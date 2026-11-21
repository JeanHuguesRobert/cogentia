// Small portable web front-end; no trackers, no external resources.
const ROOT='/3code';
const app=document.getElementById('app');
const ABC='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const val=id=>document.getElementById(id)?.value?.trim()||'';
const el=id=>document.getElementById(id);
const msg=(where,text,bad=false)=>{const e=el(where);if(e){e.textContent=text;e.className=bad?'output error':'output success';}};
const link=id=>'https://services.acorsica.org'+ROOT+'/e/'+id;
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
  const params=new URLSearchParams(location.search);
  const copyId=params.get('copy_id')||'';
  app.innerHTML=[
    '<section class="landing"><p class="eyebrow">Agir ensemble, librement</p><h1>Que souhaitez-vous faire ?</h1>',
    '<p class="lead">Vous pouvez soutenir une initiative, faire circuler un document ou lancer votre propre action. Choisissez votre objectif : nous vous guiderons ensuite.</p>',
    '<nav class="choice-grid" aria-label="Choisir mon parcours">',
    '<a class="choice" href="#participer"><strong>Je veux participer</strong><span>Choisir une initiative et préparer un document à diffuser.</span></a>',
    '<a class="choice" href="#retrouver"><strong>J’ai reçu un document</strong><span>Retrouver son origine et découvrir comment contribuer.</span></a>',
    '<a class="choice" href="#organiser"><strong>Je veux organiser une action</strong><span>Créer une initiative et inviter d’autres personnes à participer.</span></a>',
    '</nav></section>',
    '<section class="panel" id="marche-du-soleil"><h2>La Marche du Soleil — présidentielle 2027</h2>',
    '<p>Choisissez une candidature, préparez un tract, inscrivez votre numéro et enregistrez votre exemplaire.</p>',
    '<p><a class="button" href="/3code/marche-du-soleil">Participer à La Marche du Soleil</a></p></section>',
    '<section class="panel" id="participer"><h2>Choisir une initiative</h2>',
    '<p>Chaque personne choisit librement la cause ou le candidat qu’elle souhaite aider. Aucune adhésion politique n’est nécessaire.</p>',
    '<div id="campaigns-list" role="status">Recherche des initiatives ouvertes…</div></section>',
    '<section class="panel" id="retrouver"><h2>Retrouver un document</h2>',
    '<p>Un numéro comme <strong>3XY-Z89-P2K</strong> est imprimé sur certains tracts et objets. Saisissez-le pour retrouver leur fiche.</p>',
    '<label for="lookup">Numéro visible sur le document</label><input id="lookup" placeholder="3XX-XXX-XXX" autocomplete="off" inputmode="text">',
    '<button id="lookup-btn">Retrouver ce document</button><div id="found" role="status"></div></section>',
    '<details class="panel action-details" id="organiser"><summary>Organiser une action : créer une initiative</summary>',
    '<p>Décrivez votre objectif. Vous pourrez ensuite inviter des participants à créer leurs propres documents.</p>',
    '<p class="note">Vous recevrez une clé privée pour gérer votre initiative. Conservez-la : elle ne pourra pas être récupérée.</p>',
    '<label for="campaign-template">Quel type d’action ?</label><select id="campaign-template">',
    '<option value="general">Initiative ouverte à des contributions</option>',
    '<option value="presentations">Aider à obtenir les présentations nécessaires à une candidature présidentielle</option></select>',
    '<label for="newtitle">Nom de votre initiative</label><input id="newtitle" maxlength="120" placeholder="Ex. : Aider une candidature à se présenter">',
    '<label for="newgoal">Que voulez-vous accomplir ?</label><textarea id="newgoal" maxlength="1200" placeholder="Expliquez en quelques phrases votre objectif et comment participer."></textarea>',
    '<details><summary>Ajouter une présentation plus détaillée (facultatif)</summary><label for="newdesc">Présentation publique</label>',
    '<textarea id="newdesc" maxlength="3000" placeholder="Contexte et informations complémentaires"></textarea></details>',
    '<button id="create">Créer mon initiative</button><div id="created" role="status"></div></details>',
    '<details class="panel action-details" id="courriel"><summary>Confirmer par courriel un document que vous avez créé</summary>',
    '<p>Cette étape sert à constater la réception de votre message. Elle ne sert pas à créer le document ni à vérifier votre identité.</p>',
    '<div id="reg-config" class="note" role="status">Vérification de la boîte de réception…</div>',
    '<div id="reg-copy-context" class="note">Ouvrez la fiche du document que vous avez créé, puis choisissez « Confirmer par courriel ». Vous aurez besoin de la clé privée remise à sa création.</div>',
    '<div id="reg-panel" hidden><label for="reg-code">Numéro du document</label><input id="reg-code" readonly>',
    '<div id="reg-for-copy"></div><label class="check-label" for="pilot-ack"><input type="checkbox" id="pilot-ack"> ',
    'Je souhaite publier le numéro et la fiche de ce document. Je comprends que la réception de mon courriel ne prouve pas mon identité ni que je possède le document.</label>',
    '<button id="reg-start" disabled>Préparer le courriel à envoyer</button></div>',
    '<button class="secondary" id="reg-check">Vérifier mon précédent courriel</button><div id="reg-result" role="status"></div></details>',
    '<details class="panel action-details" id="outils"><summary>Autres outils et explications</summary>',
    '<h3>Préparer un brouillon à imprimer</h3><p>Vous pouvez préparer un modèle sans l’associer à une initiative. Pour obtenir un document avec son propre numéro et son QR individuel, choisissez plutôt une initiative ci-dessus.</p>',
    '<p><a href="/3code/print">Préparer un brouillon de tract</a></p>',
    '<h3>Créer un numéro à la main</h3><p>Un numéro isolé ne désigne encore aucun document. Lors de la création d’un document, un numéro peut être attribué automatiquement.</p>',
    '<button id="gen" class="secondary">Créer un numéro</button><div id="generated" class="output mono" role="status">Aucun numéro créé.</div>',
    '<h3>Un assistant numérique personnel, plus tard</h3><p>Vous pouvez découvrir le projet d’assistant personnel Cogentia. Cette démarche est facultative et indépendante de toute initiative.</p>',
    '<p><a href="/waitlist?source=3code">Découvrir ce service</a></p>',
    '<p><a href="/3code/guide">Comprendre le fonctionnement en détail</a></p></details>',
    '<p class="note">Un document et son QR permettent de retrouver une fiche, pas de déduire les opinions de son lecteur. ',
    'Pour les candidatures présidentielles, seuls les élus habilités peuvent transmettre une présentation officielle.</p>'
  ].join('');
  el('gen').onclick=()=>{el('generated').textContent=code()+' — ce numéro n’est pas encore associé à un document';};
  el('lookup-btn').onclick=lookup;
  el('create').onclick=createCampaign;
  el('campaign-template').onchange=()=>{
    if(el('campaign-template').value==='presentations'){
      el('newtitle').value='Recherche de présentations pour une candidature — préciser laquelle';
      el('newgoal').value='Des citoyens se mobilisent librement pour entrer en contact avec des élus habilités à présenter une candidature à l’élection présidentielle. Chaque élu reste libre de sa décision.';
      el('newdesc').value='Les soutiens citoyens et les promesses ne sont pas des présentations officielles. Les résultats publiés par l’organisateur sont déclaratifs. Cette initiative ne revendique aucune investiture.';
    }else{for(const id of ['newtitle','newgoal','newdesc'])el(id).value='';}
  };
  el('reg-start').onclick=startRegistration;
  el('reg-check').onclick=checkRegistration;
  if(copyId&&/^[a-f0-9-]{36}$/.test(copyId)){
    el('courriel').open=true;
    el('reg-code').value=params.get('three_code')||'';
    el('reg-panel').hidden=false;
    el('reg-copy-context').textContent='Pour confirmer ce document, conservez la clé privée fournie à sa création.';
    const token=localStorage.getItem('copy-edit-'+copyId)||'';
    el('reg-for-copy').insertAdjacentHTML('beforeend','<label for="reg-edit">Clé privée du document</label><input type="password" id="reg-edit" autocomplete="off">');
    el('reg-edit').value=token;
    requestAnimationFrame(()=>el('courriel').scrollIntoView({block:'start'}));
  }
  const expandHash=()=>{
    const name=location.hash.slice(1);
    if(['organiser','outils','courriel'].includes(name))el(name).open=true;
  };
  window.addEventListener('hashchange',expandHash);
  expandHash();
  loadActiveCampaigns();
  showRegistrationConfig();
}
async function loadActiveCampaigns(){
  try{
    const d=await api('/campaigns');
    const campaigns=d.campaigns||[];
    el('campaigns-list').innerHTML=campaigns.length
      ?'<div class="campaign-list">'+campaigns.map(c=>'<article class="campaign-choice"><h3>'+esc(c.title)+'</h3><p>'+esc(c.goal||c.description||'Découvrez cette initiative.')+'</p><a class="button" href="'+(c.title.startsWith('La Marche du Soleil')?ROOT+'/marche-du-soleil':ROOT+'/campaign/'+encodeURIComponent(c.id))+'">Découvrir et participer</a></article>').join('')+'</div>'
      :'<p><strong>Aucune initiative n’est encore ouverte.</strong> Vous pouvez revenir plus tard ou <a href="#organiser" id="start-first">créer la première initiative</a>.</p>';
    if(!campaigns.length){
      el('start-first').onclick=()=>{el('organiser').open=true;};
    }
  }catch(e){msg('campaigns-list','La liste des initiatives ne peut pas être chargée pour le moment. '+e.message,true);}
}
async function lookup(){
  try{
    const d=await api('/resolve?code='+encodeURIComponent(val('lookup')));
    const found=el('found');
    found.innerHTML='<p>'+(d.results.length||d.registrations?.length
        ? (d.ambiguous?'Plusieurs documents utilisent ce numéro : vérifiez le titre pour choisir le bon.':'Voici le document trouvé :')
        : 'Aucun document trouvé pour ce numéro. Vérifiez les caractères inscrits.')+'</p>'+
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
      ? 'Pour confirmer votre document par courriel, vous pourrez écrire à '+d.inbox+'. L’envoi reste à votre initiative.'
      : 'La confirmation par courriel n’est pas disponible pour le moment. La création de documents reste possible.';
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
    el('reg-result').innerHTML='<div class="output"><strong>Votre courriel est prêt à être envoyé.</strong><p>Cliquez ci-dessous, puis envoyez le message depuis votre messagerie. Nous ne l’envoyons pas à votre place.</p><p><a class="button" href="'+esc(data.mailto)+'">Ouvrir ma messagerie</a></p><p>Si la messagerie ne s’ouvre pas, envoyez un message à <strong>'+esc(data.email_to)+'</strong> en copiant cet objet exact :</p><label for="reg-subject">Objet à copier</label><textarea id="reg-subject" readonly></textarea><p class="note">La demande expire le '+esc(data.expires_at)+'. La réception sera confirmée après vérification du courrier arrivé.</p></div>';
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
    el('created').innerHTML='<div class="output"><strong>Votre initiative est créée.</strong><p>Elle est pour le moment privée. Vous pourrez la publier après l’avoir préparée.</p><p><a class="button" href="'+ROOT+'/campaign/'+d.id+'">Préparer mon initiative</a></p><details><summary>Afficher et sauvegarder ma clé de gestion</summary><p>Cette clé permet de modifier votre initiative. Ne la communiquez pas.</p><textarea id="owner-secret" readonly></textarea></details></div>';
    el('owner-secret').value=d.management_token;
  }catch(e){msg('created',e.message,true);}
}
async function campaign(id){
  try{
    const d=await api('/campaigns/'+encodeURIComponent(id)),c=d.campaign;
    const t=localToken(id),open=c.status==='active',ownerDraft=c.status==='draft'&&!!t;
    app.innerHTML=
      '<p class="eyebrow"><a href="'+ROOT+'">Toutes les initiatives</a></p>'+
      '<h1>'+esc(c.title)+'</h1><p class="lead">'+esc(c.goal||'Découvrez cette action et choisissez comment contribuer.')+'</p>'+
      (c.description?'<p>'+esc(c.description)+'</p>':'')+
      (open||ownerDraft
        ?section('Je crée un document à partager',
          '<p>Donnez un nom à votre document. Nous lui attribuerons automatiquement un numéro et un QR code personnel. Vous pourrez ensuite télécharger un PDF pour le diffuser.</p>'+
          '<label for="copy-title">Nom de mon document</label><input id="copy-title" value="Mon tract" maxlength="160">'+
          '<details><summary>Options facultatives (copie, numéro déjà connu, action précise)</summary>'+
          '<label for="copy-code">Numéro déjà inscrit (sinon, création automatique)</label><input id="copy-code" placeholder="3XX-XXX-XXX">'+
          '<label for="parent-code">Numéro du document dont je fais une nouvelle version</label><input id="parent-code" placeholder="3XX-XXX-XXX">'+
          '<label for="mission-select">Action associée</label><select id="mission-select"><option value="">Sans action particulière</option>'+
            d.missions.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.title)+'</option>').join('')+'</select></details>'+
          '<button id="copy-create">Créer mon document et son QR code</button><div id="copy-msg" role="status"></div>')
        :section('Participation momentanément indisponible',
          c.status==='draft'?'<p>Cette initiative est en préparation. Son organisateur ne l’a pas encore ouverte.</p>':
          '<p>Cette initiative ne reçoit pas de nouveaux documents pour le moment.</p>'))+
      section('Comment aider cette initiative ?',
        d.missions.length?d.missions.map(m=>'<article><h3>'+esc(m.title)+'</h3><p>'+esc(m.description||'Chacun peut contribuer selon ses possibilités.')+'</p></article>').join(''):
        '<p>Vous pouvez déjà créer et diffuser votre document. Aucune autre consigne n’a été publiée par l’organisateur.</p>')+
      section('Où en est cette initiative ?',
        '<p class="note">Les résultats ci-dessous sont indiqués par l’organisateur ; une promesse d’élu n’est pas un parrainage officiellement validé.</p>'+
        '<div id="progress-output" role="status">Chargement…</div>')+
      '<details class="panel action-details" id="gestion"><summary>Je suis organisateur : gérer cette initiative</summary>'+
      '<p>Cette partie est réservée à la personne qui détient la clé privée de gestion.</p>'+
      '<div id="manager-area"></div><div id="admin-result" role="status"></div>'+
      (t?
       '<h3>Ajouter une action proposée aux participants</h3><label for="mtitle">Titre de l’action</label><input id="mtitle" maxlength="140">'+
       '<label for="mdesc">Comment participer ?</label><textarea id="mdesc"></textarea><button id="mission-create">Ajouter cette action</button><div id="mission-msg" role="status"></div>'+
       '<h3>Voir mes modifications les chiffres déclarés</h3><div id="progress-admin"></div><div id="progress-msg" role="status"></div>'
       :'<p>La clé de gestion a été donnée lors de la création de cette initiative.</p>')+
      '</details>';
    const params=new URLSearchParams(location.search);
    if(el('parent-code')&&params.get('parent_code'))el('parent-code').value=params.get('parent_code');
    if(el('copy-create'))el('copy-create').onclick=()=>addCopy(id);
    if(ownerDraft)el('gestion').open=true;
    loadProgress(id,!!t);
    if(t){
      el('manager-area').innerHTML=(c.status==='draft'?'<button id="activate">Ouvrir cette initiative aux participants</button>':'')+
        '<label for="edit-title">Nom de l’initiative</label><input id="edit-title" maxlength="120" value="'+esc(c.title)+'">'+
        '<label for="edit-goal">Objectif</label><textarea id="edit-goal" maxlength="1200">'+esc(c.goal)+'</textarea>'+
        '<label for="edit-description">Présentation</label><textarea id="edit-description" maxlength="3000">'+esc(c.description||'')+'</textarea>'+
        '<button id="save-campaign">Enregistrer mes modifications</button>'+
        (c.status==='active'?'<button class="secondary" id="pause-campaign">Suspendre les nouvelles participations</button>':'')+
        (c.status==='paused'?'<button id="resume-campaign">Rouvrir les participations</button>':'')+
        (['active','paused'].includes(c.status)?'<button class="secondary" id="close-campaign">Clôturer définitivement</button>':'')+
        '<button class="secondary" id="review">Examiner les messages reçus</button>';
      if(el('mission-create'))el('mission-create').onclick=()=>addMission(id);
    }else{
      el('manager-area').innerHTML='<label for="enter-token">Ma clé privée de gestion</label><input id="enter-token" type="password" autocomplete="off"><button id="save-token">Accéder à la gestion</button>';
    }
    if(el('activate'))el('activate').onclick=()=>activate(id);
    if(el('review'))el('review').onclick=()=>review(id);
    if(el('save-campaign'))el('save-campaign').onclick=()=>updateCampaign(id,c.revision,{title:val('edit-title'),goal:val('edit-goal'),description:val('edit-description')});
    if(el('pause-campaign'))el('pause-campaign').onclick=()=>updateCampaign(id,c.revision,{status:'paused'});
    if(el('resume-campaign'))el('resume-campaign').onclick=()=>updateCampaign(id,c.revision,{status:'active'});
    if(el('close-campaign'))el('close-campaign').onclick=()=>{if(confirm('Clôturer définitivement cette initiative ?'))updateCampaign(id,c.revision,{status:'closed'});};
    if(el('save-token'))el('save-token').onclick=()=>{localStorage.setItem('campaign-key-'+id,val('enter-token'));location.reload();};
  }catch(e){app.innerHTML='<h1>Cette initiative est introuvable</h1><p class="error">'+esc(e.message)+'</p><p><a href="'+ROOT+'">Revenir à l’accueil</a></p>';}
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
    el('copy-msg').innerHTML='<div class="output"><strong>Votre document est créé.</strong><p>Son numéro : <strong class="mono">'+esc(d.three_code)+'</strong>. Son QR code vous suivra vers la fiche de ce document.</p><p><a class="button" href="'+ROOT+'/print?copy_id='+encodeURIComponent(d.id)+'">Préparer mon PDF à imprimer</a> <a href="'+ROOT+'/e/'+d.id+'">Voir sa fiche</a></p><details><summary>Ma clé privée pour modifier ce document</summary><p>Conservez cette clé ; elle ne sera pas affichée une seconde fois.</p><textarea readonly id="edit-token"></textarea></details></div>';
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
async function updateCopy(id,revision,changes){
  try{
    await api('/copies/'+id,{method:'PATCH',headers:{
      'x-copy-edit-token':val('copy-edit-key'),
      'x-management-token':val('copy-campaign-key')
    },body:JSON.stringify({expected_revision:revision,...changes})});
    location.reload();
  }catch(e){msg('copy-admin-msg',e.message,true);}
}
async function copyPage(id){
  try{
    const d=await api('/copies/'+id),c=d.copy;
    const details=await api('/campaigns/'+c.campaign_id);
    const campaign=details.campaign;
    app.innerHTML=
      '<p class="eyebrow">Vous avez ouvert un document partagé</p><h1>'+esc(c.title)+'</h1>'+
      '<p class="lead">Ce document renvoie à une initiative : <strong>'+esc(campaign.title)+'</strong>.</p>'+
      '<p>'+esc(campaign.goal||'Découvrez comment y participer librement.')+'</p>'+
      '<p><a class="button" href="'+ROOT+'/campaign/'+encodeURIComponent(c.campaign_id)+'">Découvrir cette initiative</a></p>'+
      section('Reconnaître ce document',
        '<p>Son numéro : <strong class="big-code mono">'+esc(c.three_code)+'</strong></p>'+
        '<img class="qr" src="'+qr(link(id))+'" alt="QR code de ce document">'+
        '<p>En scannant ce QR code, on revient à cette page. Il ne sert pas à identifier les personnes qui lisent le document.</p>'+
        '<details><summary>Référence complète et informations complémentaires</summary>'+
        '<p class="mono smallbreak">'+esc(c.reference)+'</p>'+
        '<p>Document source déclaré : '+esc(c.parent_code||'aucun')+'</p>'+
        '<p>Cette fiche provient d’une déclaration ; elle ne certifie pas l’identité ou le soutien du lecteur.</p></details>')+
      section('Vous souhaitez contribuer ?',
        '<p>Vous pouvez proposer une information, une correction ou un témoignage. Le message ne sera rendu public qu’après examen par l’organisateur.</p>'+
        '<label for="contribution">Votre message</label><textarea id="contribution" maxlength="1000" placeholder="Votre proposition…"></textarea>'+
        '<button id="contribute">Envoyer ma contribution</button><div id="contrib-msg" role="status"></div>')+
      (d.contributions.length?section('Informations publiées',d.contributions.map(x=>'<p>'+esc(x.message)+'</p>').join('')):'')+
      '<details class="panel action-details" id="creators"><summary>J’ai créé ce document : imprimer, confirmer ou modifier</summary>'+
      '<p><a class="button" href="'+ROOT+'/print?copy_id='+encodeURIComponent(id)+'">Préparer mon PDF</a></p>'+
      '<p><a href="'+ROOT+'/?copy_id='+encodeURIComponent(id)+'&three_code='+encodeURIComponent(c.three_code)+'">Confirmer ce document par courriel</a></p>'+
      '<p><a href="'+ROOT+'/campaign/'+encodeURIComponent(c.campaign_id)+'?parent_code='+encodeURIComponent(c.three_code)+'">Créer une nouvelle version de ce document</a></p>'+
      '<h3>Modifier ou retirer cette fiche</h3><p>La clé privée du document ou celle de son organisateur est nécessaire.</p>'+
      '<label for="copy-edit-key">Clé privée du document</label><input type="password" id="copy-edit-key" autocomplete="off">'+
      '<label for="copy-campaign-key">Ou clé de gestion de l’initiative</label><input type="password" id="copy-campaign-key" autocomplete="off">'+
      '<label for="copy-new-title">Nom du document</label><input id="copy-new-title" maxlength="160" value="'+esc(c.title)+'">'+
      '<button id="copy-update">Corriger le nom</button><button class="secondary" id="copy-revoke">Retirer définitivement la fiche</button>'+
      '<div id="copy-admin-msg" role="status"></div></details>';
    el('copy-edit-key').value=localStorage.getItem('copy-edit-'+id)||'';
    el('copy-campaign-key').value=localToken(c.campaign_id);
    el('copy-update').onclick=()=>updateCopy(id,c.revision,{title:val('copy-new-title')});
    el('copy-revoke').onclick=()=>{if(confirm('Retirer définitivement cette fiche ? Sa référence cessera de fonctionner.'))updateCopy(id,c.revision,{status:'revoked'});};
    el('contribute').onclick=async()=>{
      try{
        await api('/contributions',{method:'POST',body:JSON.stringify({copy_id:id,message:val('contribution')})});
        msg('contrib-msg','Votre message a été reçu. Il sera examiné avant une éventuelle publication.');
        el('contribution').value='';
      }catch(e){msg('contrib-msg',e.message,true);}
    };
  }catch(e){
    app.innerHTML='<h1>Ce document n’est pas disponible</h1><p>'+esc(e.message)+'</p><p><a href="'+ROOT+'">Revenir à l’accueil</a></p>';
  }
}
function printPage(){
  const requestedId=new URLSearchParams(location.search).get('copy_id')||'';
  const hasCopy=/^[0-9a-f-]{36}$/.test(requestedId);
  let registeredCopy=null;
  app.innerHTML='<div class="no-print"><h1>Préparer mon tract à imprimer</h1><p id="print-status">Écrivez votre texte, vérifiez le résultat, puis choisissez « Enregistrer en PDF » dans la fenêtre d’impression.</p><div class="grid">'+
  section('Le texte de mon tract','<label for="ptitle">Titre</label><input id="ptitle" value="Une initiative à partager"><label for="pbody">Texte principal</label><textarea id="pbody">Découvrez cette initiative et participez librement.</textarea><details class="print-extra"><summary>Numéro et options avancées (facultatif)</summary><label for="pformat">Présentation du numéro</label><select id="pformat"><option value="blank">Sans numéro personnel</option><option value="child">Avec mon numéro</option><option value="fork">Nouvelle version d’un document</option></select><label for="pchild">Numéro de mon document</label><input id="pchild" placeholder="3XX-XXX-XXX"><label for="pparent">Numéro du document source</label><input id="pparent" placeholder="3XX-XXX-XXX"></details>')+
  section('Mise en page et téléchargement','<label for="plogo">Ajouter un logo (facultatif)</label><input type="file" id="plogo" accept="image/*"><details class="print-extra"><summary>Référence de l’initiative (option avancée)</summary><label for="pcampaign">Code interne de l’initiative (facultatif)</label><input id="pcampaign" placeholder="UUID de campagne"><p class="note">Si vous n’avez pas choisi de document précis, ce QR renvoie simplement vers le service, et non vers un tract personnel.</p><button id="refresh">Voir mes modifications</button><button id="printer">Imprimer ou enregistrer en PDF</button>')+'</div></div><article class="print-design" id="preview"><img id="p-logo" class="mark" alt=""><h1 id="p-title"></h1><p id="p-body"></p><div class="cartridge"><div><strong>RETROUVEZ CE DOCUMENT</strong><p>Numéro : <span id="p-code" class="mono"></span></p><div class="code-line"></div><p id="p-parent-line">Document source : <span class="mono" id="p-parent-code"></span></p><p class="note">Pour une nouvelle version identifiable, demandez un nouveau numéro.</p></div><img id="p-qr" alt="QR commun d’enregistrement"></div><p class="note mono" id="p-reference"></p></article>';
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
    el('p-reference').textContent=registeredCopy?'Référence complète : '+registeredCopy.reference+'':'Brouillon sans référence personnelle : le QR ne désigne pas ce tract.';
    const f=el('plogo').files[0];if(f){const reader=new FileReader();reader.onload=()=>{el('p-logo').src=reader.result;};reader.readAsDataURL(f);}
  };
  el('refresh').onclick=refresh;el('printer').onclick=()=>{refresh();setTimeout(()=>window.print(),200);};
  if(hasCopy){
    el('printer').disabled=true;
    el('print-status').textContent='Préparation de votre document personnalisé…';
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
        el('print-status').textContent='Le QR de ce tract renvoie à sa propre fiche. Référence interne : '+requestedId+'. Une photocopie conserve le même QR. Pour une nouvelle version identifiable, créez un nouveau document.';
        el('printer').disabled=false;
        refresh();
      })
      .catch(e=>{el('print-status').textContent='Ce document n’est pas disponible : '+e.message;el('printer').disabled=true;});
  }else if(requestedId){
    el('print-status').textContent='Le lien vers ce document est invalide : impossible de préparer son PDF personnalisé.';
    el('printer').disabled=true;
  }
  refresh();
}
const p=location.pathname;
if(p.startsWith(ROOT+'/e/'))copyPage(p.split('/').pop());
else if(p.startsWith(ROOT+'/campaign/'))campaign(p.split('/').pop());
else if(p===ROOT+'/print')printPage();
else home();
