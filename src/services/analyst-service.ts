import { prisma } from "@/lib/prisma";
import { ticketService } from "./ticket-service";

export interface ConversationFilterDTO {
  filter: "all" | "for_you" | "with_agent" | "my";
  analystId: string;
  search?: string;
}

export class AnalystService {
  /**
   * Lista as conversas do console com base nas abas/filtros
   */
  async listConversations(params: ConversationFilterDTO) {
    const { filter, analystId, search } = params;

    const whereClause: any = {};

    switch (filter) {
      case "for_you":
        // Conversas aguardando atendimento humano
        whereClause.status = "WAITING_HUMAN";
        break;
      case "with_agent":
        // Conversas ativas com o bot
        whereClause.status = "AGENT_ACTIVE";
        break;
      case "my":
        // Conversas que este analista assumiu
        whereClause.assignedAnalystId = analystId;
        whereClause.status = "HUMAN_ACTIVE";
        break;
      case "all":
      default:
        // Todas as conversas abertas e recentes
        break;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { ticket: { ticketNumber: { contains: q } } },
        { ticket: { title: { contains: q } } },
      ];
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        user: true,
        ticket: true,
        assignedAnalyst: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Última mensagem para preview
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Contadores para as abas
    const counts = {
      all: await prisma.conversation.count(),
      for_you: await prisma.conversation.count({ where: { status: "WAITING_HUMAN" } }),
      with_agent: await prisma.conversation.count({ where: { status: "AGENT_ACTIVE" } }),
      my: await prisma.conversation.count({
        where: { assignedAnalystId: analystId, status: "HUMAN_ACTIVE" },
      }),
    };

    return {
      conversations: conversations.map((c) => {
        const lastMsg = c.messages[0];
        let tagLabel = "Agent atendendo";
        let tagType: "info" | "warning" | "transfer" | "success" = "info";

        if (c.status === "WAITING_HUMAN") {
          if (c.confidence && c.confidence < 0.6) {
            tagLabel = `Agent pediu ajuda · confiança ${Math.round(c.confidence * 100)}%`;
            tagType = "warning";
          } else if (c.ticket) {
            tagLabel = `Transferida · ${c.ticket.ticketNumber}`;
            tagType = "transfer";
          } else {
            tagLabel = "Transferida · contato em 25 min";
            tagType = "transfer";
          }
        } else if (c.status === "HUMAN_ACTIVE") {
          tagLabel = "Você está atendendo";
          tagType = "success";
        } else if (c.status === "RESOLVED") {
          tagLabel = "Resolvida";
          tagType = "success";
        }

        return {
          id: c.id,
          user: {
            id: c.user.id,
            name: c.user.name,
            email: c.user.email,
            department: c.user.department,
            initials: c.user.initials,
          },
          status: c.status,
          tagLabel,
          tagType,
          confidence: c.confidence,
          ticketNumber: c.ticket?.ticketNumber,
          lastMessageText: lastMsg ? lastMsg.content : "Início da conversa",
          lastMessageTime: lastMsg
            ? new Date(lastMsg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            : "",
          updatedAt: c.updatedAt,
        };
      }),
      counts,
    };
  }

  /**
   * Obtém detalhes completos de uma conversa e chamados do colaborador
   */
  async getConversationDetails(conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: true,
        ticket: true,
        assignedAnalyst: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) throw new Error("Conversa não encontrada.");

    // Busca histórico de chamados do colaborador (respeitando privacidade - visão analista)
    const allUserTickets = await ticketService.getUserTickets(conversation.userId);

    const relatedTicket = conversation.ticket
      ? allUserTickets.find((t) => t.id === conversation.ticketId)
      : null;

    const openTickets = allUserTickets.filter(
      (t) => t.status !== "RESOLVIDO" && t.status !== "CANCELADO" && t.id !== conversation.ticketId
    );

    const closedTickets = allUserTickets.filter((t) => t.status === "RESOLVIDO" || t.status === "CANCELADO");

    return {
      conversation,
      user: conversation.user,
      relatedTicket,
      ticketsSummary: {
        openCount: allUserTickets.filter((t) => t.status !== "RESOLVIDO" && t.status !== "CANCELADO").length,
        closedCount: closedTickets.length,
        relatedTicket,
        otherOpenTickets: openTickets,
        closedTickets: closedTickets.slice(0, 5),
      },
    };
  }

  /**
   * Analista assume a conversa (pausa o agent)
   */
  async assumeConversation(conversationId: string, analystId: string) {
    const analyst = await prisma.user.findUnique({ where: { id: analystId } });
    if (!analyst) throw new Error("Analista não encontrado.");

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { ticket: true },
    });
    if (!conv) throw new Error("Conversa não encontrada.");

    const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Atualiza conversa
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: "HUMAN_ACTIVE",
        assignedAnalystId: analystId,
        updatedAt: new Date(),
      },
    });

    // Registra mensagem de sistema
    await prisma.message.create({
      data: {
        conversationId,
        senderRole: "SYSTEM",
        senderName: "Sistema",
        content: `${analyst.name} assumiu · agent pausado · ${nowTime}`,
      },
    });

    // Se houver chamado vinculado, atualiza status para em atendimento
    if (conv.ticketId) {
      await prisma.ticket.update({
        where: { id: conv.ticketId },
        data: {
          status: "EM_ANDAMENTO",
          assignedToId: analystId,
          lastUpdate: new Date(),
        },
      });
    }

    return updated;
  }

  /**
   * Envia mensagem do analista para o colaborador
   */
  async sendAnalystMessage(conversationId: string, analystId: string, content: string) {
    const analyst = await prisma.user.findUnique({ where: { id: analystId } });
    if (!analyst) throw new Error("Analista não encontrado.");

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderRole: "ANALYST",
        senderName: analyst.name,
        content,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return message;
  }

  /**
   * Analista devolve conversa ao Nexo Assist
   */
  async returnToAgent(conversationId: string) {
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: "AGENT_ACTIVE",
        assignedAnalystId: null,
        updatedAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        conversationId,
        senderRole: "SYSTEM",
        senderName: "Sistema",
        content: `Atendimento devolvido ao Nexo Assist`,
      },
    });

    return updated;
  }

  /**
   * Analista encerra a conversa
   */
  async closeConversation(conversationId: string) {
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: "RESOLVED",
        updatedAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        conversationId,
        senderRole: "SYSTEM",
        senderName: "Sistema",
        content: `Atendimento encerrado pelo suporte.`,
      },
    });

    return updated;
  }
}

export const analystService = new AnalystService();
