import {compileNonSecretFormFill} from "./browser-form-script.js";
import { SAFE_DOM_STRUCTURE_CODE } from "./browser-safe-dom-structure.js";
import { createGatewaySession } from "./navigation-assistant/gateway-session.js";
import {createHostedFrameTransport} from "./browser-frame-cdp-transport.js";
import {executeFrameEvaluate} from "./browser-frame-evaluate.js";
import {projectFrameTree} from "./browser-frame-tree.js";
/** Hosted Chromium capabilities over the Fracta2 navigation-assistant extension. */

const DEFAULT_GATEWAY = "ws://127.0.0.1:8776/assistant";
const DEFAULT_HEALTH = "http://127.0.0.1:8776/health";

export function createHostedBrowserCapabilities(options = {}) {
  const gateway = String(options.gateway || process.env.COGENTIA_HOSTED_BROWSER_GATEWAY || DEFAULT_GATEWAY).trim();
  const health = String(options.health || process.env.COGENTIA_HOSTED_BROWSER_HEALTH || DEFAULT_HEALTH).trim();
  const browserId = String(options.browserInstanceId || process.env.COGENTIA_HOSTED_BROWSER_INSTANCE || "fracta2-hosted").trim();
  const timeoutMs = boundedInteger(options.timeoutMs, 10000, 500, 30000);
  const frameTransport = options.frameTransport || createHostedFrameTransport({
    gateway,browserInstanceId:browserId,
    cdpHttpEndpoint:options.cdpHttpEndpoint||process.env.COGENTIA_HOSTED_BROWSER_CDP_HTTP||'http://127.0.0.1:9223/',
    timeoutMs,
  });

  return [
    {
      name: "browser.navigation.instances",
      kind: "tool",
      risk: "read_only",
      resultVisibility: "reasoner",
      costUnits: 1,
      description: "List registered personal browser instances, without reading tabs or page content.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      async execute() {
        const session = await createGatewaySession(gateway, { timeoutMs });
        try { return await session.call("browser.instances"); }
        finally { session.close(); }
      },
    },
    {
      name: "browser.navigation.coordination",
      kind: "tool",
      risk: "internal_recoverable",
      resultVisibility: "reasoner",
      costUnits: 1,
      description: "Acquire a scoped tab lease for a bounded operation, optionally reading that tab's metadata; never executes page code.",
      inputSchema: {
        type: "object",
        properties: {
          browser_instance_id: { type: "string", minLength: 1 },
          tab_id: { type: "integer", minimum: 0 },
          ttl_ms: { type: "integer", minimum: 1000, maximum: 120000 },
          action: { type: "string", enum: ["probe", "tab_metadata"] },
          include_url: { type: "boolean" },
        },
        required: ["browser_instance_id", "tab_id"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        const session = await createGatewaySession(gateway, { timeoutMs });
        try {
          return await session.withTabLease(input.browser_instance_id, input.tab_id,
            async (owner) => {
              if (input.action === "tab_metadata") {
                const result = await owner.call("tabs.list", { browser_instance_id: input.browser_instance_id });
                const tab = result.tabs?.find(item => item.id === input.tab_id);
                if (!tab) throw capabilityError("BROWSER_TARGET_TAB_MISSING");
                return { acquired: true, released_on_completion: true, tab: summarizeTab(tab, input.include_url === true) };
              }
              return { acquired: true, released_on_completion: true };
            }, input.ttl_ms || 30000);
        } finally { session.close(); }
      },
    },
    {
      name: "browser.hosted.inspect",
      kind: "tool",
      risk: "read_only",
      resultVisibility: "reasoner",
      costUnits: 1,
      description: "Inspect the Fracta2 hosted browser connection, tabs, bounded page text, DOM field structure or redacted frame identities without reading field values.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["status", "tabs", "context", "structure", "frames", "frame_tree", "frame_structure"] },
          tab_id: { type: "integer", minimum: 0 },
          max_chars: { type: "integer", minimum: 1, maximum: 12000 },
          include_url: { type: "boolean" },
          expected_url: {type:"string",minLength:1,maxLength:4096},
          frame_id: {type:"string",minLength:1,maxLength:160},
          expected_frame_origin: {type:"string",minLength:1,maxLength:256},
        },
        required: ["action"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        const action = String(input.action || "");
        if (action === "status") {
          const response = await fetch(health, { signal: AbortSignal.timeout(timeoutMs) });
          if (!response.ok) throw capabilityError("BROWSER_GATEWAY_UNAVAILABLE");
          return response.json();
        }
        if (action === "tabs") {
          const result = await rpc(gateway, "tabs.list", { browser_instance_id: browserId }, timeoutMs);
          return {
            tabs: Array.isArray(result.tabs)
              ? result.tabs.map((tab) => summarizeTab(tab, input.include_url === true))
              : [],
          };
        }
        if (action === "frames") {
          // Core-owned recipe over the original, stable page.evaluate primitive.
          // This identifies DOM iframe elements by index and origin; cross-origin
          // CDP frame IDs are unavailable from this page execution context.
          const tabId=positiveInt(input.tab_id,'tab_id');
          const result=await rpc(gateway,'page.evaluate',{
            browser_instance_id:browserId,tabId,
            code:`(() => ({ origin:location.origin,frames:Array.from(document.querySelectorAll('iframe')).slice(0,20).map((f,i)=>({iframe_index:i,origin:(()=>{try{return new URL(f.getAttribute('src')||'',location.href).origin}catch{return null}})(),same_origin:(()=>{try{return !!f.contentDocument}catch{return false}})()})) }))()`
          },timeoutMs);
          const raw=result.value||{};
          return {tab_id:tabId,origin:originOf(raw.origin),frames:Array.isArray(raw.frames)?raw.frames.slice(0,20).map(f=>({
            iframe_index:boundedInteger(f.iframe_index,0,0,19),origin:originOf(f.origin),same_origin:f.same_origin===true
          })):[], frame_identity:'dom_index_not_cdp_frame_id'};
        }
        if(action==='frame_tree'||action==='frame_structure'){
          const tabId=positiveInt(input.tab_id,'tab_id');
          const expectedUrl=String(input.expected_url||'');
          if(!expectedUrl.startsWith('https://'))throw capabilityError('BROWSER_FRAME_TARGET_INVALID');
          if(action==='frame_tree'){
            return frameTransport.withFrame({tabId,expectedUrl,operation:async({frameTree,discoverFrames})=>{
              const result=projectFrameTree(frameTree);
              const related=await discoverFrames();
              return {tab_id:tabId,frame_tree:result,
                oopif_frames:related.slice(0,24).map(f=>({frame_id:f.frameId,
                  origin:f.origin,parent_frame_id:frameTree.frame.id,is_process_isolated:true}))};
            }});
          }
          const frameId=String(input.frame_id||''),expectedOrigin=String(input.expected_frame_origin||'');
          if(!frameId||!expectedOrigin.startsWith('https://'))throw capabilityError('BROWSER_FRAME_TARGET_INVALID');
          const detail=await frameTransport.withFrame({tabId,expectedUrl,frameId,expectedOrigin,
            operation:async({send})=>executeFrameEvaluate({send,frameId,expectedOrigin,
              script:SAFE_DOM_STRUCTURE_CODE})});
          const raw=detail.value||{};
          return {tab_id:tabId,frame_id:frameId,origin:expectedOrigin,
            forms:boundedInteger(raw.forms,0,0,100),total_fields:boundedInteger(raw.total_fields,0,0,100000),
            fields:Array.isArray(raw.fields)?raw.fields.slice(0,80).map(f=>({
              tag:String(f.tag||'').slice(0,16),type:String(f.type||'').slice(0,30),
              required:f.required===true,disabled:f.disabled===true,readonly:f.readonly===true,
              autocomplete:String(f.autocomplete||'').slice(0,64)
            })):[],truncated:raw.truncated===true};
        }
        if (action === "structure") {
          const targetTabId = positiveInt(input.tab_id, "tab_id");
          const result = await rpc(gateway, "page.evaluate", {
            browser_instance_id: browserId, tabId: targetTabId,
            code: SAFE_DOM_STRUCTURE_CODE,
          }, timeoutMs);
          const raw = result.value || {};
          // Explicit allowlist: never return arbitrary extension/page fields.
          return {
            tab: result.tab ? summarizeTab(result.tab, false) : null,
            title: String(raw.title || "").slice(0, 180),
            origin: originOf(raw.origin),
            forms: boundedInteger(raw.forms, 0, 0, 100),
            fields: Array.isArray(raw.fields) ? raw.fields.slice(0, 80).map(f => ({
              tag: String(f.tag || "").slice(0, 16),
              type: String(f.type || "").slice(0, 30),
              role: String(f.role || "").slice(0, 40),
              required: f.required === true,
              disabled: f.disabled === true,
              readonly: f.readonly === true,
              autocomplete: String(f.autocomplete || "").slice(0, 64),
            })) : [],
            total_fields: boundedInteger(raw.total_fields, 0, 0, 100000),
            frames: boundedInteger(raw.frames, 0, 0, 100),
            iframe_metadata: Array.isArray(raw.iframe_metadata) ? raw.iframe_metadata.slice(0,20).map(frame => ({
              origin: originOf(frame.origin),
              same_origin: frame.same_origin === true,
              forms: boundedInteger(frame.forms, 0, 0, 100),
              controls: boundedInteger(frame.controls, 0, 0, 100000),
            })) : [],
            truncated: raw.truncated === true,
          };
        }
        if (action === "context") {
          const targetTabId = positiveInt(input.tab_id, "tab_id");
          const maxChars = boundedInteger(input.max_chars, 4000, 1, 12000);
          const result = await rpc(gateway, "page.evaluate", {
            browser_instance_id: browserId,
            tabId: targetTabId,
            code: "(() => ({title:document.title,url:location.href,text:(document.body?.innerText||\"\").slice(0," + maxChars + ")}))()",
          }, timeoutMs);
          const page = result.value || {};
          return {
            tab: result.tab ? summarizeTab(result.tab, input.include_url === true) : null,
            title: page.title || "",
            url: input.include_url === true ? page.url || "" : originOf(page.url),
            text: String(page.text || "").slice(0, maxChars),
          };
        }
        throw capabilityError("BROWSER_ACTION_NOT_ALLOWED");
      },
    },
    {
      name: "browser.hosted.interact",
      kind: "tool",
      risk: "internal_recoverable",
      resultVisibility: "reasoner",
      costUnits: 1,
      description: "Perform an explicitly requested recoverable action in the hosted browser: activate, open, close a tab, or insert supplied text into the focused field.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["activate", "open", "close", "insert_text"] },
          tab_id: { type: "integer", minimum: 1 },
          expected_url: { type: "string", maxLength: 4096 },
          url: { type: "string", maxLength: 4096 },
          active: { type: "boolean" },
          text: { type: "string", maxLength: 12000 },
        },
        required: ["action"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        const action = String(input.action || "");
        if (action === "activate") return rpc(gateway, "tabs.activate", { browser_instance_id: browserId, tabId: positiveInt(input.tab_id, "tab_id") }, timeoutMs);
        if (action === "open") {
          const url = String(input.url || "");
          if (!/^https?:\/\//i.test(url)) throw capabilityError("BROWSER_URL_INVALID");
          return rpc(gateway, "tabs.create", { browser_instance_id: browserId, url, active: input.active !== false }, timeoutMs);
        }
        if (action === "close") return rpc(gateway, "tabs.close", { browser_instance_id: browserId, tabId: positiveInt(input.tab_id, "tab_id") }, timeoutMs);
        if (action === "insert_text") {
          const text = String(input.text || "");
          if (!text || text.length > 12000) throw capabilityError("BROWSER_TEXT_INVALID");
          return rpc(gateway, "page.insertText", {
            browser_instance_id: browserId,
            tabId: positiveInt(input.tab_id, "tab_id"),
            ...(input.expected_url ? { expectedUrl: input.expected_url } : {}),
            text,
          }, timeoutMs);
        }
        throw capabilityError("BROWSER_ACTION_NOT_ALLOWED");
      },
    },
    {
      name: "browser.form.fill",
      kind: "tool", risk: "internal_recoverable", resultVisibility: "reasoner", costUnits: 1,
      description: "Fill a non-secret ordinary field. For same-origin iframes, Core sends a compiled JavaScript recipe through the stable page.evaluate primitive. Cross-origin frames require a separately authorized frame-scoped transport; no extension-specific RPC.",
      inputSchema: {type:"object",properties:{
        tab_id:{type:"integer",minimum:1},field_index:{type:"integer",minimum:0,maximum:79},
        expected_url:{type:"string",minLength:1,maxLength:4096},
        text:{type:"string",minLength:1,maxLength:2048},
        frame_id:{type:"string",minLength:1,maxLength:160},
        iframe_index:{type:"integer",minimum:0,maximum:19},
        expected_frame_origin:{type:"string",minLength:1,maxLength:256},
      },required:["tab_id","field_index","expected_url","text"],additionalProperties:false},
      async execute(input={}) {
        const tab=positiveInt(input.tab_id,"tab_id");
        const expected=String(input.expected_url||"");
        const value=String(input.text||"");
        if(!expected.startsWith('https://')||!value||value.length>2048)throw capabilityError('BROWSER_FORM_INPUT_INVALID');
        const cdpFrame=input.frame_id!==undefined;
        const hasFrame=cdpFrame||input.iframe_index!==undefined||input.expected_frame_origin!==undefined;
        if(cdpFrame&&input.iframe_index!==undefined)throw capabilityError('BROWSER_FORM_FRAME_INVALID');
        if(hasFrame){
          let origin;
          try {origin=new URL(input.expected_frame_origin);}catch{throw capabilityError('BROWSER_FORM_FRAME_INVALID');}
          if((cdpFrame?!/^[A-Za-z0-9_-]{1,160}$/.test(input.frame_id):
              !Number.isInteger(input.iframe_index)||input.iframe_index<0||input.iframe_index>19)||origin.protocol!=='https:'||
            origin.origin!==input.expected_frame_origin)throw capabilityError('BROWSER_FORM_FRAME_INVALID');
        }
        if(cdpFrame){
          const result=await frameTransport.withFrame({tabId:tab,expectedUrl:expected,
            frameId:input.frame_id,expectedOrigin:input.expected_frame_origin,
            operation:async({send,frameTree})=>{
              const pending=[frameTree];let located=null;
              while(pending.length){const item=pending.shift();if(item.frame?.id===input.frame_id)located=item.frame;
                if(Array.isArray(item.childFrames))pending.push(...item.childFrames);}
              if(!located?.url?.startsWith('https://'))throw capabilityError('BROWSER_FORM_FRAME_INVALID');
              const script=compileNonSecretFormFill({fieldIndex:input.field_index,text:value,expectedUrl:located.url});
              return executeFrameEvaluate({send,frameId:input.frame_id,expectedOrigin:input.expected_frame_origin,script});
            }});
          const receipt=result.value||{};
          if(receipt.ok!==true||receipt.submitted!==false||receipt.insertedLength!==value.length)
            throw capabilityError('BROWSER_FORM_INSERTION_UNCONFIRMED');
          return {ok:true,inserted_length:value.length,tab_id:tab,field_index:input.field_index,submitted:false};
        }
        // FBF: new recipes live in the Core, not the extension worker.
        // Explicit alternate path uses existing generic page.evaluate bridge.
        // Keep the proven native-CDP path as default until browser parity tests.
        const scriptBackend=hasFrame||options.formFillBackend==='client-script';
        const response=scriptBackend
          ? await rpc(gateway,"page.evaluate",{browser_instance_id:browserId,
              tabId:tab,expectedUrl:expected,
              code:compileNonSecretFormFill({fieldIndex:input.field_index,text:value,expectedUrl:expected,
                ...(hasFrame?{iframeIndex:input.iframe_index,expectedFrameOrigin:input.expected_frame_origin}:{})})},timeoutMs)
          : await rpc(gateway,"page.form.fill",{browser_instance_id:browserId,
              tabId:tab,expectedUrl:expected,fieldIndex:input.field_index,text:value},timeoutMs);
        const inserted=scriptBackend ? {...response.value,tabId:tab,fieldIndex:input.field_index} : response;
        if(inserted.ok!==true||inserted.submitted!==false||inserted.insertedLength!==value.length||
          inserted.tabId!==tab||inserted.fieldIndex!==input.field_index||
          (hasFrame && inserted.iframeIndex!==input.iframe_index))
          throw capabilityError('BROWSER_FORM_INSERTION_UNCONFIRMED');
        return {ok:true,inserted_length:value.length,tab_id:tab,field_index:input.field_index,
          submitted:false};
      },
    },
    {
      name: "browser.hosted.evaluate",
      kind: "tool",
      risk: "external_write",
      resultVisibility: "reasoner",
      costUnits: 2,
      description: "Evaluate explicitly supplied JavaScript in an identified hosted tab. Requires this exact capability to be confirmed by the caller; page code can cause external effects.",
      inputSchema: {
        type: "object",
        properties: { code: { type: "string", minLength: 1, maxLength: 16000 }, tab_id: { type: "integer", minimum: 1 }, expected_url: { type: "string", maxLength: 4096 } },
        required: ["code", "tab_id"],
        additionalProperties: false,
      },
      async execute(input = {}) {
        const code = String(input.code || "");
        if (!code || code.length > 16000) throw capabilityError("BROWSER_SCRIPT_INVALID");
        return rpc(gateway, "page.evaluate", {
          browser_instance_id: browserId,
          tabId: positiveInt(input.tab_id, "tab_id"),
          ...(input.expected_url ? { expectedUrl: input.expected_url } : {}),
          code,
        }, timeoutMs);
      },
    },
  ];
}

