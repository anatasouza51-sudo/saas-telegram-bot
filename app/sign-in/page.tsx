"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { GhostBg } from "@/components/ghost-bg";
import { AuthForm } from "@/components/auth-form";
import { StarryBackground } from "@/components/starry-background";

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-[#020203] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Starry Background */}
      <StarryBackground />
      
      {/* Ghost Background Animation */}
      <GhostBg />

      <div className="relative z-10 w-full flex justify-center">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  );
}
