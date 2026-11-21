import type { ProjectDocumentation } from '../docs'

export const sec13fAnalyzerDocs: ProjectDocumentation = {
  slug: 'sec-13f-analyzer',
  updatedLabel: 'RELEASE v1.1.0',
  pages: [
    {
      id: 'introduction',
      label: 'Thesis & 2026-Q2 Findings',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: '8 MIN READ',
      title: 'SEC 13F Analyzer',
      subtitle: 'Smart Money Convergence Thesis & Verified Findings',
      lead: 'A 5-layer quantitative pipeline and installable Python package that ingests raw SEC EDGAR Form 13F-HR XML information tables, reconciles holdings to cover-page totals, adjusts for verified stock splits, and identifies high-conviction institutional accumulation.',
      sections: [
        {
          id: 'thesis-and-universe',
          title: 'Smart Money Convergence thesis & 7-fund universe',
          blocks: [
            {
              type: 'paragraph',
              text: 'The Smart Money Convergence thesis identifies operating common equities independently initiated or meaningfully increased (>= 10% split-adjusted QoQ share increase and >= $1,000,000 added at quarter-end implied prices) by multiple top-tier institutions during the same reporting quarter. Because multi-strategy quant hedge funds exhibit different turnover mechanics than long-horizon capital allocators, the pipeline classifies its 7 tracked institutions into two cohorts:',
            },
            {
              type: 'table',
              columns: ['INSTITUTION', 'CIK', 'FUND TYPE', 'COHORT', '2026-Q2 COMMON EQUITY AUM'],
              rows: [
                ['Berkshire Hathaway', '0001067983', 'Conglomerate', 'Discretionary (3)', '$299,253,556,246 (29 positions, 88.47% Top-10)'],
                ['CalPERS', '0000919079', 'Public Pension Fund', 'Discretionary (3)', 'Long-horizon public pension equity book'],
                ['Temasek Holdings', '0001021944', 'Sovereign Wealth Fund', 'Discretionary (3)', '$37,253,810,301 (196 positions, 51.42% Top-10)'],
                ['Citadel Advisors', '0001423053', 'Hedge Fund', 'High-Breadth Hedge Fund (4)', 'High-turnover equity + $700.88B option notional'],
                ['Two Sigma Investments', '0001179392', 'Hedge Fund', 'High-Breadth Hedge Fund (4)', '$138,117,670,065 (5,017 positions, 8.28% Top-10)'],
                ['Renaissance Technologies', '0001037389', 'Hedge Fund', 'High-Breadth Hedge Fund (4)', '$72,617,871,974 (3,139 positions, 12.01% Top-10)'],
                ['Bridgewater Associates', '0001350694', 'Hedge Fund', 'High-Breadth Hedge Fund (4)', 'Global macro systematic equity portfolio'],
              ],
            },
          ],
        },
        {
          id: 'verified-findings',
          title: 'Query-verified 2026-Q1 vs. 2026-Q2 empirical findings',
          blocks: [
            {
              type: 'principles',
              items: [
                {
                  num: '01',
                  title: '56 Broad vs. 9 Discretionary Signals',
                  body: '31 of 56 broad signals (4+ of 7 funds) are hedge-fund-only. Isolating the 3 discretionary funds (2+ buying) surfaces 9 signals (7 unique), led by merged GOOGL/GOOG (+$18.67B) and Citigroup C (+$226.49M).',
                },
                {
                  num: '02',
                  title: '5-Fund Consensus & New Listings',
                  body: 'Four seasoned issuers were bought by 5 of 7 funds: AMD (+$1.20B), WFC (+$903.05M), CBRE (+$268.15M), and FORM (+$119.59M). New-to-sample listings (is_new_listing=1) were led by SPCX (+$2.86B, 4 funds).',
                },
                {
                  num: '03',
                  title: '$1.624T AUM & Tech Rotation',
                  body: 'Total 13F AUM rose +26.40% ($1.285T -> $1.624T); common equity rose +14.18% ($803.29B -> $917.15B), led by Technology (+$53.22B, +23.13%) and Financials (+$14.68B, +9.05%).',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'edgar-fetch-parse',
      label: 'EDGAR Fetch & XML Parser',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'SEC 13F Analyzer',
      subtitle: 'SEC EDGAR Cover-Page Inspection & XML Aggregation',
      lead: 'Code walkthrough of src/fetch_13f.py and src/parse_holdings.py: cover-page amendment reconciliation, post-2023 exact-dollar XML parsing, and multi-manager row aggregation.',
      sections: [
        {
          id: 'cover-page-inspection',
          title: 'Cover-page XML inspection & amendment handling (src/fetch_13f.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Raw 13F information table XMLs contain only holding rows without filing period dates or amendment flags. src/fetch_13f.py inspects each submission directory index.json and parses primary_doc.xml under namespace http://www.sec.gov/edgar/thirteenffiler to extract isAmendment, amendmentType (RESTATEMENT vs. NEW HOLDINGS), tableEntryTotal, and tableValueTotal:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/fetch_13f.py',
              code: `COVER_NS = {"n": "http://www.sec.gov/edgar/thirteenffiler"}\n\ndef _inspect_filing_cover_page(cik: str, accession_number: str, user_agent: str | None = None) -> dict[str, Any]:\n    cik_int = str(int(cik))\n    acc_no_hyphens = accession_number.replace("-", "")\n    index_url = f"{EDGAR_BASE_URL}/data/{cik_int}/{acc_no_hyphens}/index.json"\n    index_data = make_request(index_url, user_agent=user_agent)\n\n    items = index_data.get("directory", {}).get("item", [])\n    xml_files = [item.get("name", "") for item in items if item.get("name", "").endswith(".xml")]\n    primary_doc = next((f for f in xml_files if "primary_doc" in f.lower()), None)\n    infotable_doc = next((f for f in xml_files if "primary_doc" not in f.lower()), None)\n\n    if primary_doc:\n        cover_resp = make_request(f"{EDGAR_BASE_URL}/data/{cik_int}/{acc_no_hyphens}/{primary_doc}", user_agent=user_agent)\n        root = ET.fromstring(cover_resp["text"])\n        is_amd = root.findtext(".//n:isAmendment", default="false", namespaces=COVER_NS).strip().lower() == "true"\n        amd_type = root.findtext(".//n:amendmentType", default="", namespaces=COVER_NS).strip().upper() or None\n        val_tot = root.findtext(".//n:tableValueTotal", default="", namespaces=COVER_NS).strip()`,
            },
          ],
        },
        {
          id: 'xml-parsing-aggregation',
          title: 'Exact-dollar XML parsing & multi-manager aggregation (src/parse_holdings.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Institutional filings frequently split a single security position across multiple <infoTable> rows corresponding to different sub-advisors (otherManager). parse_xml_file() extracts each row in exact post-2023 US dollars, and aggregate_holdings() groups by (fund_cik, period, cusip, put_call) with dropna=False so common-equity rows where put_call is None are never dropped by pandas:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/parse_holdings.py',
              code: `NS: dict[str, str] = {"ns": "http://www.sec.gov/edgar/document/thirteenf/informationtable"}\n\ndef aggregate_holdings(df: pd.DataFrame) -> pd.DataFrame:\n    """Groups per (fund, period, cusip, put_call) and sums value, shares, and voting_authority_sole."""\n    if df.empty:\n        return df.copy()\n\n    group_cols = [c for c in ["fund_cik", "period", "cusip", "put_call"] if c in df.columns]\n    agg_spec: dict[str, str] = {}\n    for col in df.columns:\n        if col in group_cols:\n            continue\n        if col in ("value", "value_usd", "shares", "voting_authority_sole"):\n            agg_spec[col] = "sum"\n        else:\n            agg_spec[col] = "first"\n\n    # dropna=False is critical so common equity rows (put_call=None) are preserved!\n    aggregated = df.groupby(group_cols, dropna=False, as_index=False).agg(agg_spec)\n    ordered_cols = [c for c in df.columns if c in aggregated.columns]\n    return aggregated[ordered_cols]`,
            },
          ],
        },
      ],
    },
    {
      id: 'cusip-and-sector-mapping',
      label: 'CUSIP & SIC Sector Mapper',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '8 MIN READ',
      title: 'SEC 13F Analyzer',
      subtitle: 'OpenFIGI Batch Resolution & SIC-to-GICS Classification',
      lead: 'Inside src/cusip_mapper.py: mapping 9-character CUSIPs via OpenFIGI and translating 4-digit SEC SIC codes into 11 GICS sectors with modern issuer overrides.',
      sections: [
        {
          id: 'sic-classifier',
          title: 'Deterministic 4-digit SIC classifier & modern overrides (src/cusip_mapper.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Form 13F XML files provide 9-character CUSIPs and issuer names but no ticker symbols or GICS sectors. src/cusip_mapper.py resolves CUSIPs to tickers via OpenFIGI (cached in data/mappings/cusip_cache.json), queries SEC EDGAR submissions for each issuer 4-digit SIC code (cached in sector_cache.json), and maps SIC ranges to 11 standard sectors while applying TICKER_SECTOR_OVERRIDES for issuers where 1987 SIC codes misclassify modern business models:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/cusip_mapper.py',
              code: `def sic_to_sector(sic: str | int | None) -> str:\n    code = int(str(sic).strip())\n    if (1300 <= code <= 1389) or (2900 <= code <= 2999) or (4600 <= code <= 4699) or (4920 <= code <= 4925):\n        return "Energy"\n    if (2830 <= code <= 2836) or (3840 <= code <= 3851) or code == 6324 or (8000 <= code <= 8099):\n        return "Healthcare"\n    if code == 3559 or (3570 <= code <= 3579) or (3660 <= code <= 3679) or (3820 <= code <= 3829) or (7370 <= code <= 7379):\n        return "Technology"\n    if (6000 <= code <= 6799) or code == 7320:\n        return "Financials"\n    # ... covers all 11 sectors with 'Unknown' fallback\n\nTICKER_SECTOR_OVERRIDES: dict[str, str] = {\n    "BKNG": "Consumer Discretionary", "ABNB": "Consumer Discretionary",\n    "ACN": "Technology", "IT": "Technology", "NOVT": "Technology",\n    "V": "Financials", "MA": "Financials", "PYPL": "Financials", "FIS": "Financials", "FI": "Financials",\n}`,
            },
          ],
        },
      ],
    },
    {
      id: 'database-and-splits',
      label: 'Star Schema & Split Engine',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '9 MIN READ',
      title: 'SEC 13F Analyzer',
      subtitle: 'SQLite Star Schema, Split Verification & QoQ Flags',
      lead: 'Walkthrough of src/database.py: star-schema DDL, yfinance-confirmed stock-split adjustments, and quarter-over-quarter position transitions.',
      sections: [
        {
          id: 'star-schema-ddl',
          title: 'Star schema & indexing (src/database.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'create_schema() initializes Dim_Fund, Dim_Security, Fact_Holdings, and View_Exited_Positions with three composite indexes tuned for period-over-period convergence joins:',
            },
            {
              type: 'code',
              language: 'sql',
              filename: 'src/database.py',
              code: `CREATE TABLE IF NOT EXISTS Dim_Fund (\n    fund_id INTEGER PRIMARY KEY AUTOINCREMENT,\n    cik TEXT UNIQUE NOT NULL,\n    name TEXT NOT NULL,\n    fund_type TEXT\n);\n\nCREATE TABLE IF NOT EXISTS Dim_Security (\n    security_id INTEGER PRIMARY KEY AUTOINCREMENT,\n    cusip TEXT UNIQUE NOT NULL,\n    ticker TEXT,\n    company_name TEXT,\n    security_class TEXT,\n    sector TEXT\n);\n\nCREATE TABLE IF NOT EXISTS Fact_Holdings (\n    holding_id INTEGER PRIMARY KEY AUTOINCREMENT,\n    fund_id INTEGER NOT NULL REFERENCES Dim_Fund(fund_id),\n    security_id INTEGER NOT NULL REFERENCES Dim_Security(security_id),\n    period TEXT NOT NULL,\n    put_call TEXT,\n    value_usd INTEGER,\n    shares INTEGER,\n    pct_of_portfolio REAL,\n    qoq_change_flag TEXT CHECK(qoq_change_flag IN ('NEW','INCREASED','DECREASED','EXITED','UNCHANGED')),\n    is_new_listing INTEGER\n);\n\nCREATE INDEX IF NOT EXISTS idx_fact_fund_period ON Fact_Holdings(fund_id, period);\nCREATE INDEX IF NOT EXISTS idx_fact_period_flag ON Fact_Holdings(period, qoq_change_flag);\nCREATE INDEX IF NOT EXISTS idx_fact_security ON Fact_Holdings(security_id);`,
            },
          ],
        },
        {
          id: 'split-verification',
          title: 'Two-stage stock split detection & yfinance confirmation',
          blocks: [
            {
              type: 'paragraph',
              text: 'Unadjusted forward stock splits artificially inflate Q2 share counts (making a passive 10-for-1 split look like a +900% share accumulation). detect_splits() and apply_split_adjustments() prevent false convergence signals through a two-stage gate:',
            },
            {
              type: 'list',
              items: [
                {
                  title: 'Stage 1 — Implied Price-Ratio Candidate Detection',
                  detail: 'Computes Q1 implied price (value_usd / shares) vs. Q2 implied price across all funds holding a security. If the median ratio clusters near a canonical split factor in COMMON_SPLIT_FACTORS (2, 3, 4, 5, 10, 20, 25, 50), flags the ticker as a candidate.',
                },
                {
                  title: 'Stage 2 — yfinance Historical Split Confirmation (split_cache.json)',
                  detail: 'Verifies each candidate against actual corporate split events recorded in yfinance (cached in data/mappings/split_cache.json). In 2026-Q2, only 3 confirmed splits were applied (BKNG 25-for-1, KLAC 10-for-1, CVNA 5-for-1 across 25 Q1 rows), while 7 unconfirmed price-move candidates (PSIG, LPCN, CURX, 500767330, SLNH, TDUP, TMCI) were rejected.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'convergence-sql',
      label: 'Convergence SQL Engine',
      group: 'Code Deep Dive',
      categoryLabel: 'CODE DEEP DIVE',
      readTime: '10 MIN READ',
      title: 'SEC 13F Analyzer',
      subtitle: 'Issuer-Merged Convergence CTE & Instrument Filters',
      lead: 'Inside src/analysis.py: how get_convergence_signals() merges dual-class shares by 6-digit issuer CUSIP, strips ETFs/notes/options, and computes buyer mixes.',
      sections: [
        {
          id: 'issuer-merged-cte',
          title: 'Issuer-level CTE query (get_convergence_signals)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Issuers such as Alphabet report separate 9-character CUSIPs for Class A (GOOGL) and Class C (GOOG) shares. Grouping by 9-character security_id would undercount institutional consensus when one fund buys GOOGL and another buys GOOG. get_convergence_signals() groups by the 6-character issuer CUSIP prefix SUBSTR(s.cusip, 1, 6) AS issuer_id, excludes ETFs (ETF_SQL_CONDITION) and debt/preferreds/warrants (NON_COMMON_EQUITY_SQL_CONDITION), and counts each distinct buying fund once per issuer:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'src/analysis.py',
              code: `query = f"""\n    WITH prior_period AS (\n        SELECT MAX(period) AS prev_period\n        FROM Fact_Holdings\n        WHERE period < ?\n    ),\n    qualified_buyers AS (\n        SELECT\n            SUBSTR(s.cusip, 1, 6) AS issuer_id,\n            h.security_id,\n            s.cusip,\n            s.ticker,\n            s.company_name,\n            s.sector,\n            COALESCE(h.is_new_listing, 0) AS is_new_listing,\n            f.fund_id,\n            f.name AS fund_name,\n            f.fund_type,\n            (h.shares - COALESCE(prev.shares, 0)) * (CAST(h.value_usd AS REAL) / h.shares) AS added_value_usd\n        FROM Fact_Holdings h\n        JOIN Dim_Security s ON h.security_id = s.security_id\n        JOIN Dim_Fund f ON h.fund_id = f.fund_id\n        LEFT JOIN Fact_Holdings prev\n            ON prev.fund_id = h.fund_id\n           AND prev.security_id = h.security_id\n           AND COALESCE(prev.put_call, '') = COALESCE(h.put_call, '')\n           AND prev.period = (SELECT prev_period FROM prior_period)\n           AND prev.value_usd > 0\n        WHERE h.period = ?\n          AND (h.put_call IS NULL OR h.put_call = '')\n          AND h.value_usd > 0\n          AND h.shares > 0\n          AND (\n              h.qoq_change_flag = 'NEW'\n              OR (prev.shares > 0 AND (h.shares - prev.shares) * 1.0 / prev.shares >= ?)\n          )\n          AND ((h.shares - COALESCE(prev.shares, 0)) * (CAST(h.value_usd AS REAL) / h.shares)) >= ?\n          {etf_clause}\n          {new_listing_clause}\n          {fund_type_clause}\n    )\n"""`,
            },
          ],
        },
      ],
    },
    {
      id: 'library-and-exports',
      label: 'Library API & CSV Schema',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: '7 MIN READ',
      title: 'SEC 13F Analyzer',
      subtitle: 'Public Python Package API & Power BI CSV Reference',
      lead: 'Complete reference for the installable sec_13f_analyzer library interface (sec_13f_analyzer/__init__.py) and the 7 Power BI datasets.',
      badge: '7',
      sections: [
        {
          id: 'package-exports',
          title: 'Public library API (sec_13f_analyzer/__init__.py)',
          blocks: [
            {
              type: 'paragraph',
              text: 'Downstream projects (such as sec_13f_autopilot) install sec_13f_analyzer via pip and import exclusively from the sec_13f_analyzer namespace:',
            },
            {
              type: 'code',
              language: 'python',
              filename: 'Library Usage Example',
              code: `from sec_13f_analyzer import (\n    DISCRETIONARY_FUND_TYPES,\n    bulk_insert_holdings,\n    configure,\n    get_aum_by_period,\n    get_convergence_signals,\n    get_fund_summary,\n    get_new_to_sample_signals,\n    get_sector_by_period,\n    get_top_holdings_by_aum,\n    map_cusips,\n    map_sectors,\n    parse_all_raw_files,\n    run_pipeline,\n)\n\n# Configure custom runtime paths and SEC User-Agent\nconfigure(\n    data_dir="/path/to/data",\n    db_path="/path/to/sec_13f.db",\n    user_agent="InstitutionName research@domain.com",\n)\n\n# Query seasoned convergence (4+ of 7 funds) and discretionary convergence (2+ of 3 funds)\nbroad_df = get_convergence_signals("2026-Q2", min_funds=4)\ndisc_df = get_convergence_signals("2026-Q2", min_funds=2, fund_types=DISCRETIONARY_FUND_TYPES)\nnew_df = get_new_to_sample_signals("2026-Q2", min_funds=3)`,
            },
          ],
        },
        {
          id: 'csv-data-dictionary',
          title: 'Exported Power BI CSV schemas (output/ & dashboard/data/)',
          blocks: [
            {
              type: 'table',
              columns: ['DATASET', 'GRANULARITY', 'KEY COLUMNS'],
              rows: [
                ['convergence_signals.csv', '1 row per seasoned issuer (56 rows)', 'cusip, ticker, company_name, sector, funds_buying, hedge_fund_buyers, discretionary_buyers, buyer_mix, funds, total_dollars_added'],
                ['discretionary_signals.csv', '1 row per discretionary issuer (9 rows)', 'cusip, ticker, company_name, sector, funds_buying (2+ of 3), funds, total_dollars_added, fund_type_breakdown'],
                ['new_positions_signals.csv', '1 row per new-to-sample issuer (4 rows)', 'cusip, ticker, company_name, sector, is_new_listing=1, funds_buying (3+), total_dollars_added'],
                ['top_holdings.csv', 'Top 50 common equities in Q2', 'ticker, company_name, sector, holders_count, total_value_usd, max_fund_pct, holding_funds'],
                ['fund_aum.csv', '1 row per (period, fund) (14 rows)', 'period, fund, fund_type, aum_with_options, aum_equity_only'],
                ['fund_summary.csv', '1 row per (period, fund) (14 rows)', 'period, fund, fund_type, active_positions, aum_with_options, aum_equity_only, top10_concentration_pct'],
                ['sector_by_period.csv', '1 row per (period, sector)', 'period, sector, value_usd (common equity only), fund_count'],
              ],
            },
          ],
        },
      ],
    },
  ],
}
