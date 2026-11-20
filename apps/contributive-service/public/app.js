// Small portable web front-end; no trackers, no external resources.
const ROOT='/3code';
const app=document.getElementById('app');
const ABC='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=id=>document.getElementById(id)?.value?.trim()||'';
const el=id=>document.getElementById(id);
const msg=(where,text,bad=false)=>{const e=el(where);if(e){e.textContent=text;e.className=bad?'output error':'output success';}};
const link=id=>location.origin+ROOT+'/e/'+id;
const qr=url=>ROOT+'/api/qr?url='+encodeURIComponent(url);
const localToken=id=>localStorage.getItem('campaign-key-'+id)||'';
const row=(s)=>'<p>'+s+'</p>';
async function api(path,options={}){
  const res=await fetch(ROOT+'/api'+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await res.json();
  if(!res.ok)throw Error(data.error||'Erreur HTTP '+res.status);
  return data;
}
function code(){
  const b=new Uint8Array(5);crypto.getRandomValues(b);
  let n=0;for(const x of b)n=n*256+x;
  let s='3';for(let j=7;j>=0;j--)s+=ABC[Math.floor(n/2**(j*5))%32];
  return s.slice(0,3)+'-'+s.slice(3,6)+'-'+s.slice(6,9);
}
const section=(title,body)=>'<section class="panel"><h2>'+title+'</h2>'+body+'</section>';
function home(){
  app.innerHTML='<h1>3Code et Bouteilles à la Mer</h1><p class="lead">Pilote à diffusion modeste : le 3Code sert pour le moment à identifier des Bouteilles à la Mer, c’est-à-dire des tracts, Livres Vivants, textiles ou autres exemplaires singuliers porteurs d’une mission. Ce service n’est pas un raccourcisseur d’URL universel.</p><p><a class="button" href="/3code/guide">Comprendre le fonctionnement et utiliser mon assistant IA</a></p><h2>Outils disponibles</h2><p class="lead">Générez un 3Code gratuitement, créez une campagne contributive, individualisez un tract photocopié ou un objet et faites revenir une contribution. Accessible à toutes les initiatives, y compris aux différents candidats, sans adhésion politique.</p><div class="grid">'+
  section('Générateur 3Code','<p>3 + huit caractères Crockford, générés localement. Les collisions sont permises. Un code non enregistré ne pointe vers rien.</p><button id="gen">Générer</button><div id="generated" class="output mono">—</div>')+
  section('Retrouver une référence','<label for="lookup">3Code manuscrit ou imprimé</label><input id="lookup" placeholder="3XY-Z89-P2K" autocomplete="off"><button id="lookup-btn">Rechercher</button><div id="found"></div>')+
  section('Créer une campagne','<p>Sans compte obligatoire. Vous recevrez une clé de gestion privée : conservez-la. Vous êtes responsable des déclarations et de la conformité de votre campagne.</p><label for="campaign-template">Gabarit facultatif</label><select id="campaign-template"><option value="general">Campagne contributive libre</option><option value="presentations">Recherche de présentations présidentielles — démarche civique</option></select><label for="newtitle">Titre</label><input id="newtitle" maxlength="120" placeholder="Inventaire des moulins"><label for="newgoal">Objectif et méthode</label><textarea id="newgoal" maxlength="1200"></textarea><label for="newdesc">Descriptif public</label><textarea id="newdesc" maxlength="3000" placeholder="Objet, périmètre et modalités de participation"></textarea><button id="create">Créer ma campagne</button><div id="created"></div>')+
  section('Enregistrement d’une Bouteille à la Mer','<p>En phase pilote, seul un exemplaire déjà déclaré dans une campagne contributive peut être enregistré par courriel. Aucune association libre d’un 3Code avec une URL arbitraire.</p><div id="reg-config" class="note" role="status">Vérification de la boîte de réception…</div><div id="reg-copy-context" class="note">Ouvrez la fiche d’un exemplaire déclaré, puis cliquez sur « Préparer mon courriel de référence ». Vous aurez besoin de sa clé privée de contrôle.</div><div id="reg-panel" hidden><label for="reg-code">3Code de cet exemplaire</label><input id="reg-code" placeholder="3XX-XXX-XXX" readonly><div id="reg-for-copy"></div><label for="pilot-ack"><input type="checkbox" id="pilot-ack"> Je déclare vouloir enregistrer cette Bouteille à la Mer et je comprends que son titre, son code et sa fiche seront consultables publiquement. Je conserve ma clé de contrôle. Un courriel reçu ne prouve ni mon identité civile, ni ma propriété de l’objet.</label><button id="reg-start" disabled>Préparer mon courriel</button></div><button class="secondary" id="reg-check">Vérifier une demande précédente</button><div id="reg-result" role="status"></div>')+
  section('Tracts, affiches et photocopies','<p>Personnalisez texte, logo, QR commun et cartouche manuscrit pour chaque exemplaire. Un QR du document maître ne désigne jamais automatiquement un enfant.</p><a class="button" href="/3code/print">Ouvrir le compositeur</a><p class="note">Les exemplaires peuvent être des feuilles, textiles, livres ou objets. Le porteur n’est pas identifié.</p>')+'</div>'+section('Cogentia Twins — inscription facultative','<p>Le service 3Code est accessible sans compte ni Twin. Demander un Cogentia Twin est une démarche distincte, avec son propre consentement. La collecte de la file d’attente peut ne pas être ouverte.</p><p><a href="/waitlist?source=3code">Consulter la file d’attente Cogentia</a></p>')+'<p class="note">Projet de service d’intérêt général. Toute campagne est sous la responsabilité de son initiateur ; les engagements et résultats ne se déduisent jamais d’un scan.</p>';
  el('gen').onclick=()=>{const v=code();el('generated').textContent=v+' — non enregistré';};
  el('lookup-btn').onclick=lookup;
  el('create').onclick=createCampaign;
  el('campaign-template').onchange=()=>{
    if(el('campaign-template').value==='presentations'){
      el('newtitle').value='Recherche de présentations présidentielles — préciser la candidature';
      el('newgoal').value='Documenter des démarches citoyennes volontaires auprès des élus habilités, en vue de présentations régies par le droit électoral. Le soutien citoyen ne se substitue pas aux présentations officielles.';
      el('newdesc').value='Campagne indépendante. Les contacts, intérêts, promesses, formulaires annoncés transmis et présentations reconnues doivent rester distincts. Les résultats publiés ici sont déclaratifs et ne constituent pas une validation par le Conseil constitutionnel. Aucun élu ni citoyen ne doit être enregistré nominativement dans les métriques agrégées.';
    }else{
      for(const id of ['newtitle','newgoal','newdesc'])el(id).value='';
    }
  };
  el('reg-start').onclick=startRegistration;
  el('reg-check').onclick=checkRegistration;
  const params=new URLSearchParams(location.search);
  const copyId=params.get('copy_id');
  if(copyId&&/^[a-f0-9-]{36}$/.test(copyId)){
    el('reg-code').value=params.get('three_code')||'';
    el('reg-panel').hidden=false;
    el('reg-copy-context').textContent='Demande pour l’exemplaire '+copyId+'. La clé privée de contrôle est requise.';
    const token=localStorage.getItem('copy-edit-'+copyId)||'';
    el('reg-for-copy').insertAdjacentHTML('beforeend','<label for="reg-edit">Clé de modification de l’exemplaire</label><input type="password" id="reg-edit">');
    el('reg-edit').value=token;
  }
  showRegistrationConfig();
}
async function lookup(){
  try{
    const d=await api('/resolve?code='+encodeURIComponent(val('lookup')));
    const found=el('found');
    found.innerHTML='<p>'+d.results.length+' déclaration(s) d’exemplaire, '+(d.registrations||[]).length+' référence(s) autonomes ayant un courriel reçu ; ambiguïté : '+(d.ambiguous?'oui':'non')+'.</p>'+
      d.results.map(x=>row('<a href="'+ROOT+'/e/'+encodeURIComponent(x.id)+'">'+esc(x.title)+'</a> — '+esc(x.three_code)+' ('+(x.registration_status==='mail_received'?'courriel reçu':'déclaration non vérifiée')+')')).join('')+
      (d.registrations||[]).map(x=>row('<strong>'+esc(x.title)+'</strong> — '+esc(x.three_code)+' (courriel reçu, pas d’identité civile vérifiée)')).join('');
  }catch(e){msg('found',e.message,true);}
}
async function showRegistrationConfig(){
  try{
    const d=await api('/registrations/config');
    const copyId=new URLSearchParams(location.search).get('copy_id')||'';
    el('reg-start').disabled=!d.enabled||el('reg-panel').hidden||!el('pilot-ack')?.checked;
    if(el('pilot-ack'))el('pilot-ack').onchange=()=>{
      el('reg-start').disabled=!d.enabled||!(/^[0-9a-f-]{36}$/.test(copyId))||!el('pilot-ack').checked;
    };
    el('reg-config').textContent=d.enabled
      ? 'Boîte de réception configurée : '+d.inbox+'. Une adresse saisie ne suffit pas, vous devrez expédier le courriel.'
      : 'Le contrôle par courriel n’est pas encore ouvert : aucune boîte de réception dédiée n’est configurée. Générer un code reste libre.';
  }catch(e){el('reg-config').textContent='Vérification du service indisponible : '+e.message;}
}
async function startRegistration(){
  try{
    const p=new URLSearchParams(location.search);
    const copyId=/^[a-f0-9-]{36}$/.test(p.get('copy_id')||'')?p.get('copy_id'):null;
    const data=await api('/registrations',{method:'POST',body:JSON.stringify({
      three_code:val('reg-code'),copy_id:copyId,
      edit_token:copyId?val('reg-edit'):'',
      pilot_acknowledged:el('pilot-ack').checked
    })});
    localStorage.setItem('registration-last',data.id);
    localStorage.setItem('registration-view-'+data.id,data.view_token);
    el('reg-result').innerHTML='<div class="output"><strong>Demande pour une Bouteille à la Mer : en attente de votre courriel.</strong><p>Registrar d’origine : '+esc(data.registrar_id)+' — Référence durable : '+esc(data.record_id)+'</p><p>Adresse : '+esc(data.email_to)+'</p><label for="reg-subject">Objet du courriel (à conserver exactement)</label><textarea id="reg-subject" readonly></textarea><p><a href="'+esc(data.mailto)+'">Ouvrir mon application de messagerie</a> — vous devez envoyer vous-même le message.</p><p>Expiration : '+esc(data.expires_at)+'. Le statut ne sera confirmé qu’après réception dans la boîte configurée.</p></div>';
    el('reg-subject').value=data.email_subject;
  }catch(e){msg('reg-result',e.message,true);}
}
async function checkRegistration(){
  const id=localStorage.getItem('registration-last');
  const view=id?localStorage.getItem('registration-view-'+id):null;
  if(!id||!view){msg('reg-result','Aucune demande de référence retrouvée dans ce navigateur.',true);return;}
  try{
    const d=await api('/registrations/'+encodeURIComponent(id),{headers:{'x-registration-view':view}});
    msg('reg-result','Demande '+d.three_code+' : '+(
      d.status==='mail_received'?'courriel reçu dans la boîte configurée (identité et propriété non vérifiées)':
      d.status==='expired'?'expirée': 'en attente de réception du courriel'
    )+'. Reçu local disponible ci-dessous.');
    el('reg-result').insertAdjacentHTML('beforeend','<label for="reg-receipt">Reçu local non signé (à archiver)</label><textarea readonly id="reg-receipt" rows="9"></textarea>');
    el('reg-receipt').value=JSON.stringify(d,null,2);
  }catch(e){msg('reg-result',e.message,true);}
}
async function createCampaign(){
  try{
    const d=await api('/campaigns',{method:'POST',body:JSON.stringify({title:val('newtitle'),goal:val('newgoal'),description:val('newdesc')})});
    localStorage.setItem('campaign-key-'+d.id,d.management_token);
    el('created').innerHTML='<div class="output"><strong>Campagne créée (brouillon).</strong><p>Clé de gestion à sauvegarder ; ne pas diffuser :</p><textarea id="owner-secret" readonly></textarea><p><a href="'+ROOT+'/campaign/'+d.id+'">Gérer la campagne</a></p></div>';
    el('owner-secret').value=d.management_token;
  }catch(e){msg('created',e.message,true);}
}
async function campaign(id){
  try{
    const d=await api('/campaigns/'+encodeURIComponent(id)),c=d.campaign;
    app.innerHTML='<h1>'+esc(c.title)+'</h1><p class="lead">'+esc(c.goal)+'</p><p>'+esc(c.description||'')+'</p><span class="pill">'+esc(c.status)+'</span><p class="note">Campagne auto-déclarée : son titre et son statut ne prouvent aucun agrément.</p>'+
    section('Missions contributives','<div id="missions">'+d.missions.map(m=>row('<strong>'+esc(m.title)+'</strong> — '+esc(m.description))).join('')+'</div><div class="manager"><label for="mtitle">Nouvelle mission</label><input id="mtitle" maxlength="140"><label for="mdesc">Description</label><textarea id="mdesc"></textarea><button id="mission-create">Ajouter la mission</button><div id="mission-msg"></div></div>')+
    section('Déclarer un exemplaire ou une photocopie','<p>Un nouvel exemplaire reçoit un ID technique propre et un nouveau 3Code. En cas de photocopie, renseignez l’ancien exemplaire ou son 3Code.</p><label for="copy-title">Type et description</label><input id="copy-title" placeholder="Tract N&B, affiche, Bleu de Chine…" maxlength="160"><label for="copy-code">3Code manuscrit (facultatif)</label><input id="copy-code" placeholder="Laisser vide pour génération"><label for="parent-code">3Code du parent (facultatif)</label><input id="parent-code" placeholder="3XX-XXX-XXX"><label for="mission-select">Mission (facultative)</label><select id="mission-select"><option value="">Aucune</option>'+d.missions.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.title)+'</option>').join('')+'</select><button id="copy-create">Enregistrer cette copie</button><div id="copy-msg"></div>')+
    section('Avancement agrégé déclaré','<p>Les nombres sont déclarés par l’organisateur. Ils ne prouvent ni un parrainage officiel, ni un soutien politique individuel. Inconnu n’est pas zéro.</p><div id="progress-output">Chargement…</div><div id="progress-admin"></div><div id="progress-msg"></div>')+
    section('Gestion de campagne','<p>La clé de gestion reste sur votre appareil. Pas de compte obligatoire. Version courante : '+esc(c.revision)+'.</p><div id="manager-area"></div><div id="admin-result"></div>')+
    '<p class="note">ID de campagne : <span class="mono">'+esc(id)+'</span>. Les contributions sont en attente de validation avant publication.</p>';
    const params=new URLSearchParams(location.search);if(params.get('parent_code'))el('parent-code').value=params.get('parent_code');
    el('mission-create').onclick=()=>addMission(id);
    el('copy-create').onclick=()=>addCopy(id);
    const t=localToken(id);
    loadProgress(id,!!t);
    if(t)el('manager-area').innerHTML=(c.status==='draft'?'<button id="activate">Activer la campagne</button>':'')+
      '<label for="edit-title">Titre</label><input id="edit-title" maxlength="120" value="'+esc(c.title)+'">'+
      '<label for="edit-goal">Objectif et méthode</label><textarea id="edit-goal" maxlength="1200">'+esc(c.goal)+'</textarea>'+
      '<label for="edit-description">Descriptif public</label><textarea id="edit-description" maxlength="3000">'+esc(c.description||'')+'</textarea>'+
      '<button id="save-campaign">Enregistrer les modifications</button>'+
      (c.status==='active'?'<button class="secondary" id="pause-campaign">Suspendre la campagne</button>':'')+
      (c.status==='paused'?'<button id="resume-campaign">Reprendre la campagne</button>':'')+
      (['active','paused'].includes(c.status)?'<button class="secondary" id="close-campaign">Clôturer la campagne</button>':'')+
      '<button class="secondary" id="review">Voir les contributions en attente</button>';
    else el('manager-area').innerHTML='<label for="enter-token">Clé de gestion</label><input id="enter-token" type="password"><button id="save-token">Utiliser cette clé</button>';
    if(el('activate'))el('activate').onclick=()=>activate(id);
    if(el('review'))el('review').onclick=()=>review(id);
    if(el('save-campaign'))el('save-campaign').onclick=()=>updateCampaign(id,c.revision,{title:val('edit-title'),goal:val('edit-goal'),description:val('edit-description')});
    if(el('pause-campaign'))el('pause-campaign').onclick=()=>updateCampaign(id,c.revision,{status:'paused'});
    if(el('resume-campaign'))el('resume-campaign').onclick=()=>updateCampaign(id,c.revision,{status:'active'});
    if(el('close-campaign'))el('close-campaign').onclick=()=>{if(confirm('Clôturer cette campagne ? Les nouveaux exemplaires seront refusés.'))updateCampaign(id,c.revision,{status:'closed'});};
    if(el('save-token'))el('save-token').onclick=()=>{localStorage.setItem('campaign-key-'+id,val('enter-token'));location.reload();};
  }catch(e){app.innerHTML='<h1>Campagne indisponible</h1><p class="error">'+esc(e.message)+'</p>';}
}
const PROGRESS_LABELS={
  contact:'Contacts effectués (déclarés)',
  interest:'Intérêts exprimés (déclarés)',
  promise:'Promesses de présentation (déclarées)',
  form_sent:'Formulaires transmis (déclarés)',
  officially_received:'Présentations officiellement reçues (selon organisateur)',
  validated:'Présentations validées (selon organisateur)'
};
async function loadProgress(id,isManager){
  try{
    const d=await api('/campaigns/'+id+'/progress');
    const rows=d.values.map(r=>'<tr><td>'+esc(PROGRESS_LABELS[r.stage]||r.stage)+'</td><td>'+esc(r.count)+'</td><td>'+esc(r.created_at.slice(0,10))+
      (r.evidence_url?' — <a href="'+esc(r.evidence_url)+'" rel="noopener noreferrer" target="_blank">Source déclarée</a>':'')+'</td></tr>').join('');
    el('progress-output').innerHTML='<p>'+esc(d.notice)+'</p>'+(rows?'<table><thead><tr><th>Étape</th><th>Nombre</th><th>Date et source</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p>Aucune valeur publiée : état inconnu.</p>');
    if(isManager){
      el('progress-admin').innerHTML='<label for="progress-stage">Étape</label><select id="progress-stage">'+
        Object.entries(PROGRESS_LABELS).map(([key,label])=>'<option value="'+esc(key)+'">'+esc(label)+'</option>').join('')+
        '</select><label for="progress-count">Nombre agrégé (déclaration, pas preuve officielle)</label><input type="number" id="progress-count" min="0" max="1000000" step="1">'+
        '<label for="progress-evidence">Source publique HTTPS (facultative)</label><input type="url" id="progress-evidence" placeholder="https://…">'+
        '<button id="progress-save">Enregistrer la valeur déclarée</button>';
      el('progress-save').onclick=()=>saveProgress(id);
    }
  }catch(e){msg('progress-output',e.message,true);}
}
async function saveProgress(id){
  try{
    const number=Number(val('progress-count'));
    if(!val('progress-count')||!Number.isSafeInteger(number)||number<0)throw Error('Indiquez un nombre entier positif ou zéro.');
    await api('/campaigns/'+id+'/progress',{method:'POST',headers:{'x-management-token':localToken(id)},
      body:JSON.stringify({stage:val('progress-stage'),count:number,evidence_url:val('progress-evidence')})});
    msg('progress-msg','Valeur déclarée enregistrée, sans vérification officielle.');
    await loadProgress(id,true);
  }catch(e){msg('progress-msg',e.message,true);}
}
async function activate(id){
  if(!confirm('Rendre cette campagne visible dans l’annuaire public ?'))return;
  try{await api('/campaigns/'+id+'/activate',{method:'POST',headers:{'x-management-token':localToken(id)},body:'{}'});location.reload();}
  catch(e){msg('admin-result',e.message,true);}
}
async function updateCampaign(id,revision,changes){
  try{
    await api('/campaigns/'+id,{method:'PATCH',headers:{'x-management-token':localToken(id)},
      body:JSON.stringify({expected_revision:revision,...changes})});
    location.reload();
  }catch(e){msg('admin-result',e.message,true);}
}
async function addMission(id){
  try{
    const d=await api('/missions',{method:'POST',headers:{'x-management-token':localToken(id)},body:JSON.stringify({campaign_id:id,title:val('mtitle'),description:val('mdesc')})});
    msg('mission-msg','Mission enregistrée : '+d.title);setTimeout(()=>location.reload(),700);
  }catch(e){msg('mission-msg',e.message,true);}
}
async function addCopy(id){
  try{
    const d=await api('/copies',{method:'POST',headers:{'x-management-token':localToken(id)},body:JSON.stringify({campaign_id:id,title:val('copy-title'),three_code:val('copy-code'),parent_code:val('parent-code'),mission_id:val('mission-select')})});
    localStorage.setItem('copy-edit-'+d.id,d.edit_token);
    el('copy-msg').innerHTML='<div class="output"><strong>Exemplaire déclaré (pas encore enregistré par courriel).</strong><p>3Code : <strong class="mono">'+esc(d.three_code)+'</strong></p><p>Parent : '+esc(d.parent_code||'aucun')+'</p><p><a href="'+ROOT+'/e/'+d.id+'">Fiche de cet exemplaire</a></p><p><a href="'+ROOT+'/print?copy_id='+encodeURIComponent(d.id)+'">Composer le PDF singulier (QR individuel)</a></p><p>La clé de modification n’est présentée qu’une fois :</p><textarea readonly id="edit-token"></textarea></div>';
    el('edit-token').value=d.edit_token;
  }catch(e){msg('copy-msg',e.message,true);}
}
async function review(id){
  try{
    const d=await api('/campaigns/'+id+'/contributions',{headers:{'x-management-token':localToken(id)}});
    el('admin-result').innerHTML=d.contributions.map(c=>'<div class="panel"><p>'+esc(c.message)+'</p><small>'+esc(c.status)+'</small><br><button data-cid="'+esc(c.id)+'" data-decision="accepted">Accepter</button><button class="secondary" data-cid="'+esc(c.id)+'" data-decision="rejected">Rejeter</button></div>').join('')||'<p>Aucune contribution.</p>';
    el('admin-result').querySelectorAll('button[data-cid]').forEach(b=>b.onclick=async()=>{try{await api('/contributions/'+b.dataset.cid+'/review',{method:'POST',headers:{'x-management-token':localToken(id)},body:JSON.stringify({status:b.dataset.decision})});review(id);}catch(e){alert(e.message);}});
  }catch(e){msg('admin-result',e.message,true);}
}
async function copyPage(id){
  try{
    const d=await api('/copies/'+id),c=d.copy;
    app.innerHTML='<h1>Exemplaire singulier</h1><section class="panel"><p class="big-code mono">'+esc(c.three_code)+'</p><p>'+esc(c.title)+'</p><p><strong>Parent déclaré :</strong> '+esc(c.parent_code||'aucun')+'</p><p><strong>Statut :</strong> '+esc(c.relation_status)+'</p><img class="qr" src="'+qr(link(id))+'" alt="QR individuel de l’exemplaire"><p class="mono">'+esc(link(id))+'</p><p class="mono">'+esc(c.reference)+'</p><p><a href="'+ROOT+'/print?copy_id='+encodeURIComponent(id)+'">Composer et imprimer cet exemplaire singulier en PDF</a></p><p class="note">Ce QR peut être photocopié mais continue à désigner ce même exemplaire. Il ne prouve ni la possession ni un soutien politique.</p><p><a class="button" href="'+ROOT+'/campaign/'+encodeURIComponent(c.campaign_id)+'?parent_code='+encodeURIComponent(c.three_code)+'">J’ai photocopié cet exemplaire : déclarer un enfant</a></p></section>'+
      section('Enregistrer cette Bouteille à la Mer','<p>Le registrar pilote n’enregistre que les exemplaires déclarés dans une campagne. Pour obtenir le statut « courriel reçu », ouvrez le formulaire et envoyez vous-même le message proposé.</p><p><a class="button" href="'+ROOT+'/?copy_id='+encodeURIComponent(id)+'&three_code='+encodeURIComponent(c.three_code)+'">Préparer mon courriel de référence</a></p>')+
      section('Contribuer librement','<p>Les contributions ne sont pas publiées sans validation de l’organisateur. Ne transmettez pas de données personnelles ou sensibles.</p><label for="contribution">Information, correction, témoignage ou résultat</label><textarea id="contribution" maxlength="1000"></textarea><button id="contribute">Soumettre une contribution</button><div id="contrib-msg"></div>')+
      section('Contributions publiées',d.contributions.map(x=>'<p>'+esc(x.message)+'</p>').join('')||'<p>Pas encore de contribution publiée.</p>');
    el('contribute').onclick=async()=>{try{await api('/contributions',{method:'POST',body:JSON.stringify({copy_id:id,message:val('contribution')})});msg('contrib-msg','Contribution reçue, en attente de qualification.');el('contribution').value='';}catch(e){msg('contrib-msg',e.message,true);}};
  }catch(e){app.innerHTML='<h1>Exemplaire introuvable</h1><p class="error">'+esc(e.message)+'</p>';}
}
function printPage(){
  const requestedId=new URLSearchParams(location.search).get('copy_id')||'';
  const hasCopy=/^[0-9a-f-]{36}$/.test(requestedId);
  let registeredCopy=null;
  app.innerHTML='<div class="no-print"><h1>Compositeur de tract / affiche</h1><p id="print-status">Le modèle reste reproductible par photocopie. Ajoutez ensuite un 3Code unique manuscrit à chaque nouvelle copie.</p><div class="grid">'+
  section('Texte et format','<label for="ptitle">Titre</label><input id="ptitle" value="Campagne contributive"><label for="pbody">Texte principal</label><textarea id="pbody">Un objet, une mission, une contribution volontaire. Découvrez la campagne et créez votre propre exemplaire.</textarea><label for="pformat">Cartouche</label><select id="pformat"><option value="blank">Manuscrit vierge</option><option value="child">3Code individuel</option><option value="fork">Photocopie / fork</option></select><label for="pchild">3Code enfant</label><input id="pchild" placeholder="3XX-XXX-XXX"><label for="pparent">3Code parent</label><input id="pparent" placeholder="3XX-XXX-XXX">')+
  section('Logo et QR commun','<label for="plogo">Logo (fichier local, sans transfert)</label><input type="file" id="plogo" accept="image/*"><label for="pcampaign">Identifiant de campagne (facultatif)</label><input id="pcampaign" placeholder="UUID de campagne"><p class="note">Le QR commun ouvre la campagne ou l’accueil. Il ne désigne pas un exemplaire.</p><button id="refresh">Actualiser</button><button id="printer">Imprimer / enregistrer en PDF</button>')+'</div></div><article class="print-design" id="preview"><img id="p-logo" class="mark" alt=""><h1 id="p-title"></h1><p id="p-body"></p><div class="cartridge"><div><strong>EXEMPLAIRE SINGULIER</strong><p>3Code : <span id="p-code" class="mono"></span></p><div class="code-line"></div><p id="p-parent-line">Parent : <span class="mono" id="p-parent-code"></span></p><p class="note">Inscrire un nouveau 3Code pour chaque photocopie. La filiation est déclarative.</p></div><img id="p-qr" alt="QR commun d’enregistrement"></div><p class="note mono" id="p-reference"></p></article>';
  const refresh=()=>{
    el('p-title').textContent=val('ptitle');
    el('p-body').textContent=val('pbody');
    el('p-code').textContent=el('pformat').value==='blank'?'________________':val('pchild')||'________________';
    el('p-parent-code').textContent=val('pparent')||'________________';
    el('p-parent-line').classList.toggle('hidden',el('pformat').value!=='fork');
    const campaign=val('pcampaign');
    const url=registeredCopy?link(registeredCopy.id):location.origin+ROOT+(campaign?'/campaign/'+encodeURIComponent(campaign):'');
    el('p-qr').src=qr(url);
    el('p-qr').alt=registeredCopy?'QR individuel de cet exemplaire':'QR commun de campagne';
    el('p-reference').textContent=registeredCopy?'Référence 3C1 : '+registeredCopy.reference+' — exemplaire déclaré, provenance non authentifiée.':'Modèle non individualisé : ne pas présenter le QR commun comme une référence singulière.';
    const f=el('plogo').files[0];if(f){const reader=new FileReader();reader.onload=()=>{el('p-logo').src=reader.result;};reader.readAsDataURL(f);}
  };
  el('refresh').onclick=refresh;el('printer').onclick=()=>{refresh();setTimeout(()=>window.print(),200);};
  if(hasCopy){
    el('printer').disabled=true;
    el('print-status').textContent='Chargement de la référence singulière enregistrée…';
    Promise.all([api('/copies/'+requestedId)])
      .then(async([d])=>{
        const c=d.copy;
        const campaign=await api('/campaigns/'+c.campaign_id);
        registeredCopy={...c,id:requestedId};
        el('ptitle').value=campaign.campaign.title;
        el('pbody').value=[campaign.campaign.goal,campaign.campaign.description].filter(Boolean).join('\n\n');
        el('pcampaign').value=c.campaign_id;el('pcampaign').readOnly=true;
        el('pchild').value=c.three_code;el('pchild').readOnly=true;
        el('pparent').value=c.parent_code||'';el('pparent').readOnly=true;
        el('pformat').value=c.parent_code?'fork':'child';el('pformat').disabled=true;
        el('print-status').textContent='QR individuel : cet imprimé référence exactement l’exemplaire '+requestedId+'. Une photocopie conserve la même référence; pour un nouvel exemplaire, créez une nouvelle fiche.';
        el('printer').disabled=false;
        refresh();
      })
      .catch(e=>{el('print-status').textContent='Exemplaire introuvable : '+e.message;el('printer').disabled=true;});
  }else if(requestedId){
    el('print-status').textContent='Identifiant d’exemplaire invalide : impression individuelle refusée.';
    el('printer').disabled=true;
  }
  refresh();
}
const p=location.pathname;
if(p.startsWith(ROOT+'/e/'))copyPage(p.split('/').pop());
else if(p.startsWith(ROOT+'/campaign/'))campaign(p.split('/').pop());
else if(p===ROOT+'/print')printPage();
else home();
