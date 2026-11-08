/** A return path is the next step of work, not necessarily an address embedded in a continuation.
 *  The durable continuation store is always a pull-capable reply slot.
 *  A parent/subject supplies lineage, not by itself a deliverable inbox.
 */
export function deriveContinuationReturn({id,subject={},context={},result_recipient=null}={}) {
  if (!id || typeof id !== 'string') throw new Error('Continuation id required for return slot');
  const explicit = typeof result_recipient?.address === 'string' && result_recipient.address.trim()
    ? result_recipient.address.trim() : null;
  const parent = context?.parentRef || context?.parent_ref || context?.parent_packet_ref || subject?.packet_id || subject?.parentRef || null;
  const subjectRef = subject && (subject.repo || subject.repository || subject.path || subject.number)
    ? { ...subject } : null;
  return {
    mode:'continuation_result_slot',
    result_ref:`continuation:${id}/resolution`,
    result_recipient:explicit,
    lineage_ref:parent || null,
    subject_ref:subjectRef,
    route_source:explicit?'explicit':parent?'parent_lineage':subjectRef?'subject_lineage':'continuation_identity',
    return_required:true,
    ownership_transferred:false,
    authority_transferred:false,
    delivery_confirmed:false,
    note:'The result stays retrievable from the originating continuation. Lineage is a reference, NOT evidence that a consumer was notified. The handler must not appropriate the parent work.',
  };
}
