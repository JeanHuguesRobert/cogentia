// Public, non-partisan participant journey; the code owns no identity or voting data.
const ROOT='/3code';
const HERE=ROOT+'/marche-du-soleil';
const HOWTO=HERE+'/mode-emploi';
const app=document.getElementById('marche-app');
const byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urlParam=k=>new URLSearchParams(location.search).get(k)||'';
const put=(id,message,bad=false)=>{const el=byId(id);if(el){el.textContent=message;el.className=bad?'output error':'output success';}};
const candidates=new Map();
let chosen=null;
let currentCopy=null;
let generated='';
const field=id=>byId(id)?.value?.trim()||'';
async function api(path,body,headers={}){
  const response=await fetch(ROOT+'/api'+path,body===undefined?{headers}:{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Service indisponible : HTTP '+response.status);
  return data;
}
// Rebuild a mailto link from the saved recipient and challenge subject.
// A page reload must not require creating another pending registration.
function showPreparedEmail(rec,restored=false){
  const to=rec?.email_to,subject=rec?.email_subject;
  if(typeof to!=='string'||!/^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(to)||
     typeof subject!=='string'||!/^3Code [0-9a-f-]{36} [0-9A-F]{40}$/.test(subject))return false;
  const node=byId('marche-email-result');
  node.innerHTML='<div class="output"><strong>'+(restored
      ?'Votre courriel est toujours prêt. Rouvrez-le si vous ne l’avez pas encore envoyé.'
      :'Le message est prêt : vous devez l’envoyer vous-même.')+'</strong>'+
    '<p><a class="button" href="'+esc('mailto:'+to+'?subject='+encodeURIComponent(subject))+'">Ouvrir mon application de messagerie</a></p>'+
    '<p>Si ce bouton ne fonctionne pas, envoyez un courriel à <strong>'+esc(to)+
    '</strong> avec exactement cet objet :</p><textarea id="marche-mail-subject" readonly></textarea>'+
    '<p class="note">Le service pourra constater la réception. Il n’envoie aucun message automatiquement.</p></div>';
  byId('marche-mail-subject').value=subject;
  byId('marche-status-check').hidden=false;
  byId('marche-email').disabled=true;
  return true;
}
function optionalLink(href,label){
  if(!href)return '';
  const url=new URL(href);
  if(url.protocol!=='https:')return '';
  return '<a href="'+esc(url.href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';
}
function candidateLinks(c){
  if(!c)return '<p>Vous choisissez librement votre candidature.</p>';
  return '<p><strong>'+esc(c.name)+'</strong> — '+esc(c.movement)+'</p>'+
    '<div class="marche-links">'+optionalLink(c.site,'Site de la candidature ou du mouvement')+
    optionalLink(c.x,c.x_label||'Compte X / Twitter')+'</div>'+
    (c.source_note?'<p class="note">'+esc(c.source_note)+'</p>':'');
}
async function catalog(){
  const data=await api('/marche');
  data.candidates.forEach(c=>candidates.set(c.id,c));
  return data;
}
function startPage(data){
  const options=data.candidates.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
  app.innerHTML=[
    '<p class="eyebrow">Présidentielle 2027 · démarche ouverte et volontaire</p>',
    '<h1>La Marche du Soleil</h1>',
    '<p class="lead">Vous pouvez aider à faire connaître une candidature auprès des élus habilités à la présenter. ',
    'Vous choisissez librement votre candidat. Nous vous donnons un tract et un numéro pour reconnaître votre exemplaire.</p>',
    '<p class="note">Une présentation est décidée et transmise par un élu habilité. Elle ne signifie pas nécessairement qu’il soutient le candidat.</p>',
    '<section class="panel marche-step" id="choix"><span class="marche-number">1</span><h2>Choisissez une candidature</h2>',
    '<label for="marche-candidate">Candidatures et intentions recensées, par ordre alphabétique</label>',
    '<select id="marche-candidate"><option value="">— Choisissez un nom —</option>'+options+'</select>',
    '<div id="marche-candidate-details" class="marche-details" aria-live="polite">',
    '<p>Cette liste rassemble des candidatures déclarées ou envisagées dans des sources publiques ; elle peut évoluer. Elle ne constitue pas la liste officielle des candidats qualifiés.</p></div>',
    '<p class="note">Un nom manque ? <a href="mailto:3code@acorsica.org?subject=Marche%20du%20Soleil%20-%20candidature%20a%20ajouter">Signalez-nous cette candidature</a> avec une source publique.</p></section>',
    '<section class="panel marche-step" id="copie"><span class="marche-number">2</span><h2>Prenez un tract, ou faites-en une copie</h2>',
    '<p>Vous pouvez imprimer notre modèle gratuit. Si vous avez déjà un tract de La Marche du Soleil, faites-en une copie. ',
    'Le nouveau document aura son propre numéro.</p>',
    '<p><a id="marche-template" class="button" href="'+HERE+'/tract">Voir et imprimer le tract par défaut</a></p>',
    '<label class="check-label"><input type="checkbox" id="marche-from-existing"> Je pars d’un exemplaire que j’ai déjà en main.</label>',
    '<div id="marche-parent-panel" hidden><label for="marche-parent">Son 3Code (numéro du document d’origine)</label>',
    '<input id="marche-parent" autocomplete="off" placeholder="3XX-XXX-XXX">',
    '<p class="note">Sur votre nouvelle copie, reportez ce numéro dans le cadre « Numéro de l’exemplaire d’origine ».</p></div></section>',
    '<section class="panel marche-step" id="code"><span class="marche-number">3</span><h2>Donnez un numéro à votre exemplaire</h2>',
    '<p>Créez un numéro personnel, puis écrivez-le dans le cadre « Mon 3Code » du tract que vous venez d’imprimer ou de recopier.</p>',
    '<button id="marche-generate">Créer un 3Code</button>',
    '<p class="marche-code" id="marche-code-result" role="status">—</p>',
    '<label class="check-label"><input type="checkbox" id="marche-copied-code"> J’ai écrit ce numéro sur mon tract.</label>',
    '<p class="note">Un numéro n’identifie votre document qu’après sa déclaration à l’étape suivante. Conservez votre exemplaire.</p></section>',
    '<section class="panel marche-step" id="enregistrer"><span class="marche-number">4</span><h2>Déclarez votre exemplaire et préparez son courriel</h2>',
    '<p>Cette déclaration crée une fiche publique pour le document, pas un compte à votre nom.</p>',
    '<button id="marche-declare">Créer la fiche de mon tract</button>',
    '<div id="marche-declare-result" role="status"></div>',
    '<div id="marche-email-panel" hidden>',
    '<p><a id="marche-copy-link" href="#">Retrouver la fiche de mon document</a></p>',
    '<label class="check-label"><input type="checkbox" id="marche-ack"> Je souhaite confirmer par courriel le numéro et la fiche de ce document. ',
    'La réception de ce message ne prouve ni mon identité, ni une présentation officielle.</label>',
    '<p><button id="marche-email">Préparer mon courriel d’enregistrement</button></p>',
    '<div id="marche-email-result" role="status"></div>',
    '<button id="marche-status-check" class="secondary" hidden>Vérifier la réception du courriel</button>',
    '<p id="marche-registration-status" role="status"></p></div></section>',
    '<section class="panel marche-step" id="agir"><span class="marche-number">5</span><h2>Faites connaître cette candidature à un élu</h2>',
    '<p>Vous pouvez présenter la candidature choisie à un élu habilité, lui communiquer les informations publiées par son équipe et lui demander s’il accepterait de la présenter. La décision lui appartient.</p>',
    '<p><a href="https://www.data.gouv.fr/datasets/repertoire-national-des-elus-1" target="_blank" rel="noopener noreferrer">Consulter le Répertoire national des élus</a></p>',
    '<p class="note">Le site n’envoie aucun courrier aux élus à votre place et ne déduit aucune présentation officielle du nombre de tracts diffusés.</p></section>',
    '<section class="panel"><h2>Besoin d’aide pour comprendre ou agir ?</h2>',
    '<p>Vous pouvez consulter le <a href="'+HOWTO+'">mode d’emploi</a> ou dialoguer avec votre assistant IA habituel. ',
    'Cela n’exige aucun compte Cogentia.</p>',
    '<p><a href="'+ROOT+'/guide#dialogue-a-trois">Le dialogue à trois : vous, votre IA et le service</a></p></section>',
    '<p class="note">Liste informative mise à jour le '+esc(data.updated)+'. ',
    'Des liens officiels et des comptes X sont indiqués lorsqu’ils ont pu être identifiés. ',
    'Les candidatures n’ont pas nécessairement demandé à figurer ici.</p>'
  ].join('');
  byId('marche-candidate').onchange=updateCandidate;
  byId('marche-from-existing').onchange=()=>{byId('marche-parent-panel').hidden=!byId('marche-from-existing').checked;};
  byId('marche-generate').onclick=async()=>{
    try{
      const response=await api('/generate');
      generated=response.code;
      byId('marche-code-result').textContent=generated;
      byId('marche-copied-code').checked=false;
      byId('marche-declare-result').textContent='';
    }catch(e){put('marche-declare-result',e.message,true);}
  };
  byId('marche-declare').onclick=declareCopy;
  byId('marche-email').onclick=prepareEmail;
  byId('marche-status-check').onclick=checkEmail;
  const initial=urlParam('c');
  if(candidates.has(initial)){byId('marche-candidate').value=initial;updateCandidate();}
  const parent=urlParam('origine');
  if(parent){byId('marche-from-existing').checked=true;byId('marche-parent-panel').hidden=false;byId('marche-parent').value=parent;}
  if(!urlParam('nouveau'))restoreCopy().catch(()=>{});
}
function updateCandidate(){
  const id=field('marche-candidate');
  chosen=candidates.get(id)||null;
  byId('marche-candidate-details').innerHTML=candidateLinks(chosen);
  byId('marche-template').href=HERE+'/tract'+(chosen?'?c='+encodeURIComponent(chosen.id):'');
}
async function declareCopy(){
  try{
    if(currentCopy)throw Error('Vous avez déjà créé cette fiche. Préparez maintenant son courriel, ou commencez un autre document en rechargeant la page.');
    if(!chosen)throw Error('Commencez par choisir une candidature.');
    if(!generated)throw Error('Créez d’abord le numéro de votre exemplaire.');
    if(!byId('marche-copied-code').checked)throw Error('Recopiez votre numéro sur le tract avant de poursuivre.');
    let parent_code=null;
    if(byId('marche-from-existing').checked){
      parent_code=field('marche-parent');
      if(!parent_code)throw Error('Indiquez le numéro inscrit sur votre exemplaire d’origine.');
    }
    const response=await api('/marche/documents',{candidate_id:chosen.id,three_code:generated,parent_code});
    currentCopy=response;
    localStorage.setItem('copy-edit-'+response.id,response.edit_token);
    localStorage.setItem('marche-last-document',JSON.stringify({id:response.id,candidate_id:chosen.id,three_code:response.three_code}));
    byId('marche-declare-result').innerHTML='<div class="output success"><strong>Votre exemplaire est déclaré.</strong><p>Code : <strong>'+esc(response.three_code)+'</strong></p>'+
      '<p><a href="'+ROOT+'/e/'+encodeURIComponent(response.id)+'">Voir sa fiche</a></p></div>';
    byId('marche-email-panel').hidden=false;
    byId('marche-copy-link').href=ROOT+'/e/'+encodeURIComponent(response.id);
    byId('marche-declare').disabled=true;
    byId('marche-email-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(e){put('marche-declare-result',e.message,true);}
}
async function restoreCopy(){
  // The visitor often returns from a mail application: restore their
  // document and private view token without creating a duplicate document.
  const raw=localStorage.getItem('marche-last-document');
  if(!raw)return;
  let record;
  try{record=JSON.parse(raw);}catch{return;}
  if(!record?.id||!record.three_code||!record.candidate_id)return;
  const key=localStorage.getItem('copy-edit-'+record.id);
  if(!key)return;
  const saved=await api('/marche/documents/'+encodeURIComponent(record.id));
  if(saved.document.three_code!==record.three_code||saved.candidate.id!==record.candidate_id)return;
  currentCopy={id:record.id,three_code:record.three_code};
  generated=record.three_code;
  chosen=saved.candidate;
  byId('marche-candidate').value=record.candidate_id;
  updateCandidate();
  byId('marche-code-result').textContent=record.three_code;
  byId('marche-copied-code').checked=true;
  if(saved.document.parent_code){
    byId('marche-from-existing').checked=true;
    byId('marche-parent-panel').hidden=false;
    byId('marche-parent').value=saved.document.parent_code;
  }
  byId('marche-declare').disabled=true;
  byId('marche-generate').disabled=true;
  byId('marche-candidate').disabled=true;
  byId('marche-email-panel').hidden=false;
  byId('marche-copy-link').href=ROOT+'/e/'+encodeURIComponent(record.id);
  byId('marche-declare-result').innerHTML='<div class="output success"><strong>Votre dernier tract a été retrouvé.</strong> '+
    '<a href="'+ROOT+'/e/'+encodeURIComponent(record.id)+'">Consulter sa fiche</a>. '+
    'Pour créer un autre exemplaire, ouvrez <a href="'+HERE+'?nouveau=1">une nouvelle page</a>.</div>';
  let existing=null;
  try{existing=JSON.parse(localStorage.getItem('marche-registration-'+record.id)||'null');}catch{}
  if(existing?.id&&existing.view){
    byId('marche-ack').checked=true;
    byId('marche-status-check').hidden=false;
    if(!showPreparedEmail(existing,true)){
      // Earlier releases retained the status token but not the mail subject:
      // a new request is necessary because the one-time challenge is hashed.
      byId('marche-email').textContent='Préparer un nouveau courriel';
      put('marche-email-result','La précédente demande est retrouvée, mais pas son objet de courriel. Vous pouvez en préparer une nouvelle.');
    }
  }
}
async function prepareEmail(){
  try{
    if(!currentCopy)throw Error('Créez d’abord votre fiche.');
    if(!byId('marche-ack').checked)throw Error('Cochez la confirmation de votre choix.');
    const key=localStorage.getItem('copy-edit-'+currentCopy.id);
    if(!key)throw Error('La clé privée de cet exemplaire est introuvable sur cet appareil.');
    const response=await api('/registrations',{
      three_code:currentCopy.three_code,copy_id:currentCopy.id,edit_token:key,pilot_acknowledged:true
    });
    const saved={id:response.id,view:response.view_token,email_to:response.email_to,email_subject:response.email_subject};
    localStorage.setItem('marche-registration-'+currentCopy.id,JSON.stringify(saved));
    if(!showPreparedEmail(saved))throw Error('Le courriel préparé contient une adresse ou un objet invalide.');
  }catch(e){put('marche-email-result',e.message,true);}
}
async function checkEmail(){
  try{
    const raw=localStorage.getItem('marche-registration-'+currentCopy.id);
    const rec=raw?JSON.parse(raw):null;
    if(!rec?.id||!rec.view)throw Error('Aucune demande à vérifier.');
    const response=await api('/registrations/'+encodeURIComponent(rec.id),undefined,{'x-registration-view':rec.view});
    put('marche-registration-status',response.status==='mail_received'?'Le courriel a bien été reçu.':response.status==='expired'?'La demande a expiré.':'Le courriel n’a pas encore été constaté dans la boîte de réception.');
  }catch(e){put('marche-registration-status',e.message,true);}
}
function howtoPage(){
  app.innerHTML=[
    '<p class="eyebrow">À ouvrir depuis le QR code d’un tract</p><h1>Comment utiliser votre tract ?</h1>',
    '<p class="lead">La Marche du Soleil vous propose d’agir librement pour faire connaître une candidature aux élus susceptibles de la présenter à la présidentielle.</p>',
    '<ol class="marche-instructions">',
    '<li><strong>Choisissez un candidat.</strong> La liste des candidatures est accessible sur <a href="'+HERE+'">La Marche du Soleil</a>.</li>',
    '<li><strong>Faites une copie</strong> du tract que vous avez en main, ou imprimez <a href="'+HERE+'/tract">notre modèle</a>.</li>',
    '<li><strong>Créez un nouveau 3Code</strong> sur le site. Écrivez-le dans le cadre « Mon 3Code » de votre nouvelle copie.</li>',
    '<li><strong>Si vous avez copié un tract existant,</strong> recopiez son numéro dans le cadre « 3Code de l’exemplaire d’origine ».</li>',
    '<li><strong>Déclarez votre exemplaire</strong> sur le site, puis ouvrez votre messagerie pour envoyer vous-même le courriel d’enregistrement.</li>',
    '<li><strong>Faites connaître la candidature à un élu habilité</strong> et demandez-lui librement s’il accepterait de la présenter. <a href="https://www.data.gouv.fr/datasets/repertoire-national-des-elus-1" target="_blank" rel="noopener noreferrer">Répertoire national des élus</a>.</li>',
    '</ol>',
    '<p><a class="button" href="'+HERE+'">Je participe à La Marche du Soleil</a></p>',
    '<section class="panel"><h2>À quoi sert le QR code imprimé sur le modèle ?</h2>',
    '<p>Il ouvre ce mode d’emploi commun. Le numéro manuscrit, lui, désigne votre exemplaire une fois déclaré. ',
    'Un QR code recopié ne crée pas automatiquement une nouvelle fiche.</p></section>',
    '<section class="panel"><h2>Ce qu’un parrainage signifie</h2>',
    '<p>Pour être admise à l’élection présidentielle, une candidature doit notamment réunir 500 présentations émanant d’élus habilités. ',
    'Une promesse ou un message citoyen ne remplace pas une présentation officielle. Un élu peut présenter un candidat sans approuver son programme.</p>',
    '<p><a href="https://qpc360.conseil-constitutionnel.fr/2022-03-24/decision-2022-184188-pdr-24-mars-2022" target="_blank" rel="noopener noreferrer">Décision du Conseil constitutionnel sur la présentation des candidats</a></p></section>',
    '<section class="panel"><h2>Vous avez besoin d’explications ?</h2>',
    '<p><a href="'+ROOT+'/guide#dialogue-a-trois">Le dialogue à trois : vous, votre assistant IA et notre service</a></p></section>'
  ].join('');
}
async function printPage(){
  const data=await catalog();
  const candidate=candidates.get(urlParam('c'))||null;
  const own=!!candidate;
  app.innerHTML=[
    '<div class="marche-print-tools"><p><a href="'+HERE+'">Retour à La Marche du Soleil</a></p>',
    '<h1>Le tract à reproduire</h1><p>Imprimez-le ou enregistrez-le en PDF. ',
    'Le QR code mène toujours au mode d’emploi commun. Vous écrirez les numéros de vos exemplaires dans les cadres prévus.</p>',
    '<button id="marche-print">Imprimer ou enregistrer en PDF</button></div>',
    '<article class="marche-tract" id="marche-tract">',
    '<div class="marche-tract-title"><span>LA MARCHE DU SOLEIL</span><span>PRÉSIDENTIELLE 2027</span></div>',
    '<h1>'+esc(candidate?.tract?.title||'Et si chacun pouvait rendre une candidature possible ?')+'</h1>',
    '<p class="marche-tract-lead">Un candidat à la présidentielle doit réunir 500 présentations d’élus habilités. ',
    'Des citoyens peuvent se mobiliser pour faire connaître les candidatures, faciliter les rencontres et informer les élus.</p>',
    '<div class="marche-tract-choice"><strong>Candidature concernée :</strong>',
    '<div class="marche-tract-value">'+esc(candidate?.name||'………………………………………………………')+'</div>',
    '<div class="marche-tract-small">'+esc(candidate?.movement||'Choisie librement par le porteur de ce tract')+'</div></div>',
    '<p class="marche-tract-body">'+esc(candidate?.tract?.message||
      'Vous pouvez recopier ce document, lui donner un numéro propre et le faire circuler. Vous pourrez ensuite déclarer votre exemplaire, en gardant la maîtrise de votre participation. Chaque élu reste libre de sa décision : une présentation ne signifie pas un soutien politique.')+'</p>',
    '<div class="marche-tract-fields">',
    '<div><strong>Mon 3Code</strong><span>3 _ _ – _ _ _ – _ _ _</span></div>',
    '<div><strong>3Code de l’exemplaire d’origine</strong><span>3 _ _ – _ _ _ – _ _ _</span><small>(Laissez vide si vous partez du modèle vierge.)</small></div>',
    '</div>',
    '<div class="marche-tract-bottom"><div><strong>MODE D’EMPLOI</strong>',
    '<p>1. Choisissez une candidature.</p><p>2. Copiez ce tract et inscrivez un nouveau numéro.</p>',
    '<p>3. Déclarez-le et préparez son courriel sur le site.</p>',
    '<p class="marche-tract-url">services.acorsica.org/3code/marche-du-soleil</p></div>',
    '<div class="marche-tract-qr"><img id="marche-qr" src="'+ROOT+'/api/qr?url='+encodeURIComponent('https://services.acorsica.org'+HOWTO)+'" alt="QR code vers le mode d’emploi">',
    '<small>Scannez pour lire le mode d’emploi</small></div></div>',
    '<footer>La Marche du Soleil est une initiative citoyenne transpartisane. Ce document ne constitue ni une présentation officielle ni un soutien présumé du candidat ou de son équipe.</footer>',
    '</article>'
  ].join('');
  byId('marche-print').onclick=()=>window.print();
}
const path=location.pathname;
if(path.endsWith('/mode-emploi'))howtoPage();
else if(path.endsWith('/tract'))printPage().catch(e=>app.textContent='Tract indisponible : '+e.message);
else catalog().then(startPage).catch(e=>app.innerHTML='<h1>Le service ne répond pas</h1><p>'+esc(e.message)+'</p>');
