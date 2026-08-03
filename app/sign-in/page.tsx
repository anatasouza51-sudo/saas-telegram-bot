"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { GhostBg } from "@/components/ghost-bg";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingSecure, setIsCheckingSecure] = useState(true);
  const [currentLine, setCurrentLine] = useState("");
  const [verificationDone, setVerificationDone] = useState(false);

  const securityLines = [
    ">> Initializing secure environment...",
    ">> Scanning SSL/TLS certificates...",
    ">> Verifying connection integrity...",
    ">> Checking firewall rules...",
    ">> Validating session tokens...",
  ];

  useEffect(() => {
    let lineIndex = 0;
    const interval = setInterval(() => {
      if (lineIndex < securityLines.length) {
        setCurrentLine(securityLines[lineIndex]);
        lineIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsCheckingSecure(false);
          setVerificationDone(true);
        }, 500);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const result = await authClient.signIn.email({ 
        email, 
        password
      });

      if (result.error) {
        setError(result.error.message || "Credenciais inválidas");
        setLoading(false);
        return;
      }

      // Sucesso no login
      router.refresh();
      
      // Redirecionamento forçado para a raiz
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
      
    } catch (err) {
      console.error("Login error:", err);
      setError("Ocorreu um erro ao fazer login. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050508] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ghost Background Animation */}
      <GhostBg />

      {/* LOGO DO PROJETO */}
      <div className="mb-8 z-10 text-center flex flex-col items-center justify-center">
        <Link href="/" className="flex flex-col items-center gap-3 group">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Glow Effect matching the purple logo */}
            <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
            <Image
              src="/ghostbot-final-logo.png"
              alt="GHOST BOT"
              width={80}
              height={80}
              className="relative object-contain transition-transform duration-300 group-hover:scale-110"
              priority
            />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            GHOST <span className="text-dashboard-accent">BOT</span>
          </span>
        </Link>
      </div>

      {/* Card do Formulário */}
      <div className="w-full max-w-[420px] bg-[#0c0d12] border border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 backdrop-blur-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h2>
          <p className="text-xs sm:text-sm text-gray-400">Acesse seu centro de comando e gerencie sua operação.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo E-MAIL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">E-MAIL</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="voce@empresa.com" 
                required 
                className="w-full bg-[#121319] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition" 
              />
            </div>
          </div>

          {/* Campo SENHA */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">SENHA</label>
              <Link href="/forget-password" className="text-xs text-gray-400 hover:text-white transition">Esqueceu Sua Senha?</Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-gray-500 pointer-events-none" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                className="w-full bg-[#121319] border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 text-gray-500 hover:text-gray-300 transition">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs font-medium text-red-400">
              {error}
            </div>
          )}

          {/* Terminal Hacker Verification */}
          <div className="my-4 h-[42px] relative">
            {isCheckingSecure ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 p-2 bg-[#0a0a0a] border border-gray-800 rounded-xl text-xs text-emerald-400/80 font-mono animate-in fade-in duration-200">
                <span>{currentLine}</span>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center gap-2 p-2 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-xs text-emerald-400 font-mono transition-all duration-500">
                <span className="font-bold tracking-wider">[✓] ACCESS VERIFIED</span>
              </div>
            )}
          </div>

          {/* Botão de Envio */}
          <button 
            type="submit" 
            disabled={loading || isCheckingSecure} 
            className="w-full bg-gray-200 hover:bg-white text-black font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                Acessar painel
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé do Card */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Não tem conta? <Link href="/sign-up" className="text-white font-bold hover:underline">Criar conta gratuita</Link>
        </div>
      </div>
    </div>
  );
}
