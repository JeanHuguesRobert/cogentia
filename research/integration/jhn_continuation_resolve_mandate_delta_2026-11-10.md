---
title: "Proposition non émise — delta COP John pour continuation.resolve"
date: 2026-11-10
status: proposed-unissued
document_role: operational
document_kind: mandate-amendment-plan
language: fr
visibility: public
---

# John — proposition d'amendement COP pour la résolution de continuations

**Paquet source :** [cogentia#299](https://github.com/JeanHuguesRobert/cogentia/issues/299). **Prototype associé :** [PR#306](https://github.com/JeanHuguesRobert/cogentia/pull/306), [inseme#111](https://github.com/JeanHuguesRobert/inseme/issues/111), [cogentia#305](https://github.com/JeanHuguesRobert/cogentia/issues/305).

**Statut impératif : proposition seulement.** Ce fichier ne constitue ni `MandateDeclaration`, ni consentement, ni preuve d'une opération. Aucun droit n'est ajouté par sa publication.

## Source d'autorité et version

- Principal : `principal:jhn` ; agent logique : `agent:jhn`.
- Mandat existant à amender : `mandate:jhn:john-root`.
- Source COP actuelle rapportée : `/var/lib/cogentia/cop/john-root-v1.sqlite` sur Fracta2, avec provenance d'émission SSHSIG ; **résoudre à nouveau** le mandat, son issuer, sa version et sa validité immédiatement avant la préparation du challenge.
- Périmètre constaté le 10 novembre : `browser.navigation.instances` et `browser.hosted.inspect`. Cette liste est un constat daté, **pas** une valeur de remplacement figée.
- Utiliser `resolveMandate(store, REF)`, conserver `scope`, `valid_from`, `valid_until`, `forbidden_actions` et obligations en vigueur ; ne jamais copier une version supposée du mandat depuis ce document.
- Delta voulu : ajouter **uniquement** `continuation.resolve` à `scope.allowed_actions` si l'action n'y figure pas et n'est pas expressément interdite. Ne pas ajouter `continuation.return` tant qu'un besoin réel et un contrat séparé ne sont pas démontrés.

## Sémantique et garde-fous de l'action

`continuation.resolve` permet à John de terminer **une continuation déjà réclamée par un handler admissible** dans le flux de résolution canonique ; ce n'est pas une capacité générique de lancer un shell, de changer un mandat, de publier, d'envoyer un email, de communiquer avec un tiers ou de provoquer une opération financière.

Chaque invocation doit porter une identité John authentifiée et reliée à l'instance Supabase `jhn`, le mandat actif et sa version épinglée, le type exact de capacité, un témoin `PacketClaim` valide, une révision attendue du paquet et un identifiant d'idempotence. Le contrôle COP indépendant doit vérifier l'issuer, le Principal, l'agent, la portée et les interdictions **avant** l'effet. Le budget d'exécution doit être effectivement réservé dans le ledger existant avant la résolution, puis soldé ou libéré selon le résultat. Une simple vérification préalable n'est pas une exécution autorisée.

Obligations : conserver provenance du paquet, `claim_id`, handler, référence de mandat/version, réservation et règlement, décision terminale et `result_ref`; journaliser les erreurs et refus sans faux reçu. Préserver les interdictions et obligations antérieures, ainsi que la séparation entre résultat disponible, livré et effectivement consommé par John. Ne jamais considérer `delivery_confirmed:false` comme une restitution réussie.

## Budget et exposition à soumettre

Le code `resolveJohnCopContinuation()` exprime actuellement une demande par défaut `{max_steps:1}` par résolution et requiert un ledger réel avec `reserve/settle/release/snapshot`. **Ce n'est pas une allocation de budget.** Le plafond dur total, la disponibilité du parent et les autres dimensions de coût doivent être lus dans la source canonique et présentés au Principal avant consentement. Aucun plafond numérique global n'est proposé sans cet inventaire : un challenge incomplet ne doit pas être émis.

Conserver la validité temporelle actuelle, sans prolongation automatique ; en cas de durée déjà expirée, produire une proposition distincte et explicite au lieu d'étendre silencieusement la fenêtre.

## Parcours d'émission existant — à réutiliser, non à dupliquer

1. Sur un service de confiance en possession de la source canonique, lire le mandat actuel avec `resolveMandate`, vérifier la provenance, l'état actif et les contraintes/budgets. Construire un objet **complet** `mandate` destiné à `createJhnCanonicalConsentWorkflow().request({mandate})` avec `expected_version` égale à la version effectivement lue ; remplacer seulement la liste des capacités par l'union de l'existant avec `continuation.resolve`.
2. Préparer le challenge versionné par le workflow existant ; obtenir `challenge_id`, `payload_hash`, expiration et proposition exacte. **Request n'accorde aucun droit.** Ne pas écrire un nouveau endpoint d'émission public.
3. Faire présenter l'objet complet au Principal via le canal Supabase JHN existant. `decide({challenge_id,payload_hash,session,decision})` doit revérifier `auth.getUser(jwt)` et `instances.principal_id`. Un texte ChatGPT, un token de service ou un clic non authentifié ne valent pas approbation.
4. Après décision authentifiée favorable, le service protégé appelle `apply({challenge_id,session})`. Vérifier une nouvelle `MandateDeclaration` effective, sa version, son issuer et sa portée ; rejet si ancienne version, révocation, expiration, réponse négative ou challenge consommé. La déclaration est le fait générateur, pas le commentaire GitHub.
5. Seulement ensuite : exécuter un Reality Test de John réel sur un paquet fictif/non sensible, vérifier claim CAS, COP, réservation et règlement, refus avant mandat ou après révocation/replay, puis retour réel à John et consommation distincte. Laisser [PR#306](https://github.com/JeanHuguesRobert/cogentia/pull/306) en Draft jusqu'aux preuves.

## Critères négatifs

Refuser *avant dispatch* si authentification JHN non démontrée, mandat/issuer/version indisponible, capacité interdite/absente, store ou budget inaccessibles, épuisement/concurrence de budget, claim invalide/périmé, révision du paquet changée, rejeu d'intention différente ou révocation. Préserver les règles particulières sur les tiers et sur les secrets ; ne pas rabattre une erreur sur un shell bootstrap.

## État de vérification

La présence des fonctions `createJhnCanonicalConsentWorkflow`, `assessJohnCopAuthority`, `resolveJohnCopContinuation` et `verifyJohnSupabaseRuntimeBinding` est vérifiée **dans le code du dépôt**. Le chemin JHN Supabase → COP → résolution existe à titre de prototype dans la branche de [PR#306](https://github.com/JeanHuguesRobert/cogentia/pull/306). **Aucune lecture directe du store vivant, approbation authentifiée, émission de mandat ou exécution live n'est attestée par ce document.** Une vérification runtime est requise avant émission et avant clôture de #299.
