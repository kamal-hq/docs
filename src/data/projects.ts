import syncedProjectsJson from './synced/projects.json'

export type ProjectStatus = 'Production' | 'Active' | 'Beta' | 'Research'

export type Project = {
  slug: string
  code: string
  title: string
  version: string
  status: ProjectStatus
  summary: string
  tags: string[]
  category: 'Intelligence' | 'Tools' | 'Infrastructure' | 'Data'
  accent: string
  glyph: 'spark' | 'convert' | 'orbit' | 'signal' | 'lens' | 'keyboard' | 'cadence' | 'radar'
  repoUrl?: string
  liveUrl?: string
}

export const portalConfig = {
  brandName: 'KAMAL',
  brandDivision: '/ DOCS',
  indexTag: 'DOCS / INDEX',
  revisionTag: 'PORTAL — v1.0',
  heroKicker: 'ENGINEERING KNOWLEDGE BASE',
  heroTitleTop: 'Systems, clearly',
  heroTitleAccent: 'documented.',
  heroDescription:
    'Technical references, architecture guides, and operational documentation across active AI, data, and desktop engineering projects.',
  directoryTitle: 'PROJECT DIRECTORY',
  footerLabel: 'MUHAMMAD KAMAL / ENGINEERING DOCUMENTATION PORTAL',
  footerStatus: 'GITHUB PAGES & VERCEL READY',
} as const

