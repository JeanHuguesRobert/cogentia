---
title: "3Code — Three Code, Free Code : des références humaines pour un Web durable"
description: "Présentation à double lecture du projet 3Code : utilité publique, genèse biographique, format court, collisions assumées, associations URL et fédération des registrars."
author: "Jean Hugues Noël Robert (conception et témoignage)"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-11-12"
last_modified_at: "2026-11-12"
license: "CC BY-SA 4.0"
language: fr
canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/3code.md"
status: "working-paper — présentation publique non validée"
version: "0.1.0"
document_role: source
document_kind: presentation
visibility: public
lifecycle_state: working
target_audience:
  - grand public
  - informaticiens
  - spécialistes des systèmes distribués
target_scene: public
document_function: presentation
update_policy: UP-DEFAULT-REVIEWED
ai_assisted_by:
  - "GPT-6 (rédaction structurée à partir des échanges avec le concepteur)"
provenance:
  origin_type: conversation
  origin_repository: unknown
  origin_ref: unknown
  origin_date: "2026-11-12"
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# 3Code
## *Three Code. Free Code.*

**Neuf caractères pour retrouver une ressource numérique. Même si son adresse change.**

> Les références sont globales, les opérations sont locales et leur coordination est fractale.

**État du projet.** 3Code est une proposition ouverte portée par son concepteur et envisagée comme service d'intérêt général de l'association **C.O.R.S.I.C.A.** Le format et les principes ci-dessous sont des choix de conception ; un service fédéré, son niveau de disponibilité et la pérennité des associations restent à démontrer. Les exemples de codes et de résolutions sont illustratifs.

# Première lecture — Pour tout le monde

## Un problème quotidien

Les adresses Internet sont parfois longues, difficiles à dicter et impossibles à mémoriser. Elles changent lorsque les sites déménagent, lorsqu'une organisation change d'hébergeur ou lorsqu'un service disparaît.

Un QR code simplifie l'accès immédiat, mais il ne résout pas ce problème : si l'adresse encodée cesse de fonctionner, le QR imprimé peut devenir inutile.

**3Code propose une référence courte, lisible et facile à transmettre**, que l'on puisse écrire sur une étiquette, citer au téléphone, publier dans un livre ou transmettre à un assistant numérique.

Par exemple :

### `3XY-Z89-P2K`

Trois groupes de trois caractères. Neuf caractères significatifs au total, toujours avec un `3` initial.

Cette référence pourrait renvoyer vers une page Web, une archive, une photographie, plusieurs documents, un service ou toute autre ressource disposant d'une adresse numérique.

L'adresse réelle peut changer. L'ambition est que **le 3Code reste le même**.

## Un usage sans cérémonie

Une personne produit librement un code sur son appareil. Elle choisit ensuite, si elle souhaite rendre la référence retrouvable, un **registrar** participant : un service qui enregistre l'association entre le code et une ou plusieurs URL.

Pas besoin de demander l'attribution d'un numéro à une autorité mondiale.

Pour retrouver la ressource, elle saisit ou dicte le code auprès de n'importe quel registrar participant. Un simple courriel pourrait suffire, aussi bien pour enregistrer que pour rechercher.

**Si plusieurs ressources partagent le même code**, le service propose plusieurs résultats. Quelques indices aident alors à retrouver le bon : lieu, époque, thème, hashtags, description.

Cela ressemble au fonctionnement ordinaire des noms : plusieurs personnes peuvent porter le même nom, mais nous savons généralement les distinguer par le contexte.

## Une histoire concrète

Imaginons un panneau évoquant un ancien chemin près de Corte. Une association y inscrit un 3Code. L'adresse du site qui présente son histoire change quelques années plus tard ; l'association actualise son enregistrement, sans remplacer le panneau.

Une personne ayant conservé le code le retrouve. Même si elle ne se souvient plus de l'association, elle peut préciser « ancien chemin, Corte ». Si plusieurs références correspondent au code, ces souvenirs permettent de les départager.

La personne pourrait recevoir une première réponse immédiatement, puis un complément si une information plus récente est découverte ailleurs dans le réseau.

