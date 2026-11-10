/**
 * Intra-Twin messaging over Stalwart JMAP (Cogentia semantic capability).
 * No Gmail draft-review workflow. Each effect still requires a trusted COP
 * authorization decision and a credential broker; neither is inferred from
 * a callable tool, email address or user's JSON payload.
 */
import { randomUUID } from 'node:crypto';

export const AGENT_MAIL_VERSION = 'cogentia.agent_mail.v1';
export const DEFAULT_LOCAL_DOMAIN = 'mail.fractavolta.com';
export const DEFAULT_JMAP_ORIGIN = 'http://127.0.0.1:8080';

function failure(code) { const error = new Error(code); error.error_class = code; throw error; }
function str(value, max, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) failure('invalid_'+field);
  return value;
}
function localAddress(value, domain) {
  const address = str(value, 254, 'agent_address').toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,62}@[a-z0-9.-]+$/.test(address) || !address.endsWith('@'+domain) || address.split('@')[1] !== domain) failure('outside_twin_trust_perimeter');
  return address;
}
function defaultJmapSession(origin) {
  if (origin !== DEFAULT_JMAP_ORIGIN) failure('nonlocal_jmap_origin_forbidden');
  return async ({address,password}) => {
    const basic=Buffer.from(address+':'+password,'utf8').toString('base64');
    const response=await fetch(origin+'/jmap/session',{headers:{authorization:'Basic '+basic},signal:AbortSignal.timeout(10000)});
    if (!response.ok) failure('jmap_session_http_'+response.status);
    return response.json();
  };
}
function defaultJmapPost(origin) {
  if (origin !== DEFAULT_JMAP_ORIGIN) failure('nonlocal_jmap_origin_forbidden');
  return async ({address, password, methodCalls}) => {
    const basic = Buffer.from(address+':'+password,'utf8').toString('base64');
    const response = await fetch(origin+'/jmap', {
      method:'POST',
      headers:{ authorization:'Basic '+basic, 'content-type':'application/json' },
      body:JSON.stringify({using:['urn:ietf:params:jmap:core','urn:ietf:params:jmap:mail','urn:ietf:params:jmap:submission'],methodCalls}),
      signal:AbortSignal.timeout(10000),
    });
    if (!response.ok) failure('jmap_http_'+response.status);
    return response.json();
  };
}
function pick(data, cid, method) {
  // RFC 8621 §7.5: implicit Email/set shares cid with EmailSubmission/set.
  const entries=(data?.methodResponses || []).filter(([name,, id])=>id===cid && name===method);
  if (entries.length!==1) failure('jmap_'+method.replace(/\W/g,'_')+'_failed');
  return entries[0][1];
}
function mailbox(items, role) {
  const matches=items.filter(item=>item.role===role);
  if (matches.length!==1) failure('mailbox_'+role+'_missing_or_ambiguous');
  return matches[0].id;
}
function validateDecision(decision, {from,to,subject,body,correlationId}) {
  // A signed/verified decision is provided by a trusted COP adapter, never
  // inferred from a free-form caller-supplied 'approved' boolean.
  if (!decision || decision.authorized !== true || decision.capability !== 'agent.mail.send' ||
      decision.principal !== 'principal:jhn' || decision.actor !== from ||
      decision.to !== to || decision.subject !== subject || decision.body !== body ||
      decision.correlation_id !== correlationId || !decision.authorization_id) failure('cop_effect_authorization_required');
}
export function createAgentMail({
  domain=DEFAULT_LOCAL_DOMAIN,
  origin=DEFAULT_JMAP_ORIGIN,
  credentialBroker,
  authorize,
  post=defaultJmapPost(origin),
  getSession=defaultJmapSession(origin),
}={}) {
  if (domain !== DEFAULT_LOCAL_DOMAIN) failure('unapproved_twin_domain');
  async function credentials(address) {
    if (typeof credentialBroker !== 'function') failure('agent_mail_credential_broker_missing');
    const result=await credentialBroker(address);
    if (!result || typeof result.password!=='string' || !result.password) failure('agent_mail_credential_unavailable');
    return result.password;
  }
  async function accountId(address) {
    const password=await credentials(address);
    const session=await getSession({address,password});
    const id=session?.primaryAccounts?.['urn:ietf:params:jmap:mail'];
    if (!id || !session?.accounts?.[id]) failure('jmap_mail_account_missing');
    return id;
  }
  async function request(address, methodCalls) {
    const password=await credentials(address);
    return post({address,password,methodCalls});
  }
  return {
    status() {
      return {protocol:AGENT_MAIL_VERSION, capability:['agent.mail.send','agent.mail.receive'],
        origin,domain, credential_broker_configured:typeof credentialBroker==='function',
        cop_authorizer_configured:typeof authorize==='function',
        no_external_recipients:true, gmail_draft_review:false,
        ready:typeof credentialBroker==='function' && typeof authorize==='function'};
    },
    async receive({agent,limit=10}={}) {
      const address=localAddress(agent,domain);
      if (!Number.isInteger(limit) || limit<1 || limit>50) failure('invalid_limit');
      // Receiving private messages requires an independently scoped read grant.
      if (typeof authorize!=='function') failure('cop_read_authorization_required');
      const grant=await authorize({capability:'agent.mail.receive',agent:address,limit});
      if (!grant || grant.authorized!==true || grant.capability!=='agent.mail.receive' || grant.agent!==address || grant.actor!==address || grant.principal!=='principal:jhn') failure('cop_read_authorization_required');
      const account=await accountId(address);
      const mailboxes=pick(await request(address,[['Mailbox/get',{accountId:account,ids:null},'b']]),'b','Mailbox/get');
      const inbox=mailbox(mailboxes.list||[],'inbox');
      const found=pick(await request(address,[['Email/query',{accountId:account,filter:{inMailbox:inbox},limit,sort:[{property:'receivedAt',isAscending:false}]},'q']]),'q','Email/query');
      const ids=(found.ids||[]).slice(0,limit);
      if (!ids.length) return {ok:true,agent:address,messages:[]};
      const result=pick(await request(address,[['Email/get',{accountId:account,ids,properties:['id','subject','from','to','receivedAt','textBody','bodyValues'],fetchTextBodyValues:true},'g']]),'g','Email/get');
      return {ok:true,agent:address,messages:(result.list||[]).map(m=>({id:m.id,subject:m.subject,from:m.from,to:m.to,receivedAt:m.receivedAt,
        text:(m.textBody||[]).map(part=>m.bodyValues?.[part.partId]?.value||'').join('\n')}))};
    },
    async send({from,to,subject,body,correlation_id}={}) {
      const sender=localAddress(from,domain), recipient=localAddress(to,domain);
      str(subject,255,'subject');str(body,20000,'body');
      const correlationId=correlation_id || randomUUID();
      str(correlationId,100,'correlation_id');
      if (typeof authorize!=='function') failure('cop_effect_authorization_required');
      const decision=await authorize({capability:'agent.mail.send',principal:'principal:jhn',actor:sender,to:recipient,subject,body,correlation_id:correlationId});
      validateDecision(decision,{from:sender,to:recipient,subject,body,correlationId});
      // No possibility to supply an external envelope: both addresses are
      // constructed from validated local agent addresses.
      const account=await accountId(sender);
      const [identityResult,mailboxResult]=await Promise.all([
        request(sender,[['Identity/get',{accountId:account,ids:null},'i']]),
        request(sender,[['Mailbox/get',{accountId:account,ids:null},'b']]),
      ]);
      // Identity and Mailbox queries must use the JMAP account ID, not email.
      const identities=pick(identityResult,'i','Identity/get').list||[];
      const identityIds=identities.filter(i=>i.email?.toLowerCase()===sender).map(i=>i.id);
      if (identityIds.length!==1) failure('sender_identity_missing_or_ambiguous');
      const drafts=mailbox(pick(mailboxResult,'b','Mailbox/get').list||[],'drafts');
      const created={mailboxIds:{[drafts]:true},keywords:{$draft:true},from:[{email:sender}],to:[{email:recipient}],
        subject,textBody:[{partId:'p1',type:'text/plain'}],bodyValues:{p1:{value:body}}};
      const submission={accountId:account,create:{s:{emailId:'#m',identityId:identityIds[0],envelope:{mailFrom:{email:sender},rcptTo:[{email:recipient}]}}},onSuccessDestroyEmail:['#s']};
      const response=await request(sender,[['Email/set',{accountId:account,create:{m:created}},'e'],['EmailSubmission/set',submission,'s']]);
      const stage=pick(response,'e','Email/set');
      const submitted=pick(response,'s','EmailSubmission/set');
      if (!stage.created?.m || !submitted.created?.s) failure('agent_mail_submission_rejected');
      return {ok:true,status:'submitted_not_delivery_verified',from:sender,to:recipient,correlation_id:correlationId,
        authorization_id:decision.authorization_id,submission_id:submitted.created.s.id};
    },
  };
}
