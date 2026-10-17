# Living Book Press — reprise transactionnelle après crash (FBF #238)

## Backend local

Living Book Press utilise désormais SQLite via `node:sqlite` (Node 24), transactions `BEGIN IMMEDIATE`, `synchronous=FULL` et journal WAL. Un crash du processus libère le verrou transactionnel au niveau du système d'exploitation ; SQLite rejoue ou abandonne les transactions incomplètes au redémarrage. Il ne reste aucun verrou-répertoire à effacer.

**Périmètre** : un système de fichiers **local**, avec ses garanties de verrouillage et de durabilité. Ne pas déployer le fichier SQLite sur NFS, stockage partagé multi-hôtes ou environnement à réplication active sans qualification dédiée. Les copies actives du DB, WAL et SHM ne sont pas à déplacer isolément. Sauvegarde par l'API SQLite ou arrêt complet puis copie cohérente.

## Continuité et incident

- En cas de `SIGKILL`, relancer un seul émetteur normalement ; les transactions non validées ne produisent pas de copie réservée.
- Une réservation `RESERVED` validée avant crash demeure ; elle ne doit **jamais** être réattribuée, même si le PDF n'a pas été livré.
- Après interruption entre `RESERVED` et `GENERATED`, reprendre avec une politique explicite de régénération ; ne pas fabriquer un nouveau `copy_id` sans intention de nouvelle incarnation.
- En cas de `SQLITE_CORRUPT`, `SQLITE_BUSY` persistant ou panne I/O : arrêt des écritures, sauvegarde, investigation. Ne jamais recréer silencieusement une base vide.

## Migration

Si des fichiers `press-registry-*.json` existent, l'ouverture du backend transactionnel échoue volontairement. Aucune migration implicite n'est autorisée : inventorier et vérifier les anciens identifiants et rendre la migration explicite avant émission. Ne pas effacer ces fichiers pour contourner la barrière.

## Vérification

- Test des processus indépendants + SIGKILL : `scripts/check-living-book-press-multiprocess-238.js`.
- Test des biographies concurrentes + corruption : `scripts/check-living-book-press-fbf-238.js`.
- Tests historiques : `scripts/check-living-book-press.js`.

Pas de qualification du stockage réseau, de migration réelle ni de déploiement dans cette branche.
