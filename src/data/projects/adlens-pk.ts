import type { ProjectDocumentation } from '../docs'

export const adlensPkDocs: ProjectDocumentation = {
  slug: 'adlens-pk',
  updatedLabel: 'RELEASE v2.0.0',
  pages: [
    {
      id: 'introduction',
      label: 'Architecture & Stack',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '8 MIN READ',
      title: 'AdLens PK',
      subtitle: 'Zero-Garbage Pakistani Longitudinal Ad Intelligence (v2)',
      lead: 'A $0/month production ad intelligence engine built for Pakistani D2C founders, e-commerce brands, and performance marketers—tracking Cash on Delivery (COD), Open-Parcel trust signals, Click-to-WhatsApp funnels, PKR price psychology, Urdu/Roman-Urdu hooks, and true 30+ day creative survival.',
      sections: [
        {
          id: 'topology',
          title: '$0/month production topology',
          blocks: [
            {
              type: 'callout',
              variant: 'note',
              title: 'LIVE DEPLOYMENT',
              text: 'Live dashboard deployed on Vercel at https://adlens-pk.vercel.app/ — backed by scheduled GitHub Actions ingestion and Supabase PostgreSQL.',
            },
            {
              type: 'paragraph',
              text: 'AdLens PK v2 replaces brittle single-machine desktop scrapers with a three-tier zero-cost cloud architecture designed to run continuously inside GitHub Actions, Supabase Free Tier (500 MB PostgreSQL), and Vercel Hobby:',
            },
            {
              type: 'principles',
              items: [
                {
                  num: '01',
                  title: '8-Hour Scheduled Ingestion',
                  body: 'GitHub Actions (.github/workflows/ingest.yml) runs headless Playwright Chromium at 01:00, 09:00, and 17:00 UTC to keep Supabase warm and accumulate longitudinal snapshots.',
                },
                {
                  num: '02',
                  title: 'Zero-Garbage Quality Gate',
                  body: 'Blocks non-PK EU/global ads, state media, UI chrome leaks, and near-duplicates via NFKC + SHA-256 hashing before any row touches PostgreSQL.',
                },
                {
                  num: '03',
                  title: 'Evidence-Grounded Serverless API',
                  body: 'Six Vercel TypeScript serverless endpoints (/api/*) serve live KPIs, PKR price percentiles, statistical_v1 copy grading, and 6h-cached Gemini 2.5 Flash playbooks.',
                },
              ],
            },
            {
              type: 'table',
              columns: ['LAYER', 'LOCATION', 'RUNTIME STACK', 'RESPONSIBILITY'],
              rows: [
                ['Scheduler', '.github/workflows/ingest.yml', 'GitHub Actions (ubuntu-latest, Python 3.12)', 'Runs 3x daily cron + manual workflow_dispatch across 8 canonical Pakistani industries'],
                ['Ingestion Pipeline', 'pipeline/', 'Playwright, Pydantic v2, requests', 'Meta GraphQL interception, PK relevance gate, NFKC commercial extraction, PostgREST upserts'],
                ['Longitudinal DB', 'supabase/migrations/', 'Supabase PostgreSQL + pg_trgm + RLS', '6 normalized tables, trigram GIN search indexes, brand rollup RPC, and 3 KPI views'],
                ['Web & Serverless', 'web/src/, web/api/', 'React 19, Vite 6, Tailwind v4, @vercel/node, @google/genai', '6-page editorial intelligence terminal + 6 serverless API endpoints + Gemini 2.5 Flash'],
              ],
            },
          ],
        },
        {
          id: 'vocabularies',
          title: 'Controlled vocabularies & Pakistani search seeds (pipeline/config.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Single generic English keywords like "sale" or "shop" flood Meta Ad Library results with global and EU transparency ads. pipeline/config.py enforces strict Literal vocabularies across 8 canonical industries, 8 hook categories, and high-signal Pakistan-anchored query seeds:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'pipeline/config.py',
              code: `IndustrySlug = Literal[\n    "fashion", "electronics", "beauty_health", "food_beverage",\n    "real_estate", "education", "home_living", "general",\n]\n\nHookType = Literal[\n    "direct_offer", "problem_agitation", "curiosity_question", "social_proof",\n    "urgency_fomo", "product_showcase", "lifestyle_brand", "other",\n]\n\nINDUSTRY_SEARCH_SEEDS: Dict[IndustrySlug, List[str]] = {\n    "fashion": ["lawn sale Pakistan", "unstitched lawn pk", "khaddar suit cash on delivery", "Bonanza Satrangi", "Khaadi Pakistan"],\n    "electronics": ["earbuds Pakistan COD", "Audionic Pakistan", "smart watch price Pakistan", "solar inverter Pakistan price"],\n    "real_estate": ["plot for sale Lahore", "DHA Karachi property", "Bahria Town installment", "Zameen.com"],\n    "general": ["cash on delivery all Pakistan", "free delivery all Pakistan", "muft delivery Pakistan"],\n}`,
            },
          ],
        },
      ],
    },
    {
      id: 'graphql-scraper',
      label: 'GraphQL Interceptor',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'AdLens PK',
      subtitle: 'Network-First Meta Ad Library GraphQL Interception',
      lead: 'Inside pipeline/scraper/graphql_client.py: intercepting Meta Ad Library JSON streams directly from Playwright network events rather than brittle DOM scraping.',
      sections: [
        {
          id: 'network-interception',
          title: 'Three-stage capture: GraphQL -> inline SSR -> strict DOM fallback',
          blocks: [
            {
              type: 'paragraph',
              text: 'DOM-only scrapers break whenever Meta obfuscates CSS classes and leak UI chrome strings ("See summary details", "Library ID:"). scrape_meta_graphql() launches headless Chromium configured for locale="en-PK" and timezone_id="Asia/Karachi", strips navigator.webdriver, and captures structured Meta JSON payloads across three fallback tiers:',
            },
            {
              type: 'list',
              items: [
                {
                  title: 'Tier 1 — Live GraphQL Network Listener (page.on("response"))',
                  detail: 'Intercepts every HTTP 200 response matching /api/graphql or /ads/library/async/search_ads, parses concatenated JSON chunks via parse_json_stream(), and walks nested trees with find_ad_nodes() to extract canonical ad_archive_id, page_id, start_date, collation_count, CTA type, and media thumbnails.',
                },
                {
                  title: 'Tier 2 — Inline SSR Script Inspection',
                  detail: 'Immediately after domcontentloaded, evaluates document.querySelectorAll(\'script[type="application/json"]\') for embedded ad_archive_id / adArchiveID payloads rendered during initial SSR.',
                },
                {
                  title: 'Tier 3 — Stagnant-Scroll Pagination & Strict DOM Fallback',
                  detail: 'Scrolls up to max_scrolls with randomized 2.2–3.4s pauses (exiting early if 2 consecutive scrolls yield 0 new ads), and invokes extract_dom_fallback_ads() ONLY if both GraphQL and SSR produced zero results.',
                },
              ],
            },
            {
              type: 'code',
              language: 'python',
              filename: 'pipeline/scraper/graphql_client.py',
              code: `async def _on_response(response) -> None:\n    nonlocal graphql_responses\n    resp_url = response.url\n    if "/api/graphql" not in resp_url and "/ads/library/async/search_ads" not in resp_url:\n        return\n    if response.status != 200:\n        return\n    text = await response.text()\n    graphql_responses += 1\n    for obj in parse_json_stream(text):\n        for node in find_ad_nodes(obj):\n            parsed = parse_graphql_ad_node(\n                node, search_query=query, seed_industry=seed_industry, extraction_source="graphql"\n            )\n            if parsed and parsed.ad_archive_id not in ads_by_id:\n                ads_by_id[parsed.ad_archive_id] = parsed\n\npage.on("response", _on_response)`,
            },
          ],
        },
      ],
    },
    {
      id: 'quality-gate',
      label: 'Quality Gate & PK Relevance',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'AdLens PK',
      subtitle: 'Zero-Garbage Gate, SHA-256 Dedup & Pakistan Scoring',
      lead: 'Walkthrough of pipeline/quality/gate.py and pk_relevance.py: deterministic deduplication, UI leak rejection, and local commercial relevance scoring.',
      sections: [
        {
          id: 'gate-dedup',
          title: 'Deterministic SHA-256 deduplication & hard blockers (pipeline/quality/gate.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Before any scraped ad enters enrichment or PostgreSQL, evaluate_ad_quality() enforces strict structural checks: valid numeric ad_archive_id, non-garbage page_name (blocking strings like "Video Player", "Sponsored", "EU Transparency"), at least 20 non-whitespace characters of primary copy, zero Meta UI chrome leak patterns, and a deterministic 32-char SHA-256 fingerprint preserving Urdu characters (\u0600-\u06ff) after NFKC normalization:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'pipeline/quality/gate.py',
              code: `def compute_content_hash(text: str) -> str:\n    """Deterministic SHA-256 fingerprint on NFKC-normalized alphanumeric + Urdu text."""\n    norm = normalize_nfkc(text).lower()\n    compact = re.sub(r"[^a-z0-9\\u0600-\\u06ff]+", "", norm)\n    return hashlib.sha256(compact.encode("utf-8")).hexdigest()[:32]\n\ncontent_hash = compute_content_hash(f"{ad.page_id}:{primary_copy[:300]}")\nif content_hash in seen_hashes:\n    return GateDecision(accepted=False, reason="duplicate_content_hash", content_hash=content_hash)`,
            },
          ],
        },
        {
          id: 'pk-relevance-scoring',
          title: 'Pakistani commercial relevance scoring (pipeline/quality/pk_relevance.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Even with country=PK, Meta Ad Library surfaces global gaming apps (e.g., "Lawn Mowing Simulator" matching "lawn"), EU DSA transparency ads (is_aaa_eligible=True), state media, and foreign-currency campaigns. evaluate_pk_relevance() applies hard compliance blockers first, then sums local Pakistani commercial signals above a 0.20 base prior (requiring final_score >= 0.35):',
            },
            {
              type: 'table',
              columns: ['SIGNAL / CHECK', 'WEIGHT / RULE', 'EXAMPLES DETECTED'],
              rows: [
                ['Hard Blockers', 'Immediate reject (0.0)', 'state_media_run_label, political disclaimers, known global spam (Zalando, Shopee, Temu, CGTN)'],
                ['Blocked Categories / EU / FX', 'Reject if strong_signals == 0', 'Games/toys, Politician, NGO, EU is_aaa_eligible, or foreign currencies (€, £, ₹, EUR, INR, GBP)'],
                ['.pk / .com.pk Domain', '+0.45 (strong)', 'Any .pk or .com.pk link_url, caption, or ad copy mention'],
                ['PK Mobile (+92 / 03xx)', '+0.40 (strong)', 'Pakistani cellular patterns (+92 3xx, 0092 3xx, 03xx-xxxxxxx)'],
                ['Urdu Script (\\u0600-\\u06FF)', '+0.40 (strong)', 'Native Nastaliq/Arabic-script Urdu copy'],
                ['PKR Pricing / Cities / Roman-Urdu', '+0.35 each (strong)', 'Rs. / PKR / /-, 16 PK cities + DHA/Bahria Town, 2+ Roman-Urdu markers (karein, bachat, muft, khaddar)'],
                ['COD & WhatsApp Funnel', '+0.25 / +0.15', 'Cash on Delivery / Open Parcel / Allow to Open / WHATSAPP_MESSAGE CTA / wa.me'],
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'commercial-extractors',
      label: 'PK Extractors & Classifiers',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'AdLens PK',
      subtitle: 'NFKC Commercial Signal Extraction & Honest Hook Classification',
      lead: 'Inside pipeline/enrich/extractor.py and classifier.py: parsing stylized Unicode fonts, Crore/Lac/k PKR prices, honest survival duration, and 8-category hook psychology.',
      sections: [
        {
          id: 'nfkc-pkr-extraction',
          title: 'NFKC-normalized PKR, COD & honest days_active (pipeline/enrich/extractor.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Pakistani Facebook advertisers heavily use Unicode mathematical bold fonts such as "𝗣𝗥𝗜𝗖𝗘 1750/-" or "𝐅𝐋𝐀𝐓 3𝟬% 𝗢𝗙𝗙" to bypass feed monotony. Every regex in extractor.py runs on unicodedata.normalize("NFKC", text) so stylized glyphs convert cleanly to standard ASCII before matching Crore/Lac/Million multipliers, shorthand k prices, and Open-Parcel trust cues:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'pipeline/enrich/extractor.py',
              code: `def extract_price_pkr(text: str) -> Optional[int]:\n    norm = normalize_nfkc(text)\n    m_big = _PKR_MILLION_RE.search(norm)  # e.g., Rs. 45 Lac -> 4,500,000\n    if m_big:\n        mult = {"crore": 10_000_000, "cr": 10_000_000, "lac": 100_000, "lakh": 100_000, "million": 1_000_000, "m": 1_000_000}[m_big.group(2).lower()]\n        val = int(round(float(m_big.group(1)) * mult))\n        if 100 <= val <= 500_000_000:\n            return val\n    m_k = _PKR_K_RE.search(norm)          # e.g., Rs. 2.5k -> 2500\n    if m_k:\n        return int(round(float(m_k.group(1)) * 1000))\n    for pattern in (_PKR_PREFIX_RE, _PKR_SUFFIX_RE, _PKR_PRICE_WORD_RE):\n        m = pattern.search(norm)\n        if m:\n            val = int(m.group(1).replace(",", ""))\n            if 50 <= val <= 500_000_000:\n                return val\n    return None\n\ndef compute_days_active(ad: RawMetaAd, now: Optional[datetime] = None) -> Optional[int]:\n    """Honest survival duration — NEVER computes (now - start_date) on an inactive ad."""\n    if ad.start_date is None:\n        return None\n    if ad.is_active:\n        return max(1, ((now or datetime.now(timezone.utc)) - ad.start_date).days)\n    if ad.end_date is not None and ad.end_date >= ad.start_date:\n        return max(1, (ad.end_date - ad.start_date).days)\n    return None`,
            },
          ],
        },
        {
          id: 'language-and-hooks',
          title: 'Language detection & 8-category hook classifier (pipeline/enrich/classifier.py)',
          blocks: [
            {
              type: 'list',
              items: [
                {
                  title: 'detect_language(text) -> english | roman_urdu | urdu | mixed',
                  detail: 'Detects Urdu Unicode script (\\u0600-\\u06FF) alongside Latin token ratios against a 55-word ROMAN_URDU_WORDS dictionary (roman_hits >= 2 and roman_ratio >= 0.08 triggers roman_urdu; Urdu + >=4 Latin words triggers mixed).',
                },
                {
                  title: 'classify_hook(ad_copy, headline) -> 8 Balanced HookTypes',
                  detail: 'Inspects only the opening 1–2 sentences (extract_raw_hook, <= 180 chars) plus headline across curiosity_question, urgency_fomo, direct_offer, problem_agitation, social_proof, product_showcase, lifestyle_brand, and an honest other fallback (never artificially inflating problem_agitation).',
                },
                {
                  title: 'Canonical Industry Resolver (_PAGE_CATEGORY_MAP + _INDUSTRY_KEYWORDS)',
                  detail: 'Prioritizes high-confidence Meta page categories before scoring domain keyword dictionaries across all 8 Pakistani verticals.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'supabase-storage',
      label: 'Supabase Schema & PostgREST',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '8 MIN READ',
      title: 'AdLens PK',
      subtitle: 'PostgreSQL Longitudinal Schema, RLS & Direct PostgREST Upserts',
      lead: 'Walkthrough of supabase/migrations/001–003 and pipeline/storage/supabase_repo.py: longitudinal daily snapshots, trigram search, Row-Level Security, and idempotent batch upserts.',
      sections: [
        {
          id: 'postgres-schema',
          title: 'Longitudinal PostgreSQL tables, GIN indexes & views',
          blocks: [
            {
              type: 'paragraph',
              text: 'The Supabase schema tracks both current ad state (public.ads keyed by ad_archive_id) and historical daily observations (public.ad_snapshots keyed by composite (ad_archive_id, snapshot_date)) so true creative survival curves and brand scaling velocity can be computed accurately over weeks:',
            },
            {
              type: 'code',
              language: 'sql',
              filename: 'supabase/migrations/001_initial_schema.sql & 002_analytics_views.sql',
              code: `CREATE EXTENSION IF NOT EXISTS pg_trgm;\n\nCREATE TABLE IF NOT EXISTS public.ad_snapshots (\n  ad_archive_id TEXT NOT NULL REFERENCES public.ads(ad_archive_id) ON DELETE CASCADE,\n  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,\n  is_active BOOLEAN NOT NULL,\n  days_active INTEGER,\n  collation_count INTEGER NOT NULL DEFAULT 1,\n  PRIMARY KEY (ad_archive_id, snapshot_date)\n);\n\nCREATE INDEX IF NOT EXISTS idx_ads_copy_trgm ON public.ads USING GIN (ad_copy gin_trgm_ops);\nCREATE INDEX IF NOT EXISTS idx_brands_name_trgm ON public.brands USING GIN (page_name gin_trgm_ops);\n\n-- Row-Level Security: Public read-only dashboard + service-role CI writes\nALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "public_read_ads" ON public.ads FOR SELECT USING (true);\nCREATE POLICY "users_manage_own_watchlist" ON public.watchlists\n  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`,
            },
          ],
        },
        {
          id: 'postgrest-repo',
          title: 'Zero-shadowing PostgREST batch upserts (pipeline/storage/supabase_repo.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Because the repository contains a top-level supabase/ migrations directory, importing the Python supabase SDK would suffer package shadowing in CI. SupabaseRepository communicates directly with {url}/rest/v1/* via requests.Session with Prefer: resolution=merge-duplicates,return=minimal, pre-checking existing ad_archive_ids in chunks of 100 to log exact inserted_new vs. updated_existing metrics into public.scrape_runs.',
            },
          ],
        },
      ],
    },
    {
      id: 'serverless-api-and-ci',
      label: 'Serverless API, Lab & CI',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: '8 MIN READ',
      title: 'AdLens PK',
      subtitle: 'Vercel Serverless Endpoints, Copy Grader & GitHub Actions',
      lead: 'Complete reference for the 6 Vercel TypeScript API routes under web/api/, the statistical_v1 copy grader, Gemini 2.5 Flash playbook caching, and CLI ingestion commands.',
      badge: '6 APIs',
      sections: [
        {
          id: 'vercel-endpoints',
          title: 'Vercel serverless endpoints (web/api/*.ts)',
          blocks: [
            {
              type: 'table',
              columns: ['ENDPOINT', 'METHOD', 'PURPOSE & KEY LOGIC'],
              rows: [
                ['/api/pulse', 'GET', 'Market KPIs (total/active ads, COD %, WhatsApp %, 30d+ survivor rate), 7D/30D/90D snapshot timeseries, top 5 scaling brands, industry/hook/language splits'],
                ['/api/ads', 'GET', 'Multi-facet searchable ad explorer (industry, active, 30d+ survivors, COD, WhatsApp, free delivery, language, media format) + detail drawer'],
                ['/api/patterns', 'GET / POST', 'GET: COD lift, WhatsApp vs Website survival, whitespace hooks, 6-band PKR distribution (<500 to 15k+). POST: Interactive PKR Price Positioning Checker (±20% competitor band)'],
                ['/api/brands', 'GET', 'Tracked Pakistani advertiser directory + brand detail creative gallery and commercial signal rollups'],
                ['/api/lab', 'POST', 'action=grade: statistical_v1 ad copy grader benchmarked against live category survivors. action=brief: Gemini 2.5 Flash tactical playbook cached 6h in public.ai_briefs'],
                ['/api/pipeline', 'GET', 'Live audit of scheduled GitHub Actions scrape_runs, acceptance ratios, and Quality Gate rejection breakdown'],
              ],
            },
          ],
        },
        {
          id: 'copy-grader-and-cli',
          title: 'Honest statistical_v1 Copy Grader & CLI commands',
          blocks: [
            {
              type: 'code',
              language: 'typescript',
              filename: 'web/api/_lib/analytics.ts (gradeCopyStatistical)',
              code: `// Transparent additive scoring starting from baseline 36, grounded in live Supabase benchmarks\nif (hasLocalVernacular) score += 12  // Urdu script or >=2 Roman-Urdu tokens\nif (hasPrice)           score += 12  // Explicit PKR price anchor\nif (hasCod)             score += 12  // Cash on Delivery / Open-Parcel trust\nif (hasProof)           score += 10  // Warranty, open parcel, or review proof\nif (hasUrgency)         score += 8   // Scarcity / seasonal urgency\nif (hasCta || hasWhatsapp) score += 6 // Direct checkout / WhatsApp CTA (+4 if Free Delivery)`,
            },
            {
              type: 'code',
              language: 'bash',
              filename: 'Local Ingestion & Web Build Commands',
              code: `# Run local zero-garbage Playwright ingestion (dry-run skips Supabase writes)\npython -m pipeline.run_ingest --industries fashion,electronics,beauty_health --queries-per-industry 2 --dry-run\n\n# Run v2 pipeline tests\npytest pipeline/tests/test_pipeline_v2.py -v\n\n# Build Vercel web dashboard & serverless TypeScript checks\ncd web && pnpm install && pnpm run typecheck && pnpm run build`,
            },
          ],
        },
      ],
    },
  ],
}
