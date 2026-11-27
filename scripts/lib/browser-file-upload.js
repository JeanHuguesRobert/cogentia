/**
 * Generic governed file-input capability; default hosted Chromium transport.
 *
 * Selecting a file may immediately start a network upload. This operation is
 * an EXTERNAL effect, not form.fill and not permission to publish or submit.
 * The caller must obtain the separate mandate/authorization before invocation.
 *
 * Reuses the Core's tab-bound, identity-verified CDP transport. No extension
 * changes, cookies, arbitrary page scripts, or site-specific selectors.
 */
import path from 'node:path';
import {realpath, stat} from 'node:fs/promises';

const error = code => Object.assign(new Error('Browser file selection unavailable'), {code});
const DEFAULT_MAX_BYTES = 300 * 1024 * 1024;

function uploadRoots(raw) {
  if (Array.isArray(raw)) return raw.filter(item => typeof item === 'string' && item.length > 0);
  if (typeof raw === 'string') return raw.split(path.delimiter).filter(Boolean);
  return [];
}

async function admittedLocalFile(filePath, roots, maxBytes) {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath) || filePath.includes('\0'))
    throw error('BROWSER_UPLOAD_PATH_INVALID');
  const configured = uploadRoots(roots);
  if (!configured.length) throw error('BROWSER_UPLOAD_ROOTS_NOT_CONFIGURED');
  let resolved, info;
  try {
    resolved = await realpath(filePath);
    info = await stat(resolved);
  } catch {
    throw error('BROWSER_UPLOAD_FILE_UNAVAILABLE');
  }
  if (!info.isFile() || info.size < 1 || info.size > maxBytes)
    throw error('BROWSER_UPLOAD_FILE_NOT_ALLOWED');
  let authorized = false;
  for (const root of configured) {
    if (!path.isAbsolute(root)) continue;
    let realRoot;
    try { realRoot = await realpath(root); } catch { continue; }
    const relative = path.relative(realRoot, resolved);
    if (relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) {
      authorized = true;
      break;
    }
  }
  if (!authorized) throw error('BROWSER_UPLOAD_OUTSIDE_ALLOWED_ROOTS');
  return {resolved, bytes: info.size};
}

