/**
 * source-deep-links.js — Transforms corpus source IDs into verifiable public GitHub deep links.
 *
 * Example:
 *   "FractaVolta:research/generalized_packet_networks.md#L968-L1057"
 *   -> "https://github.com/JeanHuguesRobert/FractaVolta/blob/main/research/generalized_packet_networks.md#L968-L1057"
 */

const REPO_MAP = {
  FractaVolta: "https://github.com/JeanHuguesRobert/FractaVolta",
  cogentia: "https://github.com/JeanHuguesRobert/cogentia",
  inseme: "https://github.com/JeanHuguesRobert/inseme",
  marenostrum: "https://github.com/JeanHuguesRobert/marenostrum",
  "barons-Mariani": "https://github.com/JeanHuguesRobert/barons-Mariani",
  Inox: "https://github.com/JeanHuguesRobert/Inox",
  Kudos: "https://github.com/JeanHuguesRobert/Kudos",
  JeanHuguesRobert: "https://github.com/JeanHuguesRobert/JeanHuguesRobert",
};

export function resolveSourceUrl(sourceId, explicitGithubUrl = null) {
  if (explicitGithubUrl) return explicitGithubUrl;
  if (!sourceId || typeof sourceId !== "string") return null;

  const colonIdx = sourceId.indexOf(":");
  if (colonIdx <= 0) return null;

  const repoName = sourceId.slice(0, colonIdx).trim();
  const rest = sourceId.slice(colonIdx + 1).trim();
  const baseUrl = REPO_MAP[repoName];
  if (!baseUrl) return null;

  if (rest.startsWith(".cogentia/issues/")) {
    // Issue markdown link format: .cogentia/issues/owner-repo/issue-00018.md#L...
    const issueMatch = rest.match(/issue-(\d+)\.md(#L\d+(?:-L\d+)?)?/);
    if (issueMatch) {
      const issueNum = Number(issueMatch[1]);
      const hash = issueMatch[2] || "";
      return `${baseUrl}/issues/${issueNum}${hash}`;
    }
  }

  return `${baseUrl}/blob/main/${rest}`;
}

export function formatSourceMarkdownLink(sourceId, title = null, explicitGithubUrl = null) {
  const url = resolveSourceUrl(sourceId, explicitGithubUrl);
  const displayTitle = title || sourceId;
  if (!url) return `[${sourceId}]`;
  return `[${displayTitle}](${url})`;
}
