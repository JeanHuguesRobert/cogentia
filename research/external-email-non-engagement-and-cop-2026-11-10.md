---
title: External AI-authored email, non-engagement notices and COP semantic gating
subtitle: Separate drafting, legal commitment, apparent authority and sending
lang: fr
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A.
date: '2026-11-10'
last_modified_at: '2026-11-10'
version: '0.1'
status: working-paper
document_role: operational
document_kind: research-paper
visibility: public
lifecycle_state: working
language: fr
license: CC BY-SA 4.0
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/external-email-non-engagement-and-cop-2026-11-10.md
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: principal_instruction
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 2026-11-10 discussion on external Twin email and juridical commitment
  origin_date: '2026-11-10'
  derived_from:
    - research/federated_twin_interagent_mail.md
review:
  status: unreviewed
  reviewed_by: []
---

# Courriel externe rédigé par IA : non-engagement, représentation et contrôle COP

## Invariant du Principal

« Ce qui se passe à l’intérieur d’un Twin reste à l’intérieur d’un Twin. » Tout email adressé hors du périmètre du Twin constitue un acte externe susceptible de produire des effets, indépendamment de la rédaction humaine ou automatique. Le destinataire peut légitimement ignorer le mode de production du message. L'expédition par le compte usuel du Principal est particulièrement susceptible d'être imputée à celui-ci. La mention d'une IA ne suffit pas à exonérer le Principal ni à exclure tout effet juridique.

**Règle actuelle propre à JHN : aucun email engageant le Principal envers un tiers ne doit être envoyé sans autorisation explicite et spécifique à l'envoi, même avec préambule.** Par défaut : brouillon, contrôle et envoi manuel. Les notifications adressées au seul Principal, sous politique explicitement bornée, sont un cas distinct. Le préambule n'octroie aucune permission d'expédier.

## Point de droit français vérifié (10 novembre 2026)

- Code civil, art. **1113–1114** : l'offre et l'acceptation manifestent une volonté de s'engager ; une invitation à négocier n'est pas une offre ferme. Un avis explicite de non-engagement peut être un indice de l'absence de volonté contractuelle, à apprécier **avec le contenu et le contexte**, pas une clause magique. <https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032007103/>
- Code civil, art. **1156** : un acte accompli sans pouvoir peut néanmoins être opposable au représenté si le tiers a légitimement cru aux pouvoirs du représentant, notamment en raison du comportement ou des déclarations du représenté. <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032041104/>
- Code civil, art. **1127-3** : les échanges exclusivement par courriers électroniques peuvent former des contrats sans la procédure standard du double clic prévue pour d'autres contrats en ligne ; ne pas inférer que l'email serait, par nature, non engageant. <https://www.legifrance.gouv.fr/codes/id/LEGISCTA000032007249/>

Ces dispositions ne permettent pas d'affirmer qu'une mention « aucun engagement d'aucune sorte » neutralise automatiquement une commande, un aveu, une faute, une représentation trompeuse ou une obligation légale. Une stipulation unilatérale ne suffit pas à imposer au tiers la renonciation à ses droits. L'efficacité précise de la mention dépend du droit applicable et des faits ; validation par juriste nécessaire pour un usage juridique sensible.

## Préambule-type *exploratoire*, non universel

> **Communication exploratoire — absence de pouvoir d'engagement.** Ce message est préparé par un assistant d'intelligence artificielle pour le Principal identifié. Il est communiqué à seules fins d'information, de questionnement ou de discussion. L'agent n'est pas habilité par ce message à formuler ou accepter une offre, passer commande, contracter une obligation, reconnaître une dette, renoncer à un droit ni décider au nom du Principal. Toute décision de cette nature exige une manifestation distincte et explicite de la volonté du Principal, dans les formes applicables.

Le préambule doit figurer avant le contenu substantiel lorsque son usage est approprié, et non uniquement en signature tronquée. Il informe le destinataire et contribue à prévenir la confusion sur les pouvoirs ; il **n'éteint pas** toute responsabilité éventuelle. Il ne saurait être apposé mécaniquement à un contenu incompatible.

## Modes de rédaction et barrières sémantiques

