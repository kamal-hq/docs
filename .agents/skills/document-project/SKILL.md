---
name: document-project
description: Inspect a local project folder attached via --add-dir (or sync from GitHub) and add/update its documentation in this portal.
---

# Document Project Workflow

Use this skill when the user asks to document a new or existing project in this portal.

## Mode A: Deep Local Codebase Documentation (`agy --add-dir <project-path>`)

1. Inspect the attached project directory (`README.md`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, CLI entrypoints, and primary config/source files).
2. Extract only verified facts from the codebase:
   - Exact project title, version, status, summary, category (`Intelligence` | `Tools` | `Infrastructure` | `Data`), and tech stack tags.
   - Real installation commands, CLI flags or API usage snippets, configuration options, and operational caveats.
3. Update `manualProjects` in `src/data/projects.ts` with the project card entry (matching the `Project` type).
4. Create or update the project's dedicated deep-dive module under `src/data/projects/<slug>.ts` and register it in `projectDocsRegistry` in `src/data/docs.ts` using `DocBlock` primitives (`paragraph`, `callout`, `principles`, `list`, `terminal`, `code` with `filename`, and `table`). Include multi-page architecture, source-file code walkthroughs, database/state schemas, and API/CLI references.
5. Run `pnpm run typecheck` and `pnpm run build` to verify the updated portal compiles cleanly.

## Mode B: GitHub Sync (`pnpm run sync`)

To pull metadata and `README.md` from GitHub repositories tagged with topic `docs-sync`:

- Single repo: `pnpm run sync -- --owner=<username> --repo=<repo-name>`
- All tagged repos: `pnpm run sync -- --owner=<username>`
- All owned public/private repos: `pnpm run sync -- --owner=<username> --all`

Sync writes only to `src/data/synced/projects.json` and `src/data/synced/docs.json`; manual entries in `src/data/projects.ts` and `src/data/docs.ts` keep priority by `slug`.
