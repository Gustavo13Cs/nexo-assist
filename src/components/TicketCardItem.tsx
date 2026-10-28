"use client";

import React from "react";
import { AlertCircle, ChevronRight } from "lucide-react";

export interface TicketCardData {
  number: string;
  title: string;
  status: string;
  date: string;
  priority?: string;
  isOverdue?: boolean;
  daysSinceLastUpdate?: number;
}

interface TicketCardItemProps {
  ticket: TicketCardData;
  onSelect?: (ticketNumber: string) => void;
  expanded?: boolean;
}

export function TicketCardItem({ ticket, onSelect, expanded = false }: TicketCardItemProps) {
  const isAguardando = ticket.status.toLowerCase().includes("aguardando");
  const isEmAndamento = ticket.status.toLowerCase().includes("andamento");
  const isAprovado = ticket.status.toLowerCase().includes("aprovado");

  const statusBadgeColor = isAguardando
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : isEmAndamento
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : isAprovado
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-700 border-slate-200";

  if (!expanded) {
    return (
      <button
        onClick={() => onSelect && onSelect(ticket.number)}
        className="w-full text-left p-3.5 rounded-xl border border-nexo-rule bg-white hover:bg-nexo-desk hover:border-nexo-rule-strong transition shadow-2xs flex items-center justify-between gap-3 group cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-nexo-ink">{ticket.number}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${statusBadgeColor}`}>
              {ticket.status}
            </span>
            {ticket.isOverdue && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Vencido
              </span>
            )}
          </div>
          <p className="text-xs text-nexo-ink font-medium truncate">{ticket.title}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-nexo-ink-3">{ticket.date}</span>
          <ChevronRight className="w-4 h-4 text-nexo-ink-3 group-hover:text-nexo-ink group-hover:translate-x-0.5 transition" />
        </div>
      </button>
    );
  }

  // Visualização Detalhada (Expanded)
  return (
    <div className="w-full max-w-lg bg-white rounded-2xl border border-nexo-rule shadow-sm overflow-hidden my-3">
      <div className="px-5 py-3.5 bg-nexo-desk border-b border-nexo-rule flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider">Chamado</span>
          <span className="text-xs font-mono font-bold text-nexo-ink bg-white px-2 py-0.5 rounded-md border border-nexo-rule">
            {ticket.number}
          </span>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${statusBadgeColor}`}>
          {ticket.status}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h4 className="font-semibold text-nexo-ink text-base mb-1">{ticket.title}</h4>
          <p className="text-xs text-nexo-ink-2 bg-nexo-desk/50 p-3 rounded-xl border border-nexo-rule/60">
            Lentidão geral desde a atualização recente do Windows. Procedimentos básicos de reinicialização já
            executados.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-nexo-rule/80">
          <div>
            <span className="text-[11px] text-nexo-ink-3 block mb-0.5">Prioridade</span>
            <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              {ticket.priority || "Média"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-nexo-ink-3 block mb-0.5">Última atualização</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-nexo-ink">
                {ticket.daysSinceLastUpdate ? `há ${ticket.daysSinceLastUpdate} dias` : "recente"}
              </span>
              {ticket.isOverdue && (
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200 flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" /> prazo vencido
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
