// Canonical site-specific recognition, with no dependency on the browser engine.
// Expose a vocabulary item, never the personalized aria-label.
export function editorRole(node) {
  return node?.matches?.('[role="textbox"][contenteditable="true"]') &&
    /^(Commenter en tant que|Comment as )/i.test(node.getAttribute("aria-label") || "")
    ? "facebook.comment-composer" : null;
}
