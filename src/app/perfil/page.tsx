"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Lock, KeyRound, Mail, CheckCircle2, RotateCcw } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(console.error);
  }, []);

  const handleResetPassword = () => {
    setResetSent(true);
    setTimeout(() => setResetSent(false), 5000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-nexo-desk">
      <Navbar currentUser={user} onUserChange={() => window.location.reload()} />

      {/* Subheader / Breadcrumb */}
      <div className="bg-white border-b border-nexo-rule px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-nexo-ink-3">Service desk de TI</span>
          <span className="text-nexo-rule font-bold">›</span>
          <span className="font-semibold text-nexo-ink">Meu perfil</span>
        </div>
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 md:p-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-nexo-ink tracking-tight">Meu perfil</h1>
          <p className="text-xs text-nexo-ink-3 mt-1">Seus dados de acesso ao service desk de TI.</p>
        </div>

        {/* Card Nome */}
        <div className="bg-white rounded-2xl border border-nexo-rule p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1">Nome</span>
            <div className="text-sm font-semibold text-nexo-ink">{user?.name || "Ana Souza"}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-nexo-ink text-white font-bold text-xs flex items-center justify-center">
            {user?.initials || "AS"}
          </div>
        </div>

        {/* Card E-mail */}
        <div className="bg-white rounded-2xl border border-nexo-rule p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1">
              E-mail corporativo
            </span>
            <div className="text-sm font-semibold text-nexo-ink">{user?.email || "ana.souza@nexo.com.br"}</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-nexo-ink-3 bg-nexo-desk px-2.5 py-1 rounded-lg border border-nexo-rule">
            <Lock className="w-3.5 h-3.5" />
            <span>Gerenciado pela TI</span>
          </div>
        </div>

        {/* Card Senha (Fiel ao Frame 5 do nexo.pen) */}
        <div className="bg-white rounded-2xl border border-nexo-rule overflow-hidden shadow-2xs">
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-nexo-desk flex items-center justify-center text-nexo-ink-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-nexo-ink">Senha</div>
                <div className="text-xs text-nexo-ink-3">Alterada há 42 dias</div>
              </div>
            </div>

            <button
              onClick={handleResetPassword}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-nexo-rule hover:bg-nexo-desk text-nexo-ink text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98"
            >
              <RotateCcw className="w-3.5 h-3.5 text-nexo-ink-3" />
              Redefinir senha
            </button>
          </div>

          <div className="px-5 py-3 bg-nexo-desk border-t border-nexo-rule flex items-center gap-2 text-xs text-nexo-ink-3">
            <Mail className="w-3.5 h-3.5 text-nexo-ink-3 shrink-0" />
            <span>Enviaremos um link de redefinição para {user?.email || "ana.souza@nexo.com.br"}.</span>
          </div>
        </div>

        {resetSent && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Link de redefinição de senha enviado com sucesso para seu e-mail institucional!</span>
          </div>
        )}
      </main>
    </div>
  );
}
