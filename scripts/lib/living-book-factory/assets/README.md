# Guide interactif — projection de la Factory

Ce répertoire contient les deux ressources autonomes utilisées par le générateur `scaffoldLivingBook` :

- `guide-page.html` : squelette paramétré par livre, avec consentement explicite, historique, sources, export, import et brouillon non envoyé ;
- `guide-client.js` : **instantané de distribution** du client partagé des Guides Capable et PrivAI, sans dépendance tierce côté navigateur.

## Source, projection et autorité

Source du client utilisée lors de cette intégration : `JeanHuguesRobert/barons-Mariani/scripts/lib/living-book-guide/client.js`, blob Git `1bf9db9524c631654ec77708b58482b22ad2b2fa` (17 novembre 2026). Les projections des deux Reality Cases sont réalisées par `scripts/ops/sync-living-book-guides.mjs`, sans recopier d'implémentation indépendante.

Une évolution de ce client doit être confrontée aux usages de Capable et PrivAI et répercutée explicitement dans cet instantané Factory (voir `cogentia#274` et `#337`). La copie dans la Factory est une ressource de génération disponible hors ligne, **pas une seconde autorité éditoriale**, ni une activation de service.

## Frontières de responsabilité

`scaffold` produit une projection de travail. L'instance du Livre conserve son profil Cogentia, ses sources, sa politique éditoriale, son autorité de déploiement et son droit de geler une édition.

Le fait qu'un `guide.html` et qu'un `guide.js` existent localement ne démontre ni la disponibilité du profil public, ni la publication HTTPS du site, ni l'absence de rétention des questions côté Cogentia ou fournisseur d'IA.

Validation de la Factory : `node scripts/check-living-book-factory.js`. Validation des deux Reality Cases : `node scripts/ops/check-capable-guide.mjs`, `node scripts/ops/check-privai-guide.mjs` et `node scripts/ops/check-living-book-guide-browser.mjs` dans le dépôt barons-Mariani. Le dernier contrôle utilise Chromium réel avec un fournisseur SSE simulé ; il ne constitue pas un test de facturation ni de disponibilité du fournisseur externe.
