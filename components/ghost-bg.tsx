"use client"

import { useEffect, useState, useRef, useCallback } from "react"

interface GhostData {
  id: number
  x: number
  y: number
  size: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
}

export function GhostBg() {
  const [ghosts, setGhosts] = useState<GhostData[]>([])
  const frameRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostsRef = useRef<GhostData[]>([])

  const initGhosts = useCallback(() => {
    const container = containerRef.current
    const w = container?.clientWidth || window.innerWidth
    const h = container?.clientHeight || window.innerHeight

    const generated: GhostData[] = Array.from({ length: 12 }, (_, i) => {
      const dir = Math.random() > 0.5 ? 1 : -1
      return {
        id: i,
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 80 + 60,
        vx: (Math.random() * 0.8 + 0.3) * dir * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.random() * -0.6 - 0.2,
        rotation: Math.random() * 20 - 10,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
      }
    })
    ghostsRef.current = generated
    setGhosts([...generated])
  }, [])

  useEffect(() => {
    initGhosts()
    let lastTime = performance.now()

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 3) // cap delta to 3 frames
      lastTime = time

      const container = containerRef.current
      const w = container?.clientWidth || window.innerWidth
      const h = container?.clientHeight || window.innerHeight

      ghostsRef.current = ghostsRef.current.map((g) => {
        let nx = g.x + g.vx * dt
        let ny = g.y + g.vy * dt
        let nvx = g.vx
        let nvy = g.vy
        let nr = g.rotation + g.rotationSpeed * dt

        // Bounce off edges and wrap
        if (nx < -g.size) {
          nx = w + g.size * 0.5
          nvx = Math.abs(nvx)
        } else if (nx > w + g.size * 0.5) {
          nx = -g.size
          nvx = -Math.abs(nvx)
        }
        if (ny < -g.size * 1.3) {
          ny = h + g.size * 0.5
          nvy = -Math.abs(nvy) * 0.5
        } else if (ny > h + g.size * 0.5) {
          ny = -g.size * 1.3
          nvy = -Math.abs(nvy) * 0.5
        }

        // Random gentle direction changes
        if (Math.random() < 0.002) {
          nvx += (Math.random() - 0.5) * 0.5
        }
        if (Math.random() < 0.003) {
          nvy += (Math.random() - 0.5) * 0.2
        }

        // Keep horizontal speed reasonable
        nvx = Math.max(-1.5, Math.min(1.5, nvx))
        nvy = Math.max(-1, Math.min(0.3, nvy))

        return {
          ...g,
          x: nx,
          y: ny,
          vx: nvx,
          vy: nvy,
          rotation: nr,
        }
      })

      setGhosts(ghostsRef.current.map((g) => ({ ...g })))
      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [initGhosts])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/3" />

      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          className="absolute will-change-transform"
          style={{
            left: `${ghost.x}px`,
            top: `${ghost.y}px`,
            transform: `rotate(${ghost.rotation}deg)`,
            transition: "transform 0.3s ease",
          }}
        >
          <svg
            width={ghost.size}
            height={ghost.size * 1.25}
            viewBox="0 0 100 125"
            fill="none"
            style={{
              filter: `drop-shadow(0 0 ${ghost.size * 0.12}px rgba(255,255,255,0.12))`,
            }}
          >
            <defs>
              <linearGradient id={`casperBody-${ghost.id}`} x1="50" y1="0" x2="50" y2="125" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" />
                <stop offset="1" stopColor="#d4d4d4" />
              </linearGradient>
            </defs>

            {/* Ghost body - Casper style (rounded head, wavy bottom) */}
            <path
              d="M50 5C26.5 5 8 22.5 8 45V105C8 112 13.5 117 20 117C23 117 26 115.5 28 113C30 110.5 33 109 36 109C39 109 42 110.5 44 113C46 115.5 48 117 51 117C54 117 56 115.5 58 113C60 110.5 63 109 66 109C69 109 72 110.5 74 113C76 115.5 78 117 82 117C87.5 117 92 112 92 105V45C92 22.5 73.5 5 50 5Z"
              fill={`url(#casperBody-${ghost.id})`}
              opacity="0.25"
            />

            {/* Eyes - big round Casper style */}
            <ellipse cx="36" cy="48" rx="10" ry="12" fill="#ffffff" opacity="0.85" />
            <ellipse cx="64" cy="48" rx="10" ry="12" fill="#ffffff" opacity="0.85" />

            {/* Pupils */}
            <circle cx="38" cy="46" r="5" fill="#1a1a2e" />
            <circle cx="66" cy="46" r="5" fill="#1a1a2e" />

            {/* Eye shine */}
            <circle cx="36" cy="44" r="2" fill="#ffffff" opacity="0.7" />
            <circle cx="64" cy="44" r="2" fill="#ffffff" opacity="0.7" />

            {/* Friendly smile */}
            <path
              d="M42 68C46 74 50 76 54 76C58 76 62 74 66 68"
              stroke="#d4d4d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
