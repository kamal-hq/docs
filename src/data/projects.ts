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
  glyph: 'spark' | 'convert' | 'orbit' | 'signal'
  repoUrl?: string
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
