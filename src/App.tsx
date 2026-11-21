import { useEffect, useMemo, useState } from 'react'
import { categories, portalConfig, projects, type Project } from './data/projects'
import {
  getDocMetrics,
  getProjectDocs,
  type DocBlock,
  type DocPage,
  type ProjectDocumentation,
} from './data/docs'

type IconName =
  | 'search'
  | 'sun'
  | 'moon'
  | 'arrow'
  | 'command'
  | 'menu'
  | 'close'
  | 'copy'
  | 'check'
  | 'chevron'
  | 'grid'
  | 'spark'
  | 'convert'
  | 'orbit'
  | 'signal'

const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')

function normalizeRoute(pathname: string): string {
  let route = pathname
  if (BASE_PATH && (route === BASE_PATH || route.startsWith(`${BASE_PATH}/`))) {
    route = route.slice(BASE_PATH.length) || '/'
  }
  return route.startsWith('/') ? route : `/${route}`
}

function withBase(route: string): string {
  const normalized = route.startsWith('/') ? route : `/${route}`
  return `${BASE_PATH}${normalized}` || '/'
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </>
    ),
    moon: <path d="M20 15.4A8.2 8.2 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z" />,
    arrow: <path d="M5 12h13M14 7l5 5-5 5" />,
    command: <path d="M9 6V5a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v14a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3Z" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    spark: (
      <>
        <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
        <path d="m19 17 .6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6L19 17Z" />
      </>
    ),
    convert: (
      <>
        <path d="M4 7h13l-3-3M20 17H7l3 3" />
        <path d="m17 4 3 3-3 3M7 14l-3 3 3 3" />
      </>
    ),
    orbit: (
      <>
        <circle cx="12" cy="12" r="2" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(35 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-35 12 12)" />
      </>
    ),
    signal: <path d="M4 18V9M9 18V5M14 18v-7M19 18V3" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <button className="brand" onClick={() => navigate('/')} aria-label="Documentation portal home">
      <span className="brand-mark">
        <span />
      </span>
      {!compact && (
        <>
          <span className="brand-name">{portalConfig.brandName}</span>
          <span className="brand-division">{portalConfig.brandDivision}</span>
        </>
      )}
    </button>
  )
}

function navigate(path: string) {
  window.history.pushState({}, '', withBase(path))
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function useRoute() {
  const [path, setPath] = useState(() => normalizeRoute(window.location.pathname))
  useEffect(() => {
    const update = () => setPath(normalizeRoute(window.location.pathname))
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  return path
}

function ThemeButton({ theme, toggle }: { theme: string; toggle: () => void }) {
  return (
    <button className="icon-button" onClick={toggle} aria-label="Toggle color theme">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
    </button>
  )
}

function SearchDialog({ open, close }: { open: boolean; close: () => void }) {
  const [query, setQuery] = useState('')
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])
  if (!open) return null

  const normalizedQuery = query.trim().toLowerCase()
  const results = projects.filter((p) => {
    if (!normalizedQuery) return true
    const docs = getProjectDocs(p)
    const pageText = docs.pages.map((page) => `${page.label} ${page.lead}`).join(' ')
    return `${p.title} ${p.summary} ${p.tags.join(' ')} ${pageText}`
      .toLowerCase()
      .includes(normalizedQuery)
  })

  return (
    <div className="dialog-backdrop" onMouseDown={close}>
      <div className="search-dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="search-input">
          <Icon name="search" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects and documentation…"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="search-results">
          <div className="search-label">
            {query ? `${results.length} matching systems` : 'Available systems'}
          </div>
          {results.map((project) => (
            <button
              key={project.slug}
              onClick={() => {
                navigate(`/docs/${project.slug}`)
                close()
              }}
              className="search-result"
            >
              <ProjectGlyph project={project} small />
              <span>
                <strong>{project.title}</strong>
                <small>{project.summary}</small>
              </span>
              <Icon name="arrow" size={16} />
            </button>
          ))}
        </div>
        <div className="search-footer">
          <span>
            <kbd>↵</kbd> Open
          </span>
          <span>
            <kbd>ESC</kbd> Close
          </span>
          <span className="search-brand">
            <span className="pulse" /> Index online
          </span>
        </div>
      </div>
    </div>
  )
}

function ProjectGlyph({ project, small = false }: { project: Project; small?: boolean }) {
  return (
    <span
      className={`project-glyph ${small ? 'small' : ''}`}
      style={{ '--project-color': project.accent } as React.CSSProperties}
    >
      <Icon name={project.glyph} size={small ? 17 : 25} />
    </span>
  )
}

function StatusPill({ status }: { status: Project['status'] }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <span />
      {status}
    </span>
  )
}

