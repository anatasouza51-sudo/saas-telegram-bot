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
  opacity: number
  opacityDir: number
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

    const generated: GhostData[] = Array.from({ length: 7 }, (_, i) => {
      // Velocidade horizontal: sempre movendo (positivo ou negativo)
      const dirX = Math.random() > 0.5 ? 1 : -1
      const speedX = Math.random() * 0.8 + 0.4
      // Velocidade vertical: levemente flutuante
      const speedY = (Math.random() - 0.5) * 0.4
      return {
        id: i,
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 70 + 50,
        vx: speedX * dirX,
        vy: speedY,
        rotation: Math.random() * 20 - 10,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.15 + 0.15,
        opacityDir: Math.random() > 0.5 ? 0.001 : -0.001,
      }
    })
    ghostsRef.current = generated
    setGhosts([...generated])
  }, [])

  useEffect(() => {
    initGhosts()
    let lastTime = performance.now()

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 3)
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

        // WRAP-AROUND: sai de um lado, reaparece do outro
        const marginX = g.size + 20
        const marginY = g.size * 1.3 + 20

        if (nx < -marginX) {
          nx = w + marginX
        } else if (nx > w + marginX) {
          nx = -marginX
        }

        if (ny < -marginY) {
          ny = h + marginY
        } else if (ny > h + marginY) {
          ny = -marginY
        }

        // Mudanças aleatórias suaves de direção
        if (Math.random() < 0.003) {
          nvx += (Math.random() - 0.5) * 0.3
        }
        if (Math.random() < 0.003) {
          nvy += (Math.random() - 0.5) * 0.2
        }

        // Manter velocidade razoável (sempre em movimento)
        nvx = Math.max(-1.2, Math.min(1.2, nvx))
        nvy = Math.max(-0.8, Math.min(0.8, nvy))

        // Nunca parar: se muito lento, dar um empurrão
        if (Math.abs(nvx) < 0.2) {
          nvx = (nvx >= 0 ? 1 : -1) * 0.3
        }
        if (Math.abs(nvy) < 0.05) {
          nvy = (nvy >= 0 ? 1 : -1) * 0.1
        }

        // Pulsar opacidade levemente
        let nOpacity = g.opacity + g.opacityDir * dt
        if (nOpacity > 0.3) {
          nOpacity = 0.3
          ghostsRef.current[g.id].opacityDir = -Math.abs(g.opacityDir)
        } else if (nOpacity < 0.1) {
          nOpacity = 0.1
          ghostsRef.current[g.id].opacityDir = Math.abs(g.opacityDir)
        }

        return {
          ...g,
          x: nx,
          y: ny,
          vx: nvx,
          vy: nvy,
          rotation: nr,
          opacity: nOpacity,
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
              opacity={ghost.opacity}
            />

            {/* Eyes - big round Casper style */}
            <ellipse cx="36" cy="48" rx="10" ry="12" fill="#ffffff" opacity={ghost.opacity * 3} />
            <ellipse cx="64" cy="48" rx="10" ry="12" fill="#ffffff" opacity={ghost.opacity * 3} />

            {/* Pupils */}
            <circle cx="38" cy="46" r="5" fill="#1a1a2e" opacity={ghost.opacity * 2.5} />
            <circle cx="66" cy="46" r="5" fill="#1a1a2e" opacity={ghost.opacity * 2.5} />

            {/* Eye shine */}
            <circle cx="36" cy="44" r="2" fill="#ffffff" opacity={ghost.opacity * 2} />
            <circle cx="64" cy="44" r="2" fill="#ffffff" opacity={ghost.opacity * 2} />

            {/* Friendly smile */}
            <path
              d="M42 68C46 74 50 76 54 76C58 76 62 74 66 68"
              stroke="#d4d4d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity={ghost.opacity * 2}
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
