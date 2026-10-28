import { prisma } from "@/lib/prisma";
import { agentEngine, AgentResponse } from "./decision-engine";

export class AgentService {
  /**
   * Obtém ou inicializa a conversa ativa para o usuário
   */
  async getOrCreateActiveConversation(userId: string) {
    let conversation = await prisma.conversation.findFirst({
      where: {
        userId,
        status: { in: ["AGENT_ACTIVE", "WAITING_HUMAN", "HUMAN_ACTIVE"] },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        user: true,
        ticket: true,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          status: "AGENT_ACTIVE",
          messageCount: 0,
        },
        include: {
          messages: true,
          user: true,
          ticket: true,
        },
      });
    }

    return conversation;
  }

  /**
   * Envia uma mensagem no chat
   */
  async sendMessage(userId: string, content: string, draftPayload?: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Usuário não encontrado.");

    const conversation = await this.getOrCreateActiveConversation(userId);

    // Verificação de limite de 30 mensagens por sessão (Requisito 2 do PRD)
    if (conversation.messageCount >= 30) {
      throw new Error(
        "SESSION_LIMIT_EXCEEDED: Esta sessão atingiu o limite de 30 mensagens. Por favor, encerre ou inicie um novo atendimento."
      );
    }

    // 1. Gravar mensagem do usuário
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderRole: "USER",
        senderName: user.name,
        content,
      },
    });

    // Anexo A: "o agent não responde enquanto a conversa está com um analista"
    if (conversation.status === "WAITING_HUMAN" || conversation.status === "HUMAN_ACTIVE") {
      // Atualiza apenas a contagem e data
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messageCount: conversation.messageCount + 1,
          updatedAt: new Date(),
        },
      });

      return {
        userMessage,
        agentMessage: null,
        status: conversation.status,
        agentPaused: true,
        messageCount: conversation.messageCount + 1,
      };
    }

    // 2. Processar decisão através do Decision Engine
    const history = conversation.messages.map((m) => ({
      role: m.senderRole,
      content: m.content,
    }));

    const decision: AgentResponse = await agentEngine.processMessage({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      content,
      conversationHistory: history,
      currentDraft: draftPayload,
      activeTicketId: conversation.ticketId,
    });

    // 3. Gravar resposta do agente com metadados estruturados de visibilidade
    const agentMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderRole: "AGENT",
        senderName: "Nexo Assist",
        content: decision.replyText,
        actionBadges: decision.actionBadges ? JSON.stringify(decision.actionBadges) : null,
        quickOptions: decision.quickOptions ? JSON.stringify(decision.quickOptions) : null,
        draftTicket: decision.draftTicket ? JSON.stringify(decision.draftTicket) : null,
        ticketCards: decision.ticketCards ? JSON.stringify(decision.ticketCards) : null,
        decisionDetail: decision.decisionDetail ? JSON.stringify(decision.decisionDetail) : null,
      },
    });

    let newStatus = conversation.status;
    let transferReason = conversation.transferReason;
    let transferSummary = conversation.transferSummary;

    if (decision.transferToHuman) {
      newStatus = "WAITING_HUMAN";
      transferReason = decision.transferReason || "Transferência automática";
      transferSummary = decision.transferSummary || "Transferido para suporte humano.";

      // Adiciona mensagem de sistema informando a transferência
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderRole: "SYSTEM",
          senderName: "Sistema",
          content: `Transferida para Suporte N2 · ${new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
        },
      });
    }

    // Atualizar conversa
    const updatedConv = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: newStatus,
        ticketId: decision.targetTicketId || conversation.ticketId,
        transferReason,
        transferSummary,
        confidence: decision.decisionDetail.confidence,
        messageCount: conversation.messageCount + 2, // Mensagem do user + agent
        updatedAt: new Date(),
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return {
      userMessage,
      agentMessage,
      conversation: updatedConv,
      status: updatedConv.status,
      messageCount: updatedConv.messageCount,
      agentPaused: newStatus === "WAITING_HUMAN",
    };
  }
}

export const agentService = new AgentService();
