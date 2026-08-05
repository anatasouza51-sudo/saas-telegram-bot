"use client"

import { memo } from "react"
import Image from "next/image"

export const StarryBackground = memo(() => {
  return (
    <div className="fixed inset-0 w-full h-full z-[-1] overflow-hidden bg-black">
      <div className="relative w-full h-full">
        <Image
          src="/assets/auth-bg.jpeg"
          alt="Space Background"
          fill
          priority
          className="object-cover opacity-100"
          quality={100}
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
    </div>
  )
})

StarryBackground.displayName = "StarryBackground"
