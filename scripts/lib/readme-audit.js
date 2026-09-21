import path from "node:path";

function directoryFor(readmePath) {
  return path.posix.dirname(String(readmePath).replace(/\\/g, "/"));
}

/**
 * Group README review candidates at the nearest ancestor README boundary.
 * A nested README inherits the closest parent README that also requires
 * judgment; otherwise it remains a review boundary of its own.
 */
export function groupReadmeReviewBoundaries(readmes) {
  const candidates = (readmes || []).filter(readme => readme.judgment_required);
  const reviewDirectories = new Set(candidates.map(readme => `${readme.repo}:${directoryFor(readme.path)}`));

  const boundaryFor = (readme) => {
    const ownDirectory = directoryFor(readme.path);
    let ancestor = path.posix.dirname(ownDirectory);
    while (ancestor !== "." && ancestor !== path.posix.dirname(ancestor)) {
      if (reviewDirectories.has(`${readme.repo}:${ancestor}`)) return ancestor;
      ancestor = path.posix.dirname(ancestor);
    }
    return ownDirectory;
  };

  const groupedByBoundary = new Map();
  for (const readme of candidates) {
    const boundary = boundaryFor(readme);
    const key = `${readme.repo}:${boundary}`;
    const group = groupedByBoundary.get(key) || { repo: readme.repo, boundary, readmes: [] };
    group.readmes.push(readme);
    groupedByBoundary.set(key, group);
  }

  return [...groupedByBoundary.values()].map(group => ({
    ...group,
    count: group.readmes.length,
    paths: group.readmes.map(readme => readme.path),
  }));
}
