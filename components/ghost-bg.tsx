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
  glowSize: number
  glowDir: number
}

export function GhostBg() {
  const containerRef = useRef<HTMLDivElement>(null)
  const ghostElsRef = useRef<Map<number, { wrapper: HTMLDivElement; svg: SVGSVGElement }>>(new Map())
  const ghostDataRef = useRef<GhostData[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.clientWidth || window.innerWidth
    const h = container.clientHeight || window.innerHeight

    // Reduzido: 4 fantasmas em vez de 7
    const ghosts: GhostData[] = Array.from({ length: 4 }, (_, i) => {
      const dirX = Math.random() > 0.5 ? 1 : -1
      const speedX = Math.random() * 0.4 + 0.2
      const speedY = (Math.random() - 0.5) * 0.3
      return {
        id: i,
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 60 + 50,
        vx: speedX * dirX,
        vy: speedY,
        rotation: Math.random() * 30 - 15,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.15 + 0.12,
        opacityDir: Math.random() > 0.5 ? 0.0005 : -0.0005,
        glowSize: 15 + Math.random() * 10,
        glowDir: Math.random() > 0.5 ? 0.2 : -0.2,
      }
    })
    ghostDataRef.current = ghosts

    // Criar elementos DOM uma única vez e atualizar via transform direto
    ghosts.forEach((g) => {
      const wrapper = document.createElement("div")
      wrapper.style.cssText = `position:absolute;will-change:transform;pointer-events:none`
      wrapper.style.left = `${g.x}px`
      wrapper.style.top = `${g.y}px`
      wrapper.style.transform = `rotate(${g.rotation}deg)`

      // Glow
      const glow = document.createElement("div")
      glow.style.cssText = `position:absolute;left:50%;top:50%;width:${g.size * 1.6}px;height:${g.size * 1.6}px;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(168,85,247,${g.opacity * 0.3}) 0%,transparent 70%);filter:blur(${g.glowSize * 0.6}px)`
      wrapper.appendChild(glow)

      // SVG do fantasma — reutilizar o mesmo markup via innerHTML
      wrapper.innerHTML += `
        <svg width="${g.size}" height="${g.size * 1.25}" viewBox="0 0 100 125" fill="none" style="filter:drop-shadow(0 0 ${g.glowSize}px rgba(168,85,247,${g.opacity * 0.8})) drop-shadow(0 0 ${g.glowSize * 2}px rgba(124,58,237,${g.opacity * 0.3}))">
          <defs>
            <linearGradient id="gb-${g.id}" x1="50" y1="0" x2="50" y2="125" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="${g.opacity * 2.5}" />
              <stop offset="0.5" stopColor="#e9d5ff" stopOpacity="${g.opacity * 2}" />
              <stop offset="1" stopColor="#c4b5fd" stopOpacity="${g.opacity * 1.5}" />
            </linearGradient>
          </defs>
          <path d="M50 5C26.5 5 8 22.5 8 45V105C8 112 13.5 117 20 117C23 117 26 115.5 28 113C30 110.5 33 109 36 109C39 109 42 110.5 44 113C46 115.5 48 117 51 117C54 117 56 115.5 58 113C60 110.5 63 109 66 109C69 109 72 110.5 74 113C76 115.5 78 117 82 117C87.5 117 92 112 92 105V45C92 22.5 73.5 5 50 5Z" fill="url(#gb-${g.id})" />
          <ellipse cx="36" cy="48" rx="11" ry="13" fill="#ffffff" opacity="${g.opacity * 2.5}" />
          <ellipse cx="64" cy="48" rx="11" ry="13" fill="#ffffff" opacity="${g.opacity * 2.5}" />
          <circle cx="38" cy="46" r="5.5" fill="#2e1065" opacity="${g.opacity * 2.5}" />
          <circle cx="66" cy="46" r="5.5" fill="#2e1065" opacity="${g.opacity * 2.5}" />
          <circle cx="35" cy="43" r="2.5" fill="#ffffff" opacity="${g.opacity * 2}" />
          <circle cx="63" cy="43" r="2.5" fill="#ffffff" opacity="${g.opacity * 2}" />
          <path d="M40 67C45 73 50 75 54 75C58 75 63 73 68 67" stroke="#e9d5ff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="${g.opacity * 2}" />
        </svg>
      `

      container.appendChild(wrapper)
      ghostElsRef.current.set(g.id, { wrapper, svg: wrapper.querySelector("svg")! })
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

        const marginX = g.size + 30
        const marginY = g.size * 1.3 + 30

        if (g.x < -marginX) g.x = cw + marginX
        else if (g.x > cw + marginX) g.x = -marginX
        if (g.y < -marginY) g.y = ch + marginY
        else if (g.y > ch + marginY) g.y = -marginY

        if (Math.random() < 0.004) g.vx += (Math.random() - 0.5) * 0.2
        if (Math.random() < 0.004) g.vy += (Math.random() - 0.5) * 0.12
        g.vx = Math.max(-0.8, Math.min(0.8, g.vx))
        g.vy = Math.max(-0.5, Math.min(0.5, g.vy))
        if (Math.abs(g.vx) < 0.12) g.vx = (g.vx >= 0 ? 1 : -1) * 0.2
        if (Math.abs(g.vy) < 0.04) g.vy = (g.vy >= 0 ? 1 : -1) * 0.06

        g.opacity += g.opacityDir * dt
        if (g.opacity > 0.25) { g.opacity = 0.25; g.opacityDir = -Math.abs(g.opacityDir) }
        else if (g.opacity < 0.08) { g.opacity = 0.08; g.opacityDir = Math.abs(g.opacityDir) }

        g.glowSize += g.glowDir * dt
        if (g.glowSize > 30) { g.glowSize = 30; g.glowDir = -Math.abs(g.glowDir) }
        else if (g.glowSize < 10) { g.glowSize = 10; g.glowDir = Math.abs(g.glowDir) }

        const el = ghostElsRef.current.get(g.id)
        if (el) {
          el.wrapper.style.left = `${g.x}px`
          el.wrapper.style.top = `${g.y}px`
          el.wrapper.style.transform = `rotate(${g.rotation}deg)`
        }
      })

      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      ghostElsRef.current.forEach(({ wrapper }) => wrapper.remove())
      ghostElsRef.current.clear()
    }
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradiente de fundo */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 15% 30%, rgba(88, 28, 135, 0.12) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 85% 70%, rgba(124, 58, 237, 0.08) 0%, transparent 60%),
          radial-gradient(ellipse 50% 50% at 50% 50%, rgba(168, 85, 247, 0.04) 0%, transparent 70%)
        `,
      }} />

      {/* Orbes de luz — CSS only, sem JS */}
      <div className="absolute top-[10%] left-[20%] w-48 h-48 rounded-full opacity-[0.03]"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)" }} />
      <div className="absolute bottom-[15%] right-[15%] w-56 h-56 rounded-full opacity-[0.02]"
        style={{ background: "radial-gradient(circle, rgba(217,70,239,0.2) 0%, transparent 70%)" }} />

      {/* Grade sutil */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.3) 1px, transparent 1px)`,
        backgroundSize: "120px 120px",
      }} />

      {/* Vignette */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(5,5,8,0.4) 100%)`,
      }} />
    </div>
  )
}
