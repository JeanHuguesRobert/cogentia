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
  app.innerHTML='<h1>Une référence, une mission, des exemplaires uniques</h1><p class="lead">Générez un 3Code gratuitement, créez une campagne contributive, individualisez un tract photocopié ou un objet et faites revenir une contribution. Accessible à toutes les initiatives, y compris aux différents candidats, sans adhésion politique.</p><div class="grid">'+
  section('Générateur 3Code','<p>3 + huit caractères Crockford, générés localement. Les collisions sont permises. Un code non enregistré ne pointe vers rien.</p><button id="gen">Générer</button><div id="generated" class="output mono">—</div>')+
  section('Retrouver une référence','<label for="lookup">3Code manuscrit ou imprimé</label><input id="lookup" placeholder="3XY-Z89-P2K" autocomplete="off"><button id="lookup-btn">Rechercher</button><div id="found"></div>')+
  section('Créer une campagne','<p>Sans compte obligatoire. Vous recevrez une clé de gestion privée : conservez-la.</p><label for="newtitle">Titre</label><input id="newtitle" maxlength="120" placeholder="Inventaire des moulins"><label for="newgoal">Objectif et méthode</label><textarea id="newgoal" maxlength="1200"></textarea><button id="create">Créer ma campagne</button><div id="created"></div>')+
  section('Tracts, affiches et photocopies','<p>Personnalisez texte, logo, QR commun et cartouche manuscrit pour chaque exemplaire. Un QR du document maître ne désigne jamais automatiquement un enfant.</p><a class="button" href="/3code/print">Ouvrir le compositeur</a><p class="note">Les exemplaires peuvent être des feuilles, textiles, livres ou objets. Le porteur n’est pas identifié.</p>')+'</div><p class="note">Projet de service d’intérêt général. Toute campagne est sous la responsabilité de son initiateur ; les engagements et résultats ne se déduisent jamais d’un scan.</p>';
  el('gen').onclick=()=>el('generated').textContent=code()+' — non enregistré';
  el('lookup-btn').onclick=lookup;
  el('create').onclick=createCampaign;
}
async function lookup(){
  try{
    const d=await api('/resolve?code='+encodeURIComponent(val('lookup')));
    const found=el('found');found.innerHTML='<p>'+d.results.length+' enregistrement(s) ; ambiguïté : '+(d.ambiguous?'oui':'non')+'.</p>'+d.results.map(x=>row('<a href="'+ROOT+'/e/'+encodeURIComponent(x.id)+'">'+esc(x.title)+'</a> — '+esc(x.three_code)+' (déclaration non vérifiée)')).join('');
  }catch(e){msg('found',e.message,true);}
}
async function createCampaign(){
  try{
    const d=await api('/campaigns',{method:'POST',body:JSON.stringify({title:val('newtitle'),goal:val('newgoal')})});
    localStorage.setItem('campaign-key-'+d.id,d.management_token);
    el('created').innerHTML='<div class="output"><strong>Campagne créée (brouillon).</strong><p>Clé de gestion à sauvegarder ; ne pas diffuser :</p><textarea id="owner-secret" readonly></textarea><p><a href="'+ROOT+'/campaign/'+d.id+'">Gérer la campagne</a></p></div>';
    el('owner-secret').value=d.management_token;
  }catch(e){msg('created',e.message,true);}
}
async function campaign(id){
  try{
    const d=await api('/campaigns/'+encodeURIComponent(id)),c=d.campaign;
    app.innerHTML='<h1>'+esc(c.title)+'</h1><p class="lead">'+esc(c.goal)+'</p><span class="pill">'+esc(c.status)+'</span><p class="note">Campagne auto-déclarée : son titre et son statut ne prouvent aucun agrément.</p>'+
    section('Missions contributives','<div id="missions">'+d.missions.map(m=>row('<strong>'+esc(m.title)+'</strong> — '+esc(m.description))).join('')+'</div><div class="manager"><label for="mtitle">Nouvelle mission</label><input id="mtitle" maxlength="140"><label for="mdesc">Description</label><textarea id="mdesc"></textarea><button id="mission-create">Ajouter la mission</button><div id="mission-msg"></div></div>')+
    section('Enregistrer un exemplaire ou une photocopie','<p>Un nouvel exemplaire reçoit un ID technique propre et un nouveau 3Code. En cas de photocopie, renseignez l’ancien exemplaire ou son 3Code.</p><label for="copy-title">Type et description</label><input id="copy-title" placeholder="Tract N&B, affiche, Bleu de Chine…" maxlength="160"><label for="copy-code">3Code manuscrit (facultatif)</label><input id="copy-code" placeholder="Laisser vide pour génération"><label for="parent-code">3Code du parent (facultatif)</label><input id="parent-code" placeholder="3XX-XXX-XXX"><label for="mission-select">Mission (facultative)</label><select id="mission-select"><option value="">Aucune</option>'+d.missions.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.title)+'</option>').join('')+'</select><button id="copy-create">Enregistrer cette copie</button><div id="copy-msg"></div>')+
    section('Gestion de campagne','<p>La clé de gestion reste sur votre appareil. Pas de compte obligatoire.</p><div id="manager-area"></div><div id="admin-result"></div>')+
    '<p class="note">ID de campagne : <span class="mono">'+esc(id)+'</span>. Les contributions sont en attente de validation avant publication.</p>';
    const params=new URLSearchParams(location.search);if(params.get('parent_code'))el('parent-code').value=params.get('parent_code');
    el('mission-create').onclick=()=>addMission(id);
    el('copy-create').onclick=()=>addCopy(id);
    const t=localToken(id);
    if(t)el('manager-area').innerHTML=(c.status==='draft'?'<button id="activate">Activer la campagne</button>':'')+'<button class="secondary" id="review">Voir les contributions en attente</button>';
    else el('manager-area').innerHTML='<label for="enter-token">Clé de gestion</label><input id="enter-token" type="password"><button id="save-token">Utiliser cette clé</button>';
    if(el('activate'))el('activate').onclick=()=>activate(id);
    if(el('review'))el('review').onclick=()=>review(id);
    if(el('save-token'))el('save-token').onclick=()=>{localStorage.setItem('campaign-key-'+id,val('enter-token'));location.reload();};
  }catch(e){app.innerHTML='<h1>Campagne indisponible</h1><p class="error">'+esc(e.message)+'</p>';}
}
async function activate(id){
  if(!confirm('Rendre cette campagne visible dans l’annuaire public ?'))return;
  try{await api('/campaigns/'+id+'/activate',{method:'POST',headers:{'x-management-token':localToken(id)},body:'{}'});location.reload();}
  catch(e){msg('admin-result',e.message,true);}
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
    el('copy-msg').innerHTML='<div class="output"><strong>Exemplaire enregistré.</strong><p>3Code : <strong class="mono">'+esc(d.three_code)+'</strong></p><p>Parent : '+esc(d.parent_code||'aucun')+'</p><p><a href="'+ROOT+'/e/'+d.id+'">Fiche de cet exemplaire</a></p><p>La clé de modification n’est présentée qu’une fois :</p><textarea readonly id="edit-token"></textarea></div>';
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
    app.innerHTML='<h1>Exemplaire singulier</h1><section class="panel"><p class="big-code mono">'+esc(c.three_code)+'</p><p>'+esc(c.title)+'</p><p><strong>Parent déclaré :</strong> '+esc(c.parent_code||'aucun')+'</p><p><strong>Statut :</strong> '+esc(c.relation_status)+'</p><img class="qr" src="'+qr(link(id))+'" alt="QR individuel de l’exemplaire"><p class="mono">'+esc(link(id))+'</p><p class="note">Ce QR peut être photocopié mais continue à désigner ce même exemplaire. Il ne prouve ni la possession ni un soutien politique.</p><p><a class="button" href="'+ROOT+'/campaign/'+encodeURIComponent(c.campaign_id)+'?parent_code='+encodeURIComponent(c.three_code)+'">J’ai photocopié cet exemplaire : déclarer un enfant</a></p></section>'+
      section('Contribuer librement','<p>Les contributions ne sont pas publiées sans validation de l’organisateur.</p><label for="contribution">Information, correction, témoignage ou résultat</label><textarea id="contribution" maxlength="1000"></textarea><button id="contribute">Soumettre une contribution</button><div id="contrib-msg"></div>')+
      section('Contributions publiées',d.contributions.map(x=>'<p>'+esc(x.message)+'</p>').join('')||'<p>Pas encore de contribution publiée.</p>');
    el('contribute').onclick=async()=>{try{await api('/contributions',{method:'POST',body:JSON.stringify({copy_id:id,message:val('contribution')})});msg('contrib-msg','Contribution reçue, en attente de qualification.');el('contribution').value='';}catch(e){msg('contrib-msg',e.message,true);}};
  }catch(e){app.innerHTML='<h1>Exemplaire introuvable</h1><p class="error">'+esc(e.message)+'</p>';}
}
function printPage(){
  app.innerHTML='<div class="no-print"><h1>Compositeur de tract / affiche</h1><p>Le modèle reste reproductible par photocopie. Ajoutez ensuite un 3Code unique manuscrit à chaque nouvelle copie.</p><div class="grid">'+
  section('Texte et format','<label for="ptitle">Titre</label><input id="ptitle" value="Campagne contributive"><label for="pbody">Texte principal</label><textarea id="pbody">Un objet, une mission, une contribution volontaire. Découvrez la campagne et créez votre propre exemplaire.</textarea><label for="pformat">Cartouche</label><select id="pformat"><option value="blank">Manuscrit vierge</option><option value="child">3Code individuel</option><option value="fork">Photocopie / fork</option></select><label for="pchild">3Code enfant</label><input id="pchild" placeholder="3XX-XXX-XXX"><label for="pparent">3Code parent</label><input id="pparent" placeholder="3XX-XXX-XXX"></label>')+
  section('Logo et QR commun','<label for="plogo">Logo (fichier local, sans transfert)</label><input type="file" id="plogo" accept="image/*"><label for="pcampaign">Identifiant de campagne (facultatif)</label><input id="pcampaign" placeholder="UUID de campagne"><p class="note">Le QR commun ouvre la campagne ou l’accueil. Il ne désigne pas un exemplaire.</p><button id="refresh">Actualiser</button><button id="printer">Imprimer / enregistrer en PDF</button>')+'</div></div><article class="print-design" id="preview"><img id="p-logo" class="mark" alt=""><h1 id="p-title"></h1><p id="p-body"></p><div class="cartridge"><div><strong>EXEMPLAIRE SINGULIER</strong><p>3Code : <span id="p-code" class="mono"></span></p><div class="code-line"></div><p id="p-parent-line">Parent : <span class="mono" id="p-parent-code"></span></p><p class="note">Inscrire un nouveau 3Code pour chaque photocopie. La filiation est déclarative.</p></div><img id="p-qr" alt="QR commun d’enregistrement"></div></article>';
  const refresh=()=>{
    el('p-title').textContent=val('ptitle');
    el('p-body').textContent=val('pbody');
    el('p-code').textContent=el('pformat').value==='blank'?'________________':val('pchild')||'________________';
    el('p-parent-code').textContent=val('pparent')||'________________';
    el('p-parent-line').classList.toggle('hidden',el('pformat').value!=='fork');
    const campaign=val('pcampaign');
    const url=location.origin+ROOT+(campaign?'/campaign/'+encodeURIComponent(campaign):'');
    el('p-qr').src=qr(url);
    const f=el('plogo').files[0];if(f){const reader=new FileReader();reader.onload=()=>{el('p-logo').src=reader.result;};reader.readAsDataURL(f);}
  };
  el('refresh').onclick=refresh;el('printer').onclick=()=>{refresh();setTimeout(()=>window.print(),200);};
  refresh();
}
const p=location.pathname;
if(p.startsWith(ROOT+'/e/'))copyPage(p.split('/').pop());
else if(p.startsWith(ROOT+'/campaign/'))campaign(p.split('/').pop());
else if(p===ROOT+'/print')printPage();
else home();
