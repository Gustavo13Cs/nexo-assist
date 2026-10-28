"use client";

import React from "react";
import { X, ShieldCheck, AlertTriangle, Cpu, BookOpen, Layers } from "lucide-react";

export interface DecisionData {
  intent: string;
  entities: Record<string, any>;
  ruleApplied: string;
  confidence: number;
  action: string;
  reasoning: string;
}

interface DecisionInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  decision: DecisionData | null;
}

export function DecisionInspector({ isOpen, onClose, decision }: DecisionInspectorProps) {
  if (!isOpen || !decision) return null;

  const confidencePct = Math.round(decision.confidence * 100);
  const isHighConfidence = decision.confidence >= 0.8;
  const isMediumConfidence = decision.confidence >= 0.6 && decision.confidence < 0.8;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-nexo-rule animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-nexo-rule flex items-center justify-between bg-nexo-desk">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-nexo-primary/10 text-nexo-primary flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-nexo-ink text-sm">Visibilidade da Decisão (IA)</h3>
              <p className="text-xs text-nexo-ink-3">Auditoria e explicabilidade em tempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-nexo-ink-3 hover:text-nexo-ink hover:bg-black/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Confiança */}
          <div className="p-4 rounded-xl border border-nexo-rule bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-nexo-ink-2 uppercase tracking-wider flex items-center gap-1.5">
                {isHighConfidence ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                Grau de Segurança (Confiança)
              </span>
              <span
                className={`text-sm font-bold ${
                  isHighConfidence
                    ? "text-emerald-600"
                    : isMediumConfidence
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                {confidencePct}%
              </span>
            </div>
            <div className="w-full bg-nexo-rule h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isHighConfidence
                    ? "bg-emerald-500"
                    : isMediumConfidence
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <p className="text-xs text-nexo-ink-3 mt-2">
              {decision.confidence < 0.6
                ? "Confiança abaixo do limiar (60%). O agente acionou transbordo automático para um analista humano."
                : "Confiança alta. O agente seguiu o fluxo autônomo com segurança."}
            </p>
          </div>

          {/* Intenção e Ação */}
          <div className="p-4 rounded-xl border border-nexo-rule bg-white shadow-xs space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1">
                Intenção Reconhecida
              </span>
              <div className="inline-block px-2.5 py-1 rounded-md bg-nexo-desk text-nexo-ink font-mono text-xs font-medium">
                {decision.intent}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1">
                Ação Executada
              </span>
              <div className="inline-block px-2.5 py-1 rounded-md bg-nexo-primary/10 text-nexo-primary font-mono text-xs font-medium">
                {decision.action}
              </div>
            </div>
          </div>

          {/* Raciocínio (Por quê?) */}
          <div className="p-4 rounded-xl border border-nexo-rule bg-white shadow-xs">
            <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-nexo-primary" />
              Por que esta ação foi tomada?
            </span>
            <p className="text-xs text-nexo-ink leading-relaxed bg-nexo-desk/50 p-3 rounded-lg border border-nexo-rule/60">
              {decision.reasoning}
            </p>
          </div>

          {/* Regra de Negócio Aplicada */}
          <div className="p-4 rounded-xl border border-nexo-rule bg-white shadow-xs">
            <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              Regra de Negócio do Service Desk (Anexo A)
            </span>
            <div className="text-xs text-nexo-ink-2 bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg leading-relaxed">
              {decision.ruleApplied}
            </div>
          </div>

          {/* Entidades Extraídas */}
          {decision.entities && Object.keys(decision.entities).length > 0 && (
            <div className="p-4 rounded-xl border border-nexo-rule bg-white shadow-xs">
              <span className="text-[11px] font-semibold text-nexo-ink-3 uppercase tracking-wider block mb-2">
                Entidades e Parâmetros Extraídos
              </span>
              <div className="bg-nexo-ink text-white p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                <pre>{JSON.stringify(decision.entities, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-nexo-rule bg-nexo-desk text-center">
          <p className="text-[11px] text-nexo-ink-3">
            Conforme PRD: Auditoria estruturada de decisões e transparência algorítmica.
          </p>
        </div>
      </div>
    </div>
  );
}