function TopNav({
  theme,
  toggleTheme,
  openSearch,
}: {
  theme: string
  toggleTheme: () => void
  openSearch: () => void
}) {
  return (
    <header className="top-nav">
      <Logo />
      <div className="top-actions">
        <span className="system-state">
          <span className="pulse" /> ALL SYSTEMS NOMINAL
        </span>
        <button className="search-trigger" onClick={openSearch}>
          <Icon name="search" size={16} />
          <span>Search documentation</span>
          <kbd>⌘ K</kbd>
        </button>
        <span className="nav-rule" />
        <ThemeButton theme={theme} toggle={toggleTheme} />
      </div>
    </header>
  )
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article
      className="project-card"
      style={{ '--delay': `${index * 75}ms`, '--project-color': project.accent } as React.CSSProperties}
    >
      <div className="card-top">
        <ProjectGlyph project={project} />
        <span className="project-code">{project.code}</span>
      </div>
      <div className="card-heading">
        <div>
          <span className="eyebrow">{project.category}</span>
          <h2>{project.title}</h2>
        </div>
        <StatusPill status={project.status} />
      </div>
      <p>{project.summary}</p>
      <div className="card-tags">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <button className="card-link" onClick={() => navigate(`/docs/${project.slug}`)}>
        <span>Read documentation</span>
        <span className="card-link-icon">
          <Icon name="arrow" size={17} />
        </span>
      </button>
    </article>
  )
}

