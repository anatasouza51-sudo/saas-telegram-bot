"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) router.push("/");
  }, [isSignedIn, router]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full flex justify-center">
        <div className="w-full max-w-[420px]">
          <SignUp
            appearance={{
              elements: {
                card: "bg-[#0c0d12] border border-gray-800/80 rounded-2xl shadow-2xl",
                headerTitle: "text-2xl font-bold text-white",
                headerSubtitle: "text-xs sm:text-sm text-gray-400",
                formButtonPrimary: "bg-gray-200 hover:bg-white text-black font-semibold rounded-xl text-sm",
                formFieldInput: "bg-[#121319] border border-gray-800 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600",
                formFieldLabel: "text-[11px] font-semibold text-gray-400 tracking-wider uppercase",
                footerActionLink: "text-white font-bold hover:underline",
              },
              variables: {
                colorPrimary: "#818cf8",
              },
            }}
            routing="path"
            path="/sign-up"
            afterSignUpUrl="/"
            fallbackRedirectUrl="/"
          />
        </div>
      </div>

      {/* Rodapé */}
      <div className="absolute bottom-4 text-center text-xs text-gray-400 z-10">
        Já tem conta? <Link href="/sign-in" className="text-white font-bold hover:underline">Entrar</Link>
      </div>
    </main>
  );
}
