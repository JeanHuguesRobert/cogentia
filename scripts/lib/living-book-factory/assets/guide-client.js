(function () {
  var GUIDE_BASE = document.body.getAttribute("data-guide-base") || "https://cogentia.fractavolta.com";
  var GUIDE_PROFILE = document.body.getAttribute("data-guide-profile") || "living-book";
  var GUIDE_TITLE = document.body.getAttribute("data-guide-title") || GUIDE_PROFILE;
  var EXPLORE_RUBRIC = document.body.getAttribute("data-guide-explore-rubric") || "";
  var STORAGE_KEY = GUIDE_PROFILE + "-guide-conversation";
  var OPT_IN_KEY = GUIDE_PROFILE + "-guide-opt-in";
  var IMPORT_KIND = GUIDE_PROFILE + ".guide.local.v1";

  var log = document.getElementById("log");
  var form = document.getElementById("ask");
  var question = document.getElementById("question");
  var draftTo = document.getElementById("draft-to");
  var draftSubject = document.getElementById("draft-subject");
  var draftBody = document.getElementById("draft-body");
  var status = document.getElementById("draft-status");
  var optedIn = false, generation = 0, busy = false, activeController = null;
  try { optedIn = localStorage.getItem(OPT_IN_KEY) === "yes"; } catch (e) {}
  var turns = loadTurns();

  render();
  installBridge();

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      ask(question.value);
    });
  }
  var btnContrib = document.getElementById("prepare-contribution");
  if (btnContrib) {
    btnContrib.addEventListener("click", function () {
      prepare("submit-contribution");
    });
  }
  var btnCorr = document.getElementById("prepare-correction");
  if (btnCorr) {
    btnCorr.addEventListener("click", function () {
      prepare("report-correction");
    });
  }
  var btnCopy = document.getElementById("copy-draft");
  if (btnCopy) btnCopy.addEventListener("click", copyDraft);


  // Shared Living Book Guide. Book-specific copy, scope and editorial frame
  // are injected by the static HTML attributes, not by a second runtime.
  function el(id) { return document.getElementById(id); }
  function on(id, event, fn) { if (el(id)) el(id).addEventListener(event, fn); }
  function notice(id, text) { if (el(id)) el(id).textContent = text; }
  function sanitize(list) {
    if (!Array.isArray(list) || list.length > 500) throw Error("invalid list");
    return list.map(function (t) {
      if (!t || ["user","assistant","external_agent"].indexOf(t.role) < 0 ||
        typeof t.content !== "string" || t.content.length > 15000) throw Error("invalid turn");
      return {role:t.role, content:t.content, mode:t.mode === "explore" ? "explore":"documentary",
        provider:typeof t.provider === "string" ? t.provider.slice(0,80) : "",
        annotation:typeof t.annotation === "string" ? t.annotation.slice(0,2000) : "",
        grounding:["no_profile_sources","sources_available"].indexOf(t.grounding)>=0 ? t.grounding : "not_applicable",
        sourceCount:Number.isInteger(t.sourceCount) ? Math.max(0,Math.min(50,t.sourceCount)) : 0,
        sources:sanitizeSources(t.sources)};
    });
  }
  // Preserve public provenance without trusting URLs from imported transcripts.
  function sanitizeSources(items) {
    if (!Array.isArray(items)) return [];
    return items.slice(0,12).map(function(item) {
      if (!item || typeof item.source_id !== "string" || !item.source_id.trim()) return null;
      var raw = String(item.github_url || item.url || "").slice(0,1200);
      var safe = /^https:\/\/[^\s<>"']+$/i.test(raw) ? raw : "";
      return {
        source_id:item.source_id.slice(0,400),
        title:typeof item.title === "string" ? item.title.slice(0,180) : "",
        url:safe
      };
    }).filter(Boolean);
  }

  function last(role) {
    for (var i=turns.length-1;i>=0;i--) if (turns[i].role === role) return turns[i];
    return null;
  }
  function guideHistory() {
    var list = el("send-guide-history") && el("send-guide-history").checked ?
      turns.filter(function (t) {return t.role==="user"||t.role==="assistant";})
        .map(function (t) {return {role:t.role,content:t.content};}).slice(-20) : [];
    if (el("include-agent") && el("include-agent").checked && last("external_agent")) {
      var pasted=last("external_agent");
      list.push({role:"user",content:"Texte externe non vérifié, collé par le visiteur : " +
        pasted.content + (pasted.annotation?"\nAnnotation : "+pasted.annotation:"")});
    }
    return list;
  }
  function download(name,mime,content) {
    var url=URL.createObjectURL(new Blob([content],{type:mime+";charset=utf-8"}));
    var a=document.createElement("a");
    a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
    notice("continuity-status","Export téléchargé localement.");
  }
  function installBridge() {
    if (el("retain-local")) el("retain-local").checked=optedIn;
    try {
      if (!optedIn && localStorage.getItem(STORAGE_KEY)) {
        notice("continuity-status", "Une conversation locale antérieure existe ici. Activez la conservation pour la retrouver, ou effacez-la explicitement.");
      } else if (!optedIn && typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY)) {
        notice("continuity-status", "Un échange de l'ancien Guide existe dans cet onglet. Activez la conservation pour le reprendre avant de fermer l'onglet, ou effacez-le.");
      }
    } catch (e) {}
    on("retain-local","change",function(){
      optedIn=el("retain-local").checked;
      try {
        if(optedIn) {
          if (!turns.length) {
            var old = localStorage.getItem(STORAGE_KEY);
            var migratedSession = false;
            if (!old && typeof sessionStorage !== "undefined") {
              old = sessionStorage.getItem(STORAGE_KEY);
              migratedSession = Boolean(old);
            }
            if (old) {
              var parsed = JSON.parse(old);
              turns = sanitize(Array.isArray(parsed) ? parsed : parsed.turns);
              render();
            }
            if (migratedSession) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify({kind:IMPORT_KIND,version:1,turns:turns.slice(-100)}));
              if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
            }
          }
          localStorage.setItem(OPT_IN_KEY,"yes");
          saveTurns();
        } else {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(OPT_IN_KEY);
        }
        notice("continuity-status",optedIn?"Conservation locale activée.":"Conservation désactivée.");
      } catch(e) {optedIn=false;el("retain-local").checked=false;notice("continuity-status","Stockage indisponible.");}
    });
    on("export-text","click",function(){
      download(GUIDE_PROFILE + "-guide.txt","text/plain",turns.map(function(t){
        return (t.role==="external_agent"?"Agent externe non vérifié":t.role==="user"?"Visiteur":"Guide") +
          " :\n"+t.content+(t.annotation?"\nAnnotation : "+t.annotation:"");
      }).join("\n\n---\n\n"));
    });
    on("export-json","click",function(){
      download(GUIDE_PROFILE + "-guide.json","application/json",
        JSON.stringify({kind:IMPORT_KIND,version:1,turns:turns},null,2));
    });
    on("import-json","change",function(){
      var f=el("import-json").files&&el("import-json").files[0];
      if(!f)return;
      if(f.size>1048576)return notice("continuity-status","Import refusé : fichier trop volumineux.");
      var reader=new FileReader();
      reader.onload=function(){
        try{
          var data=JSON.parse(reader.result);
          if(data.kind!==IMPORT_KIND||data.version!==1)throw Error("format");
          var incoming=sanitize(data.turns);
          if(!window.confirm("Remplacer cette conversation par celle du fichier ?"))return;
          generation++;if(activeController)activeController.abort();activeController=null;
          busy=false;notice("guide-stream","");turns=incoming;saveTurns();render();
          notice("continuity-status","Conversation importée ; aucune transmission.");
        }catch(e){notice("continuity-status","Import refusé : format ou contenu non valide.");}
      };
      reader.onerror=function(){notice("continuity-status","Fichier illisible.");};
      reader.readAsText(f);
    });
    on("erase-local","click",function(){
      if(!window.confirm("Effacer la conversation et les clés locales le Livre ? Les traces externes et les exports restent indépendants."))return;
      generation++;if(activeController)activeController.abort();activeController=null;
      busy=false;notice("guide-stream","");turns=[];optedIn=false;
      ["question","agent-prompt","agent-reply","agent-note","draft-body","draft-to","draft-subject"].forEach(function(id){
        if(el(id))el(id).value="";
      });
      if(el("retain-local"))el("retain-local").checked=false;
      if(el("include-agent"))el("include-agent").checked=false;
      try{
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(OPT_IN_KEY);
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
        notice("continuity-status",localStorage.getItem(STORAGE_KEY)===null&&
          localStorage.getItem(OPT_IN_KEY)===null?
          "Conversation et clés locales effacées.":"Effacement non vérifié.");
      }catch(e){notice("continuity-status","Effacement local impossible.");}
      render();
    });
    on("cancel-guide","click",function(){
      if(!busy || !activeController)return;
      generation++;activeController.abort();activeController=null;busy=false;
      notice("guide-stream","");
      notice("guide-status","Réponse annulée localement. Le traitement distant peut avoir déjà commencé.");
    });
    on("compose-agent","click",function(){
      var problem=lastUserText()||(question&&question.value.trim());
      if(!problem)return notice("agent-status","Formulez d'abord une question.");
      var prompt=["Analyse indépendante, sans action externe. Distinguez sources, faits, hypothèses, objections et corrections.",
        "Problème du visiteur :\n"+problem];
      if(el("include-guide").checked&&last("assistant")) {
        var selectedGuide=last("assistant");
        prompt.push("Réponse du Guide (non certifiée) :\n"+selectedGuide.content);
        if(selectedGuide.sources&&selectedGuide.sources.length)
          prompt.push("Références publiques indiquées par le Guide (à vérifier) :\n"+
            selectedGuide.sources.map(function(source){
              return source.source_id+(source.url?"\n"+source.url:"");
            }).join("\n"));
      }
      if(el("include-history").checked)
        prompt.push("Historique choisi :\n"+turns.filter(function(t){return t.role!=="external_agent";})
          .map(function(t){return (t.role==="user"?"Visiteur":"Guide")+" : "+t.content;}).join("\n"));
      prompt.push("Proposez plusieurs options à étudier, les faits à contrôler et les conditions de correction. Aucune option n'est adoptée.");
      el("agent-prompt").value=prompt.join("\n\n");
      notice("agent-status","Prompt modifiable, préparé localement sans envoi.");
    });
    on("copy-agent","click",function(){
      var prompt=el("agent-prompt").value;
      if(!prompt.trim())return notice("agent-status","Composez d'abord le prompt.");
      if(navigator.clipboard&&navigator.clipboard.writeText)
        navigator.clipboard.writeText(prompt).then(function(){notice("agent-status","Prompt copié, sans contact externe.");})
          .catch(function(){notice("agent-status","Copie impossible : sélectionnez le texte.");});
      else {el("agent-prompt").focus();el("agent-prompt").select();notice("agent-status","Copiez la sélection manuellement.");}
    });
    on("add-agent-reply","click",function(){
      var content=el("agent-reply").value.trim();
      if(!content)return notice("agent-status","Collez une réponse.");
      turns.push({role:"external_agent",content:content.slice(0,15000),
        provider:(el("agent-name").value.trim()||"Agent personnel").slice(0,80),
        annotation:el("agent-note").value.trim().slice(0,2000)});
      saveTurns();render();el("agent-reply").value="";
      notice("agent-status","Réponse externe conservée séparément, non transmise au Guide.");
    });
  }

  function ask(text) {
    var clean = String(text || "").trim();
    if (!clean || !question || busy) return;
    var history = guideHistory();
    var selected = document.querySelector('input[name="guide-mode"]:checked');
    var explore = selected && selected.value === "explore";
    var remoteQuestion = explore && EXPLORE_RUBRIC ?
      "Explorer ce problème : " + clean + "\n" + EXPLORE_RUBRIC : clean;
    if (remoteQuestion.length > 1200) {
      notice("guide-status","Problème trop long pour le Guide : réduisez votre texte ou utilisez votre agent personnel.");
      return;
    }
    var stamp = ++generation;
    busy = true;
    activeController = typeof AbortController === "function" ? new AbortController() : null;
    var controller = activeController;
    var timedOut = false;
    var watchdog = controller && typeof setTimeout === "function" ?
      setTimeout(function(){timedOut = true; controller.abort();},90000) : null;
    turns.push({role:"user", content:clean, mode:explore ? "explore" : "documentary"});
    saveTurns();
    render();
    question.value = "";
    notice("guide-stream","");
    notice("guide-status","Question transmise au Guide. Recherche des sources publiques...");
    postGuideStream({
      profile: GUIDE_PROFILE, locale: "fr", question: remoteQuestion,
      history: history, stream: true
    }, controller ? controller.signal : undefined, function (event, data) {
      if (stamp !== generation) return;
      if (event === "guide_status" && data.message) notice("guide-status",String(data.message));
      if (event === "guide_retrieval") {
        notice("guide-status",data.source_count ?
          data.source_count + " source(s) publiques sélectionnée(s). Rédaction..." :
          "Aucune source admissible dans ce Livre trouvée : la réponse devra rester hypothétique.");
      }
      if (event === "guide_delta" && typeof data.content === "string") {
        var preview = el("guide-stream");
        if (preview && preview.textContent.length < 24000) preview.textContent += data.content;
      }
    }).then(function (body) {
      if (stamp !== generation) return;
      if (!body || body.ok !== true || !body.answer) throw Error("incomplete_answer");
      var grounded = body.grounding === "no_profile_sources" ? "no_profile_sources" :
        body.sources && body.sources.length ? "sources_available" : "no_profile_sources";
      var sourceCount = Array.isArray(body.sources) ? body.sources.length : 0;
      turns.push({role:"assistant",content:String(body.answer),
        mode:explore ? "explore" : "documentary",grounding:grounded,sourceCount:sourceCount,
        sources:sanitizeSources(body.sources)});
      saveTurns();render();notice("guide-stream","");
      notice("guide-status",grounded === "no_profile_sources" ?
        "Réponse sans source admissible : hypothèses et inconnues à vérifier, non faits établis." :
        "Réponse reçue et sources identifiées. La conservation distante reste à vérifier.");
    }).catch(function () {
      if (stamp !== generation) return;
      notice("guide-stream","");
      notice("guide-status",timedOut ?
        "Délai de 90 secondes dépassé ; réponse interrompue, conservation distante inconnue." :
        "Réponse interrompue ou incomplète. Réessayez ; la conservation distante reste inconnue.");
    }).finally(function () {
      if (watchdog !== null && typeof clearTimeout === "function") clearTimeout(watchdog);
      if (stamp === generation) { busy = false; activeController = null; }
    });
  }

  function prepare(act) {
    var context = lastUserText();
    if (!context) {
      if (status) status.textContent = "Posez d'abord une question ou formulez l'objet de votre observation.";
      return;
    }
    var stamp = generation;
    if (status) status.textContent = "Préparation du brouillon : contexte transmis au service distant. Aucun envoi à un tiers.";
    postJson("/guide/prepare-act", {
      profile: GUIDE_PROFILE,
      act: act,
      locale: "fr",
      context: context,
      history: guideHistory()
    }).then(function (body) {
      if (stamp !== generation) return;
      var draft = body && body.prepared_act;
      if (!draft || draft.executed !== false) {
        if (status) status.textContent = "Préparation non autorisée par le profil.";
        return;
      }
      if (draftTo) draftTo.value = draft.to || "";
      if (draftSubject) draftSubject.value = draft.subject || "[Observation " + GUIDE_TITLE + "]";
      if (draftBody) draftBody.value = draft.body || context;
      if (status) status.textContent = "Brouillon reçu du service distant. Vous pouvez le modifier et le copier, sans envoi automatique.";
    }).catch(function () {
      if (stamp !== generation) return;
      if (draftTo) draftTo.value = "";
      if (draftSubject) draftSubject.value = "[Observation " + GUIDE_TITLE + "] " + context.slice(0, 50);
      if (draftBody) draftBody.value = "Contexte de l'observation :\n" + context + "\n\nTrace ou motif opposable :\n";
      if (status) status.textContent = "Modèle de secours inséré localement.";
    });
  }

  function copyDraft() {
    var text = [
      "Brouillon — non envoyé",
      "Destinataire : " + (draftTo ? draftTo.value : ""),
      "Objet : " + (draftSubject ? draftSubject.value : ""),
      "",
      draftBody ? draftBody.value : ""
    ].join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (status) status.textContent = "Brouillon copié dans le presse-papier.";
      });
    } else {
      if (status) status.textContent = "Veuillez sélectionner le texte pour le copier manuellement.";
    }
  }

  function render() {
    if (!log) return;
    log.innerHTML = "";
    turns.forEach(function (t) {
      var card = document.createElement("div");
      card.className = "msg " + t.role;
      var roleLabel = t.role === "user" ? "Visiteur :" : t.role === "external_agent" ?
        "Agent personnel — réponse externe non vérifiée :" : t.mode === "explore" ?
        "Guide — propositions à étudier :" : "Guide — réponse documentaire :";
      card.innerHTML = "<strong>" + roleLabel + "</strong><p>" + escapeHtml(t.content) + "</p>" +
        (t.provider ? "<small>Agent déclaré : " + escapeHtml(t.provider) + "</small>" : "") +
        (t.annotation ? "<p>Annotation du visiteur : " + escapeHtml(t.annotation) + "</p>" : "") +
        (t.role === "assistant" && t.grounding === "no_profile_sources" ?
          "<small>Aucune source admissible dans ce Livre : hypothèses non vérifiées.</small>" :
          t.role === "assistant" && t.grounding === "sources_available" ?
          "<small>" + (t.sourceCount || 0) + " source(s) publiques référencée(s).</small>" : "");
      if (t.role === "assistant" && t.sources && t.sources.length) {
        var refs=document.createElement("div");
        refs.className="guide-sources";
        var intro=document.createElement("strong");
        intro.textContent="Références publiques du Guide : ";
        refs.appendChild(intro);
        t.sources.forEach(function(source,index) {
          var link=document.createElement(source.url?"a":"span");
          if (source.url) {
            link.href=source.url;
            link.rel="noopener noreferrer";
            link.target="_blank";
          }
          link.textContent=source.title || source.source_id;
          link.title=source.source_id;
          refs.appendChild(link);
          if(index<t.sources.length-1) {
            var separator=document.createElement("span");
            separator.textContent=" · ";
            refs.appendChild(separator);
          }
        });
        card.appendChild(refs);
      }
      log.appendChild(card);
    });
  }

  function loadTurns() {
    try {
      if (!optedIn) return [];
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return sanitize(Array.isArray(parsed) ? parsed : parsed.turns);
    } catch (e) {
      return [];
    }
  }

  function saveTurns() {
    try {
      if (optedIn) localStorage.setItem(STORAGE_KEY, JSON.stringify({kind:IMPORT_KIND,version:1,turns:turns.slice(-100)}));
    } catch (e) {}
  }

  function lastUserText() {
    for (var i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === "user") return turns[i].content;
    }
    return question ? question.value : "";
  }

  // Reuse the Guide's SSE route: bounded framing, one final committed answer,
  // human-visible progress, and no storage of incomplete streamed drafts.
  function postGuideStream(payload, signal, onEvent) {
    return fetch(GUIDE_BASE + "/guide/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json","Accept":"text/event-stream"},
      body:JSON.stringify(payload),
      signal:signal
    }).then(async function (res) {
      if (!res.ok) throw Error("HTTP " + res.status);
      var contentType = res.headers && res.headers.get ? res.headers.get("content-type") || "" : "";
      if (contentType.indexOf("text/event-stream") < 0) return res.json();
      var answer = null, done = false, errored = false, buffer = "";
      function receive(frame) {
        if (!frame.trim()) return;
        var event = "message", lines = [];
        frame.split(/\r?\n/).forEach(function (line) {
          if (line.indexOf("event:") === 0) event = line.slice(6).trim();
          if (line.indexOf("data:") === 0) lines.push(line.slice(5).trim());
        });
        if (!lines.length) return;
        var data = JSON.parse(lines.join("\n"));
        if (event === "guide_error") errored = true;
        if (event === "guide_answer") answer = data;
        if (event === "done") { done = data.ok === true; if (!done) errored = true; }
        onEvent(event,data);
      }
      function parse(value) {
        buffer += value;
        var match;
        while ((match = /\r?\n\r?\n/.exec(buffer))) {
          if (match.index > 65536) throw Error("guide_stream_frame_too_large");
          receive(buffer.slice(0,match.index));
          buffer = buffer.slice(match.index+match[0].length);
        }
        if (buffer.length > 65536) throw Error("guide_stream_frame_too_large");
      }
      if (res.body && res.body.getReader) {
        var reader = res.body.getReader(), decoder = new TextDecoder();
        while (true) {
          var chunk = await reader.read();
          if (chunk.done) break;
          parse(decoder.decode(chunk.value,{stream:true}));
        }
        parse(decoder.decode());
      } else {
        parse(await res.text());
      }
      if (buffer.trim()) receive(buffer);
      if (!done || errored || !answer) throw Error("incomplete_guide_stream");
      return answer;
    });
  }

  function postJson(path, payload) {
    return fetch(GUIDE_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
