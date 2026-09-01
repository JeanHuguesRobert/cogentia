---
title: "Architecture & Manuel : Hosted Browser CDP Session Bridge & Protocoles d'Accès Agents IA"
subtitle: "Symbiose Humain/Machine sur Fracta2 : navigation visuelle (KasmVNC), pilotage programmatique (CDP) et protocoles pour agents autonomes"
author: "Jean Hugues Noël Robert, baron Mariani — Institut Mariani / Cogentia"
date: "2026-09-01"
status: published
corpus_role: source
document_role: operational-guide
document_kind: architecture-note
visibility: public
language: fr
tags:
  - Hosted Browser
  - KasmVNC
  - CDP
  - Chrome DevTools Protocol
  - X / Twitter
  - JHR
  - Suvranu
  - BaronsMariani
  - MCP
  - SOMA
  - DHITL
  - Fracta2
---

# Hosted Browser CDP Session Bridge & Protocoles d'Accès Agents IA

## 1. Vision & Principe d'Accès Symétrique

Le système **Hosted Browser** déployé sur **Fracta2** (`100.108.221.96`) résout l'un des défis majeurs de l'automatisation des réseaux sociaux : **comment permettre à des agents autonomes d'agir au nom d'un utilisateur sans manipuler ni copier-coller manuellement des mots de passe ou des clés d'API coûteuses ?**

