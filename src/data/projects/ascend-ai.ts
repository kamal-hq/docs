import type { ProjectDocumentation } from '../docs'

export const ascendAiDocs: ProjectDocumentation = {
  slug: 'ascend-ai',
  updatedLabel: 'RELEASE v3.0.0',
  pages: [
    {
      id: 'introduction',
      label: 'Architecture Overview',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '8 MIN READ',
      title: 'Ascend AI',
      subtitle: 'System Architecture & Execution Model (v3)',
      lead: 'Ascend AI is an asynchronous career, scholarship, and research intelligence platform that parses a student CV (PDF) or raw notes into a structured profile in ~2–4 seconds, then unlocks 11 independent on-demand capabilities streamed over Server-Sent Events (SSE).',
      sections: [
        {
          id: 'two-phase-model',
          title: 'Two-phase asynchronous execution model',
          blocks: [
            {
              type: 'paragraph',
              text: 'Earlier monolithic iterations ran every LLM prompt sequentially on submission, causing 45–90 second blocking HTTP requests and frequent rate-limit timeouts. Ascend AI v3 splits execution into two decoupled phases backed by SQLite WAL persistence and Redis/RQ (with an automatic in-process daemon-thread fallback):',
            },
            {
              type: 'principles',
              items: [
                {
                  num: '01',
                  title: 'Phase 1: Eager Core (~2–4s)',
                  body: 'Triggered automatically on POST /jobs. Fetches live USD->PKR FX rate, extracts structured profile JSON via gpt-oss-120b, and ranks Top-5 scholarships in <5ms.',
                },
                {
                  num: '02',
                  title: 'Phase 2: 11 Atomic Capabilities',
                  body: 'Triggered individually via POST /jobs/{id}/capabilities/{name}. Runs gpt-oss-20b with cached DuckDuckGo, ArXiv, and YouTube grounding.',
                },
                {
                  num: '03',
                  title: 'Local-First Client Isolation',
                  body: 'Every request scopes state by X-Client-Id, mirrors snapshots to browser localStorage, and transparently restores sessions after free-tier container sleep.',
                },
              ],
            },
            {
              type: 'table',
              columns: ['SUBSYSTEM', 'DIRECTORY / FILES', 'RUNTIME STACK', 'CORE RESPONSIBILITY'],
              rows: [
                ['Frontend Studio', 'frontend/src/', 'Vite 8, React 19, TypeScript, Tailwind v4', 'Workspace UI, SSE consumers, localStorage snapshot sync, cold-start warmup modal'],
                ['API Gateway', 'api/main.py, api/routes/, api/sse.py', 'FastAPI, sse-starlette, pdfplumber, python-docx', 'REST job lifecycle, PDF text extraction, SSE event streams, .docx export'],
                ['Queue & Workers', 'worker/queue.py, eager.py, capabilities.py', 'Redis 5+, RQ (rq.SimpleWorker), threading', 'Queue dispatch with automatic zero-config daemon thread fallback'],
                ['Hybrid AI Agents', 'agents/, agents/common/cache.py', 'Groq HTTP API, Pydantic v2, DuckDuckGo, ArXiv', 'Structured JSON completions + 7-day SQLite search/scrape cache (data/cache.db)'],
                ['Storage & Ranker', 'data/db.py, agents/rag_matcher.py', 'SQLite WAL (ascend.db), BM25 JSON ranker', 'Multi-revision thread storage and <5ms ranking across 371 curated scholarships'],
              ],
            },
          ],
        },
        {
          id: 'centralized-config',
          title: 'Centralized configuration (config.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'All environment variables, model identifiers, capability whitelists, and filesystem paths are resolved once in config.py at the repository root. Other modules never call os.getenv() or hardcode relative paths, ensuring workers and FastAPI routes behave identically regardless of the current working directory.',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'config.py',
              code: `import os\nfrom pathlib import Path\nfrom dotenv import load_dotenv\n\nload_dotenv()\n\n# Prevent LiteLLM from attempting slow remote cost-map downloads on cold starts\nos.environ.setdefault("LITELLM_LOCAL_MODEL_COST_MAP", "True")\n\n_ROOT = Path(__file__).resolve().parent\n\nGROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")\nREDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")\nCORS_ORIGIN_REGEX: str | None = os.getenv("CORS_ORIGIN_REGEX") or r"https://.*\\.vercel\\.app"\n\n# Model segregation: 120B for eager profile extraction, 20B for atomic capabilities\nMODEL_EAGER_PROFILE: str = "groq/openai/gpt-oss-120b"\nMODEL_CAPABILITIES: str = "groq/openai/gpt-oss-20b"\n\nALLOWED_CAPABILITIES: frozenset[str] = frozenset({\n    "sop_draft", "sop_review", "scholarship_analysis", "deadline_verification",\n    "faculty_outreach", "research_proposal", "career_paths", "learning_roadmap",\n    "freelance_pack", "academia_vs_industry", "local_ecosystem",\n})\n\nSQLITE_DB_PATH: str = str(_ROOT / "data" / "ascend.db")\nCACHE_DB_PATH: str = str(_ROOT / "data" / "cache.db")\nSCHOLARSHIPS_JSON: str = str(_ROOT / "data" / "scholarships.json")`,
            },
          ],
        },
      ],
    },
    {
      id: 'local-setup',
      label: 'Setup & Health Lifespan',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '7 MIN READ',
      title: 'Ascend AI',
      subtitle: 'Local Setup, Lifespan & Warmup Internals',
      lead: 'Configure the Python backend and React 19 frontend locally, and understand how the FastAPI lifespan and /health warmup endpoint initialize SQLite, demo seeds, and the scholarship index.',
      sections: [
        {
          id: 'lifespan-boot',
          title: 'FastAPI lifespan & readiness probe (api/main.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'When api/main.py boots, its async lifespan context manager runs init_db() to create or migrate SQLite tables, seeds the default demo profile if the database is empty, and preloads all 371 scholarships into memory. The GET /health endpoint inspects Redis connectivity, active RQ workers, SQLite job counts for the caller X-Client-Id, and optionally warms the live USD->PKR exchange rate when warmup=true is passed.',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'api/main.py',
              code: `@asynccontextmanager\nasync def lifespan(app: FastAPI):\n    """Create / migrate SQLite tables, preload scholarship index, and seed default DB."""\n    init_db()\n    if count_jobs() == 0:\n        seed_demo_for_client("default")\n    _load_scholarships()\n    yield\n\n@app.get("/health", tags=["system"])\ndef health_check(warmup: bool = False, client_id: str = Depends(get_client_id)):\n    redis_ok = False\n    workers_active = 0\n    try:\n        redis_ok = bool(get_connection().ping())\n        if redis_ok:\n            workers_active = count_active_workers()\n    except Exception:\n        redis_ok = False\n\n    scholarships_loaded = len(_load_scholarships())\n    if warmup:\n        from worker.eager import _fetch_live_rate\n        _fetch_live_rate()\n\n    execution_mode = "rq" if (redis_ok and workers_active > 0) else "async_threads"\n    return {\n        "status": "ok",\n        "redis": redis_ok,\n        "workers_active": workers_active,\n        "execution_mode": execution_mode,\n        "version": "3.0.0",\n        "checks": {\n            "api": True,\n            "scholarships_loaded": scholarships_loaded,\n            "ai_configured": bool(GROQ_API_KEY),\n        },\n    }`,
            },
          ],
        },
        {
          id: 'running-locally',
          title: 'Running in 2-terminal thread mode vs. Redis + RQ mode',
          blocks: [
            {
              type: 'paragraph',
              text: 'Because worker/queue.py checks count_active_workers() before enqueueing, you only need two terminals for local development. If you want isolated process execution, start Redis and an RQ SimpleWorker in a third terminal.',
            },
            {
              type: 'code',
              language: 'powershell',
              filename: 'Local Development Commands',
              code: `# 1. Create virtual environment & install backend dependencies\npython -m venv venv\n.\\venv\\Scripts\\activate\npip install -r requirements.txt\n\n# 2. Terminal 1 — Start FastAPI Gateway (auto-falls back to background threads)\n.\\venv\\Scripts\\python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload\n\n# 3. Terminal 2 — Start Vite React 19 Frontend\npnpm --dir frontend install\npnpm --dir frontend run dev\n\n# 4. (Optional) Terminal 3 — Dedicated Redis + RQ SimpleWorker\nredis-server --port 6379\n.\\venv\\Scripts\\python -m rq.cli worker eager capabilities --worker-class rq.SimpleWorker --url redis://localhost:6379/0`,
            },
          ],
        },
      ],
    },
    {
      id: 'queue-workers',
      label: 'Queue & Worker Engine',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '10 MIN READ',
      title: 'Ascend AI',
      subtitle: 'Queue Fallback, Eager Core & Atomic Capability Workers',
      lead: 'Code-level walkthrough of worker/queue.py, worker/eager.py, and worker/capabilities.py showing how jobs transition through pending, running, completed, and failed states.',
      sections: [
        {
          id: 'hybrid-queue',
          title: 'Hybrid Redis/RQ + daemon thread dispatcher (worker/queue.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'A common failure mode in local development and free-tier PaaS containers is enqueueing a job into Redis when no worker process is listening, leaving the job stuck in queued forever. worker/queue.py pings Redis with a tight 350ms connect timeout and verifies that at least one RQ worker is subscribed to the target queue (eager or capabilities) before using RQ; otherwise it spawns a daemon threading.Thread in-process.',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'worker/queue.py',
              code: `def get_connection() -> redis.Redis:\n    return redis.Redis.from_url(REDIS_URL, socket_connect_timeout=0.35, socket_timeout=0.5)\n\ndef count_active_workers(queue_name: str | None = None) -> int:\n    try:\n        conn = get_connection()\n        conn.ping()\n        workers = rq.Worker.all(connection=conn)\n        if queue_name is None:\n            return len(workers)\n        return sum(1 for w in workers if queue_name in w.queue_names())\n    except Exception:\n        return 0\n\ndef enqueue_eager(job_id: str, input_data: dict) -> str:\n    if count_active_workers("eager") > 0:\n        get_queue("eager").enqueue("worker.eager.run_eager_job", job_id, input_data, job_timeout="5m")\n        return "rq"\n\n    t = threading.Thread(target=_run_eager_thread, args=(job_id, input_data), daemon=True)\n    t.start()\n    return "thread"`,
            },
          ],
        },
        {
          id: 'eager-worker',
          title: 'Phase 1 Eager Core execution (worker/eager.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'run_eager_job() executes three sequential steps and persists each slice into the results table immediately so the SSE stream can push progressive updates to the React UI as soon as each slice finishes:',
            },
            {
              type: 'list',
              items: [
                {
                  title: 'Step 1 — _fetch_live_rate() -> module_name="context"',
                  detail: 'Checks data/cache.db under namespace fx_usd_pkr (24-hour TTL). On a cache miss, queries https://open.er-api.com/v6/latest/USD with a 4-second timeout and falls back to 278.5 PKR/USD if offline.',
                },
                {
                  title: 'Step 2 — extract_profile(input_text) -> module_name="profile"',
                  detail: 'Calls Groq (groq/openai/gpt-oss-120b) to extract structured student metadata (name, degree, GPA, target_program, profile_strength_score 0–100, priority_gaps, and 6-month roadmap), then updates the summary columns on the jobs row.',
                },
                {
                  title: 'Step 3 — query_scholarships_structured(profile_data, n_results=5) -> module_name="rag_matches"',
                  detail: 'Runs the in-memory BM25 + domain ranker over data/scholarships.json (~3ms) and saves the top 5 matched scholarships.',
                },
                {
                  title: 'Step 4 — prune_and_promote_revision()',
                  detail: 'If the user edited and re-analyzed an older CV revision (base_version), prunes superseded future revisions on that thread_id before marking the job completed.',
                },
              ],
            },
            {
              type: 'code',
              language: 'python',
              filename: 'worker/eager.py',
              code: `def run_eager_job(job_id: str, input_data: dict) -> None:\n    update_job_status(job_id, "running")\n    live_rate = _fetch_live_rate()\n    save_result(job_id, "context", {"live_rate": live_rate})\n\n    profile_data = extract_profile(input_data["input_text"])\n    save_result(job_id, "profile", profile_data)\n    update_job_meta(\n        job_id,\n        student_name=str(profile_data.get("name", "Student") or "Student"),\n        target_program=str(profile_data.get("target_program", "") or ""),\n        score=profile_data.get("profile_strength_score"),\n    )\n\n    matches = query_scholarships_structured(profile_data, n_results=5)\n    save_result(job_id, "rag_matches", {"matches": matches})\n    update_job_status(job_id, "completed")`,
            },
          ],
        },
        {
          id: 'capability-worker',
          title: 'Phase 2 Atomic Capability execution (worker/capabilities.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'When a user clicks any capability card in the studio, run_capability_job() marks that capability as running in SQLite, loads the completed profile, context, rag_matches, and any already-completed sibling capabilities, and dispatches to agents/capabilities.py:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'worker/capabilities.py',
              code: `def run_capability_job(job_id: str, capability_name: str, options: dict | None = None) -> None:\n    save_capability_state(job_id, capability_name, "running")\n    try:\n        rows = get_results(job_id)\n        by_name = {r["module_name"]: r["payload"] for r in rows if r["status"] == "completed"}\n        profile = by_name.get("profile")\n        if not profile:\n            raise ValueError("Eager profile result is required before running capabilities.")\n\n        live_rate = float((by_name.get("context") or {}).get("live_rate", 278.5))\n        rag_matches = (by_name.get("rag_matches") or {}).get("matches", [])\n\n        result = dispatch_capability(\n            capability_name,\n            profile=profile,\n            live_rate=live_rate,\n            rag_matches=rag_matches,\n            existing_results=by_name,\n            options=options or {},\n        )\n        save_capability_state(job_id, capability_name, "completed", payload=result)\n    except Exception as exc:\n        save_capability_state(\n            job_id, capability_name, "failed",\n            payload={"error": str(exc)}, error_message=str(exc),\n        )\n        raise`,
            },
          ],
        },
      ],
    },
    {
      id: 'rag-and-agents',
      label: 'BM25 Ranker & AI Agents',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'Ascend AI',
      subtitle: 'In-Memory BM25 Scholarship Ranker & Cached Grounding',
      lead: 'How agents/rag_matcher.py ranks 371 curated scholarships in under 5 milliseconds without PyTorch/ChromaDB cold-start overhead.',
      sections: [
        {
          id: 'bm25-design',
          title: 'Why in-process BM25 replaced ChromaDB & SentenceTransformers',
          blocks: [
            {
              type: 'paragraph',
              text: 'Loading PyTorch, SentenceTransformer weights, and ChromaDB on worker startup added 25–45 seconds of CPU delay and exceeded 512 MB RAM on free-tier containers. agents/rag_matcher.py replaces vector embeddings with a deterministic, domain-weighted BM25/TF-IDF scorer combined with country alias expansion, degree-level matching, and earliest-closing-month deadline extraction.',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'agents/rag_matcher.py',
              code: `def query_scholarships_structured(profile: dict, n_results: int = 5) -> list[dict]:\n    scholarships = _load_scholarships()\n    query_parts: list[str] = []\n    for key in ("degree", "target_program", "career_goal"):\n        if profile.get(key):\n            query_parts.append(str(profile[key]))\n    for key in ("research_interests", "target_country", "target_scholarships", "special_skills"):\n        vals = profile.get(key)\n        if vals:\n            query_parts.extend(str(v) for v in vals)\n\n    query_tokens = set(_tokenize(" ".join(query_parts))) or {"graduate", "master", "stem", "data", "science"}\n    docs = [\n        _tokenize(f"{s.get('name', '')} {s.get('country', '')} {s.get('fields', '')} {s.get('note', '')}")\n        for s in scholarships\n    ]`,
            },
            {
              type: 'list',
              items: [
                {
                  title: 'Country Alias Expansion (_COUNTRY_ALIASES)',
                  detail: 'Maps region shorthands such as "uk", "usa", "uae", and "europe (multiple)" (18 European countries) so a student targeting "Germany" matches both Germany-specific awards (DAAD) and pan-European programs (Erasmus Mundus).',
                },
                {
                  title: 'Deadline Calendar Metadata (_deadline_calendar_meta)',
                  detail: 'Parses natural-language deadline strings into a tuple of (month_number 1..13, month_label) so scholarships can be sorted chronologically alongside rolling deadlines.',
                },
                {
                  title: '7-Day Search & Scrape Cache (agents/common/cache.py)',
                  detail: 'Caches DuckDuckGo, ArXiv, YouTube, and scholarship portal scrape results in data/cache.db so repeated capability runs avoid external network latency.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'database-and-sse',
      label: 'SQLite WAL & SSE Streams',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'Ascend AI',
      subtitle: 'Database Schema, Auto-Migrations & Live SSE Generators',
      lead: 'Inside data/db.py and api/sse.py: concurrent SQLite WAL access, thread revisioning, and real-time Server-Sent Event streaming.',
      sections: [
        {
          id: 'sqlite-schema',
          title: 'SQLite WAL schema & automatic column migration (data/db.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'data/db.py opens every SQLite connection with PRAGMA journal_mode=WAL and PRAGMA foreign_keys=ON so background worker threads and FastAPI SSE polling coroutines can read and write concurrently without locking. On startup, init_db() inspects PRAGMA table_info() and runs ALTER TABLE ADD COLUMN for any missing v3 columns.',
            },
            {
              type: 'code',
              language: 'sql',
              filename: 'data/db.py (_SCHEMA)',
              code: `CREATE TABLE IF NOT EXISTS jobs (\n    id              TEXT PRIMARY KEY,\n    client_id       TEXT NOT NULL DEFAULT 'default',\n    thread_id       TEXT NOT NULL DEFAULT '',\n    version         INTEGER NOT NULL DEFAULT 1,\n    source_text     TEXT NOT NULL DEFAULT '',\n    status          TEXT NOT NULL DEFAULT 'pending'\n                        CHECK (status IN ('pending', 'running', 'completed', 'failed')),\n    input_preview   TEXT NOT NULL DEFAULT '',\n    student_name    TEXT NOT NULL DEFAULT '',\n    target_program  TEXT NOT NULL DEFAULT '',\n    score           INTEGER,\n    created_at      TEXT NOT NULL,\n    updated_at      TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS results (\n    id              INTEGER PRIMARY KEY AUTOINCREMENT,\n    job_id          TEXT    NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,\n    module_name     TEXT    NOT NULL,\n    status          TEXT    NOT NULL DEFAULT 'completed',\n    payload         TEXT    NOT NULL DEFAULT '{}',\n    error_message   TEXT,\n    completed_at    TEXT    NOT NULL,\n    UNIQUE (job_id, module_name)\n);`,
            },
          ],
        },
        {
          id: 'sse-generators',
          title: 'Server-Sent Events streaming loop (api/sse.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'api/sse.py exposes two EventSourceResponse streams mounted under /jobs: GET /jobs/{job_id}/stream for Phase 1 eager slices and GET /jobs/{job_id}/capabilities/{capability_name}/stream for individual Phase 2 capability runs. Each async generator polls SQLite every 0.5 seconds (up to _MAX_WAIT = 180.0s) and yields structured events:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'api/sse.py',
              code: `async def _capability_event_generator(job_id: str, capability_name: str):\n    last_status: str | None = None\n    elapsed: float = 0.0\n\n    while elapsed < _MAX_WAIT:\n        row = get_result(job_id, capability_name)\n        if row is not None:\n            status = row.get("status", "completed")\n            if status != last_status:\n                last_status = status\n                yield {\n                    "event": "capability_status",\n                    "data": json.dumps({"capability": capability_name, "status": status}),\n                }\n            if status == "completed":\n                yield {\n                    "event": "result",\n                    "data": json.dumps({"capability": capability_name, "payload": row["payload"]}, default=str),\n                }\n                yield {"event": "done", "data": "{}"}\n                return\n            if status == "failed":\n                err_msg = row.get("error_message") or "Capability failed"\n                yield {"event": "error", "data": json.dumps({"capability": capability_name, "error": err_msg})}\n                yield {"event": "done", "data": "{}"}\n                return\n        await asyncio.sleep(0.5)\n        elapsed += 0.5`,
            },
          ],
        },
      ],
    },
    {
      id: 'api-reference',
      label: 'REST API & Capabilities',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: '8 MIN READ',
      title: 'Ascend AI',
      subtitle: 'Endpoints, Pydantic Contracts & 11 Capabilities',
      lead: 'Complete HTTP endpoint specification, request/response schemas in api/routes/jobs.py, and the 11 on-demand studio capabilities.',
      badge: '11',
      sections: [
        {
          id: 'http-endpoints',
          title: 'HTTP & SSE API endpoints',
          blocks: [
            {
              type: 'table',
              columns: ['METHOD & PATH', 'REQUEST BODY / PARAMS', 'RESPONSE MODEL', 'DESCRIPTION'],
              rows: [
                ['GET /health', '?warmup=true, X-Client-Id', 'Health JSON', 'Checks Redis, RQ workers, SQLite, loaded scholarships, and warms FX cache'],
                ['POST /jobs', 'JobCreateRequest (input_text, thread_id, base_version)', 'JobCreateResponse (201)', 'Creates job row in SQLite and enqueues Phase 1 eager core'],
                ['GET /jobs', '?limit=20&offset=0, X-Client-Id', 'JobListResponse', 'Lists latest revision per thread for the current client workspace'],
                ['GET /jobs/{job_id}', 'X-Client-Id', 'JobStatusResponse', 'Returns full job metadata, thread revisions, results map, and capability_states'],
                ['POST /jobs/{job_id}/capabilities/{cap}', 'CapabilityTriggerRequest (custom_notes, sop_text)', 'CapabilityEnqueueResponse', 'Queues one of the 11 allowed capabilities for asynchronous execution'],
                ['POST /jobs/restore', 'JobsRestoreRequest (up to 30 snapshots)', 'Restore summary JSON', 'Restores browser localStorage job snapshots back into SQLite after container sleep'],
                ['GET /jobs/{job_id}/stream', '?client_id=...', 'text/event-stream', 'Streams result, status, and done SSE frames for Phase 1 eager slices'],
                ['GET /jobs/{job_id}/capabilities/{cap}/stream', '?client_id=...', 'text/event-stream', 'Streams capability_status, result, error, and done SSE frames'],
              ],
            },
          ],
        },
        {
          id: 'capabilities-matrix',
          title: 'On-demand capability specifications',
          blocks: [
            {
              type: 'table',
              columns: ['CAPABILITY KEY', 'DOMAIN', 'MODEL & GROUNDING', 'STRUCTURED OUTPUT PAYLOAD'],
              rows: [
                ['eager_core', 'Core Profile', 'gpt-oss-120b + BM25 + FX API', 'Profile Strength Score (0-100), 3 Priority Gaps, 6-Month Roadmap, Top-5 RAG Scholarships'],
                ['sop_draft', 'Study Abroad', 'gpt-oss-20b + custom_notes', 'Multi-paragraph tailored Statement of Purpose grounded in CV evidence'],
                ['sop_review', 'Study Abroad', 'gpt-oss-20b + sop_text', '25-point rubric evaluation across 5 dimensions with paragraph-level rewrites'],
                ['scholarship_analysis', 'Study Abroad', 'gpt-oss-20b + rag_matches', 'Eligibility breakdown, funding coverage in USD/PKR, and winning strategy per award'],
                ['deadline_verification', 'Study Abroad', 'gpt-oss-20b + DuckDuckGo cache', 'Verified official application portals, cycle dates, and required documents'],
                ['faculty_outreach', 'Research', 'gpt-oss-20b + search cache', 'Cold-email templates and faculty alignment notes tailored to research interests'],
                ['research_proposal', 'Research', 'gpt-oss-20b + ArXiv API', 'Problem statement, literature citations from ArXiv, methodology, and expected impact'],
                ['career_paths', 'Career', 'gpt-oss-20b + salary_ranges.json', '3 progression tracks with local PKR and remote USD compensation benchmarks'],
                ['learning_roadmap', 'Career', 'gpt-oss-20b + YouTube search', '12-week technical curriculum paired with curated YouTube courses and capstone milestones'],
                ['freelance_pack', 'Career', 'gpt-oss-20b', 'Upwork/Fiverr service positioning, tiered pricing packages, and proposal hooks'],
                ['academia_vs_industry', 'Decision', 'gpt-oss-20b + FX rate', '5-year financial, visa, and career trade-off matrix between MS/PhD and industry'],
                ['local_ecosystem', 'Ecosystem', 'gpt-oss-20b + local knowledge', 'Relevant Pakistani incubators (NIC, Plan9), HEC/Ignite grants, and tech communities'],
              ],
            },
          ],
        },
      ],
    },
  ],
}
