---
title: "FBF #299 — délégation permanente JHN, séparation de l'exécuteur Unix et effets techniques sémantiques"
date: "2026-11-15"
last_modified_at: "2026-11-15"
document_role: operational
document_kind: integration-runbook
visibility: public
language: fr
status: "historical — Museum-specific MCP tools removed; general host-process route retained"
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "instructions/AGENTS.shared.md"
  - "research/optimistic_mainline_governance.md"
  - "docs/cop-jhn-ratification-real-mandate-2026-11-10.md"
---

# FBF #299 — un mandat permanent, plusieurs effets imputés

> **Rectification architecturale FBF du 15 novembre 2026 (décision du Principal).**
> Les outils `cogentia_dns_record_ensure({site:"museum"})` et
> `cogentia_site_static_release({site:"museum"})` ont été effectivement
> implémentés et déployés, mais leur découpage constitue une **erreur de
> conception** : l'administration d'un nœud Fractanet est une capacité
> générale existante, pas une infinité de capacités créées par site,
> domaine, version ou incident. Ne pas reproduire ce modèle.
> La bonne base est `host.process.run` (`normal`/`super`), les accès
> fichiers et fournisseurs hôtes existants, FractaRouting/FractaHandlers,
> des recettes/manifestes paramétrés, ainsi que COP pour la portée et la
> traçabilité. Conserver les améliorations utiles d'isolation Unix, de
> preuve des effets et d'idempotence, mais **réabsorber les deux outils
> spécialisés dans le flux générique d'administration des machines**.
> **Correction déployée :** commit `f53640e4`, les deux noms MCP et
> leurs cinq modules/fichiers spécialisés sont supprimés. L'exception
> `sudo` root et les exécutables locaux propres au Musée sont retirés,
> sans toucher au site, à son DNS ni au script général Operium.
> Le serveur MCP a été redémarré : catalogue épuré, `host.process.run`
> général présent et testé sous v4 pour les diagnostics Unix/Windows.
> **Autorité restante :** le profil général `host.process-general/v1`
> exige une seule approbation canonique v4→v5 de la délégation permanente,
> elle ne peut pas être activée par simple modification du code. Le mode
> `super` conserve son admission propre jusqu'à vérification explicite.


## Cause et résolution

Le mandat canonique `mandate:jhn:john-root` a été amendé **v3 → v4** à la suite
du consentement Supabase Auth réel du Principal le 15/11/2026. Le journal
`/var/lib/cogentia/cop/john-root-v1.sqlite` contient le triplet
`PrincipalConsentRequested`, `PrincipalConsentApproved`,
`PrincipalConsentConsumed` et la déclaration **v4 active**. Les interdictions
d'envoi, d'engagement, de divulgation sensible et de suppression irréversible
ont été préservées, comme la durée et la dotation initiale du budget
`budget:mandate:jhn:john-root` de 2 048 étapes.

Le MCP reconnaît l'autorité attestée de la session JHN, lit la déclaration
signée et son profil technique **à chaque invocation**, réserve un pas du
budget canonique, vérifie la révocation avant l'appel au provider et règle ou
libère la réservation selon que l'effet a été tenté. Il ne réclame aucun
nouveau mandat humain par commande. Les reçus sont attribués à la déclaration
v4 et à l'idempotence du journal COP.

## 1. Correction Unix, effective

Avant : `mcp-cogentia.service` (`ubuntu`) et journal canonique COP
(`ubuntu:ubuntu 0600`) étaient sous le même UID. Le garde
`unix_process_cop_store_writable_by_executor` refusait à juste titre toute
commande Unix générique.

Maintenant : installation propriétaire d'un compte local
`cogentia-effect` **sans ouverture de session et sans droits sur le journal**,
puis d'une entrée sudoers limitée à l'exécution de `/bin/sh` **uniquement
sous cet utilisateur moins privilégié**, sans élévation root. Le routeur MCP
teste l'UID effectif, les groupes et les droits réels via cette même voie
d'exécution avant chaque effet ; une politique ou un compte inconnu est
refusé. La session/process group conserve le timeout et l'arrêt des enfants.

**Test réel de la capacité connectée** :
`cogentia_host_process_run({command:"hostname",provider:"unix-process",target:"node:fracta2"})`
a renvoyé `fracta2`, `identity.user:cogentia-effect`,
`authority_origin:verified_mission` et `accounting_complete:true`.
La commande composée `hostname; echo MUST_NOT_RUN` a été refusée avant
exécution. L'ancien parcours Windows a également été testé sans
autorisation par acte et avec règlement canonique.

Sources : `scripts/lib/unix-process-cop-custody.js`,
`unix-process-provider.js`, `host-capability-router.js`,
`scripts/ops/install-isolated-unix-effecter.sh`.

## 2. Effets techniques sémantiques, déployés

