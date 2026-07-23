"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Lógica de autenticação aqui
    console.log({ email, password, rememberMe });
    
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="min-h-screen w-full bg-[#050508] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Efeito de Fundo Estrelado/Cosmico */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at center, #ffffff 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Logo GHOST BOT */}
      <div className="mb-8 z-10 text-center">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase italic font-mono text-white">
          GHOST BOT
        </h1>
      </div>

      {/* Card do Formulário */}
      <div className="w-full max-w-[420px] bg-[#0c0d12] border border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 backdrop-blur-sm">
        
        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bem-vindo de volta
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Receba pagamentos no Brasil e em qualquer lugar do mundo
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Campo E-MAIL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
              E-MAIL
            </label>
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
              <label className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                SENHA
              </label>
              <Link 
                href="/forgot-password" 
                className="text-xs text-gray-400 hover:text-white transition"
              >
                Esqueceu Sua Senha?
              </Link>
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
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-gray-500 hover:text-gray-300 transition"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Checkbox Lembrar de mim */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-800 bg-[#121319] text-white focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer select-none">
              Lembrar de mim
            </label>
          </div>

          {/* Widget de Verificação (Cloudflare Simulado) */}
          <div className="my-3 p-3 bg-[#121319] border border-gray-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="h-3.5 w-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span>Verificando...</span>
            </div>
            <div className="text-[10px] text-gray-500 font-semibold tracking-wide">
              CLOUDFLARE
            </div>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-200 hover:bg-white text-black font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? "Acessando..." : "Acessar painel"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Rodapé do Card */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Não tem conta?{" "}
          <Link href="/register" className="text-white font-bold hover:underline">
            Criar conta gratuita
          </Link>
        </div>

      </div>
    </div>
  );
}