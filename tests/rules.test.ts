import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateSlaDeadline, isTicketOverdue, ticketService } from "../src/services/ticket-service";
import { agentEngine } from "../src/agent/decision-engine";
import { prisma } from "../src/lib/prisma";

describe("Regras do Service Desk (Anexo A) e Autonomia do Agent", () => {
  it("deve calcular o prazo (SLA) correto para cada prioridade segundo o Anexo A", () => {
    const now = new Date();

    // Crítica: 1 hora corrida
    const critDeadline = calculateSlaDeadline("CRITICA", now);
    const diffCritHours = (critDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    assert.ok(diffCritHours >= 0.9 && diffCritHours <= 1.1, "Crítica deve ser 1 hora");

    // Alta: 4 horas úteis
    const altaDeadline = calculateSlaDeadline("ALTA", now);
    assert.ok(altaDeadline.getTime() > now.getTime(), "Alta deve ter prazo no futuro");

    // Média: 3 dias úteis
    const mediaDeadline = calculateSlaDeadline("MEDIA", now);
    assert.ok(mediaDeadline.getTime() > now.getTime(), "Média deve ter prazo no futuro");

    // Baixa: 5 dias úteis
    const baixaDeadline = calculateSlaDeadline("BAIXA", now);
    assert.ok(baixaDeadline.getTime() > mediaDeadline.getTime(), "Baixa (5 dias) deve ser maior que Média (3 dias)");
  });

  it("deve calcular vencimento de chamado com base na última atualização (Anexo A)", () => {
    const now = new Date();
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Chamado de prioridade média sem atualização há 6 dias (prazo é 3 dias úteis) -> VENCIDO
    const ticketOverdue = {
      status: "AGUARDANDO_ANALISTA",
      priority: "MEDIA",
      lastUpdate: sixDaysAgo,
      slaDeadline: sixDaysAgo,
    };
    assert.strictEqual(isTicketOverdue(ticketOverdue), true, "Chamado parado há mais de 3 dias úteis deve estar vencido");

    // Chamado de prioridade média atualizado há 2 horas -> NÃO VENCIDO
    const ticketOk = {
      status: "AGUARDANDO_ANALISTA",
      priority: "MEDIA",
      lastUpdate: twoHoursAgo,
      slaDeadline: new Date(now.getTime() + 48 * 60 * 60 * 1000),
    };
    assert.strictEqual(isTicketOverdue(ticketOk), false, "Chamado recentemente atualizado não deve estar vencido");
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

  it("deve proteger a privacidade: colaborador não pode consultar chamados de outro colaborador", async () => {
    const ana = await prisma.user.findFirst({ where: { email: "ana.souza@nexo.com.br" } });
    const carla = await prisma.user.findFirst({ where: { email: "carla.mendes@nexo.com.br" } });

    assert.ok(ana && carla, "Usuários do seed devem existir");

    // Ana tenta consultar o chamado da Carla (INC-20150)
    await assert.rejects(
      async () => {
        await ticketService.getTicketByNumber("INC-20150", ana.id);
      },
      /PRIVACY_VIOLATION/,
      "Deve lançar erro de privacidade ao tentar consultar chamado de outro colaborador"
    );
  });

  it("deve permitir que o analista consulte chamados de qualquer colaborador", async () => {
    const rafael = await prisma.user.findFirst({ where: { email: "rafael.lima@nexo.com.br" } });
    assert.ok(rafael, "Analista deve existir");

    const ticket = await ticketService.getTicketByNumber("INC-20150", rafael.id);
    assert.ok(ticket, "Analista tem permissão para consultar");
    assert.strictEqual(ticket?.ticketNumber, "INC-20150");
  });

  it("deve cumprir regra de reabertura: até 7 dias permite; acima de 7 dias bloqueia", async () => {
    const ana = await prisma.user.findFirst({ where: { email: "ana.souza@nexo.com.br" } });
    const carla = await prisma.user.findFirst({ where: { email: "carla.mendes@nexo.com.br" } });
    assert.ok(ana && carla);

    // INC-20150 (Carla) foi resolvido há 4 dias -> deve permitir reabrir
    const ticketReopenable = await ticketService.getTicketByNumber("INC-20150", carla.id);
    assert.strictEqual(ticketReopenable?.canReopen, true, "Resolvido há 4 dias pode reabrir");

    // INC-19877 (Ana) foi resolvido há 40 dias -> canReopen deve ser false e updateTicket deve rejeitar
    const ticketExpired = await ticketService.getTicketByNumber("INC-19877", ana.id);
    assert.strictEqual(ticketExpired?.canReopen, false, "Resolvido há 40 dias NÃO pode reabrir");

    await assert.rejects(
      async () => {
        await ticketService.updateTicket({
          ticketNumber: "INC-19877",
          userId: ana.id,
          reopen: true,
        });
      },
      /PRAZO_REABERTURA_EXPIRADO/,
      "Deve rejeitar reabertura de chamado resolvido há mais de 7 dias"
    );
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
    assert.ok(response.actionBadges.includes("baixa confiança (41%)"));
    assert.ok(response.decisionDetail.reasoning.includes("confiança 41% < limiar 60%"));
  });

  it("deve transferir imediatamente quando o usuário solicitar expressamente", async () => {
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
});
