"use client"

import { useEffect, useState, useRef } from "react"

interface GhostData {
  id: number
  startX: number
  startY: number
  size: number
  speed: number
  amplitude: number
  phase: number
}

export function GhostBg() {
  const [ghosts, setGhosts] = useState<GhostData[]>([])
  const frameRef = useRef<number>(0)
  const ghostsRef = useRef<GhostData[]>([])

  useEffect(() => {
    const generated: GhostData[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      startX: Math.random() * 100,
      startY: Math.random() * 100,
      size: Math.random() * 60 + 50,
      speed: Math.random() * 0.3 + 0.15,
      amplitude: Math.random() * 4 + 2,
      phase: Math.random() * Math.PI * 2,
    }))
    setGhosts(generated)
    ghostsRef.current = generated
  }, [])

  // Continuous animation loop using requestAnimationFrame
  useEffect(() => {
    if (ghosts.length === 0) return
    let elapsed = 0
    const animate = () => {
      elapsed += 16 // ~60fps
      ghostsRef.current = ghostsRef.current.map((g) => ({
        ...g,
      }))
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [ghosts.length])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/3" />

      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          className="absolute will-change-transform"
          style={{
            left: `${ghost.startX}%`,
            top: `${ghost.startY}%`,
          }}
        >
          <svg
            width={ghost.size}
            height={ghost.size * 1.25}
            viewBox="0 0 100 125"
            fill="none"
            style={{
              animation: `casperFloat ${12 + ghost.speed * 20}s ${ghost.phase}s ease-in-out infinite`,
              filter: `drop-shadow(0 0 ${ghost.size * 0.15}px rgba(255,255,255,0.15))`,
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
              opacity="0.3"
            />

            {/* Eyes - big round Casper style */}
            <ellipse cx="36" cy="48" rx="10" ry="12" fill="#ffffff" opacity="0.9" />
            <ellipse cx="64" cy="48" rx="10" ry="12" fill="#ffffff" opacity="0.9" />

            {/* Pupils - looking slightly different directions */}
            <circle cx="38" cy="46" r="5" fill="#1a1a2e" />
            <circle cx="66" cy="46" r="5" fill="#1a1a2e" />

            {/* Eye shine */}
            <circle cx="36" cy="44" r="2" fill="#ffffff" opacity="0.8" />
            <circle cx="64" cy="44" r="2" fill="#ffffff" opacity="0.8" />

            {/* Friendly smile */}
            <path
              d="M42 68C46 74 50 76 54 76C58 76 62 74 66 68"
              stroke="#d4d4d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
            />
          </svg>
        </div>
      ))}

      <style>{`
        @keyframes casperFloat {
          0% {
            transform: translate(0px, 0px) rotate(0deg) scale(1);
          }
          20% {
            transform: translate(25px, -35px) rotate(4deg) scale(1.02);
          }
          40% {
            transform: translate(-20px, -55px) rotate(-3deg) scale(0.97);
          }
          60% {
            transform: translate(35px, -25px) rotate(5deg) scale(1.03);
          }
          80% {
            transform: translate(-30px, -45px) rotate(-5deg) scale(0.98);
          }
          100% {
            transform: translate(0px, 0px) rotate(0deg) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