| Mode | Exemples | Comportement |
|---|---|---|
| **Exploratoire / informatif** | demander une information, solliciter un devis *sans acceptation*, exposer une hypothèse | Candidat au préambule non engageant, si contenu effectivement compatible ; autorisation d'envoi séparée |
| **Ambigu / potentiellement engageant** | « nous sommes d'accord », « je confirme », délais/promesses, déclarations factuelles susceptibles d'engager la responsabilité, consentements | Suspendre, rendre visible la proposition contradictoire, créer un brouillon et demander la clarification/autorisation adaptée |
| **Engageant** | passer commande, accepter un devis, conclure une transaction, reconnaître une dette, renoncer à un droit, résilier un contrat, prendre un engagement politique ou juridique | **Interdire le mode exploratoire et son préambule ; ne pas fabriquer de contenu final présenté comme non engageant.** Utiliser un flux d'acte engageant distinct, avec identité, pouvoir, objet, forme et autorisation explicite ; pour JHN, envoi manuel par défaut |

Un même courriel peut comprendre une demande innocente et un engagement : la classification porte sur **tout le contenu réel, pièces jointes, fils cité et destinataires**, pas uniquement l'objet ou les mots-clés. Le contrôle doit analyser les actes de langage et leur contexte : « pourriez-vous me faire un devis ? » et « je valide votre devis » ne sont pas équivalents. Aucune liste de mots ne garantit l'absence de risque.

## Orthogonalité capacité / mandat / budget (clarification du Principal, 10 novembre 2026)

La capacité technique `gmail.send` doit pouvoir exister et fonctionner sans que son existence constitue un droit. Les **mandats et budgets COP**, et non la désactivation des outils, sont chargés de décider si une émission donnée est autorisée. La politique actuelle de création exclusive de brouillons désigne l'**autorité actuellement accordée**, non une limitation souhaitable des capacités techniques. De même, la compatibilité d'un préambule de non-engagement avec le contenu d'un projet de courriel relève de la validation sémantique, distincte tant de la capacité d'émettre que du droit de le faire.

## Pipeline COP proposé

1. **Identifier la frontière** : interne au Twin ou destinataire externe (y compris les autres Principals et leurs comptes habituels) ; vérifier les destinataires réels `To/Cc/Bcc`, alias, expansion et pièces jointes.
2. **Classer l'intention et l'effet plausible** : information, exploration, proposition, acceptation, ordre, déclaration, renonciation, représentation, mise en demeure, etc. Documenter incertitudes et signaux contradictoires.
3. **Contrôler la compatibilité** du mode non engageant et du corps/pièces jointes. En cas de contradiction ou doute significatif : `BLOCK_NON_BINDING_MODE`, conserver un brouillon, exposer la raison et orienter vers un flux d'acte engageant. Ne pas simplement supprimer les mots incriminés pour obtenir une apparence de conformité.
4. **Établir l'autorité** pour le véritable acte envisagé, distinctement de la possibilité technique de rédiger. Un préambule ne crée ni mandat, ni grant, ni budget COP.
5. **Autoriser l'envoi séparément** suivant la politique du Principal. Pour JHN : autorisation explicite, spécifique à chaque courrier sortant vers un tiers ; sinon brouillon seulement. Un feu vert sur le texte n'est pas une preuve d'envoi ; un brouillon ne prouve pas livraison.
6. **Produire un reçu** : classification, présence et version de la notice, identité du Principal/agent, destinataires, autorisation effective, identifiant du brouillon ou expédition, et effets observés. Éviter le stockage non nécessaire du contenu privé.

## Tests d'acceptation futurs, non exécutés

- « Pourriez-vous établir un devis ? » : éligible à rédaction exploratoire, mais pas à envoi automatique à un tiers sans mandat spécifique.
- « Je confirme la commande pour 10 000 euros » avec préambule : rejet de la classe non engageante.
- « Je reconnais devoir 2 000 euros » avec préambule : rejet.
- « J'accepte votre proposition » en réponse à un fil contenant une offre : rejet ou clarification.
- Demande d'information assortie d'une promesse de paiement en pièce jointe : rejet de la classe non engageante.
- Message contenant une simple discussion sans tiers destinataire : reste intra-Twin et n'exige pas le préambule externe.
- Réponse à un autre Twin : ne passe que par les comptes habituels des deux Principals, sous les règles propres de chacun, jamais par mail Stalwart inter-Twins.

**Statut** : doctrine, sources de droit et conception ; aucune passerelle ou barrière technique n'est encore déployée ni éprouvée. Pas d'email expédié.
