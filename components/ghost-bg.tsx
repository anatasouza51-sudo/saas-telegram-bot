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
  glowSize: number
  glowDir: number
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  opacityDir: number
}

export function GhostBg() {
  const [ghosts, setGhosts] = useState<GhostData[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const frameRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostsRef = useRef<GhostData[]>([])
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)

  const init = useCallback(() => {
    const container = containerRef.current
    const w = container?.clientWidth || window.innerWidth
    const h = container?.clientHeight || window.innerHeight

    // 7 Fantasmas com mais presença
    const generated: GhostData[] = Array.from({ length: 7 }, (_, i) => {
      const dirX = Math.random() > 0.5 ? 1 : -1
      const speedX = Math.random() * 0.6 + 0.35
      const speedY = (Math.random() - 0.5) * 0.5
      return {
        id: i,
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 90 + 70, // maiores
        vx: speedX * dirX,
        vy: speedY,
        rotation: Math.random() * 30 - 15,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        opacity: Math.random() * 0.2 + 0.2,
        opacityDir: Math.random() > 0.5 ? 0.0008 : -0.0008,
        glowSize: 20 + Math.random() * 15,
        glowDir: Math.random() > 0.5 ? 0.3 : -0.3,
      }
    })
    ghostsRef.current = generated
    setGhosts([...generated])

    // 40 partículas flutuantes
    const generatedParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2,
      opacity: Math.random() * 0.5 + 0.1,
      opacityDir: Math.random() > 0.5 ? 0.002 : -0.002,
    }))
    particlesRef.current = generatedParticles
    setParticles([...generatedParticles])
  }, [])

  useEffect(() => {
    init()
    let lastTime = performance.now()

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 3)
      lastTime = time
      timeRef.current += dt

      const container = containerRef.current
      const w = container?.clientWidth || window.innerWidth
      const h = container?.clientHeight || window.innerHeight

      // Atualizar fantasmas
      ghostsRef.current = ghostsRef.current.map((g) => {
        let nx = g.x + g.vx * dt
        let ny = g.y + g.vy * dt
        let nvx = g.vx
        let nvy = g.vy
        let nr = g.rotation + g.rotationSpeed * dt

        // WRAP-AROUND
        const marginX = g.size + 30
        const marginY = g.size * 1.3 + 30

        if (nx < -marginX) nx = w + marginX
        else if (nx > w + marginX) nx = -marginX

        if (ny < -marginY) ny = h + marginY
        else if (ny > h + marginY) ny = -marginY

        // Mudanças suaves de direção
        if (Math.random() < 0.004) nvx += (Math.random() - 0.5) * 0.25
        if (Math.random() < 0.004) nvy += (Math.random() - 0.5) * 0.15

        // Velocidade mínima
        nvx = Math.max(-1.0, Math.min(1.0, nvx))
        nvy = Math.max(-0.7, Math.min(0.7, nvy))
        if (Math.abs(nvx) < 0.15) nvx = (nvx >= 0 ? 1 : -1) * 0.25
        if (Math.abs(nvy) < 0.05) nvy = (nvy >= 0 ? 1 : -1) * 0.08

        // Pulsar opacidade
        let nOpacity = g.opacity + g.opacityDir * dt
        if (nOpacity > 0.35) { nOpacity = 0.35; ghostsRef.current[g.id].opacityDir = -Math.abs(g.opacityDir) }
        else if (nOpacity < 0.12) { nOpacity = 0.12; ghostsRef.current[g.id].opacityDir = Math.abs(g.opacityDir) }

        // Pulsar glow
        let nGlow = g.glowSize + g.glowDir * dt
        if (nGlow > 40) { nGlow = 40; ghostsRef.current[g.id].glowDir = -Math.abs(g.glowDir) }
        else if (nGlow < 12) { nGlow = 12; ghostsRef.current[g.id].glowDir = Math.abs(g.glowDir) }

        return { ...g, x: nx, y: ny, vx: nvx, vy: nvy, rotation: nr, opacity: nOpacity, glowSize: nGlow }
      })

      // Atualizar partículas
      particlesRef.current = particlesRef.current.map((p) => {
        let ny = p.y - p.speed * dt * 0.5 // flutuam para cima
        let nx = p.x + Math.sin(timeRef.current * 0.02 + p.id) * 0.15

        if (ny < -10) ny = h + 10
        if (nx < -10) nx = w + 10
        if (nx > w + 10) nx = -10

        let nOpacity = p.opacity + p.opacityDir * dt
        if (nOpacity > 0.6) { nOpacity = 0.6; particlesRef.current[p.id].opacityDir = -Math.abs(p.opacityDir) }
        else if (nOpacity < 0.05) { nOpacity = 0.05; particlesRef.current[p.id].opacityDir = Math.abs(p.opacityDir) }

        return { ...p, x: nx, y: ny, opacity: nOpacity }
      })

      setGhosts(ghostsRef.current.map((g) => ({ ...g })))
      setParticles(particlesRef.current.map((p) => ({ ...p })))
      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [init])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* === CAMADA 1: Gradiente de fundo animado === */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 15% 30%, rgba(88, 28, 135, 0.15) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 85% 70%, rgba(124, 58, 237, 0.1) 0%, transparent 60%),
          radial-gradient(ellipse 50% 50% at 50% 50%, rgba(168, 85, 247, 0.05) 0%, transparent 70%)
        `,
      }} />

      {/* === CAMADA 2: Orbes de luz flutuantes === */}
      <div className="absolute top-[10%] left-[20%] w-64 h-64 rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)", animation: "pulse 8s ease-in-out infinite" }} />
      <div className="absolute bottom-[15%] right-[15%] w-80 h-80 rounded-full opacity-[0.03]"
        style={{ background: "radial-gradient(circle, rgba(217,70,239,0.3) 0%, transparent 70%)", animation: "pulse 12s ease-in-out infinite" }} />
      <div className="absolute top-[50%] left-[60%] w-48 h-48 rounded-full opacity-[0.03]"
        style={{ background: "radial-gradient(circle, rgba(192,132,252,0.3) 0%, transparent 70%)", animation: "pulse 10s ease-in-out infinite" }} />

      {/* === CAMADA 3: Linhas de grade sutis === */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `
          linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(168,85,247,0.3) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }} />

      {/* === CAMADA 4: Partículas flutuantes === */}
      {particles.map((p) => (
        <div
          key={`p-${p.id}`}
          className="absolute rounded-full"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `radial-gradient(circle, rgba(216,180,254,${p.opacity}) 0%, transparent 70%)`,
            boxShadow: `0 0 ${p.size * 3}px rgba(168,85,247,${p.opacity * 0.3})`,
          }}
        />
      ))}

      {/* === CAMADA 5: Gradiente overlay === */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050508]/30 to-[#050508]/60" />

      {/* === CAMADA 6: Fantasmas com glow === */}
      {ghosts.map((ghost) => (
        <div
          key={ghost.id}
          className="absolute will-change-transform"
          style={{
            left: `${ghost.x}px`,
            top: `${ghost.y}px`,
            transform: `rotate(${ghost.rotation}deg)`,
            transition: "transform 0.4s ease",
          }}
        >
          {/* Glow atrás do fantasma */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${ghost.size * 1.6}px`,
              height: `${ghost.size * 1.6}px`,
              background: `radial-gradient(circle, rgba(168,85,247,${ghost.opacity * 0.3}) 0%, transparent 70%)`,
              filter: `blur(${ghost.glowSize * 0.6}px)`,
            }}
          />

          <svg
            width={ghost.size}
            height={ghost.size * 1.25}
            viewBox="0 0 100 125"
            fill="none"
            style={{
              filter: `
                drop-shadow(0 0 ${ghost.glowSize}px rgba(168,85,247,${ghost.opacity * 0.8}))
                drop-shadow(0 0 ${ghost.glowSize * 2}px rgba(124,58,237,${ghost.opacity * 0.3}))
              `,
            }}
          >
            <defs>
              <linearGradient id={`casperBody-${ghost.id}`} x1="50" y1="0" x2="50" y2="125" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" stopOpacity={ghost.opacity * 2.5} />
                <stop offset="0.5" stopColor="#e9d5ff" stopOpacity={ghost.opacity * 2} />
                <stop offset="1" stopColor="#c4b5fd" stopOpacity={ghost.opacity * 1.5} />
              </linearGradient>
            </defs>

            {/* Corpo do fantasma - Casper style */}
            <path
              d="M50 5C26.5 5 8 22.5 8 45V105C8 112 13.5 117 20 117C23 117 26 115.5 28 113C30 110.5 33 109 36 109C39 109 42 110.5 44 113C46 115.5 48 117 51 117C54 117 56 115.5 58 113C60 110.5 63 109 66 109C69 109 72 110.5 74 113C76 115.5 78 117 82 117C87.5 117 92 112 92 105V45C92 22.5 73.5 5 50 5Z"
              fill={`url(#casperBody-${ghost.id})`}
            />

            {/* Olhos grandes estilo Casper */}
            <ellipse cx="36" cy="48" rx="11" ry="13" fill="#ffffff" opacity={ghost.opacity * 2.5} />
            <ellipse cx="64" cy="48" rx="11" ry="13" fill="#ffffff" opacity={ghost.opacity * 2.5} />

            {/* Pupilas */}
            <circle cx="38" cy="46" r="5.5" fill="#2e1065" opacity={ghost.opacity * 2.5} />
            <circle cx="66" cy="46" r="5.5" fill="#2e1065" opacity={ghost.opacity * 2.5} />

            {/* Brilho nos olhos */}
            <circle cx="35" cy="43" r="2.5" fill="#ffffff" opacity={ghost.opacity * 2} />
            <circle cx="63" cy="43" r="2.5" fill="#ffffff" opacity={ghost.opacity * 2} />

            {/* Sorriso */}
            <path
              d="M40 67C45 73 50 75 54 75C58 75 63 73 68 67"
              stroke="#e9d5ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity={ghost.opacity * 2}
            />
          </svg>
        </div>
      ))}

      {/* === CAMADA 7: Vignette (escurecimento nas bordas) === */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(5,5,8,0.4) 100%)`,
      }} />

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.04; }
          50% { transform: scale(1.15); opacity: 0.06; }
        }
      `}</style>
    </div>
  )
}
