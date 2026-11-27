// Canonical site-specific recognition, with no dependency on the browser engine.
// Expose a vocabulary item, never the personalized aria-label.
export function editorRole(node) {
  return node?.matches?.('[role="textbox"][contenteditable="true"]') &&
    /^(Commenter en tant que|Comment as )/i.test(node.getAttribute("aria-label") || "")
    ? "facebook.comment-composer" : null;
}

// Observation only: a local cancellation affordance is evidence of a
// temporary edit context, not a binding to the original comment.
export function editorContext(node, registry) {
  // Called only for a previously recognized comment editor.
  if (!node) return null;
  const editorSelector='[contenteditable="true"]';
  const controls='button,[role="button"],a,[tabindex],span';
  for (let scope=node.parentElement,depth=1;scope&&depth<=12;scope=scope.parentElement,depth++) {
    const editors=scope.querySelectorAll(editorSelector);
    if(editors.length!==1||editors[0]!==node) break;
    const candidates=scope.querySelectorAll(controls);
    if(candidates.length>240) break;
    const matches=[...candidates].filter(c=>!node.contains(c)&&
      /^(Annuler|Cancel)$/i.test((c.getAttribute('aria-label')||c.innerText||'').trim())&&
      c.getClientRects().length>0);
    // Nested spans and their actionable wrapper describe one affordance.
    const outer=matches.filter(c=>!matches.some(other=>other!==c&&other.contains(c)));
    if(outer.length!==1) { if(outer.length>1)break; continue; }
    const label=outer[0],control=label.closest('button,[role="button"],a,[tabindex]');
    const actionable=!!control&&scope.contains(control)&&!control.contains(node);
    return {scope_uid:registry.elementUid(scope),cancel_uid:registry.elementUid(actionable?control:label),
      ancestor_distance:depth,actionable};
  }
  return null;
}
