import type { ProjectDocumentation } from '../docs'

export const prospectIqDocs: ProjectDocumentation = {
  slug: 'prospectiq',
  updatedLabel: 'RELEASE v3.0.0',
  pages: [
    {
      id: 'introduction',
      label: 'Architecture & Pipeline',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '8 MIN READ',
      title: 'ProspectIQ',
      subtitle: 'Automated B2B Agency Prospecting & Web-Presence Intelligence (v3.0)',
      lead: 'A garbage-free B2B lead discovery, digital-health auditing, and MX-verified contact enrichment engine pairing a Python 3.12 stealth scraping pipeline with a React 19 + Supabase Realtime agency command center on a 100% free-tier stack.',
      sections: [
        {
          id: 'cloud-topology',
          title: '$0/month cloud prospecting topology',
          blocks: [
            {
              type: 'callout',
              variant: 'note',
              title: 'LIVE DEPLOYMENT & PORTFOLIO PREVIEW',
              text: 'Live SaaS command center deployed on Vercel at https://kamal-prospectiq.vercel.app/. Unauthenticated visitors explore a 100% static client-side portfolio preview (zero DB queries, zero anon grants), while Owner authentication unlocks live prospectiq.* cloud leads, Realtime job streams, and on-demand GitHub Actions scrape dispatch.',
            },
            {
              type: 'paragraph',
              text: 'ProspectIQ v3.0 upgrades the original local SQLite CLI into a precision cloud monorepo that bypasses Vercel Hobby\'s 10-second serverless timeout and eliminates v2.0 data-quality leaks (social URLs burned on Hunter.io, Cloudflare 403s misclassified as dead sites, and plaintext API keys in logs):',
            },
            {
              type: 'principles',
              items: [
                {
                  num: '01',
                  title: 'Garbage-Free Discovery & 5-State Audit',
                  body: 'Captures full Google Maps metadata, strips 40+ aggregator directories, splits Facebook/Instagram-as-website into NO_WEBSITE leads, and distinguishes WAF_PROTECTED and PARKED sites from truly BROKEN ones.',
                },
                {
                  num: '02',
                  title: 'Free-First MX-Verified Contact Waterfall',
                  body: 'Reuses validated homepage HTML to mine JSON-LD LocalBusiness and nav-discovered Contact pages BEFORE falling back to metered Hunter.io credits—then verifies MX records via dnspython.',
                },
                {
                  num: '03',
                  title: 'Publishable-Key Multi-Schema Security',
                  body: 'Runs inside an isolated prospectiq.* schema on a shared Supabase project using ONLY the publishable key + Owner Auth JWT + fail-closed prospectiq.is_owner() RLS (zero service_role keys).',
                },
              ],
            },
            {
              type: 'table',
              columns: ['SUBSYSTEM', 'LOCATION', 'RUNTIME STACK', 'RESPONSIBILITY'],
              rows: [
                ['Python Stealth Engine', 'engine/*.py, main.py', 'Python 3.12, curl_cffi, Pydantic v2, BeautifulSoup4, dnspython', '11 single-responsibility modules: discovery, pre-scrape dedup, 5-state audit, Free-First extraction, 0–100 scoring, dual persistence'],
                ['Isolated Cloud DB', 'supabase/prospectiq_schema.sql', 'Supabase PostgreSQL + Owner-UUID RLS + Realtime', '7 tables in prospectiq.*, 3 atomic SECURITY DEFINER RPCs, row-locked quota counters, Realtime publication on leads & scrape_jobs'],
                ['Auto-Scraper Worker', '.github/workflows/auto-scrape.yml', 'GitHub Actions (ubuntu-latest, Python 3.12)', 'Daily 08:00 UTC cron (top 2 target_queue rows) + UI-dispatched workflow_dispatch runs with serialized concurrency'],
                ['Agency Command UI', 'web/src/', 'React 19, TypeScript, Vite 8, Tailwind CSS v4, Recharts', 'Command Center dashboard, Lead Explorer + slide-over CRM drawer, Auto-Scraper launcher, Quota Guard, Light/Dark theme, RFC-4180 CSV export'],
                ['Dispatch Serverless API', 'web/api/scrape-trigger.ts', 'Vercel Node Serverless, @supabase/supabase-js', 'Verifies Owner Bearer JWT + OWNER_SUPABASE_USER_ID, inserts QUEUED job row, dispatches GitHub Actions via fine-grained PAT'],
              ],
            },
          ],
        },
        {
          id: 'module-matrix',
          title: 'Single-responsibility Python engine map (engine/)',
          blocks: [
            {
              type: 'table',
              columns: ['MODULE', 'CORE RESPONSIBILITY', 'STRICT BOUNDARY'],
              rows: [
                ['engine/config.py', 'Env vars, quota ceilings, 40+ aggregator domains, 35+ franchises, email blacklists, tracking params', 'Zero business logic or network I/O'],
                ['engine/logger.py', 'Dual colored stdout + logs/app.log with mandatory SecretRedactingFilter & redact_url()', 'Formatting & secret scrubbing only'],
                ['engine/stealth.py', 'Sole outbound HTTP gateway (curl_cffi Chrome124 TLS, dnspython CurlOpt.RESOLVE, log-normal delays)', 'No HTML parsing or DB calls'],
                ['engine/tracker.py', 'Atomic monthly quota guard via prospectiq.check_and_increment_quota RPC (local JSON fallback)', 'No third-party API calls'],
                ['engine/discovery.py', 'SerpApi Google Maps (full metadata + start pagination) -> Brave fallback + Social-as-Website split', 'No website probing or scraping'],
                ['engine/validator.py', 'URL canonicalization, 5-state probe, zero-extra-request Digital Health Audit + html_body handoff', 'No contact extraction or paid APIs'],
                ['engine/extractor.py', 'JSON-LD -> DOM -> max 2 nav Contact subpages -> Hunter.io fallback + dnspython MX + DDG socials', 'No discovery or DB writes'],
                ['engine/scorer.py', 'Pure deterministic 0–100 Opportunity Score, HOT/WARM/COLD tier, Pitch Angle & factual Pitch Summary', 'Pure function; zero I/O'],
                ['engine/models.py', 'Strict ConfigDict(strict=True) Pydantic v2 contracts across every pipeline boundary', 'Schema validation only'],
                ['engine/database.py', 'Dual Supabase Postgres (publishable key + Owner JWT) / SQLite adapter, 3-key pre-scrape dedup, UPSERT', 'Sole database access layer'],
                ['engine/main.py', 'CLI/CI orchestrator, --queue cursor runs, live scrape_jobs telemetry, CI SQLite guardrail', 'No direct HTTP or HTML parsing'],
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'stealth-and-discovery',
      label: 'TLS Stealth & Discovery',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'ProspectIQ',
      subtitle: 'Chrome TLS Impersonation, DNS Recovery & Anti-Garbage Discovery',
      lead: 'Inside engine/stealth.py, engine/logger.py, and engine/discovery.py: defeating TLS fingerprinting, fixing libcurl DNS failures, scrubbing secrets, and splitting Social-as-Website listings.',
      sections: [
        {
          id: 'stealth-gateway',
          title: 'Sole HTTP gateway, DNS recovery & secret redaction (engine/stealth.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Every HTTP request across discovery, validation, and extraction routes strictly through engine/stealth.py. Persistent curl_cffi sessions impersonate chrome124 TLS handshakes, align Sec-Ch-Ua-Platform with the rotated User-Agent OS, force IPv4 (CurlOpt.IPRESOLVE = 1) to avoid broken ISP IPv6 stalls, and pace traffic via right-skewed log-normal delays. When libcurl raises curl: (6) host resolution errors, _execute_get() resolves IPv4 records via dnspython against 1.1.1.1/8.8.8.8/9.9.9.9 and injects them directly via CurlOpt.RESOLVE—falling back to www./bare domain toggling and plain HTTP on SSL handshake errors so No-SSL redesign leads are still audited:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'engine/stealth.py (Log-Normal Delays & DNS Recovery)',
              code: `def human_delay(mode: str = "request", min_bound: float = 1.0, max_bound: float = 12.0) -> float:\n    if mode == "batch":\n        delay = max(8.0, min(random.lognormvariate(mu=2.8, sigma=0.4), 45.0))\n    else:\n        delay = max(min_bound, min(random.lognormvariate(mu=0.55, sigma=0.45), max_bound))\n    time.sleep(delay)\n    return delay\n\n# On curl: (6) DNS error -> query Cloudflare/Google/Quad9 DNS and inject via CurlOpt.RESOLVE\nif _is_dns_resolution_error(exc):\n    ip = resolve_host_ipv4(host)\n    if ip:\n        resolve_entries = [f"{host}:443:{ip}", f"{host}:80:{ip}"]\n        # Passes CurlOpt.RESOLVE directly to curl_cffi; falls back to www.<host> toggle\nif allow_http_fallback and _is_ssl_error(exc) and target_url.startswith("https://"):\n    return _get_with_optional_resolve(target_session, "http://" + target_url[8:], effective_timeout)`,
            },
            {
              type: 'paragraph',
              text: 'engine/logger.py attaches SecretRedactingFilter to both stdout and logs/app.log handlers, while redact_url() masks sensitive query parameters (api_key, token, auth, secret) and Bearer/X-Subscription-Token headers before any debug line is emitted.',
            },
          ],
        },
        {
          id: 'anti-garbage-discovery',
          title: 'Multi-tier discovery & Social-as-Website splitting (engine/discovery.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'discover_leads() queries Priority 1 SerpApi Google Maps (with start pagination offset to mine deep pages across runs) and falls back cleanly to Priority 2 Brave Search on quota exhaustion or HTTP 429. Every candidate passes through classify_candidate_url() to strip UTM/GMB tracking params, discard permanently closed businesses, flag 35+ national franchises, and split social-only links (e.g., m.facebook.com/plumb.masters/) into prefilled_socials while setting website_url = None:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'engine/discovery.py (classify_candidate_url)',
              code: `matched_social_domain = _domain_matches_set(domain, set(SOCIAL_ONLY_WEBSITE_DOMAINS.keys()))\nif matched_social_domain is not None:\n    platform = SOCIAL_ONLY_WEBSITE_DOMAINS[matched_social_domain]  # facebook | instagram | linkedin | twitter | None\n    prefilled: Dict[str, Optional[str]] = {}\n    if platform:\n        cleaned_social = _clean_social_profile(clean_url)  # strips www./m./mobile. & query params\n        if urllib.parse.urlsplit(cleaned_social).path.strip("/"):\n            prefilled[platform] = cleaned_social\n    return None, prefilled, False  # Surfaces as HOT SOCIAL_ONLY lead; never burns Hunter on facebook.com!\n\nif _domain_matches_set(domain, AGGREGATOR_DOMAINS) or any(p in lowered_url for p in AGGREGATOR_PATH_PATTERNS):\n    return None, {}, True`,
            },
          ],
        },
      ],
    },
    {
      id: 'audit-and-extraction',
      label: 'Digital Audit & Waterfall',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'ProspectIQ',
      subtitle: '5-State Website Probe, Free-First Email Waterfall & MX Checks',
      lead: 'Inside engine/validator.py and engine/extractor.py: auditing technical health in zero extra requests, conserving Hunter.io credits 4–5x, and verifying email deliverability via DNS MX lookups.',
      sections: [
        {
          id: 'five-state-audit',
          title: '5-state website classification & zero-extra-request HTML audit (engine/validator.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Instead of treating every non-200 response as a dead website, validate_url() classifies reachability into 5 accurate states (LIVE, WAF_PROTECTED, PARKED, BROKEN, NO_WEBSITE). Responses matching Cloudflare/Sucuri/Akamai challenge headers or HTTP 401/403/406/429 are tagged WAF_PROTECTED (website_found=True) so established businesses behind firewalls never receive embarrassing "you have no website" pitches. For healthy 2xx–3xx responses, audit_html() inspects the fetched HTML once—checking parked-domain signatures, HTTPS SSL, mobile viewport meta tag, 8 CMS builders (WordPress, Wix, Squarespace, Webflow, GoDaddy, Shopify, Weebly, Duda), analytics (GA4/GTM/Clarity/Plausible/Matomo), Meta Pixel, and load_time_ms—and passes html_body (excluded from JSON serialization via Field(exclude=True)) directly to extractor.py to eliminate homepage double-fetching.',
            },
          ],
        },
        {
          id: 'free-first-waterfall',
          title: 'Free-First contact waterfall, agency filtering & DNS MX verification (engine/extractor.py)',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  title: 'Tier 1 (FREE) — Homepage JSON-LD LocalBusiness',
                  detail: 'Walks all <script type="application/ld+json"> graphs for structured email, telephone, and sameAs social profiles (recorded as FOUND_JSONLD).',
                },
                {
                  title: 'Tier 2 (FREE) — Homepage DOM + Up to 2 Nav-Discovered Contact Pages',
                  detail: 'Extracts mailto:, tel:, and visible regex emails while ignoring anchors inside web-agency footer credits ("designed by", "powered by"). If no email is found on the homepage, _discover_contact_urls() scores real same-domain <a href> navigation links (contact=10, quote/estimate=7, about/team=5) and fetches at most 2 subpages, stopping immediately on first verified match.',
                },
                {
                  title: 'Tier 3 (METERED FALLBACK) — Hunter.io Domain Search',
                  detail: 'Invoked ONLY if Tiers 1–2 found nothing, guarded against aggregator/social/blacklisted domains and pre-checked against monthly api_quotas (50/month free ceiling).',
                },
                {
                  title: 'Email Hygiene Ranking & Cached DNS MX Verification',
                  detail: '_rank_emails() prioritizes exact domain matches (+50) and preferred local-parts like info@/estimates@ (+20), drops 50+ blacklisted platform domains (wixpress.com, sentry.io) and unrelated third-party agency domains, and verifies DNS MX records via dnspython (rejecting RFC 7505 null MX "0 ." with RFC 5321 A-record fallback).',
                },
              ],
            },
            {
              type: 'code',
              language: 'python',
              filename: 'engine/extractor.py (verify_email_mx)',
              code: `def verify_email_mx(email: Optional[str]) -> Optional[bool]:\n    domain = email.split("@", 1)[1].strip().lower()\n    if domain in _MX_CACHE:\n        return _MX_CACHE[domain]\n    resolver = dns.resolver.Resolver(configure=False)\n    resolver.nameservers = ["1.1.1.1", "8.8.8.8", "9.9.9.9"]\n    try:\n        mx_answers = resolver.resolve(domain, "MX")\n        valid_mx = any(str(r.exchange).strip(".") != "" for r in mx_answers)  # Reject RFC 7505 null MX\n        _MX_CACHE[domain] = valid_mx\n        return valid_mx\n    except (dns.resolver.NoAnswer, dns.resolver.NoNameservers):\n        # RFC 5321 fallback: check if domain exposes an A record\n        valid_a = len(list(resolver.resolve(domain, "A"))) > 0\n        _MX_CACHE[domain] = valid_a\n        return valid_a`,
            },
          ],
        },
      ],
    },
    {
      id: 'scoring-and-contracts',
      label: 'Opportunity Scorer & Models',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '8 MIN READ',
      title: 'ProspectIQ',
      subtitle: 'Deterministic 0–100 Agency Scoring & Strict Pydantic v2 Contracts',
      lead: 'Inside engine/scorer.py and engine/models.py: ranking local service businesses transparently for web design, SEO, and redesign outreach without black-box heuristics.',
      sections: [
        {
          id: 'scoring-formula',
          title: 'Transparent 0–100 agency opportunity formula (engine/scorer.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'score_lead() is a pure deterministic function combining discovery reputation, Digital Health Audit weaknesses, and direct contactability into a clamped 0–100 Opportunity Score, Pitch Tier (HOT >= 80, WARM 50–79, COLD < 50), Pitch Angle (NO_WEBSITE, SOCIAL_ONLY, REDESIGN_SSL, SEO_ANALYTICS, ESTABLISHED), and an auto-generated factual outreach pitch_summary:',
            },
            {
              type: 'table',
              columns: ['SIGNAL CATEGORY', 'POINT WEIGHT', 'EVALUATION RULE'],
              rows: [
                ['Core Web Opportunity', '+35 / +20 / +10', '+35 for NO_WEBSITE, BROKEN, or PARKED; +20 for LIVE REDESIGN_SSL (no SSL, non-mobile, >=4000ms load, or Wix/GoDaddy/Weebly); +10 for LIVE or WAF_PROTECTED'],
                ['Local Demand Proof', '+20 / +15 / +10 / +5', '+20 if rating >= 4.5 & reviews >= 50; +15 if >= 4.2 & >= 20; +10 if >= 4.0 & >= 5; +5 if reviews > 0'],
                ['Contact Readiness', '+20 / +15 / +8', '+20 for phone AND MX-valid email; +15 for phone OR MX-valid email; +8 for unverified email only'],
                ['Digital / Tracking Gap', 'up to +15', '+15 if no site; on LIVE sites: +8 no SSL, +5 non-mobile, +7 missing both GA & Meta Pixel (+3 if missing one), capped at 15'],
                ['Social Footprint', '+10', '+10 if Facebook, Instagram, LinkedIn, or X profile detected'],
                ['Franchise Penalty', '-40', '-40 if flagged as a national/multi-state chain (deprioritizes non-local decision makers)'],
              ],
            },
            {
              type: 'code',
              language: 'python',
              filename: 'engine/scorer.py (_determine_pitch_angle)',
              code: `def _determine_pitch_angle(audit: SiteAudit, contacts: ContactEnrichment) -> PitchAngle:\n    has_social = _has_any_social(contacts)\n    if audit.website_status in ("NO_WEBSITE", "BROKEN", "PARKED"):\n        return "SOCIAL_ONLY" if has_social else "NO_WEBSITE"\n    if audit.website_status == "LIVE":\n        needs_ssl = audit.has_ssl is False\n        not_mobile = audit.is_mobile_friendly is False\n        slow_site = audit.load_time_ms is not None and audit.load_time_ms >= 4000\n        diy_cms = audit.cms_platform in {"Wix", "GoDaddy", "Weebly"}\n        if needs_ssl or not_mobile or slow_site or diy_cms:\n            return "REDESIGN_SSL"\n        if audit.has_analytics is False and audit.has_meta_pixel is False:\n            return "SEO_ANALYTICS"\n        return "ESTABLISHED"\n    return "SEO_ANALYTICS" if audit.has_ssl is False else "ESTABLISHED"`,
            },
          ],
        },
        {
          id: 'pydantic-contracts',
          title: 'Strict Pydantic v2 stage contracts (engine/models.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Every boundary object—RawCandidate, SiteAudit, ContactEnrichment, LeadScore, and BusinessLead—enforces ConfigDict(strict=True) with explicit Literal status vocabularies (WebsiteStatus, EmailStatus, SocialStatus, PitchTier, PitchAngle, OutreachStatus) matching the PostgreSQL CHECK constraints and web/src/lib/types.ts TypeScript interfaces 1:1. Null values never hide whether an extraction failed due to a firewall (BLOCKED), monthly ceiling (QUOTA_EXHAUSTED), or missing listing (NOT_ATTEMPTED).',
            },
          ],
        },
      ],
    },
    {
      id: 'cloud-schema-and-security',
      label: 'Supabase Schema & Security',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'ProspectIQ',
      subtitle: 'Publishable-Key Owner RLS, Atomic RPCs & Dual Storage Adapter',
      lead: 'Walkthrough of supabase/prospectiq_schema.sql, engine/database.py, and engine/tracker.py: zero-service_role multi-schema isolation, race-free quota locking, and CRM-preserving lead upserts.',
      sections: [
        {
          id: 'owner-rls-and-rpcs',
          title: 'Zero service_role multi-schema security & atomic PostgreSQL RPCs',
          blocks: [
            {
              type: 'callout',
              variant: 'warning',
              title: 'PUBLISHABLE KEY ONLY — ZERO SERVICE_ROLE',
              text: 'Because ProspectIQ shares a Supabase Free-Tier hub with sibling app Cadence (cadence.*), neither Vercel, local .env, nor GitHub Actions ever holds a Supabase service_role key. All browser and headless worker requests use ONLY the publishable key (sb_publishable_...) + Owner Auth JWT, enforced by fail-closed prospectiq.is_owner() RLS and SECURITY DEFINER RPC guards. All anon table/sequence/function privileges are explicitly revoked.',
            },
            {
              type: 'table',
              columns: ['OBJECT (prospectiq.*)', 'TYPE', 'PURPOSE & CONCURRENCY / ISOLATION DESIGN'],
              rows: [
                ['app_config & is_owner()', 'Table + Function', 'Stores owner_user_id (locked away from anon/authenticated); fail-closed UUID check blocks sibling-app users sharing auth.users'],
                ['profiles', 'Table', 'Lazily provisioned on Owner login via upsert(..., { onConflict: "id" }) — zero triggers on shared auth.users'],
                ['leads', 'Table (Realtime)', '37-column agency prospect record with UNIQUE(business_name, city), UNIQUE(place_id), and partial unique index on lower(root_domain)'],
                ['scrape_jobs', 'Table (Realtime)', 'Live execution ledger (QUEUED -> RUNNING -> COMPLETED/PARTIAL/FAILED) tracking inserted, updated, skipped_dup, emails, blocked, and GitHub Run URL'],
                ['target_queue', 'Table', 'Automated cron target queue ordered by (enabled, priority ASC, last_scraped_at ASC NULLS FIRST) with next_page_offset cursor'],
                ['api_quotas & exclusions', 'Tables', 'Monthly (month_key, provider) hard limits (SerpApi 250, Brave 1000, Hunter 50) + customizable DOMAIN/FRANCHISE/EMAIL_DOMAIN rules'],
                ['upsert_lead / check_and_increment_quota / advance_target_cursor', 'Atomic RPCs', 'Owner-gated PL/pgSQL functions preserving CRM outreach_status & outreach_notes on re-enrichment, locking quota rows FOR UPDATE, and advancing cursors +20'],
              ],
            },
            {
              type: 'code',
              language: 'sql',
              filename: 'supabase/prospectiq_schema.sql (Owner Predicate & Row-Locked Quota RPC)',
              code: `CREATE OR REPLACE FUNCTION prospectiq.is_owner() RETURNS BOOLEAN\nLANGUAGE sql STABLE SECURITY DEFINER SET search_path = prospectiq, auth AS $$\n  SELECT auth.uid() IS NOT NULL AND EXISTS (\n    SELECT 1 FROM prospectiq.app_config cfg\n    WHERE cfg.key = 'owner_user_id' AND auth.uid() = cfg.value::uuid\n  );\n$$;\n\n-- Atomic race-free monthly quota check & increment\nSELECT q.calls_used, LEAST(q.monthly_limit, p_monthly_limit)\n  INTO v_used, v_limit\n  FROM prospectiq.api_quotas q\n WHERE q.month_key = p_month_key AND q.provider = p_provider\n   FOR UPDATE;`,
            },
          ],
        },
        {
          id: 'dual-persistence',
          title: 'Dual Supabase / SQLite adapter & CI safety guardrail (engine/database.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'engine/database.py imports the PyPI supabase client safely without being shadowed by the repository\'s local supabase/ SQL folder, authenticates via sign_in_with_password() + postgrest.auth(access_token), lazily ensures prospectiq.profiles, and executes 3-key pre-scrape deduplication (place_id, case-insensitive (business_name, city), and root_domain) before any website probe or Hunter.io call. Offline local CLI runs fall back automatically to SQLite (leads.db, auto-migrating 23 v3.0 columns onto v2.0 tables) and usage_tracker.json, while engine/main.py raises a hard RuntimeError if GitHub Actions or --job-id runs ever lack Supabase credentials so CI never writes into ephemeral runner disks.',
            },
          ],
        },
      ],
    },
    {
      id: 'web-dispatch-cli-reference',
      label: 'Web App, Dispatch & CLI',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: '8 MIN READ',
      title: 'ProspectIQ',
      subtitle: 'React 19 Realtime Dashboard, Vercel Dispatch API & CLI Flags',
      lead: 'Reference for the Vercel React 19 SPA under web/, the /api/scrape-trigger GitHub Actions dispatcher, daily cron automation, CLI flags, and 25 automated tests.',
      badge: 'CLI + CI',
      sections: [
        {
          id: 'web-and-dispatch',
          title: 'React 19 Realtime workspace & POST /api/scrape-trigger',
          blocks: [
            {
              type: 'paragraph',
              text: 'The web/ workspace (React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Recharts) renders 4 core views—Command Center, Lead Explorer with a 520px slide-over CRM Intelligence Drawer and RFC-4180 CSV exporter, Auto-Scraper & Target Queue, and Quota Guard & Settings—supporting Light default and Dark themes. Once the Owner signs in, web/src/lib/prospectiqApi.ts opens Supabase Realtime postgres_changes subscriptions on prospectiq.leads and prospectiq.scrape_jobs so newly scraped leads stream directly into the UI.',
            },
            {
              type: 'code',
              language: 'typescript',
              filename: 'web/api/scrape-trigger.ts (Owner-Verified GitHub Actions Dispatch)',
              code: `// 1. Verify caller Bearer JWT using publishable key ONLY (zero service_role)\nconst { data: { user }, error } = await supabase.auth.getUser(token);\nif (error || !user || user.id !== ownerUserId) {\n  res.status(403).json({ error: "Forbidden: Owner account required." });\n  return;\n}\n\n// 2. Insert QUEUED job row under Owner RLS, then dispatch .github/workflows/auto-scrape.yml\nconst { data: createdJob } = await supabase\n  .from("scrape_jobs")\n  .insert({ trigger_source: "MANUAL_UI", status: "QUEUED", cities, niches, max_results_per_query: maxResults })\n  .select("*").single();\n\nawait fetch(\`https://api.github.com/repos/\${githubOwner}/\${githubRepo}/actions/workflows/auto-scrape.yml/dispatches\`, {\n  method: "POST",\n  headers: { Authorization: \`Bearer \${githubToken}\`, Accept: "application/vnd.github+json" },\n  body: JSON.stringify({ ref: "main", inputs: { mode, cities: JSON.stringify(cities), niches: JSON.stringify(niches), max_results: String(maxResults), job_id: String(createdJob.id), trigger_source: "MANUAL_UI" } }),\n});`,
            },
          ],
        },
        {
          id: 'cli-and-tests',
          title: 'CLI flags, GitHub Actions cron & verification commands',
          blocks: [
            {
              type: 'table',
              columns: ['CLI FLAG', 'DEFAULT', 'BEHAVIOR'],
              rows: [
                ['--live', 'False (Mock)', 'Enables SerpApi Google Maps -> Brave Search live discovery (omitting runs offline 5-lead mock test)'],
                ['--cities / --niches', '10 US metros / 10 trades', 'Accepts CLI tokens, JSON arrays, or pipe/semicolon lists safely preserving commas like "Houston, TX"'],
                ['--max-results', '10', 'Maximum candidates evaluated per city × niche query'],
                ['--start', '0', 'Google Maps pagination offset (0, 20, 40...) to mine fresh listings beyond page 1'],
                ['--queue / --queue-limit', 'False / 2', 'Pulls top N enabled rows from prospectiq.target_queue and advances next_page_offset (+20)'],
                ['--job-id / --trigger-source', 'None / CLI', 'Attaches live progress updates to a pre-created scrape_jobs UUID (CLI | CRON | MANUAL_UI)'],
              ],
            },
            {
              type: 'code',
              language: 'bash',
              filename: 'Local Engine, Test Suite (25 Tests) & Web Build Commands',
              code: `# 1. Python stealth engine setup & safe offline mock verification (0 API credits)\npython -m venv .venv && .venv\\Scripts\\activate\npip install -r requirements.txt\npython main.py\n\n# 2. Targeted live discovery or cloud cron queue run\npython main.py --live --cities "Houston, TX" "Austin, TX" --niches "Plumbing" "HVAC" --max-results 10\npython main.py --live --queue --queue-limit 2 --trigger-source CRON\n\n# 3. Run Phase 1 (engine anti-garbage) & Phase 2 (cloud/SQL/CI audit) unit tests (25 tests)\npython -m unittest discover -s tests -v\n\n# 4. Typecheck & build Vercel React 19 dashboard (web/)\npnpm --dir web install && pnpm --dir web exec tsc --noEmit && pnpm --dir web run build`,
            },
          ],
        },
      ],
    },
  ],
}
