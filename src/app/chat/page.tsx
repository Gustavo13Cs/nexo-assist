"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { DecisionInspector, DecisionData } from "@/components/DecisionInspector";
import { TicketDraftCard, DraftTicketData } from "@/components/TicketDraftCard";
import { TicketCardItem, TicketCardData } from "@/components/TicketCardItem";
import { Send, Sparkles, Clock, RotateCcw } from "lucide-react";

interface MessageItem {
  id: string;
  senderRole: string; // "USER" | "AGENT" | "ANALYST" | "SYSTEM"
  senderName: string;
  content: string;
  actionBadges?: string | null;
  quickOptions?: string | null;
  draftTicket?: string | null;
  ticketCards?: string | null;
  decisionDetail?: string | null;
  createdAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  // Inspector de Transparência
  const [selectedDecision, setSelectedDecision] = useState<DecisionData | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Rascunho ativo
  const [activeDraft, setActiveDraft] = useState<DraftTicketData | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChat = async (isBackground = false) => {
    try {
      const res = await fetch("/api/chat");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setConversation(data.conversation);
        setMessages(data.messages || []);
        setMessageCount(data.messageCount || 0);

        // Encontrar rascunho mais recente nas mensagens se houver
        const lastMsgWithDraft = [...(data.messages || [])].reverse().find((m) => m.draftTicket);
        if (lastMsgWithDraft && lastMsgWithDraft.draftTicket) {
          try {
            setActiveDraft(JSON.parse(lastMsgWithDraft.draftTicket));
          } catch {}
        }
      }
    } catch (e) {
      if (!isBackground) console.error("Erro ao carregar chat:", e);
    }
  };

  useEffect(() => {
    loadChat();
  }, []);

  // Polling em tempo real (a cada 3s) para receber mensagens do analista humano e status
  useEffect(() => {
    const timer = setInterval(() => {
      loadChat(true);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string, draftPayload?: any) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    setInputText("");
    setLoading(true);

    const optimisticMsg: MessageItem = {
      id: "opt-" + Date.now(),
      senderRole: "USER",
      senderName: currentUser?.name || "Você",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          draftPayload: draftPayload || activeDraft,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.agentMessage) {
        setMessages((prev) => [...prev.filter((m) => m.id !== optimisticMsg.id), data.userMessage, data.agentMessage]);
        if (data.agentMessage.draftTicket) {
          try {
            setActiveDraft(JSON.parse(data.agentMessage.draftTicket));
          } catch {}
        }
      } else {
        setMessages((prev) => [...prev.filter((m) => m.id !== optimisticMsg.id), data.userMessage]);
      }

      if (data.conversation) {
        setConversation(data.conversation);
        setMessageCount(data.messageCount);
      }
    } catch (err: any) {
      alert("Erro ao enviar mensagem: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickOption = (optionLabel: string) => {
    handleSendMessage(optionLabel);
  };

  const handleConfirmDraft = (finalDraft?: DraftTicketData) => {
    handleSendMessage("confirmar", finalDraft || activeDraft);
    setActiveDraft(null);
  };

  const handleCancelDraft = () => {
    handleSendMessage("cancelar");
    setActiveDraft(null);
  };

  const openDecisionInspector = (decisionJson: string | null) => {
    if (!decisionJson) return;
    try {
      const parsed = JSON.parse(decisionJson);
      setSelectedDecision(parsed);
      setIsInspectorOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const isPaused = conversation?.status === "WAITING_HUMAN" || conversation?.status === "HUMAN_ACTIVE";
  const isLimitReached = messageCount >= 30;

  return (
    <div className="min-h-screen flex flex-col bg-nexo-desk">
      <Navbar currentUser={currentUser} onUserChange={() => loadChat()} />

      {/* Subheader / Breadcrumb */}
      <div className="bg-white border-b border-nexo-rule px-6 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-nexo-ink-3">Service desk de TI</span>
          <span className="text-nexo-rule font-bold">›</span>
          <span className="font-semibold text-nexo-ink">Atendimento</span>
        </div>

        <div className="flex items-center gap-3">
          {isPaused ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <Clock className="w-3.5 h-3.5" /> Atendimento humano (Agent pausado)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Nexo Assist ativo
            </span>
          )}
        </div>
      </div>

      {/* Chat Messages Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between">
        <div className="space-y-6 pb-6">
          {/* Welcome Intro */}
          <div className="text-center py-4 space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-nexo-ink text-white mx-auto flex items-center justify-center font-bold text-sm shadow-xs mb-2">
              NX
            </div>
            <h2 className="text-sm font-bold text-nexo-ink">Atendimento Nexo Assist</h2>
            <p className="text-xs text-nexo-ink-3 max-w-sm mx-auto">
              Descreva o que está acontecendo com suas próprias palavras. O assistente consulta seus chamados, busca na
              central de ajuda e aciona um analista quando precisa.
            </p>
          </div>

          {messages.map((msg) => {
            const isUser = msg.senderRole === "USER";
            const isSystem = msg.senderRole === "SYSTEM";
            const isAnalyst = msg.senderRole === "ANALYST";

            // Mensagem de Sistema (Banner de transferência / status)
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="text-[11px] font-medium text-nexo-ink-3 bg-white border border-nexo-rule px-3.5 py-1 rounded-full shadow-2xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {msg.content}
                  </div>
                </div>
              );
            }

            // Mensagem do Usuário
            if (isUser) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-white border border-nexo-rule/80 text-nexo-ink px-4 py-2.5 rounded-2xl rounded-br-xs text-xs font-medium shadow-2xs max-w-md leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              );
            }

            // Mensagem do Analista Humano (Suporte N1/N2)
            if (isAnalyst) {
              return (
                <div key={msg.id} className="flex flex-col items-start space-y-1 max-w-lg">
                  <div className="flex items-center gap-2 pl-1">
                    <span className="text-xs font-semibold text-nexo-cta">{msg.senderName}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-sm font-bold">
                      Suporte N2
                    </span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 text-nexo-ink p-4 rounded-2xl rounded-tl-xs text-xs leading-relaxed shadow-2xs">
                    {msg.content}
                  </div>
                </div>
              );
            }

            // Mensagem do Nexo Assist
            const badges: string[] = msg.actionBadges ? JSON.parse(msg.actionBadges) : [];
            const quickOpts: Array<{ id: string; label: string }> = msg.quickOptions
              ? JSON.parse(msg.quickOptions)
              : [];
            const draft: DraftTicketData | null = msg.draftTicket ? JSON.parse(msg.draftTicket) : null;
            const ticketCards: TicketCardData[] = msg.ticketCards ? JSON.parse(msg.ticketCards) : [];

            return (
              <div key={msg.id} className="flex flex-col items-start space-y-2 max-w-xl animate-in fade-in duration-150">
                {/* Header do Agente + Pílulas de Ações */}
                <div className="flex items-center gap-2 flex-wrap pl-1">
                  <span className="text-xs font-bold text-nexo-ink">{msg.senderName}</span>

                  {badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] text-nexo-ink-3 bg-white px-2 py-0.5 rounded-md border border-nexo-rule"
                    >
                      {badge}
                    </span>
                  ))}

                  {/* Botão de Auditoria / Visibilidade das Decisões */}
                  {msg.decisionDetail && (
                    <button
                      onClick={() => openDecisionInspector(msg.decisionDetail || null)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-nexo-cta hover:text-nexo-cta/80 bg-nexo-cta/10 hover:bg-nexo-cta/15 px-2 py-0.5 rounded-md transition cursor-pointer"
                      title="Abrir auditoria da decisão algorítmica"
                    >
                      <Sparkles className="w-3 h-3" />
                      Ver decisão IA
                    </button>
                  )}
                </div>

                {/* Balão de Texto Principal */}
                <div className="bg-white border border-nexo-rule text-nexo-ink p-4 rounded-2xl rounded-tl-xs text-xs leading-relaxed shadow-2xs whitespace-pre-line">
                  {msg.content}
                </div>

                {/* Opções de Resposta Rápida */}
                {quickOpts.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1 pl-1">
                    {quickOpts.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleQuickOption(opt.label)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-white border border-nexo-rule text-xs font-medium text-nexo-ink hover:bg-nexo-desk hover:border-nexo-rule transition shadow-2xs active:scale-98 cursor-pointer flex items-center gap-1.5"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Card de Rascunho com Edição e Confirmação */}
                {draft && (
                  <TicketDraftCard
                    draft={draft}
                    onConfirm={(finalDraft) => handleConfirmDraft(finalDraft)}
                    onCancel={handleCancelDraft}
                    isConfirmed={false}
                  />
                )}

                {/* Cards de Chamados Existentes */}
                {ticketCards.length > 0 && (
                  <div className="w-full space-y-2 pt-1">
                    {ticketCards.length > 1 ? (
                      ticketCards.map((tc) => (
                        <TicketCardItem
                          key={tc.number}
                          ticket={tc}
                          onSelect={(num) => handleSendMessage(`${num} · ${tc.title}`)}
                          expanded={false}
                        />
                      ))
                    ) : (
                      <TicketCardItem ticket={ticketCards[0]} expanded={true} />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 pl-1 text-xs text-nexo-ink-3">
              <span className="w-2 h-2 rounded-full bg-nexo-cta animate-ping" />
              Nexo Assist pensando...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Footer */}
        <div className="sticky bottom-4 pt-2">
          {isPaused && (
            <div className="mb-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Esta conversa foi transferida para um analista humano. O assistente automático está pausado enquanto você é atendido.</span>
              </div>
            </div>
          )}

          {isLimitReached ? (
            <div className="p-4 rounded-2xl bg-white border border-nexo-rule shadow-md flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-nexo-ink">Limite de sessão atingido (30 mensagens)</div>
                <div className="text-[11px] text-nexo-ink-3">Para garantir qualidade e segurança, inicie um novo atendimento.</div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-nexo-cta text-white text-xs font-semibold hover:bg-nexo-cta/90 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Novo Atendimento
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-nexo-rule shadow-lg p-2 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Escreva para o Nexo…"
                disabled={loading}
                className="flex-1 px-3 py-2 text-xs text-nexo-ink placeholder:text-nexo-ink-3/60 focus:outline-hidden bg-transparent"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputText.trim()}
                className="px-4 py-2 rounded-xl bg-nexo-cta text-white text-xs font-semibold hover:bg-nexo-cta/90 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Session Limit Counter */}
          <div className="flex items-center justify-between text-[11px] text-nexo-ink-3 px-2 pt-2">
            <span>{messageCount}/30 mensagens nesta sessão</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedDecision({
                    intent: "ARQUITETURA_DE_DECISAO",
                    entities: { session: conversation?.id },
                    ruleApplied: "PRD Requisito 7: Visibilidade das Decisões - auditoria completa de qualquer resposta do agente.",
                    confidence: 0.98,
                    action: "SHOW_DECISION_INSPECTOR",
                    reasoning: "Auditoria disponível para conformidade e transparência algorítmica exigida no desafio.",
                  });
                  setIsInspectorOpen(true);
                }}
                className="hover:text-nexo-ink transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-nexo-cta" />
                Painel de Transparência
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Drawer de Visibilidade das Decisões */}
      <DecisionInspector
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        decision={selectedDecision}
      />
    </div>
  );
}
