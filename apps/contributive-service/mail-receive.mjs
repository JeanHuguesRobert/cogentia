#!/usr/bin/env node
// Trusted *local* inbox import. Never accepts a remote user's claimed receipt.
// The operator/adapter must have fetched the message from the configured
// receiving mailbox and supply its provider UID; no outbound email is sent.
import { openRegistrationDB, receiveRegistrationEmail } from './registrations.mjs';
const args=process.argv.slice(2);
const pairs={};
for(let i=0;i<args.length;i+=2){
  if(!args[i]?.startsWith('--')||i+1>=args.length){console.error('Expected --key value pairs');process.exit(2);}
  pairs[args[i].slice(2)]=args[i+1];
}
if(!pairs['db']||!pairs['from']||!pairs['subject']||!pairs['provider-uid']||!pairs['mailbox']){
  console.error('Usage: node mail-receive.mjs --db DB --mailbox CONFIGURED_ADDRESS --from FROM --subject SUBJECT --provider-uid TRUSTED_MAILBOX_UID');
  process.exit(2);
}
const expected=process.env.CAMPAIGNS_INBOX;
if(!expected){console.error('CAMPAIGNS_INBOX absent; refuse to assert an inbound receipt');process.exit(2);}
const db=openRegistrationDB(pairs['db']);
try{
  const r=receiveRegistrationEmail(db,{
    from:pairs['from'],subject:pairs['subject'],provider_uid:pairs['provider-uid'],
    mailbox:pairs['mailbox'],expected_inbox:expected,received_by:'trusted-mailbox-adapter'
  });
  console.log(JSON.stringify({ok:true,id:r.id,status:r.status,already_processed:r.already_processed}));
} catch(e){console.error(JSON.stringify({ok:false,error:e.message}));process.exitCode=1;}
finally{db.close();}
