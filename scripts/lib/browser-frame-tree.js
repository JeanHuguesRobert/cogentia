/** Minimal safe projection of the CDP frame tree for scoped navigation.
 * No URL path, query, document body, attributes, field values or credentials.
 * Frame IDs are opaque selectors, not permission or authentication proofs.
 */
const safeOrigin = raw => {
  try { const u = new URL(raw); return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null; }
  catch { return null; }
};
export function projectFrameTree(root, maxFrames=32) {
  if(!root || typeof root!=='object' || !Number.isInteger(maxFrames) || maxFrames<1 || maxFrames>64)
    throw Error('frame_tree_invalid');
  const pending=[{item:root,parent:null,depth:0}];
  const frames=[];const ids=new Set();
  while(pending.length && frames.length<maxFrames){
    const {item,parent,depth}=pending.shift();
    const frame=item?.frame;
    if(!frame || typeof frame.id!=='string' || frame.id.length>160 || !/^[a-zA-Z0-9_-]+$/.test(frame.id)||ids.has(frame.id))
      throw Error('frame_tree_invalid');
    ids.add(frame.id);
    frames.push({frame_id:frame.id,parent_frame_id:parent,depth,
      origin:safeOrigin(frame.securityOrigin)||safeOrigin(frame.url),
      is_top_level:parent===null});
    if(depth>=12)continue;
    if(Array.isArray(item.childFrames)){
      for(const child of item.childFrames.slice(0,maxFrames))pending.push({item:child,parent:frame.id,depth:depth+1});
    }
  }
  return {frames,truncated:pending.length>0,frame_count:frames.length,
    contains_cross_origin_frames:frames.some(f=>!f.is_top_level && f.origin!==frames[0].origin)};
}