export function createBrowserFileUploadCapability({
  transport, selectFile, allowedRoots = process.env.COGENTIA_BROWSER_UPLOAD_ROOTS,
  maxBytes = DEFAULT_MAX_BYTES
} = {}) {
  if (selectFile!==undefined ? (typeof selectFile!=='function'||transport!==undefined) : typeof transport?.withFrame!=='function') throw error('BROWSER_UPLOAD_TRANSPORT_INVALID');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > DEFAULT_MAX_BYTES)
    throw error('BROWSER_UPLOAD_LIMIT_INVALID');
  return Object.freeze({
    name: 'browser.form.upload',
    kind: 'tool',
    risk: 'external_write',
    resultVisibility: 'reasoner',
    costUnits: 2,
    description: 'Select a permitted local file in an explicitly identified HTML file input. May initiate upload immediately; requires separate external-effect authorization and never clicks Publish.',
    inputSchema: {
      type: 'object',
      properties: {
        tab_id: {type:'integer', minimum:1},
        expected_url: {type:'string', minLength:1, maxLength:4096},
        file_index: {type:'integer', minimum:0, maximum:79},
        file_path: {type:'string', minLength:1, maxLength:4096}
      },
      required:['tab_id','expected_url','file_index','file_path'],
      additionalProperties:false
    },
    async execute(input = {}) {
      const {tab_id,expected_url,file_index,file_path} = input;
      if (!Number.isSafeInteger(tab_id) || tab_id < 1
        || !Number.isInteger(file_index) || file_index < 0 || file_index > 79
        || typeof expected_url !== 'string' || expected_url.length > 4096
        || !expected_url.startsWith('https://'))
        throw error('BROWSER_UPLOAD_TARGET_INVALID');
      // Local file admission precedes browser interaction; path and file bytes
      // are never returned in the capability receipt.
      const file = await admittedLocalFile(file_path, allowedRoots, maxBytes);
      const receipt = selectFile ? await selectFile({tabId:tab_id,expectedUrl:expected_url,fileIndex:file_index,file}) : await transport.withFrame({
        tabId:tab_id,expectedUrl:expected_url,
        operation:async ({send,frameTree}) => {
          if (frameTree?.frame?.url !== expected_url)
            throw error('BROWSER_UPLOAD_DOCUMENT_CHANGED');
          const tree = await send('DOM.getDocument',{depth:1});
          if (!Number.isInteger(tree?.root?.nodeId) || tree.root.nodeId < 1)
            throw error('BROWSER_UPLOAD_DOM_UNAVAILABLE');
          const matches = await send('DOM.querySelectorAll',{
            nodeId:tree.root.nodeId,selector:'input[type="file"]'
          });
          const ids = matches?.nodeIds;
          if (!Array.isArray(ids) || file_index >= ids.length || ids.length > 80)
            throw error('BROWSER_UPLOAD_FIELD_NOT_FOUND');
          const selected = ids[file_index];
          if (!Number.isSafeInteger(selected) || selected < 1)
            throw error('BROWSER_UPLOAD_FIELD_NOT_FOUND');
          const info = await send('DOM.describeNode',{nodeId:selected});
          const node = info?.node;
          const attrs = {};
          for (let i = 0; i + 1 < (node?.attributes?.length || 0); i += 2)
            attrs[node.attributes[i]] = node.attributes[i+1];
          if (node?.nodeName?.toLowerCase() !== 'input'
            || attrs.type?.toLowerCase() !== 'file'
            || Object.hasOwn(attrs,'disabled'))
            throw error('BROWSER_UPLOAD_FIELD_UNAVAILABLE');
          // Site code may submit the file as soon as the change event fires.
          // This capability makes no promise about completion or visibility.
          await send('DOM.setFileInputFiles',{nodeId:selected,files:[file.resolved]});
          // CDP acknowledges the selection even if Chromium cannot read the
          // named file (observed: host file 49 bytes, browser File.size=0).
          // Query the SAME native input inside the tab-bound CDP session.
          // Do not infer successful selection from a change event or a CDP ack.
          const resolved = await send('DOM.resolveNode',{nodeId:selected});
          const objectId = resolved?.object?.objectId;
          if(typeof objectId!=='string'||!objectId)
            throw error('BROWSER_UPLOAD_BROWSER_FILE_UNVERIFIED');
          let observed;
          try{
            const result = await send('Runtime.callFunctionOn',{
              objectId,
              functionDeclaration:'async function(){if(!this.isConnected||this.tagName!=="INPUT"||this.type!=="file")return null;const f=this.files;if(!f||f.length!==1)return {count:f?.length??0,bytes:null,readable:false};const file=f[0];try{const b=await file.slice(0,1).arrayBuffer();return {count:1,bytes:file.size,readable:b.byteLength===1}}catch{return {count:1,bytes:file.size,readable:false}}}',
              returnByValue:true,awaitPromise:true,
            });
            observed=result?.result?.value;
          }finally{
            await send('Runtime.releaseObject',{objectId}).catch(()=>{});
          }
          if(!observed||observed.count!==1||!Number.isSafeInteger(observed.bytes))
            throw error('BROWSER_UPLOAD_BROWSER_FILE_UNVERIFIED');
          if(observed.bytes!==file.bytes)
            throw error('BROWSER_UPLOAD_BROWSER_SIZE_MISMATCH');
          if(observed.readable!==true)
            throw error('BROWSER_UPLOAD_BROWSER_READ_FAILED');
          return {selected:true,browserBytes:observed.bytes};
        }
      });
      if (receipt?.selected !== true||receipt.browserBytes!==file.bytes)
        throw error('BROWSER_UPLOAD_UNCONFIRMED');
      return {
        ok:true,tab_id,file_index,selected_file_bytes:file.bytes,
        browser_verified_bytes:receipt.browserBytes,
        file_selected:true,submitted:false,upload_completion:'unverified'
      };
    }
  });
}
