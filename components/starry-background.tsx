"use client"

import { useEffect, useRef, memo } from "react"

export const StarryBackground = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = []
    const starCount = 150

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      stars = []
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          speed: Math.random() * 0.05 + 0.01,
          opacity: Math.random()
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Fundo espacial profundo
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      )
      gradient.addColorStop(0, "#050508")
      gradient.addColorStop(1, "#020203")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Desenhar estrelas
      stars.forEach(star => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()

        // Movimento lento
        star.y -= star.speed
        if (star.y < 0) star.y = canvas.height

        // Brilho pulsante
        star.opacity += (Math.random() - 0.5) * 0.05
        if (star.opacity < 0.1) star.opacity = 0.1
        if (star.opacity > 0.8) star.opacity = 0.8
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    window.addEventListener("resize", resizeCanvas)
    resizeCanvas()
    draw()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
      style={{ background: "#020203" }}
    />
  )
})

StarryBackground.displayName = "StarryBackground"
