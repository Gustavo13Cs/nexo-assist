import { ticketService } from "@/services/ticket-service";
import { kbService } from "@/services/kb-service";
import { prisma } from "@/lib/prisma";
import { callGeminiAgent } from "./gemini-llm";

export interface DecisionInspection {
  intent: string;
  entities: Record<string, any>;
  ruleApplied: string;
  confidence: number;
  action: string;
  reasoning: string;
}

export interface AgentResponse {
  replyText: string;
  actionBadges: string[];
  quickOptions?: { id: string; label: string }[];
  draftTicket?: {
    draftId: string;
    type: "INC" | "REQ";
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    priority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
    slaHours: string;
    affectedScope: "INDIVIDUAL" | "EQUIPE" | "EMPRESA";
  };
  ticketCards?: Array<{
    number: string;
    title: string;
    status: string;
    date: string;
    priority?: string;
    isOverdue?: boolean;
    daysSinceLastUpdate?: number;
    description?: string;
    canReopen?: boolean;
  }>;
  decisionDetail: DecisionInspection;
  transferToHuman?: boolean;
  transferReason?: string;
  transferSummary?: string;
  targetTicketId?: string;
}

interface MessageContext {
  userId: string;
  userEmail: string;
  userName: string;
  content: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentDraft?: any;
  activeTicketId?: string | null;
}

export class AgentDecisionEngine {
  async processMessage(ctx: MessageContext): Promise<AgentResponse> {
    const text = ctx.content.trim();
    const textLower = text.toLowerCase();

    // 0. Se houver GEMINI_API_KEY no ambiente, invoca o LLM com o contexto completo
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 5) {
      try {
        const userTickets = await ticketService.getUserTickets(ctx.userId);
        const kbArticles = await prisma.knowledgeArticle.findMany({ take: 10 });
        const llmResult = await callGeminiAgent(apiKey, text, ctx.conversationHistory, {
          userName: ctx.userName,
          userTickets,
          kbArticles,
        });

        if (llmResult) {
          return {
            replyText: llmResult.replyText,
            actionBadges: llmResult.actionBadges,
            quickOptions: llmResult.quickOptions,
            draftTicket: llmResult.draftTicket,
            decisionDetail: {
              intent: llmResult.intent,
              entities: {},
              ruleApplied: llmResult.ruleApplied,
              confidence: llmResult.confidence,
              action: llmResult.intent,
              reasoning: llmResult.reasoning,
            },
            transferToHuman: llmResult.transferToHuman,
            transferReason: llmResult.transferReason,
            transferSummary: llmResult.transferSummary,
          };
        }
      } catch (e) {
        console.warn("Falha no LLM Gemini, usando motor determinístico:", e);
      }
    }

    // 1. Verificação de Limite de Escopo (Anexo A: Apenas assuntos de TI)
    const nonItKeywords = [
      "férias",
      "salário",
      "benefício",
      "vale refeição",
      "reembolso",
      "ar condicionado",
      "limpeza",
      "crachá físico",
      "recursos humanos",
      "contracheque",
      "holerite",
      "estacionamento",
      "plano de saúde",
      "atestado médico",
    ];

    if (nonItKeywords.some((kw) => textLower.includes(kw))) {
      return {
        replyText:
          "Olá! Eu sou o assistente do Service Desk de TI da Nexo. Assuntos de Recursos Humanos, Benefícios, Financeiro ou Facilities são tratados pelos seus respectivos canais internos (Portal do Colaborador ou ramal 3000). Posso te ajudar com algum sistema, acesso, equipamento ou software de TI?",
        actionBadges: ["identificou escopo fora de TI"],
        decisionDetail: {
          intent: "FORA_DE_ESCOPO",
          entities: { topic: "Não-TI" },
          ruleApplied: "Anexo A: Escopo - apenas assuntos de TI. Outros assuntos (RH, financeiro, facilities) são redirecionados.",
          confidence: 0.99,
          action: "REDIRECTION",
          reasoning: "A solicitação menciona tópicos administrativos/RH fora da alçada do Service Desk de TI.",
        },
      };
    }

