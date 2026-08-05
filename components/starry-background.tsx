"use client"

import { memo } from "react"
import Image from "next/image"

export const StarryBackground = memo(() => {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden bg-black">
      <div className="relative w-full h-full">
        <Image
          src="/assets/auth-bg.jpeg"
          alt="Space Background"
          fill
          priority
          className="object-cover opacity-40 grayscale brightness-75 contrast-125"
          quality={100}
        />
        {/* Overlay preto profundo para remover tons de azul e focar na Terra/Conexões */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>
    </div>
  )
})

StarryBackground.displayName = "StarryBackground"
