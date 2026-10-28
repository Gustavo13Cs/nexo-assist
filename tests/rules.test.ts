import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateSlaDeadline } from "../src/services/ticket-service";
import { agentEngine } from "../src/agent/decision-engine";

describe("Regras do Service Desk (Anexo A)", () => {
  it("deve calcular o prazo (SLA) correto para cada prioridade", () => {
    const now = new Date();

    const critDeadline = calculateSlaDeadline("CRITICA");
    const diffCritHours = (critDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    assert.ok(diffCritHours >= 0.9 && diffCritHours <= 1.1, "Crítica deve ser 1 hora");

    const altaDeadline = calculateSlaDeadline("ALTA");
    const diffAltaHours = (altaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    assert.ok(diffAltaHours >= 3.9 && diffAltaHours <= 4.1, "Alta deve ser 4 horas úteis");

    const mediaDeadline = calculateSlaDeadline("MEDIA");
    const diffMediaDays = (mediaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    assert.ok(diffMediaDays >= 2.9 && diffMediaDays <= 3.1, "Média deve ser 3 dias úteis");

    const baixaDeadline = calculateSlaDeadline("BAIXA");
    const diffBaixaDays = (baixaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    assert.ok(diffBaixaDays >= 4.9 && diffBaixaDays <= 5.1, "Baixa deve ser 5 dias úteis");
  });

  it("deve redirecionar educadamente assuntos fora de TI (Escopo)", async () => {
    const response = await agentEngine.processMessage({
      userId: "test-user-1",
      userEmail: "colaborador@nexo.com.br",
      userName: "Colaborador Teste",
      content: "Gostaria de saber quando cai o meu salário e como pedir férias.",
      conversationHistory: [],
    });

    assert.strictEqual(response.decisionDetail.intent, "FORA_DE_ESCOPO");
    assert.strictEqual(response.actionBadges.includes("identificou escopo fora de TI"), true);
    assert.ok(response.replyText.includes("Service Desk de TI"), "Deve esclarecer escopo");
    assert.ok(response.decisionDetail.confidence >= 0.95, "Confiança deve ser alta na rejeição");
  });

  it("deve classificar prioridade Alta e montar rascunho com prazo quando houver compromisso no mesmo dia", async () => {
    const response = await agentEngine.processMessage({
      userId: "test-user-1",
      userEmail: "colaborador@nexo.com.br",
      userName: "Colaborador Teste",
      content: "Só eu. Tenho reunião com um cliente às 14h e preciso da VPN funcionando.",
      conversationHistory: [],
    });

    assert.strictEqual(response.decisionDetail.intent, "CLASSIFICAR_PRIORIDADE_E_MONTAR_RASCUNHO");
    assert.ok(response.draftTicket, "Deve conter rascunho");
    assert.strictEqual(response.draftTicket?.priority, "ALTA");
    assert.ok(response.actionBadges.includes("classificou a prioridade"));
    assert.ok(response.actionBadges.includes("montou o rascunho"));
  });

  it("deve transferir imediatamente para suporte humano quando o usuário solicitar expressamente", async () => {
    const response = await agentEngine.processMessage({
      userId: "test-user-1",
      userEmail: "colaborador@nexo.com.br",
      userName: "Colaborador Teste",
      content: "Quero falar com um analista agora.",
      conversationHistory: [],
    });

    assert.strictEqual(response.transferToHuman, true);
    assert.strictEqual(response.decisionDetail.intent, "SOLICITAR_ANALISTA");
    assert.ok(response.actionBadges.includes("transferiu para analista"));
    assert.ok(response.actionBadges.includes("pausou assistente"));
  });

  it("deve acionar transbordo automático quando a confiança na decisão for baixa (< 60%)", async () => {
    const response = await agentEngine.processMessage({
      userId: "test-user-bruno",
      userEmail: "bruno.tavares@nexo.com.br",
      userName: "Bruno Tavares",
      content: "Estou tendo falhas intermitentes com script de automação em ambiente híbrido não documentado",
      conversationHistory: [],
    });

    assert.strictEqual(response.transferToHuman, true);
    assert.strictEqual(response.decisionDetail.confidence, 0.41);
    assert.ok(response.actionBadges.includes("baixa confiança"));
    assert.ok(response.decisionDetail.reasoning.includes("confiança 41% < limiar 60%"));
  });
});
