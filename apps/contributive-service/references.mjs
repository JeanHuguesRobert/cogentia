// 3C1: public, self-describing reference for singular campaign copies.
// No encryption, authority or ownership claim. In particular, a 3Code alone
// may be ambiguous even inside one campaign.
export const REFERENCE_VERSION = '3C1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function normalize3Code(value) {
  if(typeof value!=='string')throw new Error('3Code absent');
  const raw=value.toUpperCase().replace(/[\s-]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1');
  if(raw.length!==9||raw[0]!=='3'||![...raw.slice(1)].every(c=>BASE32.includes(c)))throw new Error('3Code invalide');
  return raw.slice(0,3)+'-'+raw.slice(3,6)+'-'+raw.slice(6);
}
export function normalizeUUID(value) {
  if(typeof value!=='string'||!UUID.test(value))throw new Error('UUID de référence invalide');
  return value.toLowerCase();
}
export function formatCopyReference({campaign_id,three_code,copy_id}) {
  return [REFERENCE_VERSION,normalizeUUID(campaign_id),normalize3Code(three_code),normalizeUUID(copy_id)].join(':');
}
export function parseCopyReference(value) {
  if(typeof value!=='string'||value.length>150)throw new Error('Référence 3C1 invalide');
  const pieces=value.trim().split(':');
  if(pieces.length!==4||pieces[0]!==REFERENCE_VERSION)throw new Error('Version ou format 3C1 invalide');
  const [_,campaign_id,three_code,copy_id]=pieces;
  return {version:REFERENCE_VERSION,campaign_id:normalizeUUID(campaign_id),three_code:normalize3Code(three_code),copy_id:normalizeUUID(copy_id)};
}
