const U='/3code';
const textarea=document.getElementById('ai-prompt');
const feedback=document.getElementById('copy-ai-result');
async function init() {
  try {
    const r=await fetch(U+'/assistant.fr.txt',{credentials:'omit'});
    if(!r.ok)throw Error('Prompt not found');
    textarea.value=await r.text();
  } catch {
    textarea.value='Ouvrez https://services.acorsica.org/3code/assistant.fr.txt et copiez les instructions dans votre assistant.';
  }
  try {
    const r=await fetch(U+'/api/registrations/config',{credentials:'omit'});
    if(!r.ok)throw Error('Status unavailable');
    const d=await r.json();
    document.getElementById('guide-mail-status').textContent=d.enabled
      ? 'Boîte configurée : '+d.inbox+'. Vous expédiez vous-même votre courriel ; aucun envoi n’est automatique.'
      : 'L’enregistrement par courriel n’est pas encore activé : aucune boîte dédiée n’est configurée. La génération et la déclaration restent possibles.';
  } catch {
    document.getElementById('guide-mail-status').textContent='Configuration de réception non vérifiable actuellement.';
  }
}
document.getElementById('copy-ai-prompt').onclick=async()=>{
  try {
    await navigator.clipboard.writeText(textarea.value);
    feedback.textContent='Instructions copiées.';
  } catch {
    textarea.focus();textarea.select();
    feedback.textContent='Texte sélectionné : utilisez la fonction Copier.';
  }
};
init();
