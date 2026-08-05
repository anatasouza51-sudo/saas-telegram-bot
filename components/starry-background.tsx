"use client"

import { memo } from "react"
import Image from "next/image"

export const StarryBackground = memo(() => {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden bg-[#020203]">
      <Image
        src="/assets/auth-bg.jpeg"
        alt="Space Background"
        fill
        priority
        className="object-cover opacity-60"
        quality={100}
      />
      {/* Overlay para melhorar o contraste dos formulários */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020203]/20 to-[#020203]/80" />
    </div>
  )
})

StarryBackground.displayName = "StarryBackground"
