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

type MoonSpec = {
  radius: number
  distance: number
  speed: number
  phase: number
  color: string
}

type PlanetSpec = {
  name: string
  semiMajor: number
  semiMinor: number
  tilt: number
  speed: number
  angle: number
  radius: number
  color: string
  shadowColor: string
  atmosphere: string
  hasRings?: boolean
  ringColor?: string
  hasReticle?: boolean
  moons?: MoonSpec[]
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
      const angleDeg = 145 + Math.random() * 24 // natural diagonal entry (down-left) or rightwards
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

    // Spawn one immediately so dark mode feels alive right away
    spawnShootingStar()

    // --- LIGHT MODE STATE: Moving Planets on Elliptical Orbits ---
    const planets: PlanetSpec[] = [
      {
        name: 'Ares-I',
        semiMajor: 135,
        semiMinor: 64,
        tilt: -0.24,
        speed: 0.0085,
        angle: 0.8,
        radius: 5.5,
        color: '#ff5c35',
        shadowColor: '#8f2710',
        atmosphere: 'rgba(255, 92, 53, 0.16)',
      },
      {
        name: 'Terra-II',
        semiMajor: 235,
        semiMinor: 112,
        tilt: -0.24,
        speed: 0.0052,
        angle: 2.3,
        radius: 8.5,
        color: '#2b6dff',
        shadowColor: '#102b6e',
        atmosphere: 'rgba(43, 109, 255, 0.15)',
        moons: [
          {
            radius: 2.2,
            distance: 18,
            speed: 0.034,
            phase: 0.5,
            color: '#6c7069',
          },
        ],
      },
      {
        name: 'Kronos-III',
        semiMajor: 360,
        semiMinor: 168,
        tilt: -0.24,
        speed: 0.0033,
        angle: 4.1,
        radius: 12,
        color: '#e07a3c',
        shadowColor: '#6e3412',
        atmosphere: 'rgba(224, 122, 60, 0.14)',
        hasRings: true,
        ringColor: 'rgba(19, 21, 18, 0.28)',
      },
      {
        name: 'Zephyr-IV',
        semiMajor: 495,
        semiMinor: 228,
        tilt: -0.24,
        speed: 0.0022,
        angle: 5.4,
        radius: 9.5,
        color: '#7b61ff',
        shadowColor: '#31207a',
        atmosphere: 'rgba(123, 97, 255, 0.14)',
        moons: [
          { radius: 2.0, distance: 17, speed: 0.028, phase: 1.1, color: '#7b61ff' },
          { radius: 1.6, distance: 24, speed: -0.019, phase: 3.4, color: '#6c7069' },
        ],
      },
      {
        name: 'Vanguard-V',
        semiMajor: 640,
        semiMinor: 295,
        tilt: -0.24,
        speed: 0.0015,
        angle: 1.65,
        radius: 7.2,
        color: '#00a981',
        shadowColor: '#044a39',
        atmosphere: 'rgba(0, 169, 129, 0.14)',
        hasReticle: true,
      },
    ]

    let tick = 0

    const getOrbitPoint = (
      cx: number,
      cy: number,
      a: number,
      b: number,
      tilt: number,
      theta: number,
    ) => {
      const cosT = Math.cos(theta)
      const sinT = Math.sin(theta)
      const cosTilt = Math.cos(tilt)
      const sinTilt = Math.sin(tilt)
      return {
        x: cx + a * cosT * cosTilt - b * sinT * sinTilt,
        y: cy + a * cosT * sinTilt + b * sinT * cosTilt,
        depth: sinT, // -1 (far) to +1 (near)
      }
    }

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
          // Occasional natural twin meteor
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
        // Smooth ignition ease-in and atmospheric burn-out ease-out
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

        // Tapered glowing wake
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

        // Glowing leading head halo
        const headGlow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 9)
        headGlow.addColorStop(0, `rgba(255, 255, 255, ${(0.9 * lifeAlpha).toFixed(3)})`)
        headGlow.addColorStop(0.4, `rgba(${m.tint}, ${(0.45 * lifeAlpha).toFixed(3)})`)
        headGlow.addColorStop(1, `rgba(${m.tint}, 0)`)
        ctx.fillStyle = headGlow
        ctx.beginPath()
        ctx.arc(m.x, m.y, 9, 0, Math.PI * 2)
        ctx.fill()

        // Bright white nucleus
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

      // Position solar center gracefully in the upper-right / center-right field
      const cx = width * 0.68
      const cy = Math.min(360, height * 0.36)
      const scale = Math.max(0.62, Math.min(1.18, Math.min(width, height) / 920))

      // Subtle telemetry axis lines through the barycenter
      ctx.save()
      ctx.strokeStyle = 'rgba(19, 21, 18, 0.055)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(width, cy)
      ctx.moveTo(cx, 0)
      ctx.lineTo(cx, height)
      ctx.stroke()
      ctx.restore()

      // Central Sun / Barycenter node
      ctx.save()
      const sunPulse = 1 + Math.sin(tick * 0.025) * 0.06
      const sunGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 44 * scale * sunPulse)
      sunGlow.addColorStop(0, 'rgba(255, 79, 45, 0.30)')
      sunGlow.addColorStop(0.45, 'rgba(255, 140, 66, 0.11)')
      sunGlow.addColorStop(1, 'rgba(255, 79, 45, 0)')
      ctx.fillStyle = sunGlow
      ctx.beginPath()
      ctx.arc(cx, cy, 44 * scale * sunPulse, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ff4f2d'
      ctx.beginPath()
      ctx.arc(cx, cy, 7.5 * scale, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 79, 45, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 14 * scale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // Draw each orbital track + moving planet
      for (const p of planets) {
        p.angle = (p.angle + p.speed) % (Math.PI * 2)
        const a = p.semiMajor * scale
        const b = p.semiMinor * scale

        // 1. Elliptical orbit path
        ctx.save()
        ctx.strokeStyle = 'rgba(19, 21, 18, 0.085)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(cx, cy, a, b, p.tilt, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // 2. Fading motion trail along the last ~38 degrees of the planet's orbit
        const trailSteps = 22
        const trailArc = 0.62
        for (let s = 0; s < trailSteps; s += 1) {
          const t0 = p.angle - (s / trailSteps) * trailArc
          const t1 = p.angle - ((s + 1) / trailSteps) * trailArc
          const p0 = getOrbitPoint(cx, cy, a, b, p.tilt, t0)
          const p1 = getOrbitPoint(cx, cy, a, b, p.tilt, t1)
          const alpha = (1 - s / trailSteps) * 0.42

          ctx.save()
          ctx.strokeStyle = p.color
          ctx.globalAlpha = alpha
          ctx.lineWidth = Math.max(1, (1 - s / trailSteps) * 2.6)
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.stroke()
          ctx.restore()
        }

        // 3. Planet position & 3D perspective depth scaling
        const pos = getOrbitPoint(cx, cy, a, b, p.tilt, p.angle)
        const depthScale = 0.86 + 0.22 * ((pos.depth + 1) / 2)
        const r = p.radius * scale * depthScale

        // Soft atmospheric halo
        ctx.save()
        ctx.fillStyle = p.atmosphere
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, r * 2.05, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Back half of planetary rings (if ringed gas giant)
        if (p.hasRings && p.ringColor) {
          ctx.save()
          ctx.strokeStyle = p.ringColor
          ctx.lineWidth = 2.4 * scale
          ctx.beginPath()
          ctx.ellipse(pos.x, pos.y, r * 2.25, r * 0.72, p.tilt + 0.18, Math.PI, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        // Planet body with spherical day/night illumination pointing toward the Sun (cx, cy)
        const sunAngle = Math.atan2(cy - pos.y, cx - pos.x)
        const lightX = pos.x + Math.cos(sunAngle) * (r * 0.38)
        const lightY = pos.y + Math.sin(sunAngle) * (r * 0.38)
        const bodyGrad = ctx.createRadialGradient(lightX, lightY, r * 0.1, pos.x, pos.y, r * 1.15)
        bodyGrad.addColorStop(0, p.color)
        bodyGrad.addColorStop(0.72, p.color)
        bodyGrad.addColorStop(1, p.shadowColor)

        ctx.save()
        ctx.fillStyle = bodyGrad
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Front half of planetary rings crossing in front of the sphere
        if (p.hasRings && p.ringColor) {
          ctx.save()
          ctx.strokeStyle = p.ringColor
          ctx.lineWidth = 2.6 * scale
          ctx.beginPath()
          ctx.ellipse(pos.x, pos.y, r * 2.25, r * 0.72, p.tilt + 0.18, 0, Math.PI)
          ctx.stroke()
          ctx.restore()
        }

        // Optional telemetry reticle around planet
        if (p.hasReticle) {
          ctx.save()
          ctx.strokeStyle = 'rgba(0, 169, 129, 0.38)'
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.arc(pos.x, pos.y, r * 1.65, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }

        // Orbiting Moons
        if (p.moons) {
          for (const moon of p.moons) {
            moon.phase = (moon.phase + moon.speed) % (Math.PI * 2)
            const mx = pos.x + Math.cos(moon.phase) * (moon.distance * scale * depthScale)
            const my = pos.y + Math.sin(moon.phase) * (moon.distance * 0.58 * scale * depthScale)

            ctx.save()
            ctx.strokeStyle = 'rgba(19, 21, 18, 0.11)'
            ctx.lineWidth = 0.8
            ctx.beginPath()
            ctx.ellipse(
              pos.x,
              pos.y,
              moon.distance * scale * depthScale,
              moon.distance * 0.58 * scale * depthScale,
              0,
              0,
              Math.PI * 2,
            )
            ctx.stroke()

            ctx.fillStyle = moon.color
            ctx.beginPath()
            ctx.arc(mx, my, moon.radius * scale * depthScale, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
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