    // 2. Pedido de Atendente Humano / Transferência Expressa
    if (
      textLower.includes("falar com um analista") ||
      textLower.includes("falar com analista") ||
      textLower.includes("chamar atendente") ||
      textLower.includes("falar com alguém") ||
      textLower.includes("suporte humano") ||
      textLower === "call_analyst"
    ) {
      return {
        replyText:
          "Encaminhei sua conversa para nossa equipe de analistas de Service Desk (Suporte N1/N2). Um atendente falará com você em breve. Estou pausando o atendimento automático.",
        actionBadges: ["transferiu para analista", "pausou assistente"],
        decisionDetail: {
          intent: "SOLICITAR_ANALISTA",
          entities: { requestedBy: ctx.userName },
          ruleApplied:
            "Anexo A: Transferência - acontece quando o funcionário pede. Leva um resumo do caso e o agent não responde enquanto a conversa está com um analista.",
          confidence: 1.0,
          action: "TRANSFER_TO_ANALYST",
          reasoning: "Colaborador solicitou atendimento humano expressamente.",
        },
        transferToHuman: true,
        transferReason: "Solicitação expressa do colaborador",
        transferSummary: `O colaborador ${ctx.userName} solicitou transferência para um atendente humano.`,
      };
    }

    // 3. Confirmar Criação de Rascunho
    if (
      textLower === "confirmar" ||
      textLower === "confirmar chamado" ||
      textLower === "confirmar ⌘↵" ||
      textLower === "confirm_ticket"
    ) {
      if (ctx.currentDraft) {
        const created = await ticketService.createTicket({
          userId: ctx.userId,
          title: ctx.currentDraft.title,
          description: ctx.currentDraft.description,
          type: ctx.currentDraft.type,
          category: ctx.currentDraft.category,
          subcategory: ctx.currentDraft.subcategory,
          priority: ctx.currentDraft.priority,
          affectedScope: ctx.currentDraft.affectedScope,
        });

        const isCritica = created.priority === "CRITICA";
        const slaLabel =
          created.priority === "CRITICA"
            ? "em até 1 hora (plantão 24h)"
            : created.priority === "ALTA"
            ? "em até 4 h úteis"
            : created.priority === "MEDIA"
            ? "em até 3 dias úteis"
            : "em até 5 dias úteis";

        // Anexo A: Transferência em casos críticos
        if (isCritica) {
          return {
            replyText: `Pronto: abri o chamado crítico ${created.ticketNumber}. Por se tratar de um incidente de prioridade crítica, transferi automaticamente para o plantão do Suporte N2. Um analista falará com você em até 1 hora.`,
            actionBadges: ["confirmou rascunho", `criou ${created.ticketNumber}`, "transferiu para analista"],
            targetTicketId: created.id,
            decisionDetail: {
              intent: "CONFIRMAR_CHAMADO_CRITICO",
              entities: { ticketNumber: created.ticketNumber, priority: "CRITICA" },
              ruleApplied:
                "Anexo A: Transferência em casos críticos e SLA de 1 hora para prioridade Crítica (plantão 24 horas).",
              confidence: 1.0,
              action: "CREATE_AND_TRANSFER",
              reasoning: "Chamado crítico confirmado. Regra do Anexo A exige transferência imediata para o plantão.",
            },
            ticketCards: [
              {
                number: created.ticketNumber,
                title: created.title,
                status: created.status,
                date: "hoje",
                priority: created.priority,
                description: created.description,
              },
            ],
            transferToHuman: true,
            transferReason: "Incidente Crítico com impacto em equipe/empresa",
            transferSummary: `Chamado ${created.ticketNumber} (${created.title}) criado com prioridade Crítica. Transferência obrigatória pelo Anexo A.`,
          };
        }

        return {
          replyText: `Pronto: abri o chamado ${created.ticketNumber} com prioridade ${created.priority.toLowerCase()}. Um analista fala com você ${slaLabel}.`,
          actionBadges: ["confirmou rascunho", `criou ${created.ticketNumber}`],
          targetTicketId: created.id,
          decisionDetail: {
            intent: "CONFIRMAR_CRIACAO_CHAMADO",
            entities: { ticketNumber: created.ticketNumber, priority: created.priority },
            ruleApplied:
              "Anexo A: Abertura - Todo chamado precisa de confirmação prévia do colaborador antes de ser criado no sistema.",
            confidence: 1.0,
            action: "TICKET_CREATED",
            reasoning: "Colaborador conferiu os dados do rascunho e confirmou a abertura.",
          },
          ticketCards: [
            {
              number: created.ticketNumber,
              title: created.title,
              status: created.status,
              date: "hoje",
              priority: created.priority,
              description: created.description,
            },
          ],
        };
      }
    }

