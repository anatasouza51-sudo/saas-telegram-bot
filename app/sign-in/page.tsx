"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#050508] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Efeito de Fundo Estrelado */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle at center, #ffffff 1px, transparent 1px)`, backgroundSize: '24px 24px' }}
      />

      {/* Card do Formulário */}
      <div className="w-full max-w-[420px] z-10 backdrop-blur-sm">
        <SignIn
          appearance={{
            elements: {
              card: "bg-[#0c0d12] border border-gray-800/80 rounded-2xl shadow-2xl",
              headerTitle: "text-2xl font-bold text-white",
              headerSubtitle: "text-xs sm:text-sm text-gray-400",
              formButtonPrimary: "bg-gray-200 hover:bg-white text-black font-semibold rounded-xl text-sm",
              formFieldInput: "bg-[#121319] border border-gray-800 rounded-xl text-sm text-white placeholder:text-gray-600 focus:border-gray-600 focus:ring-1 focus:ring-gray-600",
              formFieldLabel: "text-[11px] font-semibold text-gray-400 tracking-wider uppercase",
              footerActionLink: "text-white font-bold hover:underline",
              socialButtonsBlockButton: "border-gray-700 hover:bg-gray-800 text-white",
            },
            variables: {
              colorPrimary: "#818cf8",
            },
          }}
          routing="path"
          path="/sign-in"
          afterSignInUrl="/"
          fallbackRedirectUrl="/"
        />
      </div>

      {/* Rodapé */}
      <div className="mt-6 text-center text-xs text-gray-400 z-10">
        Não tem conta? <Link href="/sign-up" className="text-white font-bold hover:underline">Criar conta gratuita</Link>
      </div>
    </div>
  );
}
