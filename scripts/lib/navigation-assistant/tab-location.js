/** Present a tab without leaking the exact page the operator is on. */

export function showFullTabLocation() {
  const value = String(process.env.NAV_ASSIST_SHOW_LOCATION || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function tabSiteLabel(url, { showLocation = showFullTabLocation() } = {}) {
  if (showLocation) return url || "";
  if (!url) return "(aucun)";
  try {
    const parsed = new URL(url);
    if (/^(chrome|brave|edge|about|chrome-extension):$/i.test(parsed.protocol)) return "(navigateur)";
    const host = parsed.hostname.replace(/^www\./i, "");
    return host || "(onglet)";
  } catch {
    return "(onglet)";
  }
}

export function redactTab(tab, options = {}) {
  if (!tab || typeof tab !== "object") return tab;
  if (showFullTabLocation() && options.showLocation !== false) return tab;
  if (options.showLocation === true) return tab;
  return { ...tab, url: tabSiteLabel(tab.url, { showLocation: false }) };
}
