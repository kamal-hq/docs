import { projects, type Project } from './projects'
import { ascendAiDocs } from './projects/ascend-ai'
import { deskConvertDocs } from './projects/deskconvert'
import { sec13fAnalyzerDocs } from './projects/sec-13f-analyzer'
import { sec13fAutopilotDocs } from './projects/sec-13f-autopilot'
import syncedDocsJson from './synced/docs.json'

export type DocBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; variant: 'note' | 'warning'; title: string; text: string }
  | { type: 'principles'; items: { num: string; title: string; body: string }[] }
  | { type: 'list'; items: { title: string; detail: string }[] }
  | { type: 'terminal'; command: string }
  | { type: 'code'; language: string; filename?: string; code: string }
  | { type: 'table'; columns: string[]; rows: string[][] }

export type DocSection = {
  id: string
  title: string
  blocks: DocBlock[]
}

export type DocPage = {
  id: string
  label: string
  group: string
  categoryLabel: string
  readTime: string
  title: string
  subtitle?: string
  lead: string
  badge?: string
  sections: DocSection[]
}

export type ProjectDocumentation = {
  slug: string
  updatedLabel: string
  pages: DocPage[]
}

const projectDocsRegistry: Record<string, ProjectDocumentation> = {
  'ascend-ai': ascendAiDocs,
  deskconvert: deskConvertDocs,
  'sec-13f-analyzer': sec13fAnalyzerDocs,
  'sec-13f-autopilot': sec13fAutopilotDocs,
}

function buildDefaultProjectDocs(project: Project): ProjectDocumentation {
  return {
    slug: project.slug,
    updatedLabel: 'TEMPLATE DOCS',
    pages: [
      {
        id: 'introduction',
        label: 'Introduction',
        group: 'Getting Started',
        categoryLabel: 'GETTING STARTED',
        readTime: '4 MIN READ',
        title: project.title,
        subtitle: 'Introduction',
        lead: project.summary,
        sections: [
          {
            id: 'overview',
            title: 'Overview',
            blocks: [
              {
                type: 'paragraph',
                text: `${project.title} (${project.version}) is organized around focused modules, predictable configuration, and clear operational boundaries.`,
              },
              {
                type: 'callout',
                variant: 'note',
                title: 'NOTE',
                text: `This entry describes ${project.title} ${project.version}. Add a dedicated module under src/data/projects/ to expand project-specific guides and code deep dives.`,
              },
            ],
          },
          {
            id: 'install',
            title: 'Quick start',
            blocks: [
              {
                type: 'terminal',
                command: `git clone https://github.com/kamal-hq/${project.slug}.git`,
              },
            ],
          },
        ],
      },
    ],
  }
}

const syncedDocsRegistry = syncedDocsJson as Record<string, ProjectDocumentation>

export function getProjectDocs(project: Project): ProjectDocumentation {
  return (
    projectDocsRegistry[project.slug] ??
    syncedDocsRegistry[project.slug] ??
    buildDefaultProjectDocs(project)
  )
}

export function getDocMetrics() {
  const allDocs = projects.map(getProjectDocs)
  const pageCount = allDocs.reduce((sum, doc) => sum + doc.pages.length, 0)
  const sectionCount = allDocs.reduce(
    (sum, doc) => sum + doc.pages.reduce((pSum, page) => pSum + page.sections.length, 0),
    0,
  )
  return {
    systemCount: projects.length,
    pageCount,
    sectionCount,
  }
}