**La résolution est une recherche, pas nécessairement une redirection aveugle vers une destination unique.**

## « Three Code », « Free Code »

Le nom **3Code** joue sur la proximité sonore anglaise de *three* et *free*.

- **Three** : trois groupes de trois caractères, dont le premier commence par `3`.
- **Free** : liberté de générer le code, de choisir son registrar et, dans l'architecture visée, de changer d'opérateur sans perdre son enregistrement.
- **Code** : une référence humaine, non une adresse figée ni un mot de passe.

La liberté de génération n'implique pas que tout service d'hébergement ou de conservation sera nécessairement gratuit.

## Pourquoi accepter les collisions ?

Deux personnes peuvent produire le même code. Ce n'est **pas** une anomalie que nous cherchons à rendre impossible.

Dans un annuaire, le nom « Martin » peut correspondre à plusieurs personnes. Dans un moteur de recherche, quelques mots peuvent renvoyer à plusieurs pages. Le système donne des candidats et le contexte permet de choisir.

**3Code applique cette logique aux références numériques.** Nous privilégions des codes réellement courts et praticables, en assumant qu'ils ne constituent pas chacun une identité mondiale unique.

Ce choix demande de traiter sérieusement les ambiguïtés et les abus. Il ne les fait pas disparaître.

## Un réseau, plutôt qu'un guichet mondial

Les registrars pourraient être exploités par des associations, des collectivités, des entreprises ou des particuliers. Ils échangent les enregistrements, relaient les recherches et conservent des répliques.

Un utilisateur ne devrait pas avoir besoin de savoir chez quel registrar une association a été enregistrée initialement.

La popularité d'une référence peut rendre sa résolution plus rapide en favorisant sa mise en cache. Mais **popularité ne signifie ni authenticité ni propriété**.

La promesse recherchée est simple : **une référence humaine utilisable partout, sans dépendre durablement d'un seul opérateur**. Cette propriété devra être vérifiée expérimentalement.

## Genèse — Une idée ancienne, une impasse, puis un renversement

*Récit à la première personne d'après le témoignage du concepteur ; les dates de cette période ancienne restent à documenter.*

> Il y a de nombreuses années, j'avais déjà consacré beaucoup de travail à cette idée. Je souhaitais créer des références Internet universelles, très courtes et vraiment pratiques pour les humains.
>
> J'avais alors imaginé une solution centralisée. Je pensais qu'une référence devait nécessairement être unique dans le monde entier. Cette exigence a probablement pesé sur mon choix d'architecture.
>
> Mais les calculs de fréquence des collisions me semblaient condamner des codes aussi courts. Après y avoir beaucoup travaillé, j'ai abandonné le projet, non sans un réel mécontentement.
>
> Ce n'est que très récemment que j'ai compris que les collisions pouvaient être acceptées. Mieux : renoncer à les interdire permettait de repenser le système. Une référence pouvait désigner plusieurs associations, et des registrars fédérés pouvaient coopérer sans autorité mondiale d'attribution.
>
> Les mathématiques n'avaient pas changé. **C'était la contrainte que je m'imposais qui avait changé.**

Il ne s'agit pas d'affirmer que toute collision serait souhaitable : **c'est leur acceptation, combinée à une résolution contextuelle, qui ouvre une architecture différente**. Le lien causal entre exigence d'unicité et centralisation ancienne demeure une hypothèse biographique explicitement qualifiée.

---

# Seconde lecture — Pour informaticiens et spécialistes

Cette section précise le contrat envisagé, ses dépendances aux standards existants et les inconnues qui nécessitent des tests.

## 1. Format de classe 3

Forme de représentation : `3XX-XXX-XXX`.

