export const SHELL_JUDGMENT_PREFIX = 'COGENTIA_JUDGMENT_REQUEST_V1:';
export function extractShellJudgment(stdout) {
  const lines = String(stdout || '').split('\n');
  const requests = lines.filter(line => line.startsWith(SHELL_JUDGMENT_PREFIX));
  if (!requests.length) return null;
  if (requests.length !== 1) throw new Error('ambiguous_shell_judgment');
  let value;
  try { value = JSON.parse(requests[0].slice(SHELL_JUDGMENT_PREFIX.length)); }
  catch { throw new Error('invalid_shell_judgment_json'); }
  if (typeof value?.question !== 'string' || !value.question.trim() || value.question.length > 2000) throw new Error('invalid_shell_judgment_request');
  return {status: 'needs_judgment', protocol:'cogentia.shell_judgment.v1', request:{question:value.question, kind:'judgment'}};
}
