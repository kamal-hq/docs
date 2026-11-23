import type { ProjectDocumentation } from '../docs'

export const cadenceDocs: ProjectDocumentation = {
  slug: 'cadence',
  updatedLabel: 'RELEASE v1.0.0',
  pages: [
    {
      id: 'introduction',
      label: 'Architecture & Stack',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '8 MIN READ',
      title: 'Cadence',
      subtitle: 'Find Your Rhythm Across Tasks, Workspaces & Time (v1.0)',
      lead: 'A full-stack personal productivity, Kanban board, analytics, and calendar-scheduling web application built with Next.js 15 App Router, Supabase PostgreSQL with isolated multi-schema Row-Level Security, and AES-256-GCM encrypted Google Calendar 2-way sync—deployed 100% free on Vercel Hobby and Supabase.',
      sections: [
        {
          id: 'overview-topology',
          title: '100% free-tier full-stack topology',
          blocks: [
            {
              type: 'callout',
              variant: 'note',
              title: 'LIVE DEPLOYMENT',
              text: 'Production app live on Vercel at https://kamal-cadence.vercel.app/ — supporting Email/Password, Google OAuth, and GitHub OAuth sign-in, live Google Calendar 2-way sync, and zero-config Local Preview Mode when Supabase credentials are absent.',
            },
            {
              type: 'paragraph',
              text: 'Cadence replaces legacy single-user task boards with a strict TypeScript Next.js 15 App Router architecture that unifies Server Components, typed Server Actions, encrypted REST route handlers, and per-user PostgreSQL isolation in a single repository:',
            },
            {
              type: 'principles',
              items: [
                {
                  num: '01',
                  title: 'Isolated Multi-Schema Supabase',
                  body: 'All 7 tables, indexes, triggers, and RLS policies live strictly inside cadence.* with zero public.* pollution and zero triggers on shared auth.users.',
                },
                {
                  num: '02',
                  title: 'Encrypted Google Calendar 2-Way Sync',
                  body: 'OAuth 2.0 refresh/access tokens are encrypted server-side with AES-256-GCM before storage, syncing deltas incrementally via Google syncToken and ETag/LWW guards.',
                },
                {
                  num: '03',
                  title: 'Dual-Mode Resilience & Portability',
                  body: 'Runs in authenticated Supabase cloud mode or browser-persisted Local Preview Mode (localStorage), backed by versioned Zod-validated JSON Backup Export/Import and .ics feeds.',
                },
              ],
            },
            {
              type: 'table',
              columns: ['SUBSYSTEM', 'LOCATION', 'RUNTIME STACK', 'RESPONSIBILITY'],
              rows: [
                ['App Shell & Views', 'src/app/(app)/, src/components/', 'Next.js 15, React 19, Tailwind CSS v4, Lucide', 'Dashboard analytics, @dnd-kit Kanban/List board, Month/Week/Day calendar, Task Detail drawer, Settings, ⌘K Command Palette'],
                ['Auth & Session Edge', 'src/app/(auth)/, src/app/auth/callback/, src/middleware.ts', '@supabase/ssr, Supabase Auth', 'Email/Password + Google/GitHub OAuth, cookie-based redirect recovery (cadence_auth_next), protected route guards'],
                ['Server Mutations', 'src/app/actions/cadence.ts, src/lib/validations/schemas.ts', 'Next.js Server Actions, Zod', 'Typed CRUD for workspaces, tasks, subtasks, tags, profiles, and best-effort outbound Google Calendar event push'],
                ['Google Calendar Engine', 'src/lib/google/calendar.ts, crypto.ts, src/app/api/integrations/google/', 'Node crypto (AES-256-GCM), Google Calendar REST v3', 'CSRF-checked OAuth connect/callback, proactive token refresh, incremental syncToken pull, outbound event sync'],
                ['Isolated Cloud DB', 'supabase/migrations/0001_initial_schema.sql, src/lib/supabase/', 'Supabase PostgreSQL + RLS (cadence.*)', '7 user-scoped tables, fractional Kanban position ordering, automatic completed_at triggers, PostgREST schema routing'],
                ['Portability & Export', 'src/app/api/backup/, src/app/api/calendar/ics/', 'Zod, RFC-5545 ICS generator', 'Schema-versioned JSON backup export/import with ID remapping + downloadable .ics calendar feed'],
              ],
            },
          ],
        },
        {
          id: 'design-and-shortcuts',
          title: 'Design tokens, theme hydration & keyboard shortcuts',
          blocks: [
            {
              type: 'paragraph',
              text: 'Every surface and control references unified semantic CSS custom properties under [data-theme="light"] (default) and [data-theme="dark"] in src/app/globals.css, paired with Manrope UI typography and tabular DM Mono numerals for KPI counts, subtask fractions, and dates. Core brand tokens anchor on Cerulean (#2C99D6), Crimson (#EB2F33) for high-priority/overdue alerts, Amber Gold (#D8A23D) for In Review, and Mint Emerald (#55B692) for completed and live-synced indicators.',
            },
            {
              type: 'table',
              columns: ['SHORTCUT / CONTROL', 'ACTION', 'SCOPE'],
              rows: [
                ['⌘K / Ctrl+K', 'Toggle global Command Palette for quick task search, navigation, and workspace switching', 'Global app shell'],
                ['N', 'Open slide-over Task Detail Drawer pre-configured to create a new task', 'Global app shell (outside text inputs)'],
                ['Esc', 'Close active Task Detail Drawer, Workspace Modal, or Command Palette', 'Global app shell'],
                ['Write | Preview', 'Switch Markdown task descriptions between editing and rehype-sanitize XSS-safe GFM rendering', 'Task Detail Drawer'],
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'supabase-multi-schema',
      label: 'Multi-Schema & RLS',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'Cadence',
      subtitle: 'Isolated cadence.* PostgreSQL Schema, RLS & Lazy Provisioning',
      lead: 'Walkthrough of supabase/migrations/0001_initial_schema.sql, src/lib/supabase/, and src/lib/data/load-initial-data.ts: co-hosting cleanly on a shared Supabase Free-Tier project with zero cross-app side effects.',
      sections: [
        {
          id: 'multi-schema-isolation',
          title: 'Multi-schema isolation & zero auth.users triggers',
          blocks: [
            {
              type: 'paragraph',
              text: 'To stay within Supabase Free Tier project limits while safely co-hosting alongside sibling applications (such as ProspectIQ), Cadence places 100% of its database objects inside a dedicated PostgreSQL schema (cadence, configured via NEXT_PUBLIC_SUPABASE_SCHEMA). Browser, Server, and Middleware Supabase clients pass { db: { schema: getSupabaseSchema() } } to PostgREST, and every table enforces strict auth.uid() = user_id Row-Level Security using only the publishable anon key:',
            },
            {
              type: 'table',
              columns: ['TABLE', 'KEY COLUMNS & CONSTRAINTS', 'RLS & INDEX DESIGN'],
              rows: [
                ['cadence.profiles', 'id (uuid PK -> auth.users), full_name, avatar_url, timezone, theme_preference', 'Own-row SELECT/INSERT/UPDATE (auth.uid() = id); lazily provisioned on first login'],
                ['cadence.workspaces', 'id, user_id, name (varchar 100), color, icon, position (double precision)', 'Own-row CRUD; indexed by user_id; CASCADE delete removes owned tasks'],
                ['cadence.tasks', 'id, user_id, workspace_id, title, description, priority, status, position, start_at, due_date, all_day, completed_at, google_event_id, google_etag, sync_to_google', 'INSERT/UPDATE policies verify workspace_id belongs to auth.uid(); composite (user_id, status, position) + partial google_event_id indexes'],
                ['cadence.subtasks', 'id, user_id, task_id, title, is_completed, position (integer)', 'INSERT verifies task_id ownership; indexed on (task_id, position)'],
                ['cadence.tags & task_tags', 'tags: unique(user_id, lower(name)); task_tags: composite PK (task_id, tag_id)', 'Case-insensitive unique tag names per user; join RLS checks both task & tag ownership'],
                ['cadence.google_calendar_connections', 'user_id UNIQUE, google_email, access_token_enc, refresh_token_enc, token_expires_at, selected_calendar_id, sync_token, sync_enabled', 'Strict per-user RLS; stores AES-256-GCM ciphertexts exclusively'],
              ],
            },
            {
              type: 'code',
              language: 'sql',
              filename: 'supabase/migrations/0001_initial_schema.sql (Triggers & Cross-Table RLS)',
              code: `-- Auto-maintain completed_at for Dashboard velocity analytics\ncreate or replace function cadence.sync_task_completed_at()\nreturns trigger language plpgsql as $$\nbegin\n  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then\n    new.completed_at = coalesce(new.completed_at, now());\n  elsif new.status <> 'completed' then\n    new.completed_at = null;\n  end if;\n  return new;\nend;\n$$;\n\n-- Cross-table ownership guard prevents linking a task to another user's workspace\ncreate policy "cadence_tasks_insert_own" on cadence.tasks for insert with check (\n  auth.uid() = user_id\n  and exists (select 1 from cadence.workspaces w where w.id = workspace_id and w.user_id = auth.uid())\n);`,
            },
          ],
        },
        {
          id: 'lazy-provisioning-and-oauth',
          title: 'Lazy SSR provisioning & query-free OAuth callbacks',
          blocks: [
            {
              type: 'paragraph',
              text: 'Because auth.users is shared across co-hosted schemas, Cadence intentionally avoids attaching triggers to auth.users. Instead, loadInitialData() fetches all 5 resource slices in parallel (Promise.all) and lazily upserts cadence.profiles plus a starter "Personal" workspace (#2C99D6) only on a user\'s first authenticated visit to Cadence. If Supabase env vars are missing or placeholders, loadInitialData() returns buildDemoInitialData() so the full UI boots cleanly in Local Preview Mode.',
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'src/lib/data/load-initial-data.ts & src/app/auth/callback/route.ts',
              code: `// Lazy-provision Cadence profile without touching shared auth.users triggers\nif (!profileRow) {\n  const { data: createdProfile } = await supabase\n    .from("profiles")\n    .upsert(\n      { id: user.id, full_name: fallbackName, avatar_url: fallbackAvatar, theme_preference: "light" },\n      { onConflict: "id" }\n    )\n    .select("*")\n    .maybeSingle();\n  if (createdProfile) profileRow = createdProfile;\n}\n\n// src/app/auth/callback/route.ts — recover post-login destination via cookie\n// so Supabase OAuth redirectTo URLs stay strictly query-parameter free\nconst cookieNext = cookieStore.get("cadence_auth_next")?.value;\nconst rawNext = searchParams.get("next") ?? (cookieNext ? decodeURIComponent(cookieNext) : undefined) ?? "/dashboard";\nconst next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";`,
            },
          ],
        },
      ],
    },
    {
      id: 'google-calendar-sync',
      label: 'Google Calendar 2-Way Sync',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '10 MIN READ',
      title: 'Cadence',
      subtitle: 'AES-256-GCM Token Vault & Incremental syncToken Engine',
      lead: 'Inside src/lib/google/crypto.ts, src/lib/google/calendar.ts, and src/app/api/integrations/google/*: encrypting OAuth credentials at rest and syncing events cleanly within Vercel Hobby serverless timeouts.',
      sections: [
        {
          id: 'aes-gcm-vault',
          title: 'Authenticated AES-256-GCM token encryption (src/lib/google/crypto.ts)',
          blocks: [
            {
              type: 'callout',
              variant: 'warning',
              title: 'ZERO PLAINTEXT OAUTH CREDENTIALS',
              text: 'Google access_token and refresh_token values are never stored in plaintext in PostgreSQL or exposed to browser code. Every write runs through encryptSecret() with a fresh 12-byte random IV and GCM authentication tag, serialized as base64url(iv).base64url(tag).base64url(ciphertext).',
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'src/lib/google/crypto.ts',
              code: `const ALGO = "aes-256-gcm";\n\nexport function encryptSecret(plaintext: string): string {\n  const key = getKey(); // 64-hex-char (32-byte) ENCRYPTION_KEY env var\n  const iv = crypto.randomBytes(12);\n  const cipher = crypto.createCipheriv(ALGO, key, iv);\n  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);\n  const tag = cipher.getAuthTag();\n  return \`\${iv.toString("base64url")}.\${tag.toString("base64url")}.\${encrypted.toString("base64url")}\`;\n}\n\nexport function decryptSecret(payload: string): string {\n  const [ivStr, tagStr, dataStr] = payload.split(".");\n  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivStr, "base64url"));\n  decipher.setAuthTag(Buffer.from(tagStr, "base64url"));\n  return Buffer.concat([decipher.update(Buffer.from(dataStr, "base64url")), decipher.final()]).toString("utf8");\n}`,
            },
          ],
        },
        {
          id: 'two-way-sync-engine',
          title: 'OAuth handshake, outbound push & incremental syncToken pull',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  title: '1. CSRF-Protected OAuth Connect & Callback',
                  detail: 'GET /api/integrations/google/connect generates a 24-byte random state nonce in an HTTP-only cookie (cadence_google_oauth_state, 10m maxAge) and redirects with access_type=offline & prompt=consent. Callback verifies the state cookie, exchanges the code, encrypts both tokens, upserts google_calendar_connections, and immediately triggers an initial pull sync.',
                },
                {
                  title: '2. Proactive 120-Second Token Refresh (getValidGoogleConnection)',
                  detail: 'Before any Google API request, compares token_expires_at against Date.now() + 120_000. If expiring soon, decrypts refresh_token_enc, fetches a fresh access token, re-encrypts access_token_enc, and updates the row seamlessly.',
                },
                {
                  title: '3. Outbound Push with Remote-Delete Recovery (pushTaskToGoogleCalendar)',
                  detail: 'Triggered on task create/update/delete Server Actions. Stamps extendedProperties.private.cadenceTaskId and prefixes completed tasks with "✓ ". If PATCH returns 404 or 410 (event deleted in Google Calendar), automatically falls back to POST to recreate it; if due_date/start_at is cleared, deletes the remote event.',
                },
                {
                  title: '4. Incremental Pull, 410 Recovery & LWW Merge (pullGoogleCalendarChanges)',
                  detail: 'Queries Google Calendar Events v3 with stored sync_token (keeping Vercel latency < 2s). On HTTP 410 Gone (expired sync token), falls back to a [-30d, +90d] window. Skips no-ops via google_etag, resolves edits via Last-Write-Wins (ev.updated vs task.updated_at), and clears schedule fields—never silently deleting subtasks or notes—when a Google event is cancelled.',
                },
              ],
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'src/lib/google/calendar.ts (Incremental Delta & LWW Merge)',
              code: `let res = await fetchDelta(Boolean(connection.sync_token));\nif (res.status === 410) {\n  // Sync token expired — fall back to clean [-30d, +90d] windowed re-sync\n  res = await fetchDelta(false);\n}\n\nif (existingTask) {\n  if (ev.etag && existingTask.google_etag === ev.etag) continue;\n  if (ev.updated && new Date(ev.updated).getTime() <= new Date(existingTask.updated_at).getTime()) {\n    continue; // Local Cadence edit is newer (Last-Write-Wins)\n  }\n  await supabase.from("tasks").update({\n    title: rawTitle.slice(0, 255),\n    start_at: startAt,\n    due_date: dueDate,\n    all_day: isAllDay,\n    google_etag: ev.etag ?? null,\n    status: isMarkedDone ? "completed" : existingTask.status,\n  }).eq("id", existingTask.id).eq("user_id", userId);\n}`,
            },
            {
              type: 'paragraph',
              text: 'For users who prefer calendar subscriptions or offline imports without connecting Google OAuth, GET /api/calendar/ics invokes generateIcsFeed() (src/lib/utils/ics.ts) to emit a standards-compliant RFC-5545 VCALENDAR/VEVENT export (cadence-tasks.ics) preserving all-day VALUE=DATE entries, UTC timed blocks, workspace metadata, and escaped descriptions.',
            },
          ],
        },
      ],
    },
    {
      id: 'kanban-analytics-time',
      label: 'Kanban, Dates & Analytics',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '8 MIN READ',
      title: 'Cadence',
      subtitle: 'Fractional DnD Ordering, Timezone Safety & Dashboard Velocity',
      lead: 'Inside BoardView.tsx, dates.ts, analytics.ts, and CadenceProvider.tsx: O(1) fractional card reordering, local-timezone input safety, and live velocity analytics.',
      sections: [
        {
          id: 'fractional-kanban',
          title: 'O(1) fractional Kanban reordering (@dnd-kit)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Instead of rewriting every row in a column when a user drags a card, cadence.tasks stores a double precision position column. BoardView.tsx configures PointerSensor (5px activation threshold so clicks still open the Task Detail Drawer) alongside KeyboardSensor, and computes midpoint fractional coordinates in handleDragEnd():',
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'src/components/features/board/BoardView.tsx (handleDragEnd)',
              code: `if (overId.startsWith("col-")) {\n  targetStatus = overId.replace("col-", "") as TaskStatus;\n  targetTasks = tasksByStatus[targetStatus].filter((t) => t.id !== draggedId);\n  const lastPos = targetTasks.length ? targetTasks[targetTasks.length - 1].position : 0;\n  void patchTask(draggedId, { status: targetStatus, position: lastPos + 1000 });\n  return;\n}\n\nconst overIndex = targetTasks.findIndex((t) => t.id === overId);\nconst newPosition =\n  overIndex <= 0\n    ? (targetTasks[0]?.position ?? 1000) - 500\n    : (targetTasks[overIndex - 1].position + targetTasks[overIndex].position) / 2;\n\nvoid patchTask(draggedId, { status: targetStatus, position: newPosition });`,
            },
          ],
        },
        {
          id: 'timezone-and-velocity',
          title: 'Timezone-safe scheduling & completion velocity engine',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  title: 'UTC Storage <-> Local UI Conversion (src/lib/utils/dates.ts)',
                  detail: 'PostgreSQL stores all start_at and due_date timestamps in UTC. isoToLocalInputValue() formats local YYYY-MM-DDTHH:mm strings without UTC offset drift, while localInputValueToIso(value, allDay=true) anchors all-day dates at local 12:00 midday so cross-timezone conversions never roll a due date backward by one day. Explicit "en-US" formatting prevents Next.js SSR/client hydration mismatches.',
                },
                {
                  title: '7-Day & 30-Day Completion Velocity (src/lib/utils/analytics.ts)',
                  detail: 'computeDashboardMetrics() derives KPI totals, overdue alerts, workspace progress percentages, daily 7-day completion bars with week-over-week deltaPct, 6 five-day buckets for 30-day trend analysis, and the top-6 urgency-sorted Upcoming & Due Soon queue.',
                },
                {
                  title: 'Optimistic State & Local Preview Persistence (CadenceProvider.tsx)',
                  detail: 'In supabase mode, mutations update React state immediately while executing Next.js Server Actions (src/app/actions/cadence.ts) and refreshing routes on error; in demo mode, state persists seamlessly to localStorage under cadence_preview_v1.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'portability-and-validation',
      label: 'Server Actions & Portability',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '7 MIN READ',
      title: 'Cadence',
      subtitle: 'Zod Contracts, Versioned JSON Backups & Edge Middleware',
      lead: 'How Cadence enforces runtime payload validation across Server Actions, handles full workspace/tag/subtask JSON backup portability, and guards protected routes at the Next.js middleware edge.',
      sections: [
        {
          id: 'zod-portability',
          title: 'Versioned JSON backup schema & safe ID remapping',
          blocks: [
            {
              type: 'paragraph',
              text: 'Every mutation and backup payload passes through strict Zod schemas in src/lib/validations/schemas.ts. GET /api/backup/export serializes workspaces, tags, tasks, subtasks, and tag_names under schemaVersion: "1.0" into cadence-backup-YYYY-MM-DD.json. On import, POST /api/backup/import validates the payload with cadenceBackupSchema.safeParse(), matches or creates workspaces by lowercase name via wsIdMap, deduplicates tags via tagIdByLowerName, remaps foreign keys cleanly into the authenticated user\'s account, and sets sync_to_google: false on imported tasks to avoid bulk-flooding Google Calendar.',
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'src/lib/validations/schemas.ts (Backup & Task Contracts)',
              code: `export const cadenceBackupSchema = z.object({\n  schemaVersion: z.literal("1.0"),\n  exportedAt: z.string(),\n  workspaces: z.array(z.object({\n    id: z.string(),\n    name: z.string().trim().min(1).max(100),\n    color: z.string().default("#2C99D6"),\n    icon: z.string().default("folder"),\n    position: z.number().optional(),\n  })),\n  tags: z.array(z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(50), color: z.string().default("#2C99D6") })).default([]),\n  tasks: z.array(z.object({\n    workspace_id: z.string(),\n    title: z.string().trim().min(1).max(255),\n    priority: taskPrioritySchema.default("medium"),\n    status: taskStatusSchema.default("todo"),\n    tag_names: z.array(z.string()).default([]),\n    subtasks: z.array(z.object({ title: z.string().trim().min(1).max(255), is_completed: z.boolean().default(false), position: z.number().int().default(0) })).default([]),\n  })),\n});`,
            },
          ],
        },
        {
          id: 'middleware-guards',
          title: 'Session refresh & protected route middleware (src/lib/supabase/middleware.ts)',
          blocks: [
            {
              type: 'paragraph',
              text: 'updateSession() runs on incoming requests to refresh Supabase SSR cookies transparently, redirects unauthenticated visitors away from /dashboard, /board, /calendar, and /settings to /login?next=<pathname>, bounces authenticated users away from /login, /signup, and /forgot-password to /dashboard, and passes straight through when Supabase is unconfigured (Local Preview Mode).',
            },
          ],
        },
      ],
    },
    {
      id: 'api-and-deployment',
      label: 'API Routes, Env & CI',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: '7 MIN READ',
      title: 'Cadence',
      subtitle: 'HTTP Route Reference, Environment Matrix & Local Commands',
      lead: 'Complete reference for all Next.js App Router API endpoints, Server Actions, environment configuration, and GitHub Actions verification commands.',
      badge: '9 Routes',
      sections: [
        {
          id: 'http-routes',
          title: 'API routes & auth callback specification',
          blocks: [
            {
              type: 'table',
              columns: ['ROUTE & METHOD', 'AUTH', 'RESPONSIBILITY'],
              rows: [
                ['GET /api/health', 'Public', 'Reports runtime mode (supabase | demo), active Postgres schema, and Google Calendar configuration status'],
                ['GET /auth/callback', 'OAuth PKCE', 'Exchanges Supabase OAuth code for session and redirects safely via cadence_auth_next cookie'],
                ['GET /api/integrations/google/connect', 'Authenticated', 'Sets HTTP-only CSRF state cookie and initiates Google Calendar OAuth 2.0 offline consent flow'],
                ['GET /api/integrations/google/callback', 'Authenticated', 'Verifies state cookie, encrypts tokens with AES-256-GCM, saves connection, and runs initial delta pull'],
                ['GET /api/integrations/google/sync', 'Authenticated', 'Lists available Google Calendars (/users/me/calendarList) for target calendar selection'],
                ['POST /api/integrations/google/sync', 'Authenticated', 'Triggers manual incremental pullGoogleCalendarChanges() and returns created/updated/removed counts'],
                ['POST /api/integrations/google/disconnect', 'Authenticated', 'Deletes the user\'s google_calendar_connections record'],
                ['GET /api/backup/export', 'Authenticated', 'Streams schemaVersion 1.0 JSON backup attachment (cadence-backup-YYYY-MM-DD.json)'],
                ['POST /api/backup/import', 'Authenticated', 'Zod-validates uploaded JSON backup, remaps workspace/tag IDs, and inserts tasks & subtasks'],
                ['GET /api/calendar/ics', 'Authenticated', 'Generates RFC-5545 text/calendar (.ics) download for all dated tasks'],
              ],
            },
          ],
        },
        {
          id: 'env-and-commands',
          title: 'Environment variables, local dev & GitHub Actions CI',
          blocks: [
            {
              type: 'table',
              columns: ['VARIABLE', 'SCOPE', 'PURPOSE'],
              rows: [
                ['NEXT_PUBLIC_APP_URL', 'Client & Server', 'Canonical deployment URL used to construct OAuth redirect URIs (e.g. https://kamal-cadence.vercel.app)'],
                ['NEXT_PUBLIC_SUPABASE_URL', 'Client & Server', 'Shared Supabase Free-Tier project REST URL'],
                ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Client & Server', 'Supabase publishable key (strictly RLS-enforced; no service_role key required)'],
                ['NEXT_PUBLIC_SUPABASE_SCHEMA', 'Client & Server', 'Isolated PostgreSQL schema name (default: cadence; must be exposed in Supabase Data API settings)'],
                ['GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET', 'Server Only', 'Google Cloud OAuth 2.0 Web Client credentials with Calendar API enabled'],
                ['ENCRYPTION_KEY', 'Server Only', '64-hex-character (32-byte) AES-256-GCM key for encrypting OAuth tokens at rest'],
              ],
            },
            {
              type: 'code',
              language: 'bash',
              filename: 'Local Development, Key Generation & CI Commands (.github/workflows/ci.yml)',
              code: `# 1. Install dependencies & configure local environment (optional — boots in Local Preview Mode without keys)\nnpm install\ncp .env.example .env.local\n\n# 2. Generate 32-byte AES-256-GCM ENCRYPTION_KEY for Google Calendar sync\nnode -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\n\n# 3. Run Next.js 15 Turbopack dev server (http://localhost:3000)\nnpm run dev\n\n# 4. Run full CI verification pipeline (lint + strict TypeScript + production build)\nnpm run lint && npm run typecheck && npm run build`,
            },
          ],
        },
      ],
    },
  ],
}