export const manualProjects: Project[] = [
  {
    slug: 'ascend-ai',
    code: 'A-03',
    title: 'Ascend AI',
    version: 'v3.0',
    status: 'Production',
    summary:
      'Async AI career and scholarship studio that analyzes a student CV in seconds and streams 11 on-demand research, SOP, and career capabilities.',
    tags: ['FastAPI', 'React 19', 'Groq', 'Redis/RQ', 'SQLite'],
    category: 'Intelligence',
    accent: '#ff5c35',
    glyph: 'spark',
    repoUrl: 'https://github.com/kamal-hq/ascend-ai',
    liveUrl: 'https://ascend-ai-sandy.vercel.app/',
  },
  {
    slug: 'deskconvert',
    code: 'D-02',
    title: 'DeskConvert',
    version: 'v2.0.0',
    status: 'Production',
    summary:
      'Privacy-first local PDF and image studio running 100% client-side in the browser via WebAssembly and as a native Windows desktop app.',
    tags: ['React 19', 'TypeScript', 'WASM', 'PyMuPDF', 'WebView2'],
    category: 'Tools',
    accent: '#2b6dff',
    glyph: 'convert',
    repoUrl: 'https://github.com/kamal-hq/DeskConvert',
    liveUrl: 'https://desk-convert.vercel.app/',
  },
  {
    slug: 'adlens-pk',
    code: 'L-02',
    title: 'AdLens PK',
    version: 'v2.0.0',
    status: 'Production',
    summary:
      'Zero-garbage longitudinal Pakistani Meta Ad Library intelligence engine tracking COD, Open-Parcel trust, WhatsApp funnels, PKR pricing, and 30+ day creative survival.',
    tags: ['Playwright', 'Supabase', 'React 19', 'Vercel API', 'Gemini 2.5'],
    category: 'Data',
    accent: '#e89422',
    glyph: 'lens',
    repoUrl: 'https://github.com/kamal-hq/adlens-pk',
    liveUrl: 'https://adlens-pk.vercel.app/',
  },
  {
    slug: 'typesimulator',
    code: 'T-02',
    title: 'TypeSimulator',
    version: 'v2.0.0',
    status: 'Production',
    summary:
      'OS-level humanized keystroke automation studio for Windows with log-normal biomechanical cadence, QWERTY typo simulation, Win32 Focus Guard, and an interactive browser sandbox.',
    tags: ['Python 3.10+', 'PyWebView', 'Win32 ctypes', 'React 19', 'pynput'],
    category: 'Tools',
    accent: '#06b6d4',
    glyph: 'keyboard',
    repoUrl: 'https://github.com/kamal-hq/TypeSimulator',
    liveUrl: 'https://typesimulator-frontend.vercel.app/',
  },
  {
    slug: 'cadence',
    code: 'C-01',
    title: 'Cadence',
    version: 'v1.0.0',
    status: 'Production',
    summary:
      'Full-stack personal productivity, @dnd-kit Kanban, analytics, and calendar-scheduling web app with isolated multi-schema Supabase RLS, AES-256-GCM Google Calendar 2-way sync, and Zod-validated JSON portability.',
    tags: ['Next.js 15', 'React 19', 'Supabase RLS', '@dnd-kit', 'Google Calendar'],
    category: 'Tools',
    accent: '#2c99d6',
    glyph: 'cadence',
    repoUrl: 'https://github.com/kamal-hq/cadence',
    liveUrl: 'https://kamal-cadence.vercel.app/',
  },
  {
    slug: 'prospectiq',
    code: 'P-03',
    title: 'ProspectIQ',
    version: 'v3.0.0',
    status: 'Production',
    summary:
      'Automated B2B agency prospecting and web-presence intelligence engine with Chrome TLS stealth routing, Free-First MX-verified contact waterfalls, 0–100 opportunity scoring, and real-time Supabase cloud dashboards.',
    tags: ['Python 3.12', 'curl_cffi', 'Supabase Realtime', 'React 19', 'GitHub Actions'],
    category: 'Data',
    accent: '#6366f1',
    glyph: 'radar',
    repoUrl: 'https://github.com/kamal-hq/prospectiq',
    liveUrl: 'https://kamal-prospectiq.vercel.app/',
  },
  {
    slug: 'sec-13f-analyzer',
    code: 'S-01',
    title: 'SEC 13F Analyzer',
    version: 'v1.1.0',
    status: 'Production',
    summary:
      'Quantitative 5-layer SEC Form 13F pipeline tracking institutional Smart Money Convergence buying signals across top hedge funds and discretionary managers.',
    tags: ['Python', 'SQLite', 'pandas', 'SEC EDGAR', 'Power BI'],
    category: 'Data',
    accent: '#00a981',
    glyph: 'signal',
    repoUrl: 'https://github.com/kamal-hq/sec_13f_analyzer',
  },
  {
    slug: 'sec-13f-autopilot',
    code: 'S-02',
    title: 'SEC 13F Autopilot',
    version: 'v0.1.0',
    status: 'Active',
    summary:
      'Human-approved, one-click quarterly SEC 13F-HR update pipeline with deterministic fact grounding, R1–R9 offline validation rules, and PR review gates.',
    tags: ['Python 3.11+', 'Google GenAI', 'SEC EDGAR', 'SQLite', 'CI/CD'],
    category: 'Infrastructure',
    accent: '#7b61ff',
    glyph: 'orbit',
    repoUrl: 'https://github.com/kamal-hq/sec_13f_autopilot',
  },
]

const syncedProjects = syncedProjectsJson as Project[]

function mergeProjects(manual: Project[], synced: Project[]): Project[] {
  const syncedBySlug = new Map(synced.map((item) => [item.slug, item]))
  const seen = new Set<string>()
  const merged: Project[] = []

  for (const item of manual) {
    seen.add(item.slug)
    const syncedMatch = syncedBySlug.get(item.slug)
    merged.push({
      ...item,
      repoUrl: item.repoUrl ?? syncedMatch?.repoUrl,
      liveUrl: item.liveUrl ?? syncedMatch?.liveUrl,
    })
  }

  for (const item of synced) {
    if (!seen.has(item.slug)) {
      merged.push(item)
    }
  }

  return merged
}

export const projects: Project[] = mergeProjects(manualProjects, syncedProjects)

export const categories = ['All systems', 'Intelligence', 'Tools', 'Infrastructure', 'Data'] as const