Le MCP annonce maintenant :
- `cogentia_dns_record_ensure({site:"museum"})` — capacité COP
  `dns.record.ensure` ; **une seule cible initiale**, CNAME
  `museum.baronsmariani.org → fracta.fractavolta.com`, DNS-only.
- `cogentia_site_static_release({site:"museum"})` — capacité COP
  `site.static.release` ; **une seule projection initiale**, dépôt
  `JeanHuguesRobert/barons-Mariani`, révision immuable
  `f7f8ef131b5fc81d5a68e11cb404e886ad865861`.

Les entrées n'acceptent ni shell, ni FQDN libre, ni changement NS/MX, ni
révision arbitrary. Le résolveur d'autorité reconnaît ces types seulement
s'ils concordent avec la politique **effectivement signée en v4** ;
la présence d'une capacité dans la portée générale ne suffit pas.

La couche fournisseur DNS réutilise le provisionneur Cloudflare existant
d'Operium, épinglé par SHA-256. Ses clés restent exclusivement sur le
ThinkPad opérateur ; un `ensure` déjà satisfait vérifie les deux serveurs
Cloudflare faisant autorité et n'effectue aucune écriture. Une divergence
conflictuelle est refusée avant l'API. Une création absente emprunterait le
provider épinglé, puis exigerait une nouvelle lecture DNS indépendante.

La publication statique vérifie d'abord le lien `current`, la révision
immuable et le site HTTPS/Boutique. Une mise à jour requise est limitée à
un assistant root-owned sous
`/usr/local/libexec/cogentia/museum-static-release`, sans argument,
desservi par **une seule** commande sudoers. L'assistant exécute uniquement
le script Operium épinglé et protégé sous root, avec relecture et retour
arrière. Aucune entrée libre du modèle ne peut être exécutée sous root.

**FBF d'idempotence dans Operium :** le fournisseur de publication a été
corrigé : lorsque la version publiée, les fichiers appartenant à root, les
deux fragments Caddy, le contrôle local et HTTPS sont conformes, il renvoie
immédiatement `UNCHANGED=PASS`, **sans télécharger huit pages ni recharger
Caddy**. L'exécuteur root-owned a été remis à jour de façon atomique et
testé par le canal propriétaire ; reçu effectif
`UNCHANGED=PASS ... HTTPS=200 CERT=VALID CADDY_NOT_RELOADED`.

**Vérifications indépendantes** : les deux serveurs DNS Cloudflare répondent
avec le CNAME prévu ; la version du site et la Boutique sont en ligne
(200, certificat valide). Les régressions contrôlées sur Suicide Corse,
Rise & Fall et Capable renvoient toutes 200 / certificat valide.

Sources : `scripts/lib/john-standing-technical-effects.js`,
`john-standing-technical-providers.js`,
`cogentia-mcp-standing-mission-runtime.js`,
`cogentia-mcp-core.js`,
`scripts/ops/install-museum-semantic-release.sh`,
et [Operium](https://github.com/JeanHuguesRobert/operium/blob/main/scripts/ops/publish-museum-static.sh).

## 3. Tests et niveau de preuve

**65 tests** de régression ciblés réussis, aucun échec (15/11/2026) :
mandat signé, falsification d'identité, portée et cible, révocation avant
dispatch, budget, admission des deux effets sémantiques, refus des
commandes arbitraires, conflits DNS, idempotence, source épinglée,
isolement de l'UID Unix et compatibilité des capacités précédentes.

- Unix : **advertised / reachable / authorized / tested : oui**, appel réel
  du connecteur MCP, identité Unix distincte et règlement COP attestés.
- DNS/site : **advertised : oui** (catalogue MCP), **provider reachable :
  oui** (read-back réel), **policy and budget enforcement : vérifiés en tests
  de stockage COP jetable**, **real connector invocation : non encore
  attestée depuis cette conversation**. Les deux nouveaux outils ne
  figurent pas encore dans le schéma du connecteur attaché à la session
  ChatGPT déjà ouverte, même s'ils sont présents dans le catalogue du
  serveur MCP redémarré. Ne pas présenter la vérification directe des
  fournisseurs comme un appel sémantique complet admis par COP.

Restent à valider au prochain accès du schéma de connecteur actualisé :
1. un appel `cogentia_dns_record_ensure({site:"museum"})` avec résultat
   `changed:false`, preuve d'autorité v4 et `cop_spend` canonique ;
2. un appel `cogentia_site_static_release({site:"museum"})` avec
   `changed:false`, HTTPS 200, même comptabilisation ;
3. vérifier le rejet du `site` inconnu et l'absence de consommation
   de budget pour les refus.

**Ne pas émettre de nouveau mandat permanent ou ponctuel pour ces
vérifications.** Étendre les cibles de la registry du provider par le
workflow code/test/deploy existant lorsque nécessaire, sous les limites
du mandat v4, plutôt qu'élargir le shell.