function Hub({
  theme,
  toggleTheme,
  openSearch,
}: {
  theme: string
  toggleTheme: () => void
  openSearch: () => void
}) {
  const [category, setCategory] = useState('All systems')
  const filtered = useMemo(
    () => projects.filter((p) => category === 'All systems' || p.category === category),
    [category],
  )
  const metrics = useMemo(() => getDocMetrics(), [])

  return (
    <div className="page-shell">
      <TopNav theme={theme} toggleTheme={toggleTheme} openSearch={openSearch} />
      <main className="hub">
        <section className="hero">
          <div className="hero-index">
            <span>{portalConfig.indexTag}</span>
            <span>{portalConfig.revisionTag}</span>
          </div>
          <div className="hero-content">
            <div>
              <span className="section-kicker">
                <i /> {portalConfig.heroKicker}
              </span>
              <h1>
                {portalConfig.heroTitleTop}
                <br />
                <em>{portalConfig.heroTitleAccent}</em>
              </h1>
            </div>
            <div className="hero-copy">
              <p>{portalConfig.heroDescription}</p>
              <div className="hero-metrics">
                <span>
                  <strong>{String(metrics.systemCount).padStart(2, '0')}</strong> SYSTEMS
                </span>
                <span>
                  <strong>{String(metrics.pageCount).padStart(2, '0')}</strong> GUIDES
                </span>
                <span>
                  <strong>{String(metrics.sectionCount).padStart(2, '0')}</strong> SECTIONS
                </span>
              </div>
            </div>
          </div>
          <div className="orbital-art" aria-hidden="true">
            <span className="orbit-line one" />
            <span className="orbit-line two" />
            <span className="orbit-dot" />
            <span className="axis x" />
            <span className="axis y" />
          </div>
        </section>
        <section className="catalog">
          <div className="catalog-bar">
            <div>
              <span className="catalog-title">{portalConfig.directoryTitle}</span>
              <span className="count">{String(filtered.length).padStart(2, '0')}</span>
            </div>
            <div className="filters" role="tablist">
              {categories.map((item) => (
                <button
                  role="tab"
                  aria-selected={category === item}
                  className={category === item ? 'active' : ''}
                  key={item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="project-grid">
            {filtered.map((project, index) => (
              <ProjectCard project={project} index={index} key={project.slug} />
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>{portalConfig.footerLabel}</span>
        <span>{portalConfig.footerStatus}</span>
      </footer>
    </div>
  )
}

const KEYWORD_PATTERN =
  /\b(import|from|export|const|let|var|return|await|async|new|def|class|true|false|null)\b/g

function highlightLine(line: string) {
  const tokens = line.split(/("[^"]*"|'[^']*')/g)
  return tokens.map((token, ti) => {
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return (
        <span key={ti} className="c-green">
          {token}
        </span>
      )
    }
    const parts = token.split(KEYWORD_PATTERN)
    return parts.map((part, pi) => {
      if (
        /^(import|from|export|const|let|var|return|await|async|new|def|class)$/.test(part)
      ) {
        return (
          <span key={`${ti}-${pi}`} className="c-purple">
            {part}
          </span>
        )
      }
      if (/^(true|false|null)$/.test(part)) {
        return (
          <span key={`${ti}-${pi}`} className="c-orange">
            {part}
          </span>
        )
      }
      return <span key={`${ti}-${pi}`}>{part}</span>
    })
  })
}

function CodeBlock({
  language,
  filename,
  code,
}: {
  language: string
  filename?: string
  code: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  const lines = code.split('\n')

  return (
    <div className="code-block">
      <div className="code-head">
        <span>
          <i /> {filename ? `${language} — ${filename}` : language}
        </span>
        <button onClick={copy}>
          <Icon name={copied ? 'check' : 'copy'} size={15} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>
          {lines.map((line, idx) => (
            <span key={idx}>
              {highlightLine(line)}
              {idx < lines.length - 1 ? '\n' : ''}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

function TerminalLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="terminal-line">
      <span>$</span>
      <code>{command}</code>
      <button onClick={copy} aria-label="Copy command">
        <Icon name={copied ? 'check' : 'copy'} size={15} />
      </button>
    </div>
  )
}

function renderBlock(block: DocBlock, idx: number) {
  switch (block.type) {
    case 'paragraph':
      return <p key={idx}>{block.text}</p>
    case 'callout':
      return (
        <div key={idx} className={`callout ${block.variant}`}>
          <div className="callout-icon">{block.variant === 'warning' ? '!' : 'i'}</div>
          <div>
            <strong>{block.title}</strong>
            <p>{block.text}</p>
          </div>
        </div>
      )
    case 'principles':
      return (
        <div key={idx} className="principles">
          {block.items.map((item) => (
            <div key={item.num}>
              <span>{item.num}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      )
    case 'list':
      return (
        <div key={idx} className="doc-list">
          {block.items.map((item, li) => (
            <div key={li} className="doc-list-item">
              <code>{item.title}</code>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      )
    case 'terminal':
      return <TerminalLine key={idx} command={block.command} />
    case 'code':
      return (
        <CodeBlock
          key={idx}
          language={block.language}
          filename={block.filename}
          code={block.code}
        />
      )
    case 'table':
      return (
        <div key={idx} className="table-wrap">
          <table>
            <thead>
              <tr>
                {block.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{ci === 0 ? <code>{cell}</code> : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

function DocsTopbar({
  project,
  theme,
  toggleTheme,
  openSearch,
  toggleMenu,
}: {
  project: Project
  theme: string
  toggleTheme: () => void
  openSearch: () => void
  toggleMenu: () => void
}) {
  return (
    <header className="docs-topbar">
      <div className="docs-brand">
        <button className="mobile-menu" onClick={toggleMenu} aria-label="Open navigation">
          <Icon name="menu" />
        </button>
        <Logo compact />
        <span className="crumb-rule" />
        <button onClick={() => navigate('/')}>Documentation</button>
        <Icon name="chevron" size={14} />
        <strong>{project.title}</strong>
      </div>
      <div className="top-actions">
        <button className="docs-search" onClick={openSearch}>
          <Icon name="search" size={15} />
          <span>Search docs</span>
          <kbd>⌘ K</kbd>
        </button>
        <ThemeButton theme={theme} toggle={toggleTheme} />
      </div>
    </header>
  )
}

function LeftSidebar({
  project,
  docs,
  activePageId,
  open,
  close,
}: {
  project: Project
  docs: ProjectDocumentation
  activePageId: string
  open: boolean
  close: () => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, DocPage[]>()
    for (const page of docs.pages) {
      const existing = map.get(page.group) ?? []
      existing.push(page)
      map.set(page.group, existing)
    }
    return Array.from(map.entries())
  }, [docs.pages])

  return (
    <aside className={`left-sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-mobile-head">
        <span>NAVIGATION</span>
        <button onClick={close} aria-label="Close navigation">
          <Icon name="close" />
        </button>
      </div>
      <button className="project-switcher" onClick={() => navigate('/')}>
        <ProjectGlyph project={project} small />
        <span>
          <small>ALL PROJECTS</small>
          <strong>{project.title}</strong>
        </span>
        <Icon name="grid" size={16} />
      </button>
      <nav className="docs-nav">
        {grouped.map(([groupLabel, items]) => (
          <div className="nav-group" key={groupLabel}>
            <span>{groupLabel}</span>
            {items.map((item) => (
              <a
                key={item.id}
                className={item.id === activePageId ? 'active' : ''}
                href={withBase(`/docs/${project.slug}/${item.id}`)}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(`/docs/${project.slug}/${item.id}`)
                  close()
                }}
              >
                {item.label}
                {item.badge && <small>{item.badge}</small>}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-meta">
        <span>DOCUMENT VERSION</span>
        <strong>{project.version}</strong>
        {project.repoUrl && (
          <a className="sidebar-repo" href={project.repoUrl} target="_blank" rel="noreferrer">
            VIEW REPOSITORY ↗
          </a>
        )}
        <span>{docs.updatedLabel}</span>
      </div>
    </aside>
  )
}

function DocContent({
  project,
  docs,
  page,
}: {
  project: Project
  docs: ProjectDocumentation
  page: DocPage
}) {
  const pageIndex = docs.pages.findIndex((p) => p.id === page.id)
  const prevPage = pageIndex > 0 ? docs.pages[pageIndex - 1] : null
  const nextPage = pageIndex >= 0 && pageIndex < docs.pages.length - 1 ? docs.pages[pageIndex + 1] : null

  return (
    <article className="doc-content">
      <div className="doc-title">
        <div className="doc-label">
          <span>{page.categoryLabel}</span>
          <span>{page.readTime}</span>
        </div>
        <h1>
          {page.title}
          {page.subtitle && (
            <>
              <br />
              <em>{page.subtitle}</em>
            </>
          )}
        </h1>
        <p>{page.lead}</p>
      </div>
      <div className="doc-rule">
        <span>{String(pageIndex + 1).padStart(2, '0')}</span>
      </div>
      {page.sections.map((section) => (
        <section key={section.id} id={section.id}>
          <h2>{section.title}</h2>
          {section.blocks.map((block, bi) => renderBlock(block, bi))}
        </section>
      ))}
      <nav className="page-nav">
        <button
          onClick={() =>
            navigate(prevPage ? `/docs/${project.slug}/${prevPage.id}` : '/')
          }
        >
          <small>← PREVIOUS</small>
          <strong>{prevPage ? prevPage.label : 'Project directory'}</strong>
        </button>
        {nextPage ? (
          <button onClick={() => navigate(`/docs/${project.slug}/${nextPage.id}`)}>
            <small>NEXT →</small>
            <strong>{nextPage.label}</strong>
          </button>
        ) : (
          <button onClick={() => navigate('/')}>
            <small>INDEX →</small>
            <strong>All projects</strong>
          </button>
        )}
      </nav>
    </article>
  )
}

function RightSidebar({
  page,
  activeSectionId,
  progress,
}: {
  page: DocPage
  activeSectionId: string
  progress: number
}) {
  return (
    <aside className="right-sidebar">
      <span className="toc-title">ON THIS PAGE</span>
      <nav>
        {page.sections.map((item) => (
          <a
            className={item.id === activeSectionId ? 'active' : ''}
            key={item.id}
            href={`#${item.id}`}
          >
            {item.title}
          </a>
        ))}
      </nav>
      <div className="toc-progress">
        <span>READING PROGRESS</span>
        <div>
          <i style={{ width: `${progress}%` }} />
        </div>
        <small>{progress}%</small>
      </div>
    </aside>
  )
}

function Docs({
  project,
  pageId,
  theme,
  toggleTheme,
  openSearch,
}: {
  project: Project
  pageId?: string
  theme: string
  toggleTheme: () => void
  openSearch: () => void
}) {
  const [menu, setMenu] = useState(false)
  const docs = useMemo(() => getProjectDocs(project), [project])
  const activePage = docs.pages.find((p) => p.id === pageId) ?? docs.pages[0]
  const [activeSectionId, setActiveSectionId] = useState(activePage.sections[0]?.id ?? '')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setActiveSectionId(activePage.sections[0]?.id ?? '')
  }, [activePage])

  useEffect(() => {
    const onScroll = () => {
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const pct = Math.min(100, Math.max(0, Math.round((window.scrollY / scrollMax) * 100)))
      setProgress(pct)

      let current = activePage.sections[0]?.id ?? ''
      for (const sec of activePage.sections) {
        const el = document.getElementById(sec.id)
        if (el && el.getBoundingClientRect().top <= 140) {
          current = sec.id
        }
      }
      setActiveSectionId(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [activePage])

  return (
    <div className="docs-page">
      <DocsTopbar
        project={project}
        theme={theme}
        toggleTheme={toggleTheme}
        openSearch={openSearch}
        toggleMenu={() => setMenu(!menu)}
      />
      {menu && (
        <button className="mobile-overlay" onClick={() => setMenu(false)} aria-label="Close menu" />
      )}
      <div className="docs-layout">
        <LeftSidebar
          project={project}
          docs={docs}
          activePageId={activePage.id}
          open={menu}
          close={() => setMenu(false)}
        />
        <DocContent project={project} docs={docs} page={activePage} />
        <RightSidebar page={activePage} activeSectionId={activeSectionId} progress={progress} />
      </div>
    </div>
  )
}

function NotFound({
  slug,
  theme,
  toggleTheme,
  openSearch,
}: {
  slug: string
  theme: string
  toggleTheme: () => void
  openSearch: () => void
}) {
  return (
    <div className="page-shell">
      <TopNav theme={theme} toggleTheme={toggleTheme} openSearch={openSearch} />
      <main className="hub">
        <section className="not-found">
          <span className="section-kicker">
            <i /> 404 / UNKNOWN SYSTEM
          </span>
          <h1>Documentation not found for &ldquo;{slug}&rdquo;.</h1>
          <p>Return to the project directory to browse documented systems.</p>
          <button className="card-link not-found-link" onClick={() => navigate('/')}>
            <span>Back to project directory</span>
            <span className="card-link-icon">
              <Icon name="arrow" size={17} />
            </span>
          </button>
        </section>
      </main>
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const [search, setSearch] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('aperture-theme') || 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('aperture-theme', theme)
  }, [theme])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch(true)
      }
      if (e.key === 'Escape') setSearch(false)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const match = route.match(/^\/docs\/([^/]+)(?:\/([^/]+))?/)
  const slug = match?.[1]
  const pageId = match?.[2]
  const project = slug ? projects.find((p) => p.slug === slug) : undefined
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <>
      {slug ? (
        project ? (
          <Docs
            project={project}
            pageId={pageId}
            theme={theme}
            toggleTheme={toggleTheme}
            openSearch={() => setSearch(true)}
          />
        ) : (
          <NotFound
            slug={slug}
            theme={theme}
            toggleTheme={toggleTheme}
            openSearch={() => setSearch(true)}
          />
        )
      ) : (
        <Hub theme={theme} toggleTheme={toggleTheme} openSearch={() => setSearch(true)} />
      )}
      <SearchDialog open={search} close={() => setSearch(false)} />
    </>
  )
}
