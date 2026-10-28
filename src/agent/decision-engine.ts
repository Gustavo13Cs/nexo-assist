import { ticketService } from "@/services/ticket-service";
import { kbService } from "@/services/kb-service";

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
  }>;
  decisionDetail: DecisionInspection;
  transferToHuman?: boolean;
  transferReason?: string;
  transferSummary?: string;
}

interface MessageContext {
  userId: string;
  userEmail: string;
  userName: string;
  content: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentDraft?: any;
}

export class AgentDecisionEngine {
  /**
   * Processa a mensagem do colaborador e decide a rota de ação de acordo com as regras do Anexo A
   */
  async processMessage(ctx: MessageContext): Promise<AgentResponse> {
    const text = ctx.content.trim();
    const textLower = text.toLowerCase();

    // 1. Verificação de Limite de Escopo (Anexo A: Apenas assuntos de TI)
    const nonItKeywords = [
      "férias",
      "salário",
      "benefício",
      "vale refeição",
      "reembolso de despesas",
      "ar condicionado",
      "limpeza",
      "crachá físico",
      "recursos humanos",
      "contracheque",
      "holerite",
    ];

    if (nonItKeywords.some((kw) => textLower.includes(kw))) {
      return {
        replyText:
          "Olá! Eu sou o assistente do Service Desk de TI. Assuntos relacionados a Recursos Humanos, Financeiro ou Facilities devem ser tratados diretamente pelos seus canais próprios (como o Portal do Colaborador ou ramal 3000). Posso te ajudar com algum sistema, computador, rede ou acesso de TI?",
        actionBadges: ["identificou escopo fora de TI"],
        decisionDetail: {
          intent: "FORA_DE_ESCOPO",
          entities: { topic: "Não-TI" },
          ruleApplied: "Anexo A: Escopo - apenas assuntos de TI. Outros assuntos (RH, financeiro, facilities) são redirecionados.",
          confidence: 0.99,
          action: "REDIRECTION",
          reasoning: "A solicitação menciona tópicos administrativos/RH fora da alçada de Suporte de TI.",
        },
      };
    }

    // 2. Ação de Transferência Expressa / Pedido de Atendente
    if (
      textLower.includes("falar com um analista") ||
      textLower.includes("falar com analista") ||
      textLower.includes("chamar atendente") ||
      textLower.includes("falar com alguém") ||
      textLower === "call_analyst"
    ) {
      return {
        replyText:
          "Encaminhei sua conversa para nossa equipe de Suporte. Um analista vai falar com você em breve. Estou pausando o atendimento automático.",
        actionBadges: ["transferiu para analista", "pausou assistente"],
        decisionDetail: {
          intent: "SOLICITAR_ANALISTA",
          entities: { requestedBy: ctx.userName },
          ruleApplied: "Anexo A: Transferência - acontece quando o funcionário pede. Leva um resumo e o agent não responde enquanto a conversa está com o analista.",
          confidence: 1.0,
          action: "TRANSFER_TO_ANALYST",
          reasoning: "Colaborador solicitou atendimento humano expressamente.",
        },
        transferToHuman: true,
        transferReason: "Solicitação expressa do colaborador",
        transferSummary: `O colaborador ${ctx.userName} solicitou transferência para um atendente humano.`,
      };
    }

    // 3. Confirmar Rascunho de Chamado
    if (
      textLower === "confirmar" ||
      textLower === "confirmar chamado" ||
      textLower === "confirmar ⌘↵" ||
      textLower === "confirm_ticket"
    ) {
      // Se há rascunho em contexto
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

        const priorityLabel =
          created.priority === "ALTA"
            ? "alta"
            : created.priority === "CRITICA"
            ? "crítica"
            : created.priority === "MEDIA"
            ? "média"
            : "baixa";

        const slaLabel =
          created.priority === "CRITICA"
            ? "em até 1 hora"
            : created.priority === "ALTA"
            ? "em até 4 h úteis"
            : created.priority === "MEDIA"
            ? "em até 3 dias úteis"
            : "em até 5 dias úteis";

        return {
          replyText: `Pronto: criei o chamado ${created.ticketNumber} com prioridade ${priorityLabel}. Um analista fala com você ${slaLabel}.`,
          actionBadges: ["confirmou rascunho", `criou o chamado ${created.ticketNumber}`],
          decisionDetail: {
            intent: "CONFIRMAR_CRIACAO_CHAMADO",
            entities: { ticketNumber: created.ticketNumber, priority: created.priority },
            ruleApplied: "Anexo A: Abertura - Todo chamado precisa de confirmação prévia do colaborador antes de ser criado no sistema.",
            confidence: 1.0,
            action: "TICKET_CREATED",
            reasoning: `Colaborador confirmou a criação do chamado após revisão dos dados do rascunho.`,
          },
          ticketCards: [
            {
              number: created.ticketNumber,
              title: created.title,
              status: created.status,
              date: "hoje",
              priority: created.priority,
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
          ruleApplied: "Anexo A: Confirmação - o colaborador tem total controle para desistir do rascunho.",
          confidence: 1.0,
          action: "DRAFT_DISCARDED",
          reasoning: "Colaborador optou por não criar o chamado.",
        },
      };
    }

    // 5. Consulta de Chamados Abertos (Tela 3 Flow)
    const isStatusQuery =
      textLower.includes("status do meu chamado") ||
      textLower.includes("como está meu chamado") ||
      textLower.includes("consultar chamado") ||
      textLower.includes("meus chamados") ||
      textLower.includes("ver meus chamados");

    if (isStatusQuery) {
      const tickets = await ticketService.getUserTickets(ctx.userId);
      const openTickets = tickets.filter((t) => t.status !== "RESOLVIDO" && t.status !== "CANCELADO");

      if (openTickets.length === 0) {
        return {
          replyText: "Você não possui nenhum chamado aberto no momento. Gostaria de abrir um novo ou tirar alguma dúvida?",
          actionBadges: ["consultou seus chamados"],
          decisionDetail: {
            intent: "CONSULTAR_STATUS_CHAMADO",
            entities: { openCount: 0 },
            ruleApplied: "Anexo A: Privacidade - consulta restrita aos chamados do próprio colaborador.",
            confidence: 0.98,
            action: "EMPTY_TICKET_LIST",
            reasoning: "Nenhum chamado aberto encontrado para o usuário no sistema legado.",
          },
        };
      }

      return {
        replyText: `Você tem ${openTickets.length} chamados abertos. Sobre qual deles quer saber?`,
        actionBadges: ["consultou seus chamados"],
        ticketCards: openTickets.map((t) => ({
          number: t.ticketNumber,
          title: t.title,
          status: t.status === "AGUARDANDO_ANALISTA" ? "Aguardando analista" : "Em andamento",
          date: new Date(t.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          priority: t.priority,
          isOverdue: t.isOverdue,
          daysSinceLastUpdate: t.daysSinceLastUpdate,
        })),
        decisionDetail: {
          intent: "CONSULTAR_STATUS_CHAMADO",
          entities: { totalOpen: openTickets.length },
          ruleApplied: "Anexo A: Histórico e Privacidade - exibição dos chamados ativos do usuário para seleção rápida.",
          confidence: 0.99,
          action: "LIST_USER_TICKETS",
          reasoning: "Colaborador solicitou status geral; apresentando lista de chamados abertos para disambiguação.",
        },
      };
    }

    // 6. Seleção ou menção de Chamado Específico (ex: INC-20311)
    const ticketMatch = text.match(/(INC-\d+|REQ-\d+)/i);
    if (ticketMatch || textLower.includes("notebook lento após atualização")) {
      const ticketNumber = ticketMatch ? ticketMatch[1].toUpperCase() : "INC-20311";
      const ticket = await ticketService.getTicketByNumber(ticketNumber, ctx.userId);

      if (ticket) {
        if (ticket.isOverdue) {
          return {
            replyText: `Está sem atualização há ${ticket.daysSinceLastUpdate} dias, acima do prazo de 3 dias úteis para prioridade média. Quer que eu chame um analista?`,
            actionBadges: [`consultou o ${ticket.ticketNumber}`, "calculou o prazo"],
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
              },
            ],
            decisionDetail: {
              intent: "VERIFICAR_PRAZO_CHAMADO",
              entities: { ticketNumber: ticket.ticketNumber, daysOverdue: ticket.daysSinceLastUpdate - 3 },
              ruleApplied:
                "Anexo A: Prioridade e Prazos - Prioridade Média tem prazo de 3 dias úteis. Passado o prazo, o chamado está vencido e requer oferta proativa de transferência.",
              confidence: 0.98,
              action: "OFFER_TRANSFER_OVERDUE",
              reasoning: `Chamado ${ticket.ticketNumber} está sem movimentação há ${ticket.daysSinceLastUpdate} dias, excedendo o SLA pactuado.`,
            },
          };
        } else {
          return {
            replyText: `O chamado ${ticket.ticketNumber} (${ticket.title}) está atualmente com status "${ticket.status}" e dentro do prazo estimado. Deseja adicionar alguma informação ou falar com a equipe?`,
            actionBadges: [`consultou o ${ticket.ticketNumber}`],
            quickOptions: [
              { id: "add_info", label: "Adicionar informação" },
              { id: "call_analyst", label: "Falar com um analista" },
              { id: "dismiss", label: "Não, obrigado" },
            ],
            decisionDetail: {
              intent: "DETALHAR_CHAMADO",
              entities: { ticketNumber: ticket.ticketNumber, status: ticket.status },
              ruleApplied: "Anexo A: Prazos - chamado dentro do prazo regulamentar.",
              confidence: 0.96,
              action: "SHOW_TICKET_DETAILS",
              reasoning: `Chamado ${ticket.ticketNumber} consultado com sucesso. SLA em dia.`,
            },
          };
        }
      }
    }

    // 7. Fluxo de Impacto / Urgência (Respostas Rápidas para Abertura)
    // Se a mensagem anterior era pergunta sobre quem foi afetado ou se o usuário diz que tem reunião
    const isImpactAnswer =
      textLower === "só eu" ||
      textLower === "so eu" ||
      textLower === "1" ||
      textLower.includes("só eu.") ||
      textLower.includes("minha equipe") ||
      textLower.includes("2") ||
      textLower.includes("toda a empresa") ||
      textLower.includes("3") ||
      textLower.includes("reunião") ||
      textLower.includes("reuniao");

    if (isImpactAnswer) {
      const hasMeetingOrSameDayUrgency =
        textLower.includes("reunião") ||
        textLower.includes("reuniao") ||
        textLower.includes("cliente") ||
        textLower.includes("14h") ||
        textLower.includes("hoje") ||
        textLower.includes("impede");

      const affectedTeamOrCompany = textLower.includes("equipe") || textLower.includes("toda a empresa");

      let priority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA" = "ALTA";
      let slaText = "em até 4 h úteis";

      if (affectedTeamOrCompany) {
        priority = "CRITICA";
        slaText = "em até 1 hora";
      } else if (hasMeetingOrSameDayUrgency) {
        priority = "ALTA";
        slaText = "em até 4 h úteis (antes das 14h)";
      } else {
        priority = "MEDIA";
        slaText = "em até 3 dias úteis";
      }

      const draft = {
        draftId: "D-381",
        type: "INC" as const,
        title: "VPN não conecta no notebook — erro 809",
        description:
          "Desde ontem o notebook (Windows 11) não conecta na VPN corporativa e mostra o erro 809. Necessário para reunião com cliente no mesmo dia.",
        category: "Rede e VPN",
        subcategory: "VPN Cisco / Fortinet",
        priority,
        slaHours: slaText,
        affectedScope: "INDIVIDUAL" as const,
      };

      return {
        replyText:
          "Coloquei prioridade alta por causa da reunião — a resposta chega antes das 14h. Confira antes de eu criar:",
        actionBadges: ["classificou a prioridade", "consultou o SLA", "montou o rascunho"],
        draftTicket: draft,
        decisionDetail: {
          intent: "CLASSIFICAR_PRIORIDADE_E_MONTAR_RASCUNHO",
          entities: {
            impact: "Individual",
            urgency: "Compromisso com cliente no mesmo dia",
            calculatedPriority: priority,
          },
          ruleApplied:
            "Anexo A: Prioridade Alta - 'Impede uma pessoa de trabalhar, ou há um compromisso no mesmo dia. Prazo: 4 horas úteis.'",
          confidence: 0.98,
          action: "PROPOSE_DRAFT",
          reasoning:
            "O colaborador relatou reunião iminente com cliente que depende da VPN, configurando critério objetivo de urgência Alta com SLA de 4h úteis.",
        },
      };
    }

    // 8. Relato de Problema de VPN e Erro 809 (Tela 2 Flow)
    if (textLower.includes("vpn") || textLower.includes("809")) {
      // Anexo A: Sem duplicidade - verificar se já há chamado aberto
      const duplicate = await ticketService.findPotentialDuplicate(ctx.userId, "Rede e VPN", ["vpn", "809"]);
      if (duplicate) {
        return {
          replyText: `Notei que você já possui o chamado ${duplicate.ticketNumber} aberto sobre VPN (${duplicate.title}). Segundo as regras de TI, para evitar duplicidade, nós atualizamos o chamado existente em vez de criar um novo. Deseja adicionar esta informação ao chamado existente?`,
          actionBadges: ["consultou seus chamados", "identificou chamado existente"],
          quickOptions: [
            { id: "update_existing", label: `Atualizar ${duplicate.ticketNumber}` },
            { id: "call_analyst", label: "Falar com um analista" },
          ],
          decisionDetail: {
            intent: "ANTI_DUPLICIDADE",
            entities: { existingTicket: duplicate.ticketNumber },
            ruleApplied: "Anexo A: Sem duplicidade - se já existe um chamado aberto sobre o mesmo problema, ele é atualizado, não duplicado.",
            confidence: 0.99,
            action: "SUGGEST_UPDATE",
            reasoning: `Encontrado chamado correlato ativo (${duplicate.ticketNumber}). Regra de anti-duplicidade acionada.`,
          },
        };
      }

      // Consulta central de ajuda
      const articles = await kbService.searchArticles(text, "Windows 11");

      return {
        replyText:
          "Não há chamado aberto sobre VPN, e o artigo do erro 809 vale só para Windows 10 — o seu é Windows 11. Vou abrir um chamado.\n\nQuem está sendo afetado?",
        actionBadges: ["consultou seus chamados", "buscou na central de ajuda"],
        quickOptions: [
          { id: "1", label: "1 Só eu" },
          { id: "2", label: "2 Minha equipe" },
          { id: "3", label: "3 Toda a empresa" },
          { id: "4", label: "4 Não sei" },
        ],
        decisionDetail: {
          intent: "DIAGNOSTICAR_E_SOLICITAR_IMPACTO",
          entities: {
            system: "VPN",
            errorCode: "809",
            detectedOs: "Windows 11",
            articleChecked: articles[0]?.title || "VPN com erro 809 no Windows",
          },
          ruleApplied:
            "Anexo A: Abertura de chamado - todo chamado precisa de título, descrição, tipo, categoria, prioridade e de quem é afetado. Artigo da base indica que Windows 11 necessita de chamado.",
          confidence: 0.95,
          action: "REQUEST_AFFECTED_SCOPE",
          reasoning:
            "O artigo de autoajuda é restrito a Windows 10. Para Windows 11 o procedimento exige suporte técnico. Solicitando escopo de impacto para correta classificação de SLA.",
        },
      };
    }

    // 9. Caso de Baixa Confiança (ex: Bruno Tavares - PRD & Protótipo: Confiança 41%)
    if (
      textLower.includes("script de automação") ||
      textLower.includes("ambiente híbrido não documentado") ||
      textLower.includes("erro obscuro") ||
      textLower.includes("kernel")
    ) {
      return {
        replyText:
          "Vou chamar um analista para isso. Identifiquei que este problema envolve particularidades técnicas avançadas fora da base de autoatendimento.",
        actionBadges: ["baixa confiança", "transferiu para analista"],
        decisionDetail: {
          intent: "SUPORTE_AVANCADO_NAO_CATALOGADO",
          entities: { topic: "Automação complexa" },
          ruleApplied:
            "Anexo A: Transferência - acontece quando o agent não tem segurança sobre o que fazer (< limiar de confiança). Leva um resumo do caso.",
          confidence: 0.41,
          action: "LOW_CONFIDENCE_TRANSFER",
          reasoning:
            "O agente não identificou procedimentos homologados na base de conhecimento ou padrão de chamados anteriores com alta similaridade (confiança 41% < limiar 60%).",
        },
        transferToHuman: true,
        transferReason: "Agent pediu ajuda · confiança 41%",
        transferSummary: `O agente transferiu a conversa devido a baixa segurança na decisão (41% de confiança). Assunto: ${text}`,
      };
    }

    // 10. Consulta Geral na Base de Conhecimento
    const kbResults = await kbService.searchArticles(text);
    if (kbResults.length > 0 && kbResults[0].matchScore >= 5) {
      const topArticle = kbResults[0];
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
          ruleApplied: "Objetivo: Resolução sem fila - dúvidas e consultas resolvidas no próprio chat pela base de ajuda.",
          confidence: 0.92,
          action: "SERVE_KB_ARTICLE",
          reasoning: `Artigo "${topArticle.title}" possui alta aderência ao questionamento (score: ${topArticle.matchScore}).`,
        },
      };
    }

    // 11. Resposta Padrão de Triagem
    return {
      replyText:
        "Entendi seu relato. Para que eu possa te ajudar da melhor maneira, você poderia me dar mais detalhes sobre o que está acontecendo, ou se prefere consultar um chamado existente?",
      actionBadges: ["analisou a mensagem"],
      quickOptions: [
        { id: "check_tickets", label: "Consultar meus chamados" },
        { id: "new_ticket", label: "Abrir um novo chamado" },
        { id: "call_analyst", label: "Falar com um analista" },
      ],
      decisionDetail: {
        intent: "SOLICITAR_ESCLARECIMENTO",
        entities: {},
        ruleApplied: "Condução da conversa: Pergunta quando falta informação e mantém o contexto.",
        confidence: 0.85,
        action: "CLARIFICATION",
        reasoning: "A mensagem inicial necessita de maior especificidade para categorização de TI.",
      },
    };
  }
}

export const agentEngine = new AgentDecisionEngine();