async function rpc(endpoint, method, params, timeoutMs) {
  if (typeof WebSocket !== "function") throw capabilityError("BROWSER_WEBSOCKET_UNAVAILABLE");
  const socket = new WebSocket(endpoint);
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(capabilityError("BROWSER_EXTENSION_TIMEOUT")), timeoutMs);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* already closed */ }
      if (error) reject(error);
      else resolve(value);
    }
    socket.addEventListener("open", () => socket.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })));
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.id !== 1) return;
      if (message.error) finish(capabilityError("BROWSER_EXTENSION_REQUEST_FAILED"));
      else finish(null, message.result || {});
    });
    socket.addEventListener("error", () => finish(capabilityError("BROWSER_GATEWAY_UNAVAILABLE")));
    socket.addEventListener("close", () => {
      if (!settled) finish(capabilityError("BROWSER_EXTENSION_DISCONNECTED"));
    });
  });
}

function originOf(value) {
  try { return new URL(value).origin; } catch { return ""; }
}
function summarizeTab(tab, includeUrl = false) {
  return {
    id: tab.id,
    title: tab.title || "",
    url: includeUrl ? (tab.url || "") : originOf(tab.url),
    windowId: tab.windowId,
    active: Boolean(tab.active),
  };
}
function positiveInt(value, name) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw capabilityError("BROWSER_" + name.toUpperCase() + "_INVALID");
  return number;
}
function boundedInteger(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}
function capabilityError(code) {
  const error = new Error("Hosted browser capability failed");
  error.name = "CapabilityError";
  error.code = code;
  return error;
}
