#!/usr/bin/env node
/**
 * Synchronizes GitHub repositories into src/data/synced/projects.json and
 * src/data/synced/docs.json for both local CLI runs and GitHub Actions CI.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SYNCED_DIR = path.join(ROOT_DIR, 'src', 'data', 'synced')
const PROJECTS_PATH = path.join(SYNCED_DIR, 'projects.json')
const DOCS_PATH = path.join(SYNCED_DIR, 'docs.json')

const CATEGORY_STYLE = {
  Intelligence: { accent: '#ff5c35', glyph: 'spark' },
  Tools: { accent: '#2b6dff', glyph: 'convert' },
  Infrastructure: { accent: '#7b61ff', glyph: 'orbit' },
  Data: { accent: '#00a981', glyph: 'signal' },
}

const VALID_BLOCK_TYPES = new Set([
  'paragraph',
  'callout',
  'principles',
  'list',
  'terminal',
  'code',
  'table',
])

function parseCliArgs(argv) {
  const opts = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const [key, inlineVal] = arg.slice(2).split('=')
    if (inlineVal !== undefined) {
      opts[key] = inlineVal
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      opts[key] = argv[++i]
    } else {
      opts[key] = 'true'
    }
  }
  return opts
}

function inferOwnerFromGitRemote() {
  try {
    const url = execSync('git remote get-url origin', { cwd: ROOT_DIR, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    const match = url.match(/github\.com[:/]([^/]+)\//i)
    return match?.[1] || ''
  } catch {
    return ''
  }
}

async function githubFetch(endpoint, { token, raw = false } = {}) {
  const headers = {
    Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
    'User-Agent': 'docs-portal-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`https://api.github.com${endpoint}`, { headers })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub API ${res.status} on ${endpoint}: ${body.slice(0, 200)}`)
  }
  return raw ? res.text() : res.json()
}

async function listOwnedRepos(owner, token) {
  if (token) {
    try {
      const repos = await githubFetch('/user/repos?affiliation=owner&sort=updated&per_page=100', { token })
      if (Array.isArray(repos)) {
        return owner
          ? repos.filter((r) => r.owner?.login?.toLowerCase() === owner.toLowerCase())
          : repos
      }
    } catch (err) {
      console.warn(`Authenticated /user/repos unavailable (${err.message}); falling back to public /users/${owner}/repos.`)
    }
  }
  if (!owner) {
    throw new Error('Specify --owner <github-username> or set GITHUB_OWNER.')
  }
  const publicRepos = await githubFetch(`/users/${encodeURIComponent(owner)}/repos?type=owner&sort=updated&per_page=100`, {
    token,
  })
  return Array.isArray(publicRepos) ? publicRepos : []
}

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toDisplayTitle(name) {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function inferCategory(repo) {
  const text = `${repo.name} ${repo.description || ''} ${repo.language || ''} ${(repo.topics || []).join(' ')}`.toLowerCase()
  if (/\b(ai|ml|llm|agent|model|inference|rag|pytorch|openai|gemini)\b/.test(text)) return 'Intelligence'
  if (/\b(infra|docker|k8s|kubernetes|runtime|deploy|ci|server|cloud|wasm|grpc|go)\b/.test(text)) return 'Infrastructure'
  if (/\b(data|analytics|telemetry|etl|sql|pipeline|metrics|otel|db)\b/.test(text)) return 'Data'
  return 'Tools'
}

function inferStatus(repo, version) {
  const topics = new Set((repo.topics || []).map((t) => t.toLowerCase()))
  if (topics.has('research') || topics.has('experimental')) return 'Research'
  if (topics.has('beta') || topics.has('alpha') || /^v?0\./.test(version)) return 'Beta'
  if (topics.has('production') || /^v?[1-9]\d*\./.test(version)) return 'Production'
  return 'Active'
}

function buildProjectCode(slug, index) {
  const prefix = (slug[0] || 'P').toUpperCase()
  return `${prefix}-${String(index + 1).padStart(2, '0')}`
}

function stripMarkdownNoise(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim()
}

function parseMarkdownTable(lines) {
  const cleaned = lines
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'))
    .filter((l) => !/^\|(?:\s*:?-{2,}:?\s*\|)+$/.test(l))
  if (cleaned.length < 2) return null
  const splitRow = (row) =>
    row
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => stripMarkdownNoise(cell))
  const columns = splitRow(cleaned[0])
  const rows = cleaned.slice(1).map(splitRow).filter((r) => r.length === columns.length)
  if (!columns.length || !rows.length) return null
  return { type: 'table', columns, rows }
}

function parseSectionBlocks(body) {
  const blocks = []
  const lines = body.split(/\r?\n/)
  let i = 0
  let proseBuf = []

  const flushProse = () => {
    const joined = stripMarkdownNoise(proseBuf.join(' ').replace(/\s+/g, ' '))
    if (joined) blocks.push({ type: 'paragraph', text: joined })
    proseBuf = []
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushProse()
      const lang = trimmed.slice(3).trim().toLowerCase() || 'text'
      const codeLines = []
      i += 1
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i += 1
      }
      const code = codeLines.join('\n').trim()
      if (code) {
        const isShell = /^(bash|sh|shell|zsh|powershell|console)$/.test(lang)
        if (isShell && codeLines.length === 1 && code.length <= 100) {
          blocks.push({ type: 'terminal', command: code.replace(/^\$\s*/, '') })
        } else {
          blocks.push({ type: 'code', language: lang, code })
        }
      }
      i += 1
      continue
    }

    if (trimmed.startsWith('>')) {
      flushProse()
      const quoteLines = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      const text = stripMarkdownNoise(quoteLines.join(' '))
      if (text) {
        const isWarning = /\b(warning|caution|important|breaking)\b/i.test(text)
        blocks.push({
          type: 'callout',
          variant: isWarning ? 'warning' : 'note',
          title: isWarning ? 'IMPORTANT' : 'NOTE',
          text,
        })
      }
      continue
    }

    if (trimmed.startsWith('|')) {
      flushProse()
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i += 1
      }
      const tableBlock = parseMarkdownTable(tableLines)
      if (tableBlock) blocks.push(tableBlock)
      continue
    }

    if (!trimmed) {
      flushProse()
      i += 1
      continue
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      flushProse()
      const headingText = stripMarkdownNoise(trimmed.replace(/^#{1,6}\s+/, ''))
      if (headingText) blocks.push({ type: 'paragraph', text: headingText })
      i += 1
      continue
    }

    proseBuf.push(trimmed.replace(/^[-*+]\s+/, '• '))
    i += 1
  }

  flushProse()
  return blocks
}

