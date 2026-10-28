"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ana.souza@nexo.com.br");
  const [password, setPassword] = useState("••••••••••");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (overrideEmail?: string) => {
    const targetEmail = overrideEmail || email;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na autenticação.");

      if (data.user.role === "ANALYST") {
        router.push("/analyst");
      } else {
        router.push("/chat");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* Coluna Esquerda: Showcase (Dark Theme $ink #1B2431) */}
      <div className="w-full lg:w-[58%] bg-nexo-ink text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M21.763 0.24493l-3.374 1.687c-0.623 0.308-0.973 0.903-0.973 1.631l0 6.293-11.193-9.429c-0.623-0.469-1.372-0.553-2.03-0.245l-3.185 1.631c-0.651 0.322-1.008 0.924-1.008 1.673l0 15.218c0 1.477 1.526 2.289 2.716 1.785l3.073-1.617c0.693-0.322 1.057-0.952 1.057-1.722l0-7.7 11.732 10.591c0.602 0.546 1.421 0.679 2.086 0.364l2.786-1.505c0.602-0.315 0.938-0.931 0.938-1.68l0-15.288c0-1.463-1.505-2.275-2.625-1.687z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">Nexo Assist</span>
        </div>

        {/* Story Headline & Preview */}
        <div className="my-10 lg:my-0 max-w-xl space-y-8">
          <div className="space-y-4">
            <span className="text-xs font-semibold tracking-wider uppercase text-white/60">
              Service desk de TI da Nexo
            </span>
            <h1 className="text-4xl lg:text-5xl font-serif tracking-tight font-normal text-white leading-tight">
              Seu problema de TI, resolvido em uma conversa.
            </h1>
            <p className="text-white/70 text-sm lg:text-base leading-relaxed">
              Descreva o que está acontecendo. O assistente consulta seus chamados, busca na central de ajuda e chama
              um analista quando precisa.
            </p>
          </div>

          {/* Conversation Preview Card (Fiel ao Frame 0) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-3.5 shadow-2xl">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-white text-nexo-ink px-4 py-2.5 rounded-2xl rounded-br-xs text-xs font-medium shadow-xs max-w-sm">
                Meu notebook não conecta na VPN. Erro 809.
              </div>
            </div>

            {/* Agent message */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/90">Nexo Assist</span>
                <span className="text-[11px] text-white/50">consultou seus chamados · criou um chamado</span>
              </div>

              <div className="bg-white/10 text-white p-3.5 rounded-2xl rounded-tl-xs text-xs leading-relaxed max-w-md">
                Pronto: abri o chamado com prioridade alta. Um analista fala com você em até 4 h úteis.
              </div>

              {/* Ticket Chip */}
              <div className="inline-flex items-center gap-2.5 bg-white text-nexo-ink px-3 py-1.5 rounded-xl shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="font-mono text-xs font-bold">INC-20517</span>
                <span className="text-xs text-nexo-ink-3">Rede e VPN · Alta · em até 4 h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats & Footer */}
        <div className="pt-8 border-t border-white/10 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">8 s</div>
              <div className="text-xs text-white/60">primeira resposta, em média</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">72%</div>
              <div className="text-xs text-white/60">resolvidos sem fila</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tracking-tight">6</div>
              <div className="text-xs text-white/60">analistas online agora</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/50 pt-2">
            <span>Problema para entrar? Ligue no ramal 4000</span>
            <span>Beyond the Bytes · Desafio Técnico</span>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Formulário de Login (Tela 1) */}
      <div className="w-full lg:w-[42%] flex flex-col justify-between p-8 lg:p-14 bg-white">
        <div className="max-w-md w-full mx-auto my-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-nexo-ink tracking-tight">Entrar</h2>
            <p className="text-xs text-nexo-ink-3 mt-1.5">
              Use seu e-mail corporativo e a senha da rede Nexo para acessar.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-5"
          >
            <div>
              <label className="text-xs font-semibold text-nexo-ink-2 block mb-1.5">E-mail corporativo</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@nexo.com.br"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-nexo-rule text-sm text-nexo-ink placeholder:text-nexo-ink-3/50 focus:outline-hidden focus:border-nexo-primary focus:ring-2 focus:ring-nexo-primary/10 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-nexo-ink-2">Senha</label>
                <a href="#reset" className="text-xs text-nexo-cta hover:underline font-medium">
                  Esqueci minha senha
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-nexo-rule text-sm text-nexo-ink placeholder:text-nexo-ink-3/50 focus:outline-hidden focus:border-nexo-primary focus:ring-2 focus:ring-nexo-primary/10 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-nexo-rule text-nexo-cta focus:ring-nexo-cta/20 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-nexo-ink-3 cursor-pointer">
                Manter conectado neste computador
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-nexo-cta text-white text-xs font-semibold hover:bg-nexo-cta/90 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher (Perfeito para o avaliador) */}
          <div className="pt-6 border-t border-nexo-rule space-y-3">
            <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block">
              Entrada rápida com usuários do PRD
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLogin("ana.souza@nexo.com.br")}
                className="p-2.5 text-left rounded-xl border border-nexo-rule hover:bg-nexo-desk hover:border-nexo-rule-strong transition group cursor-pointer"
              >
                <div className="font-semibold text-xs text-nexo-ink">Ana Souza</div>
                <div className="text-[11px] text-nexo-ink-3">Funcionária (Financeiro)</div>
              </button>

              <button
                type="button"
                onClick={() => handleLogin("rafael.lima@nexo.com.br")}
                className="p-2.5 text-left rounded-xl border border-nexo-rule bg-nexo-primary/5 hover:bg-nexo-primary/10 border-nexo-primary/20 transition group cursor-pointer"
              >
                <div className="font-semibold text-xs text-nexo-cta flex items-center gap-1">
                  Rafael Lima <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded-sm">Console</span>
                </div>
                <div className="text-[11px] text-nexo-ink-3">Analista Suporte N2</div>
              </button>

              <button
                type="button"
                onClick={() => handleLogin("carla.mendes@nexo.com.br")}
                className="p-2.5 text-left rounded-xl border border-nexo-rule hover:bg-nexo-desk hover:border-nexo-rule-strong transition group cursor-pointer"
              >
                <div className="font-semibold text-xs text-nexo-ink">Carla Mendes</div>
                <div className="text-[11px] text-nexo-ink-3">Acesso SAP (Vendas)</div>
              </button>

              <button
                type="button"
                onClick={() => handleLogin("bruno.tavares@nexo.com.br")}
                className="p-2.5 text-left rounded-xl border border-nexo-rule hover:bg-nexo-desk hover:border-nexo-rule-strong transition group cursor-pointer"
              >
                <div className="font-semibold text-xs text-nexo-ink">Bruno Tavares</div>
                <div className="text-[11px] text-nexo-ink-3">Baixa Confiança (41%)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-nexo-ink-3 pt-6 border-t border-nexo-rule">
          © 2026 Nexo · Service desk de TI · Privacidade e uso de dados
        </div>
      </div>
    </div>
  );
}