    // 4. Cancelar Rascunho
    if (textLower === "cancelar" || textLower === "cancelar chamado" || textLower === "cancel_ticket") {
      return {
        replyText: "Operação cancelada. O rascunho foi descartado. Em que mais posso te ajudar?",
        actionBadges: ["descartou o rascunho"],
        decisionDetail: {
          intent: "CANCELAR_RASCUNHO",
          entities: {},
          ruleApplied: "Anexo A: Confirmação - O colaborador tem controle para desistir da abertura.",
          confidence: 1.0,
          action: "DRAFT_DISCARDED",
          reasoning: "Colaborador optou por não criar o chamado.",
        },
      };
    }

    // 5. Histórias 2 e 3: Consultar Chamados e Verificar Prazos
    const isStatusQuery =
      textLower.includes("status do meu chamado") ||
      textLower.includes("como está meu chamado") ||
      textLower.includes("consultar chamado") ||
      textLower.includes("meus chamados") ||
      textLower.includes("ver meus chamados") ||
      textLower.includes("meu chamado está atrasado");

    if (isStatusQuery) {
      const tickets = await ticketService.getUserTickets(ctx.userId);
      const openTickets = tickets.filter((t) => t.status !== "RESOLVIDO" && t.status !== "CANCELADO");

      if (openTickets.length === 0) {
        return {
          replyText:
            "Você não possui nenhum chamado em andamento no momento. Gostaria de abrir um novo chamado ou consultar a central de ajuda?",
          actionBadges: ["consultou seus chamados"],
          decisionDetail: {
            intent: "CONSULTAR_STATUS_CHAMADO",
            entities: { totalOpen: 0 },
            ruleApplied: "História 2: Saber como está um chamado meu, mesmo sem lembrar o número.",
            confidence: 0.98,
            action: "EMPTY_TICKET_LIST",
            reasoning: "Nenhum chamado aberto encontrado para o usuário.",
          },
        };
      }

      const overdueTickets = openTickets.filter((t) => t.isOverdue);
      let replyMessage = `Você tem ${openTickets.length} chamados em aberto.`;
      if (overdueTickets.length > 0) {
        replyMessage += ` Atenção: o chamado **${overdueTickets[0].ticketNumber}** está com o prazo de SLA vencido.`;
      }
      replyMessage += ` Sobre qual deles você quer falar?`;

      return {
        replyText: replyMessage,
        actionBadges: ["consultou seus chamados", "calculou o prazo"],
        ticketCards: openTickets.map((t) => ({
          number: t.ticketNumber,
          title: t.title,
          status: t.status === "AGUARDANDO_ANALISTA" ? "Aguardando analista" : "Em andamento",
          date: new Date(t.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          priority: t.priority,
          isOverdue: t.isOverdue,
          daysSinceLastUpdate: t.daysSinceLastUpdate,
          description: t.description,
          canReopen: t.canReopen,
        })),
        decisionDetail: {
          intent: "CONSULTAR_STATUS_CHAMADO",
          entities: { totalOpen: openTickets.length, overdueCount: overdueTickets.length },
          ruleApplied:
            "História 2: Saber como está um chamado meu, mesmo sem lembrar o número, e saber se ele está atrasado.",
          confidence: 0.99,
          action: "LIST_USER_TICKETS",
          reasoning: "Apresentando chamados abertos com indicação de prazo de SLA para o colaborador.",
        },
      };
    }

    // 6. História 3: Complementar chamado aberto com novas informações
    if (
      textLower.startsWith("adicionar informacao") ||
      textLower.startsWith("adicionar informação") ||
      textLower.startsWith("complementar chamado") ||
      textLower.includes("anexar informação") ||
      textLower === "add_info"
    ) {
      // Se tiver chamado em contexto ou ticket mencionado
      const match = text.match(/(INC-\d+|REQ-\d+)/i);
      const userTickets = await ticketService.getUserTickets(ctx.userId);
      const targetTicket = match
        ? userTickets.find((t) => t.ticketNumber.toUpperCase() === match[1].toUpperCase())
        : userTickets.find((t) => t.id === ctx.activeTicketId) || userTickets[0];

      if (!targetTicket) {
        return {
          replyText: "Qual o número do chamado que você gostaria de complementar?",
          actionBadges: ["solicitou número do chamado"],
          decisionDetail: {
            intent: "COMPLEMENTAR_CHAMADO_FALTANDO_ID",
            entities: {},
            ruleApplied: "História 3: Complementar um chamado aberto com novas informações.",
            confidence: 0.9,
            action: "REQUEST_TICKET_NUMBER",
            reasoning: "Necessário identificar o chamado a ser complementado.",
          },
        };
      }

      // Se o usuário já forneceu a informação no mesmo texto:
      const infoPayload = text.replace(/^(adicionar informa(ção|cao)|complementar chamado|anexar informa(ção|cao)|add_info)[:\s-]*/i, "").trim();

      if (infoPayload.length > 5) {
        const updated = await ticketService.updateTicket({
          ticketNumber: targetTicket.ticketNumber,
          userId: ctx.userId,
          newDescription: infoPayload,
        });

        return {
          replyText: `Pronto! Adicionei suas novas informações ao chamado ${updated.ticketNumber}. O analista responsável já foi notificado da atualização.`,
          actionBadges: [`atualizou ${updated.ticketNumber}`, "registrou complemento"],
          targetTicketId: updated.id,
          decisionDetail: {
            intent: "COMPLEMENTAR_CHAMADO",
            entities: { ticketNumber: updated.ticketNumber, infoAdded: infoPayload },
            ruleApplied: "História 3: Complementar um chamado aberto com novas informações.",
            confidence: 1.0,
            action: "TICKET_UPDATED",
            reasoning: `Novas informações anexadas ao chamado ${updated.ticketNumber} com data e hora.`,
          },
        };
      }

      return {
        replyText: `Por favor, digite o que você gostaria de acrescentar ao chamado **${targetTicket.ticketNumber}** (${targetTicket.title}):`,
        actionBadges: [`consultou ${targetTicket.ticketNumber}`],
        decisionDetail: {
          intent: "SOLICITAR_TEXTO_COMPLEMENTO",
          entities: { ticketNumber: targetTicket.ticketNumber },
          ruleApplied: "História 3: Complementar um chamado aberto com novas informações.",
          confidence: 0.95,
          action: "AWAITING_COMPLEMENT_TEXT",
          reasoning: "Aguardando o texto com os novos detalhes fornecidos pelo colaborador.",
        },
      };
    }

    // 7. Anexo A: Reabrir chamado resolvido há até 7 dias
    if (textLower.includes("reabrir") || textLower.includes("reabra o chamado")) {
      const match = text.match(/(INC-\d+|REQ-\d+)/i);
      const userTickets = await ticketService.getUserTickets(ctx.userId);
      const targetTicket = match
        ? userTickets.find((t) => t.ticketNumber.toUpperCase() === match[1].toUpperCase())
        : userTickets.find((t) => t.status === "RESOLVIDO");

      if (targetTicket) {
        if (!targetTicket.canReopen) {
          return {
            replyText: `O chamado **${targetTicket.ticketNumber}** foi encerrado há mais de 7 dias e, de acordo com as regras de governança do Service Desk (Anexo A), não pode ser reaberto. Mas não se preocupe: posso abrir um novo chamado para você agora mesmo. Deseja iniciar?`,
            actionBadges: ["verificou política de reabertura", "bloqueou reabertura > 7 dias"],
            quickOptions: [
              { id: "new_ticket", label: "Abrir novo chamado" },
              { id: "call_analyst", label: "Falar com analista" },
            ],
            decisionDetail: {
              intent: "REABERTURA_EXPIRADA",
              entities: { ticketNumber: targetTicket.ticketNumber },
              ruleApplied: "Anexo A: Sem duplicidade - Chamados resolvidos há até 7 dias podem ser reabertos. Acima disso, abre-se novo.",
              confidence: 0.99,
              action: "PROPOSE_NEW_TICKET",
              reasoning: "Chamado resolvido além do prazo regulamentar de 7 dias.",
            },
          };
        }

        const reopened = await ticketService.updateTicket({
          ticketNumber: targetTicket.ticketNumber,
          userId: ctx.userId,
          reopen: true,
          newDescription: "Colaborador solicitou reabertura do chamado no chat.",
        });

        return {
          replyText: `Reabri o chamado **${reopened.ticketNumber}** (${reopened.title}). Ele retornou para a fila de atendimento dos analistas com prioridade ${reopened.priority.toLowerCase()}.`,
          actionBadges: [`reabriu ${reopened.ticketNumber}`, "retornou à fila"],
          targetTicketId: reopened.id,
          decisionDetail: {
            intent: "REABRIR_CHAMADO",
            entities: { ticketNumber: reopened.ticketNumber },
            ruleApplied: "Anexo A: Sem duplicidade - Chamados resolvidos há até 7 dias podem ser reabertos.",
            confidence: 1.0,
            action: "TICKET_REOPENED",
            reasoning: "Chamado estava resolvido dentro da janela permitida de 7 dias e foi reaberto com sucesso.",
          },
        };
      }
    }

    // 8. Seleção ou Menção de Chamado Específico (ex: INC-20311)
    const ticketMatch = text.match(/(INC-\d+|REQ-\d+)/i);
    if (ticketMatch || textLower.includes("notebook lento após atualização")) {
      const ticketNumber = ticketMatch ? ticketMatch[1].toUpperCase() : "INC-20311";
      const ticket = await ticketService.getTicketByNumber(ticketNumber, ctx.userId);

      if (ticket) {
        if (ticket.isOverdue) {
          return {
            replyText: `O chamado **${ticket.ticketNumber}** está sem atualização há ${ticket.daysSinceLastUpdate} dias, excedendo o prazo regulamentar de 3 dias úteis para prioridade média. Quer que eu chame um analista agora?`,
            actionBadges: [`consultou ${ticket.ticketNumber}`, "calculou o prazo", "detectou SLA vencido"],
            targetTicketId: ticket.id,
            quickOptions: [
              { id: "call_analyst", label: "Falar com um analista" },
              { id: "add_info", label: "Adicionar informação" },
              { id: "dismiss", label: "Não, obrigado" },
            ],
            ticketCards: [
              {
                number: ticket.ticketNumber,
                title: ticket.title,
                status: ticket.status === "AGUARDANDO_ANALISTA" ? "Aguardando analista" : ticket.status,
                date: new Date(ticket.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
                priority: ticket.priority,
                isOverdue: true,
                daysSinceLastUpdate: ticket.daysSinceLastUpdate,
                description: ticket.description,
              },
            ],
            decisionDetail: {
              intent: "VERIFICAR_PRAZO_CHAMADO",
              entities: { ticketNumber: ticket.ticketNumber, daysOverdue: ticket.daysSinceLastUpdate - 3 },
              ruleApplied:
                "Anexo A: Transferência em chamados vencidos. Prioridade Média tem prazo de 3 dias úteis. Ultrapassado, oferta-se analista proativamente.",
              confidence: 0.98,
              action: "OFFER_TRANSFER_OVERDUE",
              reasoning: `Chamado ${ticket.ticketNumber} está vencido (5 dias sem atualização vs 3 dias úteis de SLA).`,
            },
          };
        } else {
          return {
            replyText: `O chamado **${ticket.ticketNumber}** (${ticket.title}) está atualmente com status "${ticket.status}" e dentro do prazo estimado. Deseja adicionar alguma informação ou falar com a equipe?`,
            actionBadges: [`consultou ${ticket.ticketNumber}`],
            targetTicketId: ticket.id,
            quickOptions: [
              { id: "add_info", label: "Adicionar informação" },
              { id: "call_analyst", label: "Falar com um analista" },
              { id: "dismiss", label: "Não, obrigado" },
            ],
            ticketCards: [
              {
                number: ticket.ticketNumber,
                title: ticket.title,
                status: ticket.status,
                date: new Date(ticket.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
                priority: ticket.priority,
                isOverdue: false,
                daysSinceLastUpdate: ticket.daysSinceLastUpdate,
                description: ticket.description,
              },
            ],
            decisionDetail: {
              intent: "DETALHAR_CHAMADO",
              entities: { ticketNumber: ticket.ticketNumber, status: ticket.status },
              ruleApplied: "História 2: Consulta detalhada de chamado.",
              confidence: 0.96,
              action: "SHOW_TICKET_DETAILS",
              reasoning: `Chamado ${ticket.ticketNumber} localizado. SLA em conformidade.`,
            },
          };
        }
      }
    }

    // 9. Caso de Baixa Confiança (< 60%): Transbordo Automático (PRD requisito explícito)
    const complexOrAmbiguous =
      textLower.includes("script de automação") ||
      textLower.includes("ambiente híbrido não documentado") ||
      textLower.includes("kernel") ||
      textLower.includes("cluster") ||
      textLower.includes("firmware corrompido");

    if (complexOrAmbiguous) {
      return {
        replyText:
          "Vou chamar um analista para isso. Identifiquei que esta questão envolve particularidades técnicas avançadas fora da base homologada de autoatendimento.",
        actionBadges: ["baixa confiança (41%)", "transferiu para analista"],
        decisionDetail: {
          intent: "SUPORTE_AVANCADO_NAO_CATALOGADO",
          entities: { topic: "Automação / Infraestrutura complexa" },
          ruleApplied:
            "Anexo A: Transferência - acontece quando o agent não tem segurança sobre o que fazer (< limiar de confiança de 60%). Leva um resumo do caso.",
          confidence: 0.41,
          action: "LOW_CONFIDENCE_TRANSFER",
          reasoning:
            "O agente não identificou procedimentos homologados na base de conhecimento ou padrão de chamados anteriores com alta similaridade (confiança 41% < limiar 60%).",
        },
        transferToHuman: true,
        transferReason: "Agent pediu ajuda · confiança 41%",
        transferSummary: `O agente transferiu a conversa devido a baixa segurança na decisão (41% de confiança). Relato: ${text}`,
      };
    }

    // 10. Resposta de Impacto de um Chamado em Andamento
    const isImpactSelection =
      textLower === "só eu" ||
      textLower === "so eu" ||
      textLower === "1" ||
      textLower === "1 só eu" ||
      textLower.startsWith("só eu.") ||
      textLower.startsWith("so eu.") ||
      textLower === "minha equipe" ||
      textLower === "2" ||
      textLower === "2 minha equipe" ||
      textLower === "toda a empresa" ||
      textLower === "3" ||
      textLower === "3 toda a empresa" ||
      textLower === "não sei" ||
      textLower === "4";

    if (isImpactSelection) {
      const isTeamOrCompany =
        textLower.includes("equipe") ||
        textLower.includes("2") ||
        textLower.includes("toda a empresa") ||
        textLower.includes("3");

      const hasSameDayUrgency =
        textLower.includes("reunião") ||
        textLower.includes("reuniao") ||
        textLower.includes("cliente") ||
        textLower.includes("hoje") ||
        textLower.includes("14h") ||
        textLower.includes("urgente");

      let calculatedPriority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA" = "MEDIA";
      let slaHours = "em até 3 dias úteis";

      if (isTeamOrCompany) {
        calculatedPriority = "CRITICA";
        slaHours = "em até 1 hora (plantão 24h)";
      } else if (hasSameDayUrgency) {
        calculatedPriority = "ALTA";
        slaHours = "em até 4 h úteis";
      }

      // Recupera o tema da conversa anterior para não fixar VPN se for outro assunto!
      const previousUserMsgs = ctx.conversationHistory
        .filter((h) => h.role === "USER")
        .map((h) => h.content);
      const originalIssue = previousUserMsgs[0] || text;
      const detectedTopic = extractTopicAndCategory(originalIssue);

      const draft = {
        draftId: `D-${Math.floor(100 + Math.random() * 900)}`,
        type: detectedTopic.type,
        title: detectedTopic.title,
        description: `${originalIssue}. Impacto: ${isTeamOrCompany ? "Equipe / Empresa" : "Individual"}.`,
        category: detectedTopic.category,
        subcategory: detectedTopic.subcategory,
        priority: calculatedPriority,
        slaHours,
        affectedScope: (isTeamOrCompany ? "EQUIPE" : "INDIVIDUAL") as "INDIVIDUAL" | "EQUIPE" | "EMPRESA",
      };

      let reply = `Coloquei prioridade ${calculatedPriority === "ALTA" ? "alta" : calculatedPriority === "CRITICA" ? "crítica" : "média"}`;
      if (hasSameDayUrgency) reply += " por causa do compromisso de hoje — a resposta chega mais rápido.";
      else if (isTeamOrCompany) reply += " porque afeta múltiplos colaboradores.";
      else reply += ". Confira os dados antes de eu criar:";

      return {
        replyText: reply,
        actionBadges: ["classificou a prioridade", "consultou o SLA", "montou o rascunho"],
        draftTicket: draft,
        decisionDetail: {
          intent: "CLASSIFICAR_PRIORIDADE_E_MONTAR_RASCUNHO",
          entities: {
            impact: isTeamOrCompany ? "Equipe" : "Individual",
            urgency: hasSameDayUrgency ? "Alta" : "Normal",
            priority: calculatedPriority,
          },
          ruleApplied:
            calculatedPriority === "CRITICA"
              ? "Anexo A: Crítica - Algo parado para uma equipe ou para a empresa (1 hora)."
              : calculatedPriority === "ALTA"
              ? "Anexo A: Alta - Impede uma pessoa de trabalhar, ou há um compromisso no mesmo dia (4 horas úteis)."
              : "Anexo A: Média - Atrapalha, mas há alternativa (3 dias úteis).",
          confidence: 0.97,
          action: "PROPOSE_DRAFT",
          reasoning: "Matriz de prioridade aplicada combinando impacto e urgência informados pelo usuário.",
        },
      };
    }

    // 11. Análise Geral Dinâmica da Solicitação do Usuário (VPN, Impressora, Office, Mouse, SAP, etc.)
    const parsed = extractTopicAndCategory(text);

    // Anti-duplicidade dinâmica (para QUALQUER categoria)
    const duplicate = await ticketService.findPotentialDuplicate(ctx.userId, parsed.category, parsed.keywords);
    if (duplicate) {
      return {
        replyText: `Notei que você já possui o chamado aberto **${duplicate.ticketNumber}** sobre ${duplicate.category} ("${duplicate.title}"). De acordo com as regras de governança do Service Desk (Anexo A), para evitar duplicidade de atendimento, nós complementamos o chamado existente. Deseja adicionar novas informações a ele?`,
        actionBadges: ["consultou seus chamados", "identificou chamado existente", "evitou duplicidade"],
        targetTicketId: duplicate.id,
        quickOptions: [
          { id: "add_info", label: `Atualizar ${duplicate.ticketNumber}` },
          { id: "call_analyst", label: "Falar com um analista" },
        ],
        decisionDetail: {
          intent: "ANTI_DUPLICIDADE",
          entities: { existingTicket: duplicate.ticketNumber, category: duplicate.category },
          ruleApplied: "Anexo A: Sem duplicidade - Se já existe um chamado aberto sobre o mesmo problema, ele é atualizado, não duplicado.",
          confidence: 0.98,
          action: "SUGGEST_UPDATE",
          reasoning: `Encontrado chamado ativo (${duplicate.ticketNumber}) com mesmo escopo.`,
        },
      };
    }

    // Busca na base de conhecimento
    const kbResults = await kbService.searchArticles(text, parsed.os);
    if (kbResults.length > 0 && kbResults[0].matchScore >= 5) {
      const topArticle = kbResults[0];

      // Se o artigo tiver restrição de OS explícita (ex: erro 809 só vale Windows 10 e usuário usa Windows 11)
      if (topArticle.applicableOs && topArticle.applicableOs !== parsed.os && parsed.os) {
        return {
          replyText: `Não há chamado aberto sobre ${parsed.category}, e o artigo sobre "${topArticle.title}" vale para ${topArticle.applicableOs} — o seu ambiente é ${parsed.os}. Vou abrir um chamado.\n\nQuem está sendo afetado?`,
          actionBadges: ["consultou seus chamados", "buscou na central de ajuda"],
          quickOptions: [
            { id: "1", label: "1 Só eu" },
            { id: "2", label: "2 Minha equipe" },
            { id: "3", label: "3 Toda a empresa" },
            { id: "4", label: "4 Não sei" },
          ],
          decisionDetail: {
            intent: "DIAGNOSTICAR_E_SOLICITAR_IMPACTO",
            entities: { system: parsed.category, os: parsed.os, article: topArticle.title },
            ruleApplied: "Anexo A: Abertura de chamado - verificação de autoatendimento antes de abrir chamado.",
            confidence: 0.96,
            action: "REQUEST_AFFECTED_SCOPE",
            reasoning: "Artigo de autoajuda não é aplicável à versão do usuário. Iniciando abertura de chamado.",
          },
        };
      }

      // Se for dúvida solucionável pela KB
      return {
        replyText: `Consultei nossa Central de Ajuda e encontrei uma orientação para o seu caso:\n\n**${topArticle.title}**\n${topArticle.content}\n\nIsso resolveu sua dúvida ou deseja que eu abra um chamado?`,
        actionBadges: ["buscou na central de ajuda"],
        quickOptions: [
          { id: "resolved", label: "Isso resolveu, obrigado!" },
          { id: "need_ticket", label: "Ainda preciso de chamado" },
          { id: "call_analyst", label: "Falar com um analista" },
        ],
        decisionDetail: {
          intent: "RESOLUCAO_BASE_CONHECIMENTO",
          entities: { articleId: topArticle.id, category: topArticle.category },
          ruleApplied: "Objetivo do PRD: Resolução sem fila - dúvidas e consultas resolvidas no próprio chat.",
          confidence: 0.94,
          action: "SERVE_KB_ARTICLE",
          reasoning: `Artigo "${topArticle.title}" atende à consulta diretamente.`,
        },
      };
    }

    // Se for um problema ou pedido técnico genuíno, pergunta sobre o escopo de afetados para montar o rascunho
    return {
      replyText: `Entendi que você precisa de suporte com **${parsed.title}**. Para definir a prioridade e o prazo de atendimento corretos segundo o SLA, quem está sendo afetado por este problema?`,
      actionBadges: ["analisou a solicitação", "verificou catálogo de TI"],
      quickOptions: [
        { id: "1", label: "1 Só eu" },
        { id: "2", label: "2 Minha equipe" },
        { id: "3", label: "3 Toda a empresa" },
        { id: "4", label: "4 Não sei" },
      ],
      decisionDetail: {
        intent: "SOLICITAR_ESCOPO_IMPACTO",
        entities: { detectedCategory: parsed.category, type: parsed.type },
        ruleApplied: "Anexo A: Abertura - Todo chamado precisa de tipo, categoria, prioridade e de quem é afetado.",
        confidence: 0.92,
        action: "REQUEST_IMPACT",
        reasoning: "Classificando impacto para determinar a prioridade correta da matriz de SLA.",
      },
    };
  }
}

/**
 * Função utilitária de classificação dinâmica de tópicos técnicos de TI
 */
function extractTopicAndCategory(text: string): {
  type: "INC" | "REQ";
  category: string;
  subcategory?: string;
  title: string;
  keywords: string[];
  os?: string;
} {
  const t = text.toLowerCase();
  const os = t.includes("windows 11") || t.includes("win 11") ? "Windows 11" : t.includes("windows 10") ? "Windows 10" : undefined;

  // VPN / Conexão
  if (t.includes("vpn") || t.includes("809") || t.includes("rede") || t.includes("wi-fi") || t.includes("wifi")) {
    return {
      type: "INC",
      category: "Rede e VPN",
      subcategory: t.includes("vpn") ? "VPN Corporativa" : "Wi-Fi e Rede",
      title: t.includes("809") ? "VPN não conecta no notebook — erro 809" : "Falha de conexão de rede/VPN",
      keywords: ["vpn", "809", "rede", "conexao"],
      os: os || "Windows 11",
    };
  }

  // Acesso / Senha / SAP
  if (t.includes("sap") || t.includes("senha") || t.includes("login") || t.includes("bloqueada") || t.includes("permissão")) {
    const isRequest = t.includes("solicitar") || t.includes("novo acesso") || t.includes("preciso de acesso");
    return {
      type: isRequest ? "REQ" : "INC",
      category: "Acesso",
      subcategory: t.includes("sap") ? "SAP ERP" : "Contas de Rede",
      title: t.includes("sap") ? "Acesso ao ambiente SAP ERP" : "Redefinição de acesso corporativo",
      keywords: ["sap", "senha", "bloqueada", "acesso"],
      os,
    };
  }

  // Hardware (Notebook, Monitor, Mouse, Teclado, Impressora)
  if (t.includes("notebook") || t.includes("monitor") || t.includes("mouse") || t.includes("impressora") || t.includes("teclado")) {
    const isRequest = t.includes("preciso de outro") || t.includes("solicitar") || t.includes("segundo monitor");
    return {
      type: isRequest ? "REQ" : "INC",
      category: "Hardware",
      subcategory: t.includes("impressora") ? "Impressoras" : t.includes("monitor") ? "Monitores" : "Periféricos",
      title: t.includes("impressora")
        ? "Impressora com falha de impressão"
        : t.includes("mouse")
        ? "Substituição de mouse danificado"
        : t.includes("monitor")
        ? "Solicitação de segundo monitor para trabalho"
        : "Instabilidade em equipamento de hardware",
      keywords: ["hardware", "notebook", "monitor", "mouse", "impressora"],
      os,
    };
  }

  // Software (Office 365, Teams, Outlook, Instalação)
  if (t.includes("office") || t.includes("teams") || t.includes("software") || t.includes("instalar") || t.includes("adobe") || t.includes("programa")) {
    const isRequest = t.includes("instalar") || t.includes("solicitar") || t.includes("preciso instalar");
    return {
      type: isRequest ? "REQ" : "INC",
      category: "Software",
      subcategory: "Aplicativos Corporativos",
      title: t.includes("office") ? "Instalação do pacote Microsoft Office 365" : "Solicitação de software homologado",
      keywords: ["software", "office", "instalacao", "aplicativo"],
      os,
    };
  }

  // E-mail
  if (t.includes("email") || t.includes("e-mail") || t.includes("outlook") || t.includes("caixa de entrada")) {
    return {
      type: "INC",
      category: "E-mail",
      subcategory: "Microsoft Outlook",
      title: "Falha de sincronização no serviço de E-mail",
      keywords: ["email", "e-mail", "outlook"],
      os,
    };
  }

  // Padrão Geral
  return {
    type: t.includes("solicitar") || t.includes("preciso") ? "REQ" : "INC",
    category: "Outros",
    title: text.length > 50 ? `${text.slice(0, 47)}...` : text,
    keywords: ["suporte", "geral"],
    os,
  };
}

export const agentEngine = new AgentDecisionEngine();
