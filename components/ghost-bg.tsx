"use client"

import { useEffect, useRef } from "react"

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
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostElsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const ghostDataRef = useRef<GhostData[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight

    // 5 fantasmas com o novo estilo baseado na referência
    const ghosts: GhostData[] = Array.from({ length: 5 }, (_, i) => {
      const dirX = Math.random() > 0.5 ? 1 : -1
      return {
        id: i,
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 40 + 60, // 60px a 100px
        vx: (Math.random() * 0.3 + 0.1) * dirX,
        vy: (Math.random() - 0.5) * 0.2,
        rotation: Math.random() * 20 - 10,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        opacity: Math.random() * 0.05 + 0.05, // Bem sutil: 5% a 10%
        opacityDir: Math.random() > 0.5 ? 0.0002 : -0.0002,
      }
    })
    ghostDataRef.current = ghosts

    ghosts.forEach((g) => {
      const wrapper = document.createElement("div")
      wrapper.style.cssText = `position:absolute;will-change:transform;pointer-events:none;opacity:${g.opacity}`
      
      // SVG baseado na referência do usuário (fantasminha clássico com lençol ondulado)
      wrapper.innerHTML = `
        <svg width="${g.size}" height="${g.size * 1.3}" viewBox="0 0 100 130" fill="none">
          <path d="M50 10C28 10 10 28 10 50V110C10 115 14 120 20 120C25 120 28 115 32 110C36 105 40 105 44 110C48 115 52 120 56 120C60 120 64 115 68 110C72 105 76 105 80 110C84 115 88 120 92 120C97 120 100 115 100 110V50C100 28 82 10 50 10Z" 
            fill="white" fill-opacity="0.8" stroke="white" stroke-width="2" />
          <circle cx="35" cy="45" r="5" fill="black" />
          <circle cx="65" cy="45" r="5" fill="black" />
          <ellipse cx="50" cy="65" rx="6" ry="10" fill="black" />
        </svg>
      `

      container.appendChild(wrapper)
      ghostElsRef.current.set(g.id, wrapper)
    })

    let lastTime = performance.now()
    let frameId = 0

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 16, 3)
      lastTime = time

      const cw = container.clientWidth || window.innerWidth
      const ch = container.clientHeight || window.innerHeight

      ghostDataRef.current.forEach((g) => {
        g.x += g.vx * dt
        g.y += g.vy * dt
        g.rotation += g.rotationSpeed * dt

        const margin = g.size + 50
        if (g.x < -margin) g.x = cw + margin
        else if (g.x > cw + margin) g.x = -margin
        if (g.y < -margin) g.y = ch + margin
        else if (g.y > ch + margin) g.y = -margin

        g.opacity += g.opacityDir * dt
        if (g.opacity > 0.15) g.opacityDir = -Math.abs(g.opacityDir)
        else if (g.opacity < 0.03) g.opacityDir = Math.abs(g.opacityDir)

        const el = ghostElsRef.current.get(g.id)
        if (el) {
          el.style.transform = `translate3d(${g.x}px, ${g.y}px, 0) rotate(${g.rotation}deg)`
          el.style.opacity = `${g.opacity}`
        }
      })

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      ghostElsRef.current.forEach((el) => el.remove())
      ghostElsRef.current.clear()
    }
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none bg-[#020203]">
      {/* Camada de Profundidade Sombria (Dark Theme Real) */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(circle at 20% 20%, rgba(20, 20, 30, 0.4) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(10, 10, 15, 0.4) 0%, transparent 50%)
        `,
      }} />

      {/* Ruído de textura para visual profissional */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

      {/* Vinheta para foco central */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.8) 100%)`,
      }} />
    </div>
  )
}
