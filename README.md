# Chapbook

Chapbook is a licence-gated, local-first blog composer that runs as a
Progressive Web App (PWA). Writers activate with a Studio-access key, compose
posts in the browser (all state kept locally), and publish to **their own
GitHub Pages repository** — the static blog and its media are committed straight
to the user's own Git-hosted site. Chapbook holds no server-side content: the
only backend surface is a small set of Netlify Functions for the licence-mint
webhook, the GitHub device-flow relay, and trial requests.

## Fork base

This repository is a hard fork of the Helm Studio codebase with a fresh git
history. Fork base = helm snapshot at "/Users/inayatsmac/Desktop/Transferred to
new mac/Inayat-website/helm", branch feat/literature-decoded, commit 259544d
(2026-07-08) plus uncommitted working-tree edits through 2026-07-12; canonical
Air 2 offline at fork time; go-live commit 64fb912 reconstructed as the live Buy
link; reconcile against Air 2 when it returns.

## Build, test, and deploy

All commands are run from the repository root.

| Command | What it does |
|---|---|
| `npm run build` | Bundles `src/` and emits the deployable static site to `dist/`. |
| `npm test` | Runs the full test suite (`node --test`). |
| `npm run deploy:draft` | Builds, then deploys a Netlify **draft** (preview) to site `d825cd70` — does not touch production. |
| `npm run deploy:prod` | Builds, then promotes to production. **Owner-gated — do not run.** |

The GitHub device-flow client id is supplied at deploy time via the
`STUDIO_GH_CLIENT_ID` environment variable, e.g.
`STUDIO_GH_CLIENT_ID=… npm run deploy:draft`.

## Helm boundary

(filled in a later task)
