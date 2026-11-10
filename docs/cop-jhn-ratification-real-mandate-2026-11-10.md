---
title: "COP JHN — ratification authentifiée d'un mandat réel sans extension de droits"
date: 2026-11-10
last_modified_at: 2026-11-10
status: working-paper
document_role: operational
document_kind: technical-note
visibility: public
language: fr
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "docs/cop-consent-production-staging-2026-11-09.md"
  - "docs/cop-supabase-authenticated-consent-2026-11-09.md"
---

# Ratification de mandat existant : un vrai acte sans nouvelle autorité

Le 10/11/2026, le journal COP canonique de Fracta2 contient trois déclarations
JHN (v1), dont `mandate:jhn:john-root` et `mandate:jhn:form-assist`, valides
jusqu'au 06/11/2027, et un mandat de lecture privilégiée très borné, valide
jusqu'au 14/11/2026. La liaison Supabase `instances.principal_id` JHN est
confirmée. Le service `cogentia-jhn-consent.service` est actif, mais son
`COGENTIA_JHN_CONSENT_ENABLE_DECISION=0` interdit les POST. Le relais HTTPS
`https://jhn.baronsmariani.org/api/cop/principal-consent/<uuid>` est en ligne.

## État livré

Un nouveau `workflow.requestRatification({mandate_ref})` lit un **vrai
mandat existant et actif** depuis le journal COP canonique : identifiant,
`version`, identifiant immuable de déclaration, portée effective, date de
validité, agent et Principal. Il crée seulement un événement
`PrincipalConsentRequested` avec l'empreinte SHA-256 et une expiration (600 s).
Cette ratification ne contient **aucune nouvelle version cible**, aucun
grant, ni aucun budget, et la méthode `apply()` refuse explicitement son
type (`ratification_never_grants_mandate`).

`decide()` doit obtenir le token Supabase humain depuis **le navigateur JHN** ;
le backend revalide ce token avec Supabase Auth, vérifie qu'il correspond
exactement au `principal_id` de l'instance JHN, contrôle le hash et le statut
du challenge, puis revérifie que le mandat initial n'a été ni remplacé, ni
révoqué, ni expiré. Le clic confirme ou refuse la **ratification du mandat
existant** ; il émet une trace de décision `PrincipalConsentApproved` ou
`PrincipalConsentRefused`, jamais un nouveau mandat. Une seconde décision
sur le même challenge est refusée.

La CLI commune `cogentia.js` dispose de :

```bash
node scripts/cogentia.js cop consent ratify --mandate mandate:jhn:john-root --json
```

Cette commande est réservée à la session SSH du propriétaire du serveur,
avec accès à la base canonique ; elle génère une URL opaque JHN valable dix
minutes. Elle n'accepte aucun nouveau scope, compte ou identifiant non prévu.
Les autres surfaces d'agent ne doivent jamais appeler ce mode d'émission.

Sur le site Inseme, `/cop/consent/:challengeId` présente désormais
explicitement « Ratification d'un mandat existant » et sa **version actuelle**,
ainsi que les interdictions/budgets conservés. Le bouton d'accord est intitulé
« Ratifier le mandat existant » ; aucun déclenchement d'effet.

## Activation contrôlée

`enable-jhn-consent-decisions.py` a un mode prévisualisation par défaut.
En mode `--apply`, il exige une opération administrateur explicite :

- ajoute une surcharge systemd `COGENTIA_JHN_CONSENT_ENABLE_DECISION=1`,
- redémarre le service existant et vérifie son état,
- confirme l'absence de dérogation aux GET anonymes (`401`),
- n'expose toujours que GET/POST de revue/décision ; aucune route `apply()`.

Cette activation n'est pas encore accomplie au moment de la publication du
présent code. **La création d'un challenge de revue nécessite ensuite une
commande SSH distincte**, regroupable avec l'activation dans une unique
session propriétaire ; n'envoyer aucun jeton Supabase dans le terminal ni
dans ChatGPT.

## Recette d'acceptation

1. Activation root selon l'acte explicite du propriétaire ; vérifier POST
   anonyme interdit et refus des tokens incorrects.
2. CLI propriétaire : demander la ratification réelle de `john-root` v1,
   sans extension ni mandat nouveau ; enregistrer l'URL/empreinte.
3. Principal : ouvrir l'URL et se connecter à Supabase si besoin, vérifier
   identifiant/version/scope/hash, exprimer une décision.
4. Relire les événements COP : request + un événement de décision ;
   `MandateDeclaration` doit rester à 3, la version `john-root` à v1 et
   aucun grant/budget/effet supplémentaire ne doit apparaître.
5. Tester le refus d'un deuxième clic et d'une autre identité.

Le fait que le Principal approuve le mandat existant ne remplace pas une
nouvelle demande **amendement exact** pour modifier des pouvoirs. Le pont
d'amendement est codé, mais sa mise en émission réelle reste distincte et
nécessite une vérification transactionnelle des fonds/versions/autorités.

## Commande propriétaire unique, avec garde-fou de déploiement

La commande suivante regroupe la prévalidation de l'interface, l'activation
administrative contrôlée des seules **décisions**, puis la préparation d'une
revue de `john-root` v1 (dix minutes) :

```powershell
ssh -tt fracta2 'bash /srv/cogentia/repos/cogentia/scripts/ops/consent-deploy/prepare-jhn-ratification.sh'
```

Le script source `prepare-jhn-ratification.sh` vérifie **avant le sudo**
que le bundle JS réellement servi par `https://jhn.baronsmariani.org`
contient l'interface explicite « Ratifier le mandat existant ». Si ce n'est
pas le cas, il s'arrête **sans activer l'enregistrement et sans écrire dans
le journal COP**. Il exige ensuite SSH + TTY et délègue l'activation exacte à
`enable-jhn-consent-decisions.py --apply`, avant de créer seulement une
requête de ratification sur le mandat réel. Aucun jeton Supabase n'est
transmis dans le terminal, l'URL ne contient qu'un UUID opaque. Le Principal
ouvre cette URL et décide dans sa propre session Supabase.

La vérification locale du 10 novembre a précisément observé que l'ancien
bundle était encore servi ; le script a refusé et le journal est resté à
36 événements, 3 déclarations et 0 événements de consentement.
