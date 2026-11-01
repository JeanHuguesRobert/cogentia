// Pure target selection for navigation commands; selection never changes browser focus.
export function selectTargetTab(tabs, params = {}) {
  if (params.tabId !== undefined && params.tabId !== null) {
    if (!Number.isInteger(params.tabId) || params.tabId < 0) throw new Error('tabId must be a nonnegative integer');
    const tab = tabs.find((candidate) => candidate.id === params.tabId);
    if (!tab) throw new Error('Target tab does not exist');
    return tab;
  }
  const active = tabs.filter((tab) => tab.active && tab.lastFocusedWindow);
  if (active.length !== 1) throw new Error('An explicit tabId is required when the active tab is ambiguous');
  return active[0];
}
export function ensureExpectedUrl(tab, params = {}) {
  if (params.expectedUrl !== undefined && params.expectedUrl !== tab.url)
    throw new Error('Target tab navigated since observation');
  if (!tab.url || !/^https?:\/\//i.test(tab.url)) throw new Error('Target is not a web page');
  return tab;
}
