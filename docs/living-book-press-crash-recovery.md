# Living Book Press — récupération après arrêt brutal (FBF #238)

## Propriété établie

Un processus interrompu par `SIGKILL` peut laisser le répertoire `.living-book-registry.lock`.
Le registre doit alors refuser toute nouvelle émission (`fail-closed`) : **ne jamais supprimer automatiquement un verrou simplement parce qu'il est ancien**. Le PID peut être réutilisé et un autre processus ou hôte peut encore agir. L'ancien mécanisme n'offre aucun *fencing token*.

## Récupération administrative hors ligne, exclusivement

1. **Arrêter tous les producteurs et lecteurs-écrivains du registre** ; suspendre planificateurs, agents et services, sur **tous** les hôtes partageant le répertoire. Vérifier indépendamment leur arrêt et empêcher les redémarrages. Si le périmètre n'est pas maîtrisé : STOP, ne pas toucher au verrou.
2. Réaliser une sauvegarde en lecture seule du répertoire du registre. Examiner les fichiers `press-registry-*.json` : JSON valide, identifiants uniques, compteur cohérent, absence de conflit entre éditions. Si une corruption est constatée : STOP et restauration depuis une sauvegarde qualifiée.
3. Dans cette fenêtre d'exclusivité **vérifiée par l'opérateur**, déplacer le répertoire `.living-book-registry.lock` vers une archive hors du chemin de verrouillage (conserver preuve/date/provenance). Ne pas laisser un ancien lock dans le même nom. Cette étape ne doit pas être exécutée par un agent non mandaté.
4. Redémarrer **un seul** émetteur ; valider un Reality Test contrôlé et sa persistance après redémarrage. Puis autoriser l'exploitation normale.

Le déplacement du verrou ne fournit *aucune* garantie d'exclusivité en soi : la sûreté repose sur la suspension administrative vérifiée, faute de verrou récupérable avec fencing. Ne pas automatiser cette procédure dans `_withLock`.

## Réparation structurelle recommandée

Passer l'allocateur à une transaction SQLite locale (journal WAL et `BEGIN IMMEDIATE`) ou à un service unique disposant d'un mécanisme de fencing et de récupération documenté, et conserver le contrat `reserveCopy` / `updateRecord`. Un verrou de répertoire n'est qu'une étape transitoire.

## Reality Tests

- `scripts/check-living-book-press-multiprocess-238.js` : huit véritables processus Node parallèles, unicité + persistance, `SIGKILL` sous verrou, refus explicite de nouvelles émissions.
- `scripts/check-living-book-press-fbf-238.js` : éditions et contributions indépendantes, corruption détectée.
- `scripts/check-living-book-press.js` : tests du moteur historique.

## Frontière de la preuve

Aucun protocole de récupération *automatique* sûr n'est établi par cette branche. Ne pas promouvoir une garantie « self-healing ». La reprise décrite est une procédure **manuelle hors ligne** ; aucun registre réel n'a été déverrouillé.
