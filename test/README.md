# Cogentia Test Suite

This directory contains the automated, deterministic unit test suite for Cogentia (`npm test` / `node --test test/*.test.js`).

## Invariant & Execution Guidelines

- **Runner**: `npm test` (scoped to `test/*.test.js`).
- **Safety**: Pure unit assertions, isolated temporary directories (`fs.mkdtempSync`), no network exposure, no mutations across repositories.
- **Naming**: Every automated unit test in this directory MUST be named `*.test.js`.

## Separation from Standalone Checks (`scripts/check-*.js`)

Per [cogentia#193](https://github.com/JeanHuguesRobert/cogentia/issues/193), standalone/bespoke verification scripts located in `scripts/` are named `scripts/check-*.js` (and executed individually via `node scripts/check-whatever.js` or `npm run test:whatever`).

They are intentionally prefixed with `check-` rather than `test-` so that Node.js's built-in test runner discovery glob (`**/test-*.?(c|m)js`) does NOT auto-discover or execute them when running bare `node --test`.
