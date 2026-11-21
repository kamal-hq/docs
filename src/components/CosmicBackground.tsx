import { useEffect, useRef } from 'react'

type Star = {
  x: number
  y: number
  r: number
  baseAlpha: number
  twinkleSpeed: number
  phase: number
  drift: number
  color: string
}

type ShootingStar = {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  length: number
  age: number
  maxAge: number
  width: number
  tint: string
}

type DaylightMote = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  baseAlpha: number
  phase: number
  isAccent: boolean
}

type SolarStreak = {
  x: number
  y: number
  vx: number
  vy: number
  curve: number
  length: number
  age: number
  maxAge: number
  width: number
  isAccent: boolean
}

const STAR_COLORS = ['#ffffff', '#e8f1ff', '#fff4e4', '#d6e6ff']
const METEOR_TINTS = ['255, 120, 85', '175, 210, 255', '255, 210, 165']

export function CosmicBackground({ theme }: { theme: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let rafId = 0

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // --- DARK MODE STATE: Starfield + Natural Shooting Stars ---
    const starCount = Math.min(160, Math.max(95, Math.floor((width * height) / 13000)))
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.45 + Math.random() * 1.45,
      baseAlpha: 0.18 + Math.random() * 0.55,
      twinkleSpeed: 0.7 + Math.random() * 2.1,
      phase: Math.random() * Math.PI * 2,
      drift: 0.03 + Math.random() * 0.08,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    }))

    const shootingStars: ShootingStar[] = []
    let nextMeteorTimer = 25

    const spawnShootingStar = (burst = false) => {
      const startX = Math.random() * (width * 0.85) + width * 0.1
      const startY = Math.random() * (height * 0.42) - 20
      const angleDeg = 145 + Math.random() * 24
      const goRight = Math.random() > 0.35
      const rad = ((goRight ? 22 + Math.random() * 24 : angleDeg) * Math.PI) / 180
      const speed = (burst ? 10.5 : 8.5) + Math.random() * 5.5

      shootingStars.push({
        x: goRight ? Math.random() * (width * 0.72) : startX,
        y: startY,
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed,
        gravity: 0.025 + Math.random() * 0.025,
        length: 115 + Math.random() * 95,
        age: 0,
        maxAge: 46 + Math.floor(Math.random() * 28),
        width: 1.2 + Math.random() * 1.0,
        tint: METEOR_TINTS[Math.floor(Math.random() * METEOR_TINTS.length)],
      })
    }

    spawnShootingStar()

    // --- LIGHT MODE STATE: Ambient Constellation Dust Motes + Daylight Wind Streaks ---
    const moteCount = Math.min(72, Math.max(42, Math.floor((width * height) / 24000)))
    const motes: DaylightMote[] = Array.from({ length: moteCount }, (_, idx) => {
      const speed = 0.14 + Math.random() * 0.26
      const angle = Math.random() * Math.PI * 2
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.0 + Math.random() * 1.5,
        baseAlpha: 0.16 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        isAccent: idx % 6 === 0,
      }
    })

    const solarStreaks: SolarStreak[] = []
    let nextStreakTimer = 20

    const spawnSolarStreak = () => {
      const goRight = Math.random() > 0.3
      const startX = goRight ? Math.random() * (width * 0.7) : width * 0.25 + Math.random() * (width * 0.7)
      const startY = Math.random() * (height * 0.65)
      const deg = goRight ? 16 + Math.random() * 22 : 142 + Math.random() * 22
      const rad = (deg * Math.PI) / 180
      const speed = 6.2 + Math.random() * 4.2

      solarStreaks.push({
        x: startX,
        y: startY,
        vx: Math.cos(rad) * speed,
        vy: Math.sin(rad) * speed,
        curve: (Math.random() - 0.5) * 0.028,
        length: 110 + Math.random() * 90,
        age: 0,
        maxAge: 54 + Math.floor(Math.random() * 30),
        width: 1.0 + Math.random() * 0.8,
        isAccent: Math.random() < 0.45,
      })
    }

    spawnSolarStreak()

    let tick = 0

    const renderDark = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Twinkling starfield
      for (const s of stars) {
        s.x += s.drift
        if (s.x > width + 4) s.x = -4
        const twinkle = Math.sin(tick * 0.03 * s.twinkleSpeed + s.phase) * 0.24
        const alpha = Math.max(0.06, Math.min(0.92, s.baseAlpha + twinkle))

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // 2. Spawn natural shooting stars
      nextMeteorTimer -= 1
      if (nextMeteorTimer <= 0 && shootingStars.length < 3) {
        spawnShootingStar(false)
        if (Math.random() < 0.28) {
          spawnShootingStar(true)
        }
        nextMeteorTimer = 55 + Math.floor(Math.random() * 95)
      }

      // 3. Update & draw shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i -= 1) {
        const m = shootingStars[i]
        m.x += m.vx
        m.y += m.vy
        m.vy += m.gravity
        m.age += 1

        const progress = m.age / m.maxAge
        const lifeAlpha =
          progress < 0.18
            ? progress / 0.18
            : progress > 0.72
              ? Math.max(0, (1 - progress) / 0.28)
              : 1

        const speedMag = Math.hypot(m.vx, m.vy) || 1
        const ux = m.vx / speedMag
        const uy = m.vy / speedMag
        const currentLen = m.length * (0.55 + 0.45 * Math.sin(progress * Math.PI))
        const tailX = m.x - ux * currentLen
        const tailY = m.y - uy * currentLen

        const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY)
        grad.addColorStop(0, `rgba(255, 255, 255, ${(0.95 * lifeAlpha).toFixed(3)})`)
        grad.addColorStop(0.22, `rgba(${m.tint}, ${(0.65 * lifeAlpha).toFixed(3)})`)
        grad.addColorStop(1, `rgba(${m.tint}, 0)`)

        ctx.save()
        ctx.strokeStyle = grad
        ctx.lineWidth = m.width
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(tailX, tailY)
        ctx.stroke()

        const headGlow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 9)
        headGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.9 * lifeAlpha).toFixed(3)})`)
        headGlow.addColorStop(0.4, `rgba(${m.tint}, ${(0.45 * lifeAlpha).toFixed(3)})`)
        headGlow.addColorStop(1, `rgba(${m.tint}, 0)`)
        ctx.fillStyle = headGlow
        ctx.beginPath()
        ctx.arc(m.x, m.y, 9, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(255, 255, 255, ${lifeAlpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        if (m.age >= m.maxAge || m.x < -250 || m.x > width + 250 || m.y > height + 250) {
          shootingStars.splice(i, 1)
        }
      }
    }

    const renderLight = () => {
      ctx.clearRect(0, 0, width, height)

      // 1. Update & draw ambient floating dust motes (paper-ink & warm terracotta tones)
      for (const m of motes) {
        m.x += m.vx + Math.sin(tick * 0.008 + m.phase) * 0.08
        m.y += m.vy + Math.cos(tick * 0.008 + m.phase) * 0.06
        if (m.x < -20) m.x = width + 20
        if (m.x > width + 20) m.x = -20
        if (m.y < -20) m.y = height + 20
        if (m.y > height + 20) m.y = -20

        const pulse = Math.sin(tick * 0.025 + m.phase) * 0.08
        const alpha = Math.max(0.08, Math.min(0.45, m.baseAlpha + pulse))

        ctx.save()
        ctx.fillStyle = m.isAccent
          ? `rgba(255, 79, 45, ${(alpha * 1.15).toFixed(3)})`
          : `rgba(19, 21, 18, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // 2. Delicate hairline constellation filaments between nearby motes
      const maxDist = 135
      ctx.save()
      ctx.lineWidth = 0.65
      for (let i = 0; i < motes.length; i += 1) {
        const a = motes[i]
        for (let j = i + 1; j < motes.length; j += 1) {
          const b = motes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist) continue
          const dist = Math.hypot(dx, dy)
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.075
            ctx.strokeStyle =
              a.isAccent || b.isAccent
                ? `rgba(255, 79, 45, ${(lineAlpha * 1.1).toFixed(3)})`
                : `rgba(19, 21, 18, ${lineAlpha.toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      ctx.restore()

      // 3. Daylight solar-wind streaks (light-mode counterpart to shooting stars)
      nextStreakTimer -= 1
      if (nextStreakTimer <= 0 && solarStreaks.length < 3) {
        spawnSolarStreak()
        if (Math.random() < 0.25) {
          spawnSolarStreak()
        }
        nextStreakTimer = 50 + Math.floor(Math.random() * 85)
      }

      for (let i = solarStreaks.length - 1; i >= 0; i -= 1) {
        const s = solarStreaks[i]
        s.x += s.vx
        s.y += s.vy
        s.vy += s.curve
        s.age += 1

        const progress = s.age / s.maxAge
        const lifeAlpha =
          progress < 0.2
            ? progress / 0.2
            : progress > 0.72
              ? Math.max(0, (1 - progress) / 0.28)
              : 1

        const speedMag = Math.hypot(s.vx, s.vy) || 1
        const ux = s.vx / speedMag
        const uy = s.vy / speedMag
        const currentLen = s.length * (0.55 + 0.45 * Math.sin(progress * Math.PI))
        const tailX = s.x - ux * currentLen
        const tailY = s.y - uy * currentLen

        const rgb = s.isAccent ? '255, 79, 45' : '19, 21, 18'
        const peakAlpha = (s.isAccent ? 0.38 : 0.24) * lifeAlpha
        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY)
        grad.addColorStop(0, `rgba(${rgb}, ${peakAlpha.toFixed(3)})`)
        grad.addColorStop(0.35, `rgba(${rgb}, ${(peakAlpha * 0.55).toFixed(3)})`)
        grad.addColorStop(1, `rgba(${rgb}, 0)`)

        ctx.save()
        ctx.strokeStyle = grad
        ctx.lineWidth = s.width
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(tailX, tailY)
        ctx.stroke()

        // Subtle leading glider point
        ctx.fillStyle = `rgba(${rgb}, ${(peakAlpha * 1.25).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, 1.35, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        if (s.age >= s.maxAge || s.x < -250 || s.x > width + 250 || s.y < -250 || s.y > height + 250) {
          solarStreaks.splice(i, 1)
        }
      }
    }

    const animate = () => {
      tick += 1
      if (theme === 'dark') {
        renderDark()
      } else {
        renderLight()
      }
      rafId = window.requestAnimationFrame(animate)
    }

    rafId = window.requestAnimationFrame(animate)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [theme])

  return <canvas ref={canvasRef} className="cosmic-canvas" aria-hidden="true" />
}
