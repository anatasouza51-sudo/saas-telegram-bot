"use client"

import { memo } from "react"
import Image from "next/image"

export const StarryBackground = memo(() => {
  return (
    <div className="fixed inset-0 w-full h-full -z-20 overflow-hidden bg-black">
      <div className="relative w-full h-full">
        <Image
          src="/assets/auth-bg.jpeg"
          alt="Space Background"
          fill
          priority
          className="object-cover opacity-100" // Opacidade total para garantir visibilidade
          quality={100}
        />
        {/* Overlay sutil apenas para garantir que o texto do formulário continue legível */}
        <div className="absolute inset-0 bg-black/20" />
      </div>
    </div>
  )
})

StarryBackground.displayName = "StarryBackground"
