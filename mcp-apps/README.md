# Cogentia MCP Apps — registre déclaratif

## Contrat

MCP Apps est l'extension normalisée `io.modelcontextprotocol/ui` (SEP-1865).
Chaque application expose un outil MCP standard muni de
`_meta.ui.resourceUri`, une ressource `ui://` avec le MIME
`text/html;profile=mcp-app`, et utilise le SDK officiel
`@modelcontextprotocol/ext-apps` côté iframe. Aucun protocole UI concurrent.

Le dossier `mcp-apps/<slug>/manifest.json` est **un registre de déploiement
propre à Cogentia**, pas une partie de la spécification MCP. Un manifeste
est strictement limité aux applications publiques de présentation sans effet
physique direct. Il ne peut enregistrer ni écriture, ni shell, ni outil à
privilèges. Ces actions exigent un outil MCP sémantique distinct, avec COP.

Les ressources HTML sont des artefacts autonomes sans connexion réseau
déclarée ; le SDK officiel est intégré à la compilation, sans CDN à l'exécution.

## Créer une application

Depuis la racine du dépôt :

```bash
node scripts/create-mcp-app.js --name ma-calibration --title "Ma calibration"
cd mcp-apps/ma-calibration
npm install
npm run build
```

Le manifeste contient le nom de l'outil et l'URI `ui://` ; le serveur
MCP Cogentia (une fois équipé de ce registre) le découvre au prochain
`tools/list` et sert `resources/read` sans réécrire son code central.

Pour iDual :

```bash
cd mcp-apps/idual-calibration
npm ci
npm run build
cd ../..
node scripts/check-idual-calibration-mcp-app.js
node scripts/check-mcp-app-registry.js
```

Le HTML `index.html` est une sortie compilée, versionnée pour que le
serveur n'ait pas besoin de dépendances Node de build au runtime. Les fichiers
`client.js`, `template.html` et `package-lock.json` sont les sources.

## Limites vérifiables

- Le chargement dynamique s'applique **après le premier déploiement du
  registre** dans le serveur MCP. Il ne crée pas magiquement de nouvelles
  capacités physiques.
- Le serveur redécouvre les manifestes lors de `tools/list`, `tools/call`
  et `resources/read`. Mais les clients peuvent mettre en cache la liste
  des outils : un rafraîchissement ou une reconnexion du connecteur peut être
  nécessaire. Le standard ne garantit pas une visibilité instantanée.
- La v1 iDual passe par `App.sendMessage` : un clic demande une opération
  dans la conversation, mais **n'atteste ni l'émission IR ni l'effet lumineux**.
- Les observations sont conservées **en mémoire de l'iframe** jusqu'à
  transmission explicite du journal. Il n'y a pas de persistance automatique.
- La recette locale teste MCP `tools/list`, `resources/read`, `tools/call`,
  les schémas et le bundle. Elle ne constitue pas une vérification d'affichage
  dans ChatGPT ; cette dernière reste une recette séparée.

Référence : https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx
SDK : https://github.com/modelcontextprotocol/ext-apps
