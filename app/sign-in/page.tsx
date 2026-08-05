"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { GhostBg } from "@/components/ghost-bg";
import { AuthForm } from "@/components/auth-form";


export default function LoginPage() {
  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ghost Background Animation */}
      <GhostBg />

      <div className="relative z-10 w-full flex justify-center">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  );
}
