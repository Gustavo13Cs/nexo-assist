"use client";

import React, { useState } from "react";
import { Check, Edit3, X, Clock, Save } from "lucide-react";

export interface DraftTicketData {
  draftId: string;
  type: "INC" | "REQ";
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
  slaHours: string;
  affectedScope: "INDIVIDUAL" | "EQUIPE" | "EMPRESA";
}

interface TicketDraftCardProps {
  draft: DraftTicketData;
  onConfirm: (finalDraft?: DraftTicketData) => void;
  onCancel: () => void;
  isConfirmed?: boolean;
}

export function TicketDraftCard({ draft, onConfirm, onCancel, isConfirmed }: TicketDraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(draft.title);
  const [editedDescription, setEditedDescription] = useState(draft.description);
  const [editedPriority, setEditedPriority] = useState(draft.priority);

  const priorityColor =
    (isEditing ? editedPriority : draft.priority) === "CRITICA"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : (isEditing ? editedPriority : draft.priority) === "ALTA"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : (isEditing ? editedPriority : draft.priority) === "MEDIA"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  const priorityLabel =
    (isEditing ? editedPriority : draft.priority) === "CRITICA"
      ? "Crítica"
      : (isEditing ? editedPriority : draft.priority) === "ALTA"
      ? "Alta"
      : (isEditing ? editedPriority : draft.priority) === "MEDIA"
      ? "Média"
      : "Baixa";

  const handleSaveEdit = () => {
    setIsEditing(false);
  };

  const handleConfirmAction = () => {
    const finalData: DraftTicketData = {
      ...draft,
      title: editedTitle,
      description: editedDescription,
      priority: editedPriority,
    };
    onConfirm(finalData);
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl border border-nexo-rule shadow-sm overflow-hidden my-3 animate-in fade-in zoom-in-95 duration-150">
      {/* Top Header */}
      <div className="px-5 py-3.5 bg-nexo-desk border-b border-nexo-rule flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider">
            {draft.type === "REQ" ? "Nova Requisição" : "Novo Chamado"}
          </span>
          <span className="text-xs font-mono font-medium text-nexo-ink bg-white px-2 py-0.5 rounded-md border border-nexo-rule">
            Rascunho {draft.draftId}
          </span>
        </div>
        <div>
          {isConfirmed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Check className="w-3 h-3" /> Criado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <Clock className="w-3 h-3" /> Aguardando confirmação
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1">
                Título do Chamado
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-nexo-rule text-nexo-ink focus:outline-hidden focus:border-nexo-primary"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1">
                Descrição do Problema
              </label>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-nexo-rule text-nexo-ink focus:outline-hidden focus:border-nexo-primary resize-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1">
                Prioridade (Matriz Anexo A)
              </label>
              <select
                value={editedPriority}
                onChange={(e) => setEditedPriority(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-nexo-rule text-nexo-ink focus:outline-hidden"
              >
                <option value="CRITICA">Crítica (1 hora - equipe parada)</option>
                <option value="ALTA">Alta (4 horas úteis - compromisso no dia)</option>
                <option value="MEDIA">Média (3 dias úteis - com alternativa)</option>
                <option value="BAIXA">Baixa (5 dias úteis - sem urgência)</option>
              </select>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-nexo-desk text-nexo-ink text-xs font-semibold hover:bg-nexo-rule transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar alterações
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h4 className="font-semibold text-nexo-ink text-base mb-1">{editedTitle}</h4>
            <p className="text-xs text-nexo-ink-2 leading-relaxed bg-nexo-desk/50 p-3 rounded-xl border border-nexo-rule/60 whitespace-pre-line">
              {editedDescription}
            </p>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-3 gap-3 pt-1 border-t border-nexo-rule/80">
          <div>
            <span className="text-[11px] text-nexo-ink-3 block mb-0.5">Categoria</span>
            <span className="text-xs font-semibold text-nexo-ink">{draft.category}</span>
          </div>

          <div>
            <span className="text-[11px] text-nexo-ink-3 block mb-0.5">Prioridade</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border ${priorityColor}`}>
                {priorityLabel}
              </span>
              <span className="text-[11px] text-nexo-ink-3">· {draft.slaHours}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-nexo-ink-3 block mb-0.5">Afetados</span>
            <span className="text-xs font-medium text-nexo-ink">
              {draft.affectedScope === "INDIVIDUAL"
                ? "Somente você"
                : draft.affectedScope === "EQUIPE"
                ? "Minha equipe"
                : "Toda a empresa"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {!isConfirmed && (
        <div className="px-5 py-3.5 bg-nexo-desk border-t border-nexo-rule flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirmAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-nexo-cta text-white text-xs font-semibold hover:bg-nexo-cta/90 transition shadow-xs active:scale-98 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Confirmar <span className="opacity-75 font-mono text-[10px]">⌘↵</span>
            </button>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-nexo-rule text-nexo-ink-2 text-xs font-medium hover:bg-nexo-desk transition shadow-2xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-nexo-ink-3" />
                Editar
              </button>
            )}
          </div>

          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-nexo-ink-3 hover:text-nexo-danger hover:bg-nexo-danger/5 text-xs font-medium transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
