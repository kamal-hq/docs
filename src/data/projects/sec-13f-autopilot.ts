import type { ProjectDocumentation } from '../docs'

export const sec13fAutopilotDocs: ProjectDocumentation = {
  slug: 'sec-13f-autopilot',
  updatedLabel: 'RELEASE v0.1.0',
  pages: [
    {
      id: 'introduction',
      label: '7-Stage Pipeline & Parity',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '8 MIN READ',
      title: 'SEC 13F Autopilot',
      subtitle: 'Orchestrator Architecture & Cell-for-Cell Database Parity',
      lead: 'A human-approved, one-click quarterly SEC Form 13F-HR / 13F-HR/A automation pipeline built on sec_13f_analyzer@v1.1.0 with deterministic FactsBundle grounding, offline R1–R9 validation, and Pull Request review gates.',
      sections: [
        {
          id: 'pipeline-orchestrator',
          title: 'Ordered 7-stage orchestrator (src/autopilot/pipeline.py)',
          blocks: [
            {
              type: 'callout',
              variant: 'warning',
              title: 'MANDATORY RESEARCH NOTE DISCLAIMER',
              text: 'Not investment advice; AI-drafted, figures checked against filings data.',
            },
            {
              type: 'paragraph',
              text: 'Pipeline.run() in src/autopilot/pipeline.py executes seven ordered Stage classes against a shared PipelineContext, supports partial execution via --through <stage>, checks stage.should_run(ctx) before each step, and records per-stage millisecond timing and attempt counts into a structured RunLog:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/autopilot/pipeline.py',
              code: `def build_default_stages(settings: Settings | None = None) -> list[Stage]:\n    """Return the canonical ordered sequence of 13F autopilot pipeline stages."""\n    resolved_settings = settings or Settings()\n    return [\n        DetectStage(settings=resolved_settings),\n        IngestStage(settings=resolved_settings),\n        FactsStage(settings=resolved_settings),\n        NarrateStage(settings=resolved_settings),\n        ValidateStage(settings=resolved_settings),\n        ReviewStage(settings=resolved_settings),\n        PublishStage(settings=resolved_settings),\n    ]`,
            },
            {
              type: 'table',
              columns: ['STAGE', 'CLASS', 'PRIMARY ARTIFACTS', 'CONTRACT & GATE BEHAVIOR'],
              rows: [
                ['1. detect', 'DetectStage', 'reports/<period>/detect.json', 'Queries SecGateway (<= 8 req/s), classifies periods as COMPLETE, RESTATED, PARTIAL, or PROCESSED'],
                ['2. ingest', 'IngestStage', 'data/autopilot.db', 'Seeds mappings from seed/, parses 13F XMLs, applies verified splits, and reconciles cover-page totals to the dollar'],
                ['3. facts', 'FactsStage', 'reports/<period>/facts.json, diff.md', 'Computes deterministic FactsBundle with allowed_numbers, entity bindings, and period diffs'],
                ['4. narrate', 'NarrateStage', 'reports/<period>/draft.md, draft_clean.md', 'Invokes NullProvider, ManualProvider, or GeminiProvider under BudgetGuard'],
                ['5. validate', 'ValidateStage', 'reports/<period>/validation_report.json/.md', 'Audits draft offline against rules R1–R9 (retries NarrateStage up to 3 times on defect)'],
                ['6. review', 'ReviewStage', 'PR review gate', 'Enforces mandatory human review before state commitment'],
                ['7. publish', 'PublishStage', 'reports/<period>/final.md, state/processed_filings.json', 'Writes final research note, CSV exports, and updates processed_filings.json when --commit-state is set'],
              ],
            },
          ],
        },
        {
          id: 'verified-parity',
          title: 'Cell-for-cell database parity & the Sinovac ($0) audit finding',
          blocks: [
            {
              type: 'paragraph',
              text: 'Rebuilding data/autopilot.db from raw SEC filings matches the baseline sec_13f_analyzer database cell for cell across all 7 funds, 8,860 securities, and 50,311 holdings (with all 14 fund-period totals reconciling to SEC cover pages to the exact dollar). During parity verification (scripts/parity_check.py), auditing uncovered why naive value_usd > 0 filters reported 50,307 rows (4 rows short):',
            },
            {
              type: 'list',
              items: [
                {
                  title: 'Sinovac Biotech Ltd (SVA, CUSIP P8696W104) — 4 Active Zero-Value Rows',
                  detail: 'Both CalPERS (68,732 shares) and Renaissance Technologies (1,312,520 shares) reported active long holdings in SVA across 2026-Q1 and 2026-Q2 with value_usd = 0 (shares > 0, qoq_change_flag = UNCHANGED). Accounting for these 4 active zero-value rows restores exact mathematical parity: 22,853 (Q1 active) + 24,012 (Q2 active) + 3,446 (exited) = 50,311 total holdings.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'settings-and-redaction',
      label: 'Settings & Secret Redaction',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'SEC 13F Autopilot',
      subtitle: 'Environment-Only Secrets & Log Redaction Filter',
      lead: 'Inside src/autopilot/settings.py: enforcing environment-only credentials, masked representations, least-privilege key access, and regex log scrubbing.',
      sections: [
        {
          id: 'settings-invariants',
          title: 'Settings secret isolation & YAML rejection (src/autopilot/settings.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'To guarantee credentials never leak into stack traces, logs, or committed config files, Settings loads SEC_USER_AGENT, GEMINI_API_KEY, and OPENFIGI_API_KEY exclusively from environment variables. If a user places any key matching _SECRET_YAML_KEYS inside config.yaml, Settings raises a SettingsError immediately:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/autopilot/settings.py',
              code: `REDACTED_MASK = "***REDACTED***"\n\n_SECRET_YAML_KEYS = frozenset({\n    "gemini_api_key", "sec_user_agent", "openfigi_api_key",\n    "api_key", "secret", "token", "password",\n})\n\n@dataclass(slots=True)\nclass Settings:\n    sec_user_agent: str = field(default="", repr=False)\n    _gemini_api_key: str = field(default="", repr=False)\n    openfigi_api_key: str = field(default="", repr=False)\n    target_period: str = "2026-Q2"\n    baseline_period: str = "2026-Q1"\n    sec_max_requests_per_second: float = 8.0\n    llm_max_calls_per_run: int = 5`,
            },
          ],
        },
        {
          id: 'log-redaction-filter',
          title: 'In-place LogRecord scrubbing (SecretRedactionFilter)',
          blocks: [
            {
              type: 'paragraph',
              text: 'No module in sec_13f_autopilot is permitted to call print() (enforced by ruff rule T20). All output flows through Python logging handlers with SecretRedactionFilter attached, which scrubs literal secret values as well as Authorization headers, Bearer tokens, key=... query strings, and Google AIza... API keys before emission:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/autopilot/settings.py (SecretRedactionFilter)',
              code: `class SecretRedactionFilter(logging.Filter):\n    """Logging filter that redacts secret values and key/Authorization patterns."""\n\n    def filter(self, record: logging.LogRecord) -> bool:\n        try:\n            formatted = record.getMessage()\n        except Exception:\n            formatted = str(record.msg)\n\n        record.msg = self.redact(formatted)\n        record.args = ()\n        if record.exc_text:\n            record.exc_text = self.redact(record.exc_text)\n        return True`,
            },
          ],
        },
      ],
    },
    {
      id: 'sec-and-http-gateways',
      label: 'SEC & HTTP Gateways',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'SEC 13F Autopilot',
      subtitle: 'Rate-Limited SEC Gateway & Offline Fixture Session',
      lead: 'Walkthrough of src/autopilot/gateways/sec.py and http.py: strict <= 8.0 req/s rate limiting, exponential backoff, and 100% offline test execution via FixtureSecSession.',
      sections: [
        {
          id: 'gateway-boundary',
          title: 'Network isolation boundary & SecGateway rate limiting',
          blocks: [
            {
              type: 'paragraph',
              text: 'Pipeline stages, domain models, and policies never import requests, urllib, httpx, or google.genai directly; all external I/O lives in src/autopilot/gateways/. SecGateway enforces MAX_SEC_REQUESTS_PER_SECOND = 8.0 (below the SEC 10 req/s ceiling), rejects placeholder User-Agent strings via _PLACEHOLDER_USER_AGENTS, and maps HTTP failures into a typed exception hierarchy:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/autopilot/gateways/sec.py',
              code: `MAX_SEC_REQUESTS_PER_SECOND: float = 8.0\nCOVER_NS: dict[str, str] = {"n": "http://www.sec.gov/edgar/thirteenffiler"}\n\n_PLACEHOLDER_USER_AGENTS = frozenset({\n    "",\n    "your name your.email@example.com",\n    "your name your@email.com",\n    "sec_13f_analyzer research@example.com",\n})\n\nclass SecError(HttpError): ...\nclass SecConfigurationError(SecError): ...\nclass SecRateLimitError(SecError, HttpRateLimitError): ...\nclass SecServerError(SecError, HttpServerError): ...\nclass SecClientError(SecError, HttpClientError): ...\nclass SecNotFoundError(SecClientError): ...\nclass SecNetworkError(SecError): ...`,
            },
          ],
        },
        {
          id: 'fixture-sec-session',
          title: 'Offline deterministic replay (FixtureSecSession)',
          blocks: [
            {
              type: 'paragraph',
              text: 'To ensure pytest and --dry-run / replay modes execute 100% offline without mocking internal gateway methods, FixtureSecSession implements a drop-in requests.Session replacement that matches EDGAR submissions (/submissions/CIK*.json) and archive paths (/Archives/edgar/data/{cik}/{accession}/{doc}) against local test fixtures:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/autopilot/gateways/sec.py (FixtureSecSession)',
              code: `sub_match = _SUBMISSIONS_URL_RE.search(url)\nif sub_match:\n    cik = sub_match.group(1)\n    sub_path = self.submissions_dir / f"CIK{cik}.json"\n    if not sub_path.exists():\n        return _SimpleFixtureResponse(404, '{"error": "Not Found"}')\n    return _SimpleFixtureResponse(200, sub_path.read_text(encoding="utf-8"))`,
            },
          ],
        },
      ],
    },
    {
      id: 'llm-and-budget-guard',
      label: 'LLM Gateway & BudgetGuard',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'SEC 13F Autopilot',
      subtitle: 'Narrative Providers, Repair Loop & BudgetGuard',
      lead: 'Inside src/autopilot/gateways/llm.py: NullProvider, ManualProvider, GeminiProvider, and BudgetGuard enforcement.',
      sections: [
        {
          id: 'budget-guard',
          title: 'Call caps, token budgets & kill switch (BudgetGuard)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Every LLMProvider instance is wrapped in BudgetGuard, which enforces three pre-call checks in check_before_call() before any request can leave the process: the AUTOPILOT_LLM_DISABLED=1 environment kill switch, max_calls_per_run (default 5), and max_output_tokens (default 2048), plus a per-call ThreadPoolExecutor timeout (default 30.0s):',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/autopilot/gateways/llm.py',
              code: `def check_before_call(self, max_output_tokens: int) -> None:\n    """Validate kill switch, remaining call budget, and output token budget."""\n    if self.is_kill_switch_active():\n        raise LLMDisabledError(\n            "LLM execution blocked: AUTOPILOT_LLM_DISABLED kill switch is active."\n        )\n    if self._calls_made >= self.max_calls_per_run:\n        raise LLMBudgetExceededError(\n            f"LLM call budget exceeded: {self._calls_made}/{self.max_calls_per_run} "\n            f"calls already used in this run."\n        )\n    if max_output_tokens <= 0 or max_output_tokens > self.max_output_tokens:\n        raise LLMBudgetExceededError(\n            f"Requested max_output_tokens ({max_output_tokens}) violates budget cap "\n            f"(1..{self.max_output_tokens})."\n        )`,
            },
          ],
        },
        {
          id: 'provider-modes',
          title: 'Three narrative generation providers',
          blocks: [
            {
              type: 'table',
              columns: ['PROVIDER CLASS', 'CLI FLAG', 'CREDENTIALS', 'EXECUTION & FALLBACK SEMANTICS'],
              rows: [
                ['NullProvider', '--llm none', 'None', 'Generates a 100% deterministic research note template directly from FactsBundle with zero API tokens'],
                ['ManualProvider', '--llm manual', 'None', 'Writes reports/<period>/prompt.md and raises NeedsManualInput until operator supplies response.md (or writes repair_prompt.md on validation failure)'],
                ['GeminiProvider', '--llm gemini', 'GEMINI_API_KEY', 'Calls Google GenAI SDK with compact fact sheet only (no local paths or raw XML). Retries up to 3 times with targeted repair prompts; falls back to deterministic draft on HTTP 429'],
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'validator-r1-r9',
      label: 'Validator Rules (R1–R9)',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '10 MIN READ',
      title: 'SEC 13F Autopilot',
      subtitle: 'Offline Quantitative Auditing & Adversarial Test Suite',
      lead: 'Walkthrough of src/autopilot/stages/validate.py: how ValidateStage audits every numeric token, citation tag, entity binding, and prose constraint offline.',
      badge: 'R1–R9',
      sections: [
        {
          id: 'numeric-grounding',
          title: 'Numeric token parsing & k-significant-figure verification',
          blocks: [
            {
              type: 'paragraph',
              text: 'ValidateStage runs 100% offline. For every numeric token in the narrative draft, it resolves the cited [fact_id] in FactsBundle and verifies that the number either matches an exact display format in facts.json or equals the underlying fact value rounded to k >= 2 significant figures (within unit and sign agreement):',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/autopilot/stages/validate.py',
              code: `REQUIRED_HEADINGS: tuple[str, ...] = (\n    "## Executive Summary",\n    "## Data and Coverage",\n    "## Broad Convergence",\n    "## Discretionary Convergence",\n    "## New to the Sample",\n    "## What Changed Since Last Quarter",\n    "## Sector View",\n    "## Data Quality",\n    "## Limitations",\n)\n\nREQUIRED_LIMIT_FACTS: tuple[str, ...] = (\n    "limit.long_only",\n    "limit.filing_lag_45d",\n    "limit.no_forward_return_test",\n    "limit.hedge_only_may_be_hedging",\n    "limit.small_discretionary_sample",\n    "limit.dollars_added_estimate",\n)\n\ndef is_valid_k_sig_figs(parsed_fig: float, fact_val: float, max_k: int = 6) -> bool:\n    """Check if parsed_fig equals fact_val rounded to k significant figures for some k >= 2."""\n    if fact_val == 0:\n        return parsed_fig == 0\n    digits = math.floor(math.log10(abs(fact_val))) + 1\n    for k in range(2, max_k + 1):\n        power = k - digits\n        mag = 10**power\n        k_sig = round(fact_val * mag) / mag if mag != 0 else 0\n        if abs(parsed_fig - k_sig) <= 1e-4 * max(1.0, abs(k_sig)):\n            return True\n    return False`,
            },
          ],
        },
        {
          id: 'rules-reference',
          title: 'Complete R1–R9 rule specification (20/20 bad rejected, 7/7 good accepted)',
          blocks: [
            {
              type: 'table',
              columns: ['RULE ID', 'RULE NAME', 'DETERMINISTIC CHECK IN VALIDATESTAGE'],
              rows: [
                ['R1', 'Number Grounding', 'Every currency, percentage, count, or multiplier must cite an existing [fact_id] and match display form or k>=2 sig figs (within 2%) with matching units ($M != $B)'],
                ['R2', 'Citation Integrity', 'Every cited [fact_id] tag matching FACT_TAG_REGEX must exist in facts.json with zero orphan tags'],
                ['R3', 'Entity Whitelist', 'Every institutional fund name and ticker symbol mentioned in prose must exist in target-period facts'],
                ['R4', 'Entity Binding', 'A cited entity-specific fact must appear in the same clause/bullet as its bound fund or ticker entity'],
                ['R5', 'Banned Advice', 'Rejects BANNED_ADVICE_WORDS (will outperform, expected to, should buy/invest, accumulate, alpha, undervalued, guaranteed) outside negated Limitations'],
                ['R6', 'Causal Claims', 'Rejects CAUSAL_WORDS_REGEX (because, due to, driven by, as a result of) outside Limitations'],
                ['R7', 'Required Structure', 'Requires all 9 REQUIRED_HEADINGS, all 6 REQUIRED_LIMIT_FACTS citations, and valid target/baseline period tokens'],
                ['R8', 'Stale Superseded Data', 'Rejects any figure matching a pre-amendment superseded value (e.g., pre-amendment Citadel 2026-Q2 total)'],
                ['R9', 'Formatting & Length Cap', 'Forbids URLs (URL_REGEX), markdown links, HTML tags, and code fences in narrative blocks; caps each block at MAX_BLOCK_WORDS = 150'],
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'cli-and-ci-security',
      label: 'CLI & Hardened CI/CD',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: '7 MIN READ',
      title: 'SEC 13F Autopilot',
      subtitle: 'CLI Subcommands & SHA-Pinned GitHub Actions Security',
      lead: 'Complete reference for the autopilot CLI (src/autopilot/cli.py) and the hardened GitHub Actions workflow (.github/workflows/autopilot.yml).',
      sections: [
        {
          id: 'cli-subcommands',
          title: 'autopilot CLI subcommand reference (src/autopilot/cli.py)',
          blocks: [
            {
              type: 'table',
              columns: ['COMMAND', 'KEY FLAGS', 'OUTPUT / BEHAVIOR'],
              rows: [
                ['autopilot detect', '--as-of YYYY-MM-DD, --emit-period, --dry-run', 'Writes reports/<period>/detect.json or prints most recent actionable COMPLETE/RESTATED period'],
                ['autopilot seed-state', '--through 2026-Q2, --yes', 'Seeds state/processed_filings.json for historical periods (dry-run unless --yes is passed)'],
                ['autopilot ingest', '--period 2026-Q2, --as-of, --dry-run', 'Copies seed/ caches on miss, ingests XMLs into data/autopilot.db, and verifies cover-page totals'],
                ['autopilot facts', '--period 2026-Q2, --dry-run', 'Extracts deterministic FactsBundle to reports/<period>/facts.json and diff.md'],
                ['autopilot narrate', '--period 2026-Q2, --llm [none|manual|gemini], --max-attempts 3', 'Drafts reports/<period>/draft.md and draft_clean.md under BudgetGuard'],
                ['autopilot validate', '--period 2026-Q2, --draft <path>', 'Audits draft against rules R1–R9 and writes validation_report.json/.md'],
                ['autopilot publish', '--period 2026-Q2, --commit-state, --replay', 'Writes final.md, final_cited.md, CSV exports, and updates processed_filings.json when --commit-state is set'],
                ['autopilot run', '--through [detect|ingest|facts|narrate|validate|publish], --llm', 'Executes ordered pipeline stages through target stage and records RunLog timing'],
                ['autopilot learn / metrics', '--period 2026-Q2 / --markdown', 'Computes human review edit ratio into metrics/history.jsonl and renders Markdown results table'],
              ],
            },
          ],
        },
        {
          id: 'ci-hardening',
          title: 'Hardened GitHub Actions workflow invariants',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  title: '40-Character Commit SHA Pinning (scripts/verify_action_shas.py)',
                  detail: 'Every third-party action in .github/workflows/ci.yml and autopilot.yml is pinned to an immutable 40-char Git commit SHA and verified against the GitHub REST API.',
                },
                {
                  title: 'Step-Level Secret Isolation & Top-Level Read-Only Permissions',
                  detail: 'Top-level workflow permissions are contents: read. SEC_USER_AGENT is passed only to resolve_period and run_pipeline steps; GEMINI_API_KEY and OPENFIGI_API_KEY are scoped strictly to run_pipeline.',
                },
                {
                  title: 'Fail-Fast Offline Pytest Gate Before PR Creation',
                  detail: 'Because PRs opened by GITHUB_TOKEN do not trigger downstream workflows, autopilot.yml executes the offline pytest suite (including tests/test_workflow_security.py) before running the pipeline or calling gh pr create.',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
