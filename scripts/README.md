# Cogentia Scripts & Verification Checks

This directory contains CLI utilities, tools, operational helpers, and standalone check scripts.

## Standalone Checks (`check-*.js`)

Per [cogentia#193](https://github.com/JeanHuguesRobert/cogentia/issues/193), bespoke and manual verification scripts in this directory are prefixed with `check-*.js` (e.g. `check-mcp-live.js`, `check-rossignol-runner.js`, `check-host-desktop-commander-provider.js`).

### Why `check-*.js` instead of `test-*.js`?
Node's built-in test runner (`node --test`) by default discovers and executes any file matching `**/test-*.?(c|m)js`. Many verification scripts in this directory are standalone scripts with live network, daemon, or filesystem effects. Prefixing them with `check-*.js` structurally prevents bare `node --test` from accidentally discovering or running them.

### Running checks
- Individual script: `node scripts/check-<name>.js`
- npm aliases: `npm run test:<name>` or `npm run check:<name>`
- Automated unit test suite: `npm test` (scoped to `test/*.test.js`)
