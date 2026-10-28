"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ChevronDown, CheckCircle2, Shield } from "lucide-react";

interface NavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    initials: string;
    department: string;
  } | null;
  onUserChange?: (email: string) => void;
}

export function Navbar({ currentUser, onUserChange }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const personas = [
    { name: "Ana Souza", email: "ana.souza@nexo.com.br", role: "Funcionária (Financeiro)", initials: "AS" },
    { name: "Carla Mendes", email: "carla.mendes@nexo.com.br", role: "Funcionária (Vendas)", initials: "CM" },
    { name: "Bruno Tavares", email: "bruno.tavares@nexo.com.br", role: "Funcionário (Baixa Confiança)", initials: "BT" },
    { name: "Rafael Lima", email: "rafael.lima@nexo.com.br", role: "Analista (Suporte N2)", initials: "RL" },
  ];

  const handleSwitchUser = async (email: string) => {
    try {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDropdownOpen(false);
      if (email.includes("rafael") || email.includes("analista")) {
        router.push("/analyst");
      } else {
        router.push("/chat");
      }
      router.refresh();
      if (onUserChange) onUserChange(email);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    document.cookie = "nexo_user_id=; Max-Age=0; path=/";
    router.push("/login");
  };

  const isAnalyst = currentUser?.role === "ANALYST";

  return (
    <header className="h-16 border-b border-nexo-rule bg-white sticky top-0 z-40 px-6 flex items-center justify-between shadow-2xs">
      {/* Brand & Status */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-nexo-ink text-white flex items-center justify-center font-bold text-sm tracking-tighter">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21.763 0.24493l-3.374 1.687c-0.623 0.308-0.973 0.903-0.973 1.631l0 6.293-11.193-9.429c-0.623-0.469-1.372-0.553-2.03-0.245l-3.185 1.631c-0.651 0.322-1.008 0.924-1.008 1.673l0 15.218c0 1.477 1.526 2.289 2.716 1.785l3.073-1.617c0.693-0.322 1.057-0.952 1.057-1.722l0-7.7 11.732 10.591c0.602 0.546 1.421 0.679 2.086 0.364l2.786-1.505c0.602-0.315 0.938-0.931 0.938-1.68l0-15.288c0-1.463-1.505-2.275-2.625-1.687z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
          <span className="font-bold text-base text-nexo-ink tracking-tight">Nexo Assist</span>
        </Link>

        <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-nexo-rule">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-nexo-ink-3">Assistente online</span>
        </div>
      </div>

      {/* Center Tabs */}
      <nav className="flex items-center gap-1 bg-nexo-desk p-1 rounded-xl border border-nexo-rule/70">
        <Link
          href="/chat"
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            pathname === "/chat" || pathname === "/"
              ? "bg-white text-nexo-ink shadow-2xs"
              : "text-nexo-ink-3 hover:text-nexo-ink"
          }`}
        >
          Atendimento
        </Link>

        <Link
          href="/perfil"
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            pathname === "/perfil"
              ? "bg-white text-nexo-ink shadow-2xs"
              : "text-nexo-ink-3 hover:text-nexo-ink"
          }`}
        >
          Meu perfil
        </Link>

        <Link
          href="/analyst"
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            pathname.startsWith("/analyst")
              ? "bg-white text-nexo-cta shadow-2xs font-bold"
              : "text-nexo-ink-3 hover:text-nexo-ink"
          }`}
        >
          <Shield className="w-3 h-3 text-nexo-cta" />
          Console Analista
        </Link>
      </nav>

      {/* User Info & Persona Switcher */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-nexo-desk transition text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-nexo-ink text-white font-semibold text-xs flex items-center justify-center">
            {currentUser?.initials || "AS"}
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold text-nexo-ink leading-tight flex items-center gap-1">
              {currentUser?.name || "Ana Souza"}
              {isAnalyst && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded-sm font-medium">N2</span>
              )}
            </div>
            <div className="text-[11px] text-nexo-ink-3 leading-tight truncate max-w-[140px]">
              {currentUser?.email || "ana.souza@nexo.com.br"}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-nexo-ink-3" />
        </button>

        {/* Persona Switcher Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-nexo-rule p-2 z-50 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 border-b border-nexo-rule/70">
              <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block">
                Alternar Persona de Demonstração
              </span>
              <p className="text-[11px] text-nexo-ink-2 mt-0.5">
                Alterne instantaneamente para testar cada cenário do PRD.
              </p>
            </div>

            <div className="py-1 space-y-0.5">
              {personas.map((p) => {
                const isSelected = currentUser?.email === p.email;
                return (
                  <button
                    key={p.email}
                    onClick={() => handleSwitchUser(p.email)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer ${
                      isSelected ? "bg-nexo-desk text-nexo-ink font-semibold" : "hover:bg-nexo-desk/60 text-nexo-ink-2"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-nexo-ink-3/10 text-nexo-ink text-xs font-bold flex items-center justify-center">
                        {p.initials}
                      </div>
                      <div>
                        <div className="text-xs">{p.name}</div>
                        <div className="text-[10px] text-nexo-ink-3">{p.role}</div>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-nexo-cta" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-1 mt-1 border-t border-nexo-rule/70">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair da conta
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
