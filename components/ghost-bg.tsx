"use client"

import { useEffect, useState } from "react"

interface Ghost {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

export function GhostBg() {
  const [ghosts, setGhosts] = useState<Ghost[]>([])

  useEffect(() => {
    const generated: Ghost[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 80 + 80,
      duration: Math.random() * 15 + 20,
      delay: Math.random() * 15,
    }))
    setGhosts(generated)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 via-transparent to-purple-950/20" />

      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          className="absolute"
          style={{
            left: `${ghost.x}%`,
            top: `${ghost.y}%`,
            animation: `evilFloat ${ghost.duration}s ${ghost.delay}s ease-in-out infinite`,
          }}
        >
          <svg
            width={ghost.size}
            height={ghost.size * 1.15}
            viewBox="0 0 120 138"
            fill="none"
            style={{ filter: "drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))" }}
          >
            <defs>
              <linearGradient id={`evilGrad-${ghost.id}`} x1="60" y1="0" x2="60" y2="138" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7c3aed" />
                <stop offset="1" stopColor="#4c1d95" />
              </linearGradient>
              <radialGradient id={`eyeGlow-${ghost.id}`} cx="0.5" cy="0.5" r="0.5">
                <stop stopColor="#ef4444" />
                <stop offset="1" stopColor="#991b1b" />
              </radialGradient>
            </defs>

            {/* Ghost body - menacing shape */}
            <path
              d="M60 5C30.18 5 5 30.18 5 60V125C5 132.73 11.27 139 19 139C24.5 139 29.5 137.27 33.5 134.27C37.5 131.27 42 129.5 47 129.5C52 129.5 56.5 131.27 60.5 134.27C64.5 137.27 69 139 74 139C79.5 139 84.5 137.27 88.5 134.27C92.5 131.27 97 129.5 102 129.5C107.23 129.5 111.95 132 115 135.5V60C115 30.18 89.82 5 60 5Z"
              fill={`url(#evilGrad-${ghost.id})`}
              opacity="0.35"
            />

            {/* Sinister mouth */}
            <path
              d="M42 85C48 92 54 95 60 95C66 95 72 92 78 85"
              stroke="#7c3aed"
              strokeWidth="2.5"
              fill="none"
              opacity="0.5"
            />

            {/* Glowing red eyes */}
            <circle cx="42" cy="62" r="8" fill={`url(#eyeGlow-${ghost.id})`} />
            <circle cx="78" cy="62" r="8" fill={`url(#eyeGlow-${ghost.id})`} />
            {/* Eye pupils - narrow menacing */}
            <ellipse cx="42" cy="62" rx="2.5" ry="5" fill="#0a0a0a" />
            <ellipse cx="78" cy="62" rx="2.5" ry="5" fill="#0a0a0a" />

            {/* Eye glow effect */}
            <circle cx="42" cy="62" r="14" fill="#ef4444" opacity="0.08" />
            <circle cx="78" cy="62" r="14" fill="#ef4444" opacity="0.08" />
          </svg>
        </div>
      ))}

      <style>{`
        @keyframes evilFloat {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 0.6;
          }
          25% {
            transform: translate(-40px, -50px) rotate(-8deg) scale(1.05);
            opacity: 0.8;
          }
          50% {
            transform: translate(60px, -30px) rotate(5deg) scale(0.95);
            opacity: 0.5;
          }
          75% {
            transform: translate(-20px, -60px) rotate(-4deg) scale(1.02);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  )
}