- **9 caractères significatifs** ; le `3` initial est un discriminateur de classe.
- Les **8 caractères suivants** sont générés uniformément et indépendamment dans l'alphabet Base32 de Crockford :
  `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.
- L'espace théorique de génération de cette classe est donc de `32^8 = 2^40 = 1 099 511 627 776` codes.
- Les tirets et espaces sont des séparateurs de présentation, ignorés lors de la normalisation.
- Les lettres peuvent être acceptées en minuscules lors de la saisie. Les confusions courantes `O→0`, `I/L→1` peuvent être prises en charge par le parseur.
- **Aucun caractère de contrôle n'est prévu dans cette classe** : les huit positions postérieures au préfixe restent aléatoires.
- Les autres classes sont réservées : aucune sémantique n'est définie ici pour elles.

Le 3Code **n'est pas** un secret, un titre de propriété, une authentification ou une preuve d'autorité.

La vocalisation pourra utiliser l'alphabet phonétique OACI/OTAN pour les lettres, avec dénomination explicite des chiffres ; son ergonomie réelle devra être testée.

## 2. La collision n'est pas une erreur de protocole

Pour `n` codes indépendamment générés dans un espace de `M = 2^40` valeurs, la probabilité approximative d'au moins une collision parmi l'ensemble est :

`P(collision quelconque) ≈ 1 − exp(−n(n−1)/(2M))`.

Ce n'est **pas** la probabilité qu'un code précis soit ambigu. Pour une référence donnée confrontée à `n−1` autres attributions aléatoires :

`P(au moins un homonyme) ≈ 1 − exp(−(n−1)/M)`.

Ces probabilités décrivent des tirages aléatoires honnêtes, **pas** le risque d'imitations délibérées, de spam, de détournement ou de squattage de codes, lesquels nécessitent leurs propres défenses.

Une recherche peut légitimement retourner zéro, un ou plusieurs enregistrements. Les résultats contextuels sont classés, pas effacés arbitrairement par un filtre supposé infaillible.

## 3. Le modèle de données : dissocier les identités

Un **3Code** est une étiquette publique pouvant être partagée.

Un **enregistrement** est un objet distinct, doté d'un identifiant technique stable, d'une provenance, d'une autorité de modification et d'un historique de révisions.

Une **association** relie un enregistrement à une ou plusieurs URL et à des métadonnées facultatives : titre, description, langue, catégorie, hashtags, géolocalisation déclarée et temporalité.

Il peut exister :
- plusieurs enregistrements indépendants pour un même 3Code ;
- plusieurs URL pour un même enregistrement ;
- plusieurs 3Code pour une même ressource ;
- des états provisoires, des révocations et des divergences détectables.

Le **droit de modifier un enregistrement** ne découle jamais de la simple connaissance de son code.

## 4. Opérations conceptuelles

| Opération | Effet |
|---|---|
| `generate()` | Création locale, hors ligne, sans autorité préalable |
| `register(code, links, metadata)` | Création d'un enregistrement chez un registrar |
| `resolve(code, context?)` | Recherche et classement des enregistrements candidats |
| `update(recordId, revision, authority)` | Modification autorisée d'un enregistrement |
| `revoke(recordId, authority)` | Révocation attestée et propagée |
| `render(code, medium)` | Représentation texte, URL, QR ou étiquette |

Les formes exactes des API, les schémas et les règles de confiance restent à spécifier. Le protocole doit séparer **identifiant humain, identité technique, autorité et localisation de stockage**.

## 5. Registrars fédérés et principe de localité

Un registrar peut stocker des enregistrements primaires, des répliques durables, des caches et un index de découverte.

Le réseau envisagé est maillé : les registrars échangent des lots d'enregistrements et de révocations, recherchent des pairs et relaient des requêtes sans imposer de registrar central mondial.

**Principe : les références sont globales ; les opérations sont locales ; leur coordination est fractale.**

La résolution commence au plus près du demandeur et élargit le champ si les indices et les réponses disponibles ne suffisent pas.

Pendant une partition réseau :
- génération et enregistrement local restent possibles ;
- les résultats peuvent être incomplets ou périmés et doivent être annoncés comme tels ;
- les changements autorisés concurrents ne doivent pas être résolus silencieusement par simple dernier horodatage ;
- la reconnexion doit permettre anti-entropie, détection des divergences et réconciliation contrôlée.

**Une autorité canonique de modification n'implique pas un serveur canonique unique.** La portabilité de cette autorité après la disparition d'un registrar reste un problème majeur à résoudre.

## 6. Résolution progressive et courrier électronique

Une requête peut fournir rapidement les réponses présentes en cache, puis être complétée si un résultat plus récent, une révocation ou un meilleur candidat est découvert.

La continuation de recherche peut être identifiée par un `query_id` et ses notifications regroupées dans un même fil de courriels. Des limites de durée, d'envoi et de conservation sont nécessaires.

Les registrars devraient relayer des identifiants techniques de requête plutôt que propager à tout le maillage l'adresse e-mail du demandeur.

L'e-mail peut aussi servir à confirmer des actions, mais **le contrôle d'une boîte mail n'établit ni identité civile ni propriété d'une URL**.

Le protocole doit éviter qu'un déploiement de grande taille serve au suivi non consenti des consultations de références.

## 7. Standards à réutiliser

Ne pas réinventer les primitives existantes :
- Douglas Crockford, [Base32 for Humans](https://www.crockford.com/base32) : alphabet de représentation.
- [RFC 8288 — Web Linking](https://www.rfc-editor.org/rfc/rfc8288) et [RFC 9264 — Linkset](https://www.rfc-editor.org/rfc/rfc9264) : liens typés et représentation d'associations multiples.
- [GS1 Digital Link, principes transférables](https://gs1.github.io/DigitalLinkDocs/principles/) et [standard du résolveur GS1](https://ref.gs1.org/standards/resolver/1.2.1/) : séparation identifiant/destination et sélection de liens.
- [IPNS](https://docs.ipfs.tech/concepts/ipns/) et [GNU Name System](https://docs.gnunet.org/v0.24.x/users/gns.html) : références distribuées, gestion des modifications et espaces de nommage.

Ces systèmes sont des **précédents et références techniques**, non des implémentations équivalentes de 3Code. En particulier, GS1 et IPNS ne fournissent pas nativement la sémantique 3Code des **collisions volontaires au niveau de la référence humaine**.

Les réponses d'un registrar pourront inclure un `Linkset` par enregistrement candidat, mais une enveloppe propre à 3Code sera nécessaire pour exposer **plusieurs enregistrements homonymes**, avec provenance, statut et niveau de fraîcheur.

## 8. MVP et Test du Réel

**Service pilote envisagé : C.O.R.S.I.C.A., via KYS Services, sur `services.acorsica.org/3code`.** Cette URL est une destination candidate : cette publication GitHub n'est pas une preuve de déploiement du service.

Progression minimale :
1. Génération locale correcte et vérifiable ; documentation publique, normalisation et tests de conformité.
2. Premier registrar : enregistrement, associations multiples, recherche, modification autorisée, révocation, export ; interface Web et e-mail selon capacité de transport réellement disponible.
3. Second registrar indépendant : synchronisation, requête fédérée, gestion des mêmes codes et reprise après partition simulée.
4. Publication du service avec contrôle de l'abus, consentement, traçabilité des modifications et procédures de sauvegarde.

**Critères de réussite :**
- une personne peut créer, enregistrer et retrouver une référence sans compte obligatoire ;
- une autre implémentation peut interopérer en suivant seulement la documentation et les tests ;
- deux registrars conservent les enregistrements et leurs révocations sans écraser silencieusement des modifications concurrentes.

**Non-objectifs initiaux :** annuaire planétaire complet, algorithme sémantique propriétaire, blockchain, consensus mondial des attributions, comptes obligatoires, garantie absolue de conservation.

L'adjectif **« pérenne » désigne un objectif de conception**, dépendant de la continuité des opérateurs, de la portabilité de l'autorité et de la réplication ; aucune durée de vie n'est garantie par neuf caractères.

## 9. Statut et gouvernance

3Code doit pouvoir être mis en œuvre par un registrar tiers **sans licence exclusive ni autorisation discrétionnaire de C.O.R.S.I.C.A.** L'association peut inaugurer le service et publier une implémentation de référence ; elle ne devient pas pour autant propriétaire des codes générés par le public.

La présente publication est une **présentation canonique de travail**, non une spécification finalisée ni une norme adoptée. Les décisions techniques resteront corrigibles à la lumière des tests du réel.

---

*3Code — Three Code. Free Code. Des références humaines, des ressources numériques, une résolution distribuée.*
