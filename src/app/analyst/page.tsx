"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ArrowLeft,
  Shield,
  RotateCcw,
  Check,
  ExternalLink,
} from "lucide-react";

export default function AnalystConsolePage() {
  const [filter, setFilter] = useState<"all" | "for_you" | "with_agent" | "my">("for_you");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [counts, setCounts] = useState({ all: 0, for_you: 0, with_agent: 0, my: 0 });
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [convDetails, setConvDetails] = useState<any>(null);
  const [currentAnalyst, setCurrentAnalyst] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/analyst/conversations?filter=${filter}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setCounts(data.counts || { all: 0, for_you: 0, with_agent: 0, my: 0 });
        setCurrentAnalyst(data.currentAnalyst);

        // Selecionar o primeiro da lista se nenhum selecionado
        if (!selectedConvId && data.conversations.length > 0) {
          setSelectedConvId(data.conversations[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/analyst/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setConvDetails(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [filter, search]);

  useEffect(() => {
    if (selectedConvId) {
      fetchDetails(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convDetails?.conversation?.messages]);

  const handleAssume = async () => {
    if (!selectedConvId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analyst/conversations/${selectedConvId}/assume`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchDetails(selectedConvId);
        await fetchConversations();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToAgent = async () => {
    if (!selectedConvId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analyst/conversations/${selectedConvId}/return`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchDetails(selectedConvId);
        await fetchConversations();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!selectedConvId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analyst/conversations/${selectedConvId}/close`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchDetails(selectedConvId);
        await fetchConversations();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnalystMessage = async () => {
    if (!selectedConvId || !replyText.trim()) return;
    const text = replyText;
    setReplyText("");
    setLoading(true);

    try {
      const res = await fetch(`/api/analyst/conversations/${selectedConvId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        await fetchDetails(selectedConvId);
        await fetchConversations();
      }
    } finally {
      setLoading(false);
    }
  };

  const currentConv = convDetails?.conversation;
  const isAssumedByMe = currentConv?.status === "HUMAN_ACTIVE";
  const isWaitingHuman = currentConv?.status === "WAITING_HUMAN";

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden text-nexo-ink">
      {/* Top Header */}
      <header className="h-14 border-b border-nexo-rule px-6 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="flex items-center gap-1.5 text-xs text-nexo-ink-3 hover:text-nexo-ink transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Chat
          </Link>
          <div className="h-4 w-px bg-nexo-rule" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-nexo-ink">Console do Analista</span>
            <span className="text-[11px] font-semibold text-nexo-cta bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Service Desk N1 / N2
            </span>
          </div>
        </div>

        {/* Analista Ativo */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-nexo-cta text-white font-bold text-xs flex items-center justify-center">
            {currentAnalyst?.initials || "RL"}
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-nexo-ink">{currentAnalyst?.name || "Rafael Lima"}</div>
            <div className="text-[11px] text-nexo-ink-3 flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Disponível
            </div>
          </div>
        </div>
      </header>

      {/* Main 3 Columns Layout (Fiel aos Frames 3 e 4 do nexo.pen) */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUNA 1: Lista de Conversas e Fila */}
        <aside className="w-80 md:w-88 border-r border-nexo-rule flex flex-col bg-nexo-desk/50 shrink-0">
          <div className="p-4 border-b border-nexo-rule space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-nexo-ink">Conversas</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Disponível
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-nexo-ink-3 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar conversa ou chamado"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-nexo-rule text-xs text-nexo-ink placeholder:text-nexo-ink-3/60 bg-nexo-desk/50 focus:outline-hidden focus:bg-white"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                  filter === "all" ? "bg-nexo-ink text-white font-semibold" : "text-nexo-ink-3 hover:bg-nexo-desk"
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilter("for_you")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  filter === "for_you" ? "bg-nexo-ink text-white font-semibold" : "text-nexo-ink-3 hover:bg-nexo-desk"
                }`}
              >
                Para você
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "for_you" ? "bg-white/20 text-white" : "bg-nexo-rule text-nexo-ink"}`}>
                  {counts.for_you}
                </span>
              </button>
              <button
                onClick={() => setFilter("with_agent")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  filter === "with_agent" ? "bg-nexo-ink text-white font-semibold" : "text-nexo-ink-3 hover:bg-nexo-desk"
                }`}
              >
                Com o agent
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "with_agent" ? "bg-white/20 text-white" : "bg-nexo-rule text-nexo-ink"}`}>
                  {counts.with_agent}
                </span>
              </button>
              <button
                onClick={() => setFilter("my")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  filter === "my" ? "bg-nexo-ink text-white font-semibold" : "text-nexo-ink-3 hover:bg-nexo-desk"
                }`}
              >
                Minhas
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filter === "my" ? "bg-white/20 text-white" : "bg-nexo-rule text-nexo-ink"}`}>
                  {counts.my}
                </span>
              </button>
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-nexo-rule/60">
            {conversations.map((c) => {
              const isSelected = c.id === selectedConvId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`w-full p-4 text-left transition flex items-start gap-3 cursor-pointer ${
                    isSelected ? "bg-white border-l-4 border-l-nexo-cta shadow-2xs" : "hover:bg-white/60"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-nexo-ink-3/15 text-nexo-ink font-bold text-xs flex items-center justify-center shrink-0">
                    {c.user.initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-xs text-nexo-ink truncate">{c.user.name}</span>
                      <span className="text-[10px] text-nexo-ink-3 shrink-0">{c.lastMessageTime || "recente"}</span>
                    </div>

                    <p className="text-[11px] text-nexo-ink-2 truncate mb-2">{c.lastMessageText}</p>

                    {/* Tag de Status da Conversa */}
                    <div>
                      {c.tagType === "warning" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {c.tagLabel}
                        </span>
                      ) : c.tagType === "transfer" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          <Clock className="w-3 h-3 text-blue-600" />
                          {c.tagLabel}
                        </span>
                      ) : c.tagType === "success" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {c.tagLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-nexo-ink-3 bg-nexo-desk px-2 py-0.5 rounded-md border border-nexo-rule">
                          {c.tagLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* COLUNA 2: Chat com o Colaborador */}
        <section className="flex-1 flex flex-col bg-white overflow-hidden border-r border-nexo-rule">
          {convDetails ? (
            <>
              {/* Top Subheader */}
              <div className="px-6 py-3 border-b border-nexo-rule flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-nexo-ink text-white font-bold text-xs flex items-center justify-center">
                    {convDetails.user.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-nexo-ink">{convDetails.user.name}</span>
                      <span className="text-[10px] text-nexo-ink-3">
                        online · {convDetails.user.department}
                        {convDetails.relatedTicket ? ` · ${convDetails.relatedTicket.ticketNumber}` : ""}
                      </span>
                    </div>
                    <div className="text-[11px] text-nexo-ink-3">
                      {isAssumedByMe ? (
                        <span className="text-emerald-600 font-medium">Você está atendendo esta conversa</span>
                      ) : isWaitingHuman ? (
                        <span className="text-amber-600 font-medium">Aguardando atendente</span>
                      ) : (
                        <span>Com o assistente Nexo</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações do Analista */}
                <div className="flex items-center gap-2">
                  {isWaitingHuman && (
                    <>
                      <button
                        onClick={handleReturnToAgent}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl border border-nexo-rule text-xs font-medium text-nexo-ink-2 hover:bg-nexo-desk transition cursor-pointer"
                      >
                        Devolver ao agent
                      </button>
                      <button
                        onClick={handleAssume}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl bg-nexo-cta text-white text-xs font-semibold hover:bg-nexo-cta/90 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Assumir atendimento
                      </button>
                    </>
                  )}

                  {isAssumedByMe && (
                    <>
                      <button
                        onClick={handleReturnToAgent}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl border border-nexo-rule text-xs font-medium text-nexo-ink-2 hover:bg-nexo-desk transition cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-nexo-ink-3" />
                        Devolver ao agent
                      </button>
                      <button
                        onClick={handleClose}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Encerrar atendimento
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Thread de Mensagens */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-nexo-desk/30">
                {convDetails.conversation.messages.map((m: any) => {
                  const isUser = m.senderRole === "USER";
                  const isAgent = m.senderRole === "AGENT";
                  const isSystem = m.senderRole === "SYSTEM";
                  const isAnalyst = m.senderRole === "ANALYST";

                  if (isSystem) {
                    return (
                      <div key={m.id} className="flex justify-center my-3">
                        <span className="text-[11px] font-medium text-nexo-ink-3 bg-white border border-nexo-rule px-3 py-0.5 rounded-full shadow-2xs">
                          {m.content}
                        </span>
                      </div>
                    );
                  }

                  if (isUser) {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div className="bg-white border border-nexo-rule text-nexo-ink p-3 rounded-2xl rounded-br-xs text-xs max-w-md shadow-2xs">
                          <div className="text-[10px] text-nexo-ink-3 font-semibold mb-0.5 text-right">
                            {convDetails.user.name} ·{" "}
                            {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {m.content}
                        </div>
                      </div>
                    );
                  }

                  if (isAgent) {
                    return (
                      <div key={m.id} className="flex flex-col items-start max-w-md space-y-1">
                        <div className="flex items-center gap-1.5 pl-1">
                          <span className="text-xs font-bold text-nexo-ink">Nexo Assist</span>
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1 rounded-sm">IA</span>
                          <span className="text-[10px] text-nexo-ink-3">
                            · {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="bg-white border border-nexo-rule text-nexo-ink p-3 rounded-2xl rounded-tl-xs text-xs shadow-2xs whitespace-pre-line">
                          {m.content}
                        </div>
                      </div>
                    );
                  }

                  if (isAnalyst) {
                    return (
                      <div key={m.id} className="flex flex-col items-start max-w-md space-y-1">
                        <div className="flex items-center gap-1.5 pl-1">
                          <span className="text-xs font-bold text-nexo-cta">{m.senderName}</span>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1 rounded-sm">Suporte N2</span>
                          <span className="text-[10px] text-nexo-ink-3">
                            · {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 text-nexo-ink p-3 rounded-2xl rounded-tl-xs text-xs shadow-2xs">
                          {m.content}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}

                {/* Banner de Aguardando Atendente (Fiel ao Frame 3) */}
                {isWaitingHuman && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 mt-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-xs">{convDetails.user.name} espera um atendente</span>
                      </div>
                      <span className="text-[11px] text-amber-700">Agent pausado</span>
                    </div>
                    {convDetails.conversation.transferSummary && (
                      <p className="text-xs text-amber-800 bg-white/60 p-2.5 rounded-xl border border-amber-200/60">
                        <strong>Resumo do Agent:</strong> {convDetails.conversation.transferSummary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleAssume}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition cursor-pointer shadow-2xs"
                      >
                        Assumir atendimento
                      </button>
                      <button
                        onClick={handleReturnToAgent}
                        className="px-3 py-1.5 rounded-xl bg-white text-amber-800 border border-amber-300 text-xs font-medium hover:bg-amber-50 transition cursor-pointer"
                      >
                        Devolver ao agent
                      </button>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar do Analista */}
              <div className="p-4 border-t border-nexo-rule bg-white shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAnalystMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isAssumedByMe
                        ? `Escreva uma resposta para ${convDetails.user.name}…`
                        : "Assuma o atendimento para responder"
                    }
                    disabled={!isAssumedByMe || loading}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-nexo-rule text-xs text-nexo-ink placeholder:text-nexo-ink-3/60 focus:outline-hidden focus:border-nexo-cta disabled:bg-nexo-desk disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!isAssumedByMe || !replyText.trim() || loading}
                    className="px-4 py-2.5 rounded-xl bg-nexo-cta text-white text-xs font-semibold hover:bg-nexo-cta/90 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <span>Responder</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-nexo-ink-3">
              Selecione uma conversa para ver o histórico e atender.
            </div>
          )}
        </section>

        {/* COLUNA 3: Painel Lateral de Chamados do Colaborador (Fiel ao Frame 3 e 4) */}
        <aside className="w-80 border-l border-nexo-rule bg-nexo-desk/30 flex flex-col shrink-0 overflow-y-auto p-5 space-y-6">
          {convDetails ? (
            <>
              <div>
                <h3 className="font-bold text-sm text-nexo-ink">Chamados da {convDetails.user.name.split(" ")[0]}</h3>
                <span className="text-[11px] text-nexo-ink-3">
                  {convDetails.ticketsSummary.openCount} abertos · {convDetails.ticketsSummary.closedCount} encerrados
                </span>
              </div>

              {/* Desta conversa */}
              {convDetails.relatedTicket && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block">
                    Desta conversa
                  </span>
                  <div className="p-3.5 rounded-2xl bg-white border border-nexo-rule shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-nexo-ink">
                        {convDetails.relatedTicket.ticketNumber}
                      </span>
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        {convDetails.relatedTicket.status}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-nexo-ink leading-snug">
                      {convDetails.relatedTicket.title}
                    </div>
                    <div className="text-[11px] text-nexo-ink-3">
                      {convDetails.relatedTicket.category} · prioridade {convDetails.relatedTicket.priority.toLowerCase()}
                    </div>
                    <div className="pt-2 border-t border-nexo-rule text-[11px] text-amber-700 flex items-center justify-between">
                      <span>Transferido para analista</span>
                      <span>10:05</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Outros chamados */}
              <div className="space-y-3">
                <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block">
                  Outros chamados
                </span>

                <div className="space-y-2">
                  {convDetails.ticketsSummary.otherOpenTickets.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-xl bg-white border border-nexo-rule shadow-2xs space-y-1">
                      <div className="font-medium text-xs text-nexo-ink">{t.title}</div>
                      <div className="text-[11px] text-nexo-ink-3">
                        {t.ticketNumber} · {t.status}
                      </div>
                    </div>
                  ))}

                  {convDetails.ticketsSummary.closedTickets.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-xl bg-white/60 border border-nexo-rule/60 space-y-1">
                      <div className="font-medium text-xs text-nexo-ink-2">{t.title}</div>
                      <div className="text-[11px] text-nexo-ink-3">
                        {t.ticketNumber} · Resolvido
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button className="text-xs font-medium text-nexo-cta hover:underline flex items-center gap-1 cursor-pointer">
                  <span>Ver todos os chamados da {convDetails.user.name.split(" ")[0]}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-nexo-ink-3 text-center mt-10">Carregando painel do colaborador...</div>
          )}
        </aside>
      </div>
    </div>
  );
}