function buildDocsFromReadme(project, readmeText, manifests) {
  const clean = (readmeText || '').replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '').trim()
  if (!clean) {
    return [
      {
        id: 'overview',
        label: 'Overview',
        group: 'Getting Started',
        categoryLabel: 'GETTING STARTED',
        readTime: '2 MIN READ',
        title: project.title,
        subtitle: 'Overview',
        lead: project.summary,
        sections: [
          {
            id: 'repository',
            title: 'Repository summary',
            blocks: [
              {
                type: 'paragraph',
                text: `${project.title} (${project.version}) was synced from GitHub. Add a README.md in the source repository to populate detailed sections automatically.`,
              },
              {
                type: 'terminal',
                command: `git clone ${project.repoUrl}.git`,
              },
            ],
          },
        ],
      },
    ]
  }

  const rawSections = clean.split(/\n(?=##\s+)/)
  const introText = rawSections[0]?.replace(/^#\s+[^\n]*\n?/, '').trim() || ''
  const parsedSections = []

  if (introText) {
    const blocks = parseSectionBlocks(introText)
    if (blocks.length) {
      parsedSections.push({
        id: 'overview',
        title: 'Overview',
        blocks,
      })
    }
  }

  for (const chunk of rawSections.slice(1)) {
    const newlineIdx = chunk.indexOf('\n')
    const heading = (newlineIdx === -1 ? chunk : chunk.slice(0, newlineIdx))
      .replace(/^##\s+/, '')
      .trim()
    const body = newlineIdx === -1 ? '' : chunk.slice(newlineIdx + 1)
    const blocks = parseSectionBlocks(body)
    if (heading && blocks.length) {
      parsedSections.push({
        id: toSlug(heading) || `section-${parsedSections.length + 1}`,
        title: heading,
        blocks,
      })
    }
  }

  if (!parsedSections.length) {
    parsedSections.push({
      id: 'overview',
      title: 'Overview',
      blocks: [{ type: 'paragraph', text: project.summary }],
    })
  }

  if (manifests.length && parsedSections.length === 1) {
    parsedSections.push({
      id: 'repository-files',
      title: 'Detected stack',
      blocks: [
        {
          type: 'paragraph',
          text: `Detected repository manifests: ${manifests.join(', ')}.`,
        },
      ],
    })
  }

  const splitAt = Math.min(4, Math.ceil(parsedSections.length / 2))
  if (parsedSections.length <= 4) {
    return [
      {
        id: 'introduction',
        label: 'Introduction',
        group: 'Getting Started',
        categoryLabel: 'GETTING STARTED',
        readTime: `${Math.max(2, parsedSections.length * 2)} MIN READ`,
        title: project.title,
        subtitle: 'Documentation',
        lead: project.summary,
        sections: parsedSections,
      },
    ]
  }

  return [
    {
      id: 'introduction',
      label: 'Introduction',
      group: 'Getting Started',
      categoryLabel: 'GETTING STARTED',
      readTime: `${Math.max(2, splitAt * 2)} MIN READ`,
      title: project.title,
      subtitle: 'Introduction',
      lead: project.summary,
      sections: parsedSections.slice(0, splitAt),
    },
    {
      id: 'reference',
      label: 'Usage & Reference',
      group: 'Reference',
      categoryLabel: 'REFERENCE',
      readTime: `${Math.max(2, (parsedSections.length - splitAt) * 2)} MIN READ`,
      title: project.title,
      subtitle: 'Usage & Reference',
      lead: `Commands, configuration, and reference sections for ${project.title}.`,
      sections: parsedSections.slice(splitAt),
    },
  ]
}

function isValidPagesArray(pages) {
  if (!Array.isArray(pages) || !pages.length) return false
  return pages.every(
    (page) =>
      page &&
      typeof page.id === 'string' &&
      typeof page.label === 'string' &&
      typeof page.group === 'string' &&
      typeof page.categoryLabel === 'string' &&
      typeof page.readTime === 'string' &&
      typeof page.title === 'string' &&
      typeof page.lead === 'string' &&
      Array.isArray(page.sections) &&
      page.sections.length > 0 &&
      page.sections.every(
        (sec) =>
          sec &&
          typeof sec.id === 'string' &&
          typeof sec.title === 'string' &&
          Array.isArray(sec.blocks) &&
          sec.blocks.every((b) => b && VALID_BLOCK_TYPES.has(b.type)),
      ),
  )
}

async function draftPagesWithGemini(project, readmeText, manifests, apiKey) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const prompt = [
    `Convert this GitHub repository documentation into a JSON array of 1 to 3 DocPage objects.`,
    `Project metadata: ${JSON.stringify({ title: project.title, slug: project.slug, version: project.version, summary: project.summary, tags: project.tags, manifests })}`,
    `Each DocPage must strictly follow:`,
    `{ id, label, group, categoryLabel, readTime, title, subtitle, lead, sections: [{ id, title, blocks }] }`,
    `Allowed block types:`,
    `- { "type": "paragraph", "text": "..." }`,
    `- { "type": "callout", "variant": "note" | "warning", "title": "...", "text": "..." }`,
    `- { "type": "terminal", "command": "..." }`,
    `- { "type": "code", "language": "...", "code": "..." }`,
    `- { "type": "table", "columns": ["..."], "rows": [["..."]] }`,
    `Only state facts grounded in the README or metadata below. Return valid JSON array only.`,
    `README.md:\n${(readmeText || 'No README provided.').slice(0, 12000)}`,
  ].join('\n\n')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}`)
  }
  const payload = await res.json()
  const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) throw new Error('Empty Gemini response')
  const parsed = JSON.parse(raw)
  if (!isValidPagesArray(parsed)) {
    throw new Error('Gemini output failed DocPage schema validation')
  }
  return parsed
}

function readJsonOrFallback(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2))
  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN || ''
  const owner = args.owner || process.env.GITHUB_OWNER || inferOwnerFromGitRemote()
  const targetRepo = args.repo || process.env.TARGET_REPO || ''
  const syncAll = args.all === 'true' || process.env.SYNC_ALL === 'true'
  const syncTopic = (args.topic || process.env.SYNC_TOPIC || 'docs-sync').toLowerCase()
  const docsRepoName = (args['docs-repo'] || process.env.DOCS_REPO_NAME || 'docs').toLowerCase()
  const dryRun = args['dry-run'] === 'true'
  const geminiApiKey = process.env.GEMINI_API_KEY || ''

  const allRepos = await listOwnedRepos(owner, token)
  const candidates = allRepos.filter((repo) => {
    if (repo.fork || repo.archived || repo.disabled) return false
    if (repo.name.toLowerCase() === docsRepoName) return false
    if (targetRepo) return repo.name.toLowerCase() === targetRepo.toLowerCase()
    if (syncAll) return true
    return (repo.topics || []).some((t) => t.toLowerCase() === syncTopic)
  })

  if (!candidates.length) {
    console.log(
      targetRepo
        ? `No matching repository found for "${targetRepo}".`
        : `No repositories matched (syncAll=${syncAll}, topic="${syncTopic}").`,
    )
    return
  }

  const existingProjects = readJsonOrFallback(PROJECTS_PATH, [])
  const existingDocs = readJsonOrFallback(DOCS_PATH, {})
  const nextProjectsMap = new Map(targetRepo ? existingProjects.map((p) => [p.slug, p]) : [])
  const nextDocsMap = targetRepo ? { ...existingDocs } : {}

  for (let i = 0; i < candidates.length; i += 1) {
    const repo = candidates[i]
    const slug = toSlug(repo.name)
    const [latestRelease, readmeText, rootContents] = await Promise.all([
      githubFetch(`/repos/${repo.owner.login}/${repo.name}/releases/latest`, { token }).catch(() => null),
      githubFetch(`/repos/${repo.owner.login}/${repo.name}/readme`, { token, raw: true }).catch(() => ''),
      githubFetch(`/repos/${repo.owner.login}/${repo.name}/contents`, { token }).catch(() => []),
    ])

    const version = latestRelease?.tag_name || 'v0.1'
    const category = inferCategory(repo)
    const style = CATEGORY_STYLE[category]
    const tags = Array.from(
      new Set([
        ...(repo.language ? [repo.language] : []),
        ...(repo.topics || []).filter((t) => t.toLowerCase() !== syncTopic),
      ]),
    ).slice(0, 3)

    const existingEntry = existingProjects.find((p) => p.slug === slug)
    const project = {
      slug,
      code: existingEntry?.code ?? buildProjectCode(slug, nextProjectsMap.size),
      title: toDisplayTitle(repo.name),
      version,
      status: inferStatus(repo, version),
      summary: repo.description?.trim() || `${toDisplayTitle(repo.name)} engineering documentation.`,
      tags: tags.length ? tags : ['Repository'],
      category,
      accent: style.accent,
      glyph: style.glyph,
      repoUrl: repo.html_url,
    }

    const manifests = Array.isArray(rootContents)
      ? rootContents
          .map((entry) => entry.name)
          .filter((name) =>
            /^(package\.json|pyproject\.toml|Cargo\.toml|go\.mod|Dockerfile|Makefile)$/i.test(name),
          )
      : []

    let pages
    if (geminiApiKey) {
      try {
        pages = await draftPagesWithGemini(project, readmeText, manifests, geminiApiKey)
      } catch (err) {
        console.warn(`Gemini fallback for ${repo.name}: ${err.message}`)
      }
    }
    if (!pages) {
      pages = buildDocsFromReadme(project, readmeText, manifests)
    }

    nextProjectsMap.set(slug, project)
    nextDocsMap[slug] = {
      slug,
      updatedLabel: `SYNCED ${new Date(repo.pushed_at || Date.now()).toISOString().slice(0, 10)}`,
      pages,
    }
    console.log(`Synced ${repo.full_name} -> /docs/${slug} (${pages.length} page(s))`)
  }

  const sortedProjects = Array.from(nextProjectsMap.values()).sort((a, b) =>
    a.slug.localeCompare(b.slug),
  )
  const sortedDocs = Object.fromEntries(
    Object.keys(nextDocsMap)
      .sort()
      .map((key) => [key, nextDocsMap[key]]),
  )

  if (dryRun) {
    console.log('Dry run enabled; skipping file writes.')
    return
  }

  fs.mkdirSync(SYNCED_DIR, { recursive: true })
  fs.writeFileSync(PROJECTS_PATH, `${JSON.stringify(sortedProjects, null, 2)}\n`, 'utf8')
  fs.writeFileSync(DOCS_PATH, `${JSON.stringify(sortedDocs, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${sortedProjects.length} synced project(s) to src/data/synced/.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