La réponse repose sur une architecture à **double surface d'accès symétrique** sur la même instance Chromium :

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         SURFACE HUMAINE : KASMVNC                           │
 │                   (http://100.108.221.96/ ou https://...:8444)              │
 │                                                                             │
 │ • L'humain se connecte visuellement via son navigateur web.                 │
 │ • Il s'authentifie normalement sur X/Twitter, Facebook, ChatGPT.            │
 │ • Le profil persistant est stocké dans ~/.hosted-browser/chromium-profile.  │
 └──────────────────────────────────────┬──────────────────────────────────────┘
                                        │ Même instance Chrome partagée
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                 SURFACE MACHINE : CHROME DEVTOOLS PROTOCOL (CDP)            │
 │                          (ws://127.0.0.1:9223/devtools)                     │
 │                                                                             │
 │ • Les agents (Agent John, Cogentia, scripts Node.js) accèdent au CDP.      │
 │ • Inspection DOM en direct et détection automatique du compte actif.       │
 │ • Bascule programmatique de compte (--switch-to=jhr) via le sélecteur.      │
 │ • Émission directe sous gouvernance stricte DHITL (WhatsApp).               │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Validation Empirique sur Fracta2 (Preuve en Direct)

Le 1er septembre 2026, la chaîne complète a été vérifiée en direct sur le serveur `fracta2` :

### A. Découverte & Bascule Programmatique de Compte (`--switch-to=jhr`)
La sonde CDP a déclenché l'ouverture du sélecteur de compte dans l'interface de X, sélectionné la ligne `@jhr` et synchronisé la session Chrome :
* **Nouveau compte actif vérifié :** `@jhr` (User ID Twitter : `1348141`).

### B. Émission Réelle sur `@jhr`
Le tweet officiel de test a été publié en direct sous la session authentifiée de `@jhr` :
* **Horodatage :** `2026-09-01T14:48:36.949Z` (16:48:36 heure locale)
* **Contenu :** *"Test d'infrastructure de campagne et de souveraineté cognitive. Retrouvez l'ensemble de nos travaux, architectures et corpus ouverts : https://github.com/JeanHuguesRobert"*
* **Statut public :** En ligne sur [https://x.com/jhr](https://x.com/jhr).

---

## 3. Manuel des Commandes CLI

Le contrôleur CDP est disponible via [`scripts/ops/cdp-browser-cli.js`](../scripts/ops/cdp-browser-cli.js) et [`scripts/x-dispatch-cli.js`](../scripts/x-dispatch-cli.js) :

```bash
# 1. Lister les onglets actifs dans le navigateur hébergé
node scripts/ops/cdp-browser-cli.js --tabs

# 2. Inspecter les identités et sessions Twitter actives
node scripts/ops/cdp-browser-cli.js --inspect-sessions

# 3. Basculer le compte actif de manière programmatique
node scripts/ops/cdp-browser-cli.js --switch-to=jhr
node scripts/ops/cdp-browser-cli.js --switch-to=suvranu
node scripts/ops/cdp-browser-cli.js --switch-to=baronsmariani

# 4. Émettre un tweet sous contrôle DHITL
node scripts/x-dispatch-cli.js --account=jhr --text="Mon tweet..."
```

---

## 4. Invariants de Sécurité & Conformité Juridique

1. **Isolement Réseau :** Le port CDP `127.0.0.1:9223` est strictement lié à l'interface de boucle locale ou au maillage Tailscale chiffré. Il n'est **jamais exposé sur l'Internet public**.
2. **Contrôle Humain Inviolable (DHITL) :** Le CDP permet à la machine de préparer les actions, mais **l'ordre d'émission nécessite l'approbation explicite de l'humain** via WhatsApp (`approve ctn_soc_xxx`).
3. **Obligation de Transparence IA (AI Act Art. 50 & Loi SREN) :**  
   - Si validé par Jean-Hugues Robert $\rightarrow$ Publication éditoriale officielle du candidat (exemption Art. 50(4)).
   - Si émis en mode autonome $\rightarrow$ Badge légal transparent obligatoire : `🤖 [Agent John — Publication IA autonome déclarée]`.

---

## 5. Limite Opérationnelle & Contexte Multi-Comptes dans Chromium

### Constat Empirique
Dans une même instance de Google Chrome (partageant le même `--user-data-dir`), **le stockage des cookies est global** :
* Twitter/X ne maintient qu'un seul compte authentifié actif globalement à un instant $T$.
* Toute action d'émission envoyée dans le navigateur s'effectue sur le **compte actuellement sélectionné**.
* Pour émettre sur un autre compte, la sonde CDP exécute d'abord la bascule `--switch-to=<compte>` avant d'injecter la publication.

---

## 6. Par Quels Protocoles un Agent IA Mobilise cette « Capability » ?

Un agent IA (ex: Agent John, Codex, Antigravity) peut mobiliser cette nouvelle capacité d'émission via **3 protocoles standardisés** :

```text
                                PROTOCOLES D'ACCÈS AGENT IA
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[1. PROTOCOLE MCP (Standard)]       [2. SOMA / AGENT GATEWAY (DHITL)]     [3. REST / ONA (:8794)]
• Outil MCP standard :              • Protocole de continuation           • Endpoint JSON-RPC sur
  social_publish_tweet(...)           asynchrone (ctn_soc_xxx)              le maillage Fractanet :
• Utilisé par Claude, Codex,        • Workflow WhatsApp en 1 clic :         POST /api/v1/capabilities/
  Antigravity et clients MCP.         Agent propose → Humain approuve       x-publish
```

### A. Le Protocole MCP (Model Context Protocol) — Le standard universel
L'agent IA interagit avec le serveur MCP de Cogentia qui expose les outils :
* `social_publish_tweet({ account: "jhr" | "suvranu" | "baronsmariani", text: "...", dry_run?: boolean })`
* `social_switch_account({ handle: "jhr" })`

### B. Le Protocole SOMA / Agent Gateway & Paquets Attracteurs (DHITL)
C'est le protocole asynchrone utilisé pour la campagne :
1. L'agent détecte une actualité insulaire et rédige une proposition de cascade.
2. Il émet un paquet `ctn_soc_xxx.json` (`cogentia.x_cascade_relay/v1`).
3. Il notifie le cockpit mobile WhatsApp de Jean-Hugues Robert.
4. Dès réception du message `approve ctn_soc_xxx`, la passerelle Agent Gateway mobilise le CDP de Fracta2 pour publier.

### C. Le Protocole ONA / HTTP Mesh
Les nœuds distants (PC portable, Raspberry Pi, Termux) envoient une simple requête HTTP POST authentifiée par Tailscale sur l'endpoint ONA (`http://100.108.221.96:8794/api/v1/capabilities/x-publish`).
