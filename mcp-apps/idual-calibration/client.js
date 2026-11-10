
import { App } from "@modelcontextprotocol/ext-apps";
const app=new App({name:"Cogentia iDual Calibration",version:"1.0.0",autoResize:true});

const $=id=>document.getElementById(id);
let ready=false, pending=false, lastIntent=null;
const entries=[];
const now=()=>new Date().toISOString();
const status=message=>{$('status').textContent=message};
async function send(message){
 if(!ready){status("Hôte MCP Apps non connecté. Aucune demande transmise.");return false;}
 if(pending){status("Une demande est déjà en cours de transmission.");return false;}
 pending=true;
 status("Demande en cours de transmission via MCP Apps ; aucune émission IR directe.");
 try {
   const result=await app.sendMessage({role:"user",content:[{type:"text",text:message}]});
   if(result?.isError){status("L'hôte a refusé la demande.");return false;}
   status("Demande reçue par la conversation ; effet physique à confirmer séparément.");
   return true;
 } catch(error){
   status("Transmission refusée ou indisponible : "+String(error?.message||error));
   return false;
 } finally {pending=false;}
}
function requestCommand(command){
 const intent={kind:"idual.command.request.v1",command,device:"idual",transport:"BroadLink RM Pro+",mode:"single_short_IR",requested_at:now()};
 lastIntent=intent;
 void send("Commande de calibration iDual : "+JSON.stringify(intent)+". Émets exactement cette commande une fois via le chemin Cogentia/ThinkPad existant, puis rapporte le reçu ; n'invente pas d'observation lumineuse.");
}
document.querySelectorAll("[data-command]").forEach(button=>button.addEventListener("click",()=>requestCommand(button.dataset.command)));
$('run').addEventListener("click",()=>{
 const baseline=$('baseline').value, command=$('command').value;
 const count=Number($('count').value),interval=Number($('interval').value);
 if(!Number.isInteger(count)||count<1||count>32||!Number.isInteger(interval)||interval<200||interval>5000){status("Paramètres invalides (1–32 commandes, 200–5000 ms).");return;}
 const intent={kind:"idual.sequence.request.v1",device:"idual",baseline,command,count,interval_ms:interval,requested_at:now()};
 lastIntent=intent;
 void send("Expérience de calibration iDual : "+JSON.stringify(intent)+". Exécute une seule fois cette séquence, avec contrôle des erreurs et journal des horaires ; ne suppose pas que les couleurs ont été atteintes.");
});
$('record').addEventListener("click",()=>{
 const color=$('observed').value.trim();
 if(!color){status("Décrivez d'abord la couleur observée.");return;}
 entries.push({kind:"idual.calibration.observation.v1",recorded_at:now(),based_on_request:lastIntent,observed_color:color,transition:$('transition').value,confidence:$('certainty').value,observer:"human",note:"Observation déclarative, non mesurée par capteur."});
 $('observed').value="";
 $('log').textContent=entries.map((e,i)=>(i+1)+". "+e.observed_color+" — "+e.transition+" ("+e.confidence+")").join("\n");
 status("Observation locale enregistrée ("+entries.length+"). L'enregistrement n'est pas encore persistant.");
});
$('export').addEventListener("click",()=>{
 if(!entries.length){status("Journal vide.");return;}
 send("Intègre ces observations iDual au corpus de calibration, en conservant leur niveau de confiance et la provenance humaine : "+JSON.stringify({kind:"idual.calibration.batch.v1",entries}));
});
$('clear').addEventListener("click",()=>{entries.length=0;$('log').textContent="";status("Journal de cette interface effacé.");});
// Standard MCP Apps SDK owns the handshake, lifecycle and postMessage transport.
app.connect().then(()=>{
 ready=true;
 status("MCP Apps SDK connecté. Prêt pour les mesures.");
}).catch(error=>{
 status("Initialisation MCP Apps refusée : "+String(error?.message||error));
});
