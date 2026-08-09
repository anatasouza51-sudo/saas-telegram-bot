"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Zap, Users, ShoppingCart, MessageSquare, Settings, BarChart3 } from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  targetId?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "dashboard",
    title: "Bem-vindo ao Ghost Bot!",
    description:
      "Aqui é o seu painel principal. Nesta tela você verá resumos das suas vendas, pedidos recentes e estatísticas gerais do seu negócio.",
    icon: BarChart3,
  },
  {
    id: "sidebar",
    title: "Menu Lateral",
    description:
      "No menu lateral você encontra todas as seções do painel: Divulgação, Catálogo, Vendas, Configurações e mais. Clique para expandir e acessar as ferramentas.",
    icon: Zap,
    targetId: "app-sidebar",
  },
  {
    id: "divulgacao",
    title: "Divulgação",
    description:
      "Aqui você gerencia seus Grupos e Canais do Telegram, configura publicações automáticas e programa mensagens para manter sua audiência engajada.",
    icon: MessageSquare,
  },
  {
    id: "catalogo",
    title: "Catálogo",
    description:
      "Cadastre seus produtos, defina preços e controle o estoque. É aqui que o Bot monta o menu que será enviado aos clientes.",
    icon: ShoppingCart,
  },
  {
    id: "vendas",
    title: "Vendas & Clientes",
    description:
      "Acompanhe todos os pedidos realizados, gerencie entregas e visualize a lista de clientes cadastrados pelo bot.",
    icon: Users,
  },
  {
    id: "configuracoes",
    title: "Configurações",
    description:
      "Personalize o comportamento do bot: defina o token, configure os botões do catálogo, gerencie cupons e muito mais.",
    icon: Settings,
  },
];

export default function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Marca o onboarding como visto no banco de dados (persistente por conta)
  const markAsCompleted = useCallback(async () => {
    try {
      await fetch("/api/onboarding-complete", { method: "POST" });
    } catch {
      // Silencioso — não bloqueia o usuário
    }
  }, []);

  useEffect(() => {
    // Verifica no servidor se o usuário já viu o onboarding
    // Contas antigas: onboardingSeen = TRUE (coluna criada com DEFAULT TRUE)
    // Contas novas: onboardingSeen = FALSE (criadas pelo hook do Better Auth)
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/onboarding-check");
        if (res.ok) {
          const data = await res.json();
          // Se o servidor diz que ja viu, não mostra
          if (data?.onboardingSeen) return;
        }
        // Se não viu, mostra o tutorial
        setIsVisible(true);
      } catch {
        // Se falhar a verificação, não mostra (segurança — não forçar)
        setIsVisible(false);
      }
    };
    checkOnboarding();
  }, []);

  const handleContinue = async () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsVisible(false);
      await markAsCompleted();
    }
  };

  const handleClose = async () => {
    setIsVisible(false);
    await markAsCompleted();
  };

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay escuro com área transparente ao redor do tooltip */}
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Tooltip central */}
          <motion.div
            className="relative pointer-events-auto bg-gray-900 border border-purple-500/40 rounded-xl shadow-2xl shadow-purple-500/20 max-w-md w-[90vw] overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -40 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* Progress bar */}
            <div className="h-1 bg-gray-800">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold text-lg">{step.title}</h3>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Descrição */}
              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Footer com progresso e botão */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {currentStep + 1} de {ONBOARDING_STEPS.length}
                </span>
                <div className="flex gap-2">
                  {/* Bolinhas de progresso */}
                  <div className="flex gap-1 mr-3">
                    {ONBOARDING_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          i <= currentStep ? "bg-purple-500" : "bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleContinue}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {currentStep < ONBOARDING_STEPS.length - 1 ? "Continuar" : "Começar"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
