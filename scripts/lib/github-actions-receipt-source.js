/**
 * Read-only GitHub Actions execution evidence adapter.
 * GitHub API client is injected by the trusted control plane, never the user
 * request. This verifies one specific Actions run, not the task output.
 * Does NOT authenticate the caller, nor create grants/mandates.
 */
export function createGitHubActionsReceiptSource({repository, github, pinned = {}} = {}) {
  if (!/^[-\w]+\/[-\w.]+$/.test(repository || "") ||
    !github || typeof github.fetchRunJobs !== "function" ||
    typeof github.fetchRunArtifacts !== "function") {
    throw new TypeError("trusted GitHub run/jobs/artifacts client required");
  }
  return Object.freeze({
    async fetchVerified({requirement_ref, offer_id}) {
      const spec = pinned[requirement_ref];
      // Never allow the caller to choose an arbitrary run or offer.
      if (!spec || spec.offer_id !== offer_id ||
          !Number.isSafeInteger(spec.run_id) || spec.run_id < 1 ||
          !Number.isSafeInteger(spec.artifact_id) || spec.artifact_id < 1 ||
          typeof spec.head_sha !== "string" || !/^[0-9a-f]{40}$/.test(spec.head_sha)) {
        return {verified:false,reason:"untrusted_or_missing_binding"};
      }
      const [jobs, artifacts] = await Promise.all([
        github.fetchRunJobs(repository,spec.run_id),
        github.fetchRunArtifacts(repository,spec.run_id)
      ]);
      const okJob = (jobs || []).some(j =>
        j.run_id === spec.run_id && j.id === spec.job_id &&
        j.status === "completed" && j.conclusion === "success"
      );
      const okArtifact = (artifacts || []).some(a =>
        a.id === spec.artifact_id && a.expired === false &&
        a.workflow_run?.id === spec.run_id &&
        a.workflow_run?.head_sha === spec.head_sha &&
        /^sha256:[0-9a-f]{64}$/.test(a.digest || "")
      );
      if (!okJob || !okArtifact) return {verified:false,reason:"run_evidence_mismatch"};
      // A synthetic correlated receipt representing GitHub transport. The
      // source is provider metadata, not an untrusted posted receipt body.
      return {verified:true,receipt:{
        schema:"magistral.execution-receipt/v1",
        status:"completed",terminal:true,
        binding:{
          schema:"magistral.execution-binding/v1",
          requirement_ref,offer_id,
          runtime_id:"github-actions",
          handler_instance_ref:"github-actions-job:"+spec.job_id,
          execution_surface:"batch",
          provider_ref:repository,
          provider_execution_id:String(spec.run_id)
        },
        artifact_refs:["github-actions-artifact:"+spec.artifact_id],
        result_refs:[],log_refs:[],error:null
      }};
    }
  });
}
