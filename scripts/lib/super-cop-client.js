/** Transport only. The root broker consumes the canonical COP effect grant. */
import net from 'node:net';
export function createSuperCopClient({socket='/run/cogentia-super/broker.sock'}={}){
  return {
    invoke({command,timeout_ms,actor,principal,mandate,target,provider,authorization_id}={}){
      if(!authorization_id||!actor||!principal||!mandate||!target||!provider||typeof command!=='string')
        throw Object.assign(new Error('cop_authorization_required'),{error_class:'authorization_missing'});
      return new Promise((resolve,reject)=>{
        const conn=net.createConnection(socket);
        let response='',done=false;
        function finish(error,value){if(done)return;done=true;conn.destroy();error?reject(error):resolve(value);}
        conn.setTimeout((timeout_ms??120000)+10000,()=>finish(new Error('broker_timeout')));
        conn.on('connect',()=>conn.write(JSON.stringify({op:'run',execution_mode:'super',
          authorization_id,actor,principal,mandate,target,provider,script:command,timeout_ms:timeout_ms??null})+'\n'));
        conn.on('data',chunk=>{
          response+=chunk.toString('utf8');
          if(response.length>600000)return finish(new Error('broker_response_too_large'));
          const idx=response.indexOf('\n');
          if(idx<0)return;
          try{const result=JSON.parse(response.slice(0,idx));
            if(typeof result.ok!=='boolean')throw new Error('invalid_broker_receipt');
            finish(null,result);
          }catch(e){finish(e);}
        });
        conn.on('error',e=>finish(e));
        conn.on('end',()=>{if(!done)finish(new Error('broker_receipt_missing'));});
      });
    }
  };
}
