# Engineering Documentation Portal (`docs`)

Centralized technical documentation portal for projects built and maintained by **Muhammad Kamal**, deployed live on both **Vercel** and **GitHub Pages**:

- **Live Portal (Vercel):** [https://docs-kamal.vercel.app/](https://docs-kamal.vercel.app/)
- **Live Portal (GitHub Pages):** [https://kamal-hq.github.io/docs/](https://kamal-hq.github.io/docs/)

---

## Documented Systems

| Code | System | Version | Category | Live App | Repository |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A-03** | **Ascend AI** | `v3.0` | Intelligence | [ascend-ai-sandy.vercel.app](https://ascend-ai-sandy.vercel.app/) | [kamal-hq/ascend-ai](https://github.com/kamal-hq/ascend-ai) |
| **D-02** | **DeskConvert** | `v2.0.0` | Tools | [desk-convert.vercel.app](https://desk-convert.vercel.app/) | [kamal-hq/DeskConvert](https://github.com/kamal-hq/DeskConvert) |
| **L-02** | **AdLens PK** | `v2.0.0` | Data | [adlens-pk.vercel.app](https://adlens-pk.vercel.app/) | [kamal-hq/adlens-pk](https://github.com/kamal-hq/adlens-pk) |
| **T-02** | **TypeSimulator** | `v2.0.0` | Tools | [typesimulator-frontend.vercel.app](https://typesimulator-frontend.vercel.app/) | [kamal-hq/TypeSimulator](https://github.com/kamal-hq/TypeSimulator) |
| **C-01** | **Cadence** | `v1.0.0` | Tools | [kamal-cadence.vercel.app](https://kamal-cadence.vercel.app/) | [kamal-hq/cadence](https://github.com/kamal-hq/cadence) |
| **P-03** | **ProspectIQ** | `v3.0.0` | Data | [kamal-prospectiq.vercel.app](https://kamal-prospectiq.vercel.app/) | [kamal-hq/prospectiq](https://github.com/kamal-hq/prospectiq) |
| **S-01** | **SEC 13F Analyzer** | `v1.1.0` | Data | — | [kamal-hq/sec_13f_analyzer](https://github.com/kamal-hq/sec_13f_analyzer) |
| **S-02** | **SEC 13F Autopilot** | `v0.1.0` | Infrastructure | — | [kamal-hq/sec_13f_autopilot](https://github.com/kamal-hq/sec_13f_autopilot) |

---

## Local Development

```powershell
pnpm install
pnpm run dev        # Start local Vite dev server (default port 8443)
pnpm run typecheck  # Run TypeScript check (tsc --noEmit)
pnpm run build      # Build production bundle (dist/index.html + dist/404.html)
pnpm run preview    # Preview built static bundle locally
```

---

## Updating Documentation (Two Workflows)

### 1. Deep Local Codebase Documentation (Antigravity CLI `--add-dir`)

Attach one or more local project folders to your `agy` session so the agent can inspect source files, manifests, and tests directly:

```powershell
cd "C:\Users\Asif Computers\Desktop\docs"
agy --add-dir "..\ascend-ai" --add-dir "..\DeskConvert" --add-dir "..\sec_13f_analyzer" --add-dir "..\sec_13f_autopilot"
```

The workspace skill in [.agents/skills/document-project/SKILL.md](.agents/skills/document-project/SKILL.md) and rules in [.agents/rules/docs-portal.md](.agents/rules/docs-portal.md) guide updates to [src/data/projects.ts](src/data/projects.ts) and [src/data/docs.ts](src/data/docs.ts).

### 2. Automated GitHub Repository Sync (CLI & GitHub Actions CI)

Run [scripts/sync-github-docs.mjs](scripts/sync-github-docs.mjs) locally or via [.github/workflows/sync-docs.yml](.github/workflows/sync-docs.yml):

```powershell
# Sync all owned repositories tagged with the "docs-sync" GitHub topic
pnpm run sync -- --owner=kamal-hq

# Sync a specific repository on demand
pnpm run sync -- --owner=kamal-hq --repo=DeskConvert

# Sync all non-fork, non-archived repositories owned by the user
pnpm run sync -- --owner=kamal-hq --all
```

- Synced output writes strictly to [src/data/synced/projects.json](src/data/synced/projects.json) and [src/data/synced/docs.json](src/data/synced/docs.json).
- Hand-curated entries in [src/data/projects.ts](src/data/projects.ts) and [src/data/docs.ts](src/data/docs.ts) always take precedence by `slug`.
- In GitHub Actions, [.github/workflows/sync-docs.yml](.github/workflows/sync-docs.yml) runs daily (and on `workflow_dispatch`), verifies `pnpm run typecheck` and `pnpm run build`, and opens/updates a `chore/sync-docs` Pull Request.

---

## Dual Deployment (GitHub Pages + Vercel)

- **Vercel ([https://docs-kamal.vercel.app/](https://docs-kamal.vercel.app/))**: Deployed directly from the repository root using [vercel.json](vercel.json) SPA rewrites.
- **GitHub Pages ([https://kamal-hq.github.io/docs/](https://kamal-hq.github.io/docs/))**: Deployed automatically on push to `main` via [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which sets `BASE_PATH` from the repository name and emits `dist/404.html` for client-side route resolution.
