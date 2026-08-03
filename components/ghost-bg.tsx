"use client"

import { useEffect, useState } from "react"

interface Ghost {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  delay: number
  duration: number
}

export function GhostBg() {
  const [ghosts, setGhosts] = useState<Ghost[]>([])

  useEffect(() => {
    const generated: Ghost[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 24 + 12,
      speed: Math.random() * 20 + 15,
      opacity: Math.random() * 0.15 + 0.05,
      delay: Math.random() * 10,
      duration: Math.random() * 10 + 15,
    }))
    setGhosts(generated)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-purple-950/10" />

      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          className="absolute"
          style={{
            left: `${ghost.x}%`,
            top: `${ghost.y}%`,
            animationName: "ghostFloat",
            animationDuration: `${ghost.duration}s`,
            animationDelay: `${ghost.delay}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-in-out",
          }}
        >
          <svg
            width={ghost.size}
            height={ghost.size * 1.2}
            viewBox="0 0 40 48"
            fill="none"
            style={{ opacity: ghost.opacity }}
          >
            {/* Ghost body */}
            <path
              d="M20 2C10.06 2 2 10.06 2 20V40C2 42.21 3.79 44 6 44C7.1 44 8.1 43.55 8.83 42.83C9.55 42.1 10.5 41.65 11.5 41.65C12.5 41.65 13.45 42.1 14.17 42.83C14.9 43.55 15.9 44 17 44C18.1 44 19.05 43.55 19.77 42.83C20.5 42.1 21.45 41.65 22.45 41.65C23.45 41.65 24.4 42.1 25.13 42.83C25.85 43.55 26.85 44 27.95 44C30.16 44 31.95 42.21 31.95 40V20C31.95 10.06 23.89 2 14 2"
              fill="url(#ghostGrad)"
            />
            {/* Eyes */}
            <circle cx="14" cy="20" r="3" fill="#0a0a0a" opacity="0.6" />
            <circle cx="26" cy="20" r="3" fill="#0a0a0a" opacity="0.6" />
            <defs>
              <linearGradient id="ghostGrad" x1="20" y1="2" x2="20" y2="44" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a855f7" />
                <stop offset="1" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ))}

      <style>{`
        @keyframes ghostFloat {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(${Math.random() > 0.5 ? "" : "-"}30px, -40px) rotate(${Math.random() > 0.5 ? "" : "-"}5deg);
          }
          50% {
            transform: translate(${Math.random() > 0.5 ? "" : "-"}60px, -20px) rotate(${Math.random() > 0.5 ? "" : "-"}3deg);
          }
          75% {
            transform: translate(${Math.random() > 0.5 ? "" : "-"}20px, -50px) rotate(${Math.random() > 0.5 ? "" : "-"}7deg);
          }
        }
      `}</style>
    </div>
  )
}
