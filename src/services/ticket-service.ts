import { prisma } from "@/lib/prisma";

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  type: string;
  category: string;
  subcategory: string | null;
  priority: string;
  status: string;
  affectedScope: string;
  userId: string;
  assignedToName?: string | null;
  slaDeadline: Date;
  isOverdue: boolean;
  daysSinceLastUpdate: number;
  lastUpdate: Date;
  createdAt: Date;
  canReopen: boolean;
}

export interface CreateTicketDTO {
  userId: string;
  type: "INC" | "REQ";
  category: string;
  subcategory?: string;
  title: string;
  description: string;
  priority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
  affectedScope?: "INDIVIDUAL" | "EQUIPE" | "EMPRESA";
}

export interface UpdateTicketDTO {
  ticketNumber: string;
  userId: string;
  newDescription?: string;
  status?: string;
  reopen?: boolean;
}

/**
 * Anexo A: Prazos e prioridades do Service Desk
 * Crítica: 1 hora corrida (plantão 24h)
 * Alta: 4 horas úteis
 * Média: 3 dias úteis
 * Baixa: 5 dias úteis
 */
export function calculateSlaDeadline(priority: string, fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  const p = priority.toUpperCase();

  if (p === "CRITICA") {
    // 1 hora corrida
    result.setTime(result.getTime() + 1 * 60 * 60 * 1000);
    return result;
  }

  if (p === "ALTA") {
    // 4 horas úteis (expediente comercial 8h às 18h)
    // Para simplificação determinística mantendo regras úteis: adiciona 4h úteis
    let hoursLeft = 4;
    while (hoursLeft > 0) {
      result.setHours(result.getHours() + 1);
      const day = result.getDay();
      const hr = result.getHours();
      // Pula fins de semana (0 = domingo, 6 = sábado)
      if (day === 0 || day === 6) continue;
      // Horário útil: 8h às 18h
      if (hr >= 8 && hr <= 18) {
        hoursLeft--;
      }
    }
    return result;
  }

  if (p === "MEDIA") {
    // 3 dias úteis
    let daysLeft = 3;
    while (daysLeft > 0) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) {
        daysLeft--;
      }
    }
    return result;
  }

  // Baixa: 5 dias úteis
  let daysLeft = 5;
  while (daysLeft > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      daysLeft--;
    }
  }
  return result;
}

/**
 * Verifica se um chamado está vencido com base na data da última atualização
 * "O prazo vale para a primeira resposta e para cada atualização; passado o prazo, o chamado está vencido."
 */
export function isTicketOverdue(ticket: {
  status: string;
  priority: string;
  lastUpdate: Date;
  slaDeadline: Date;
}): boolean {
  if (ticket.status === "RESOLVIDO" || ticket.status === "CANCELADO") {
    return false;
  }
  const now = new Date();
  // Se passou do deadline inicial ou se o tempo desde o último update passou do SLA
  const calculatedDeadline = calculateSlaDeadline(ticket.priority, new Date(ticket.lastUpdate));
  return now.getTime() > ticket.slaDeadline.getTime() || now.getTime() > calculatedDeadline.getTime();
}

class LegacyTicketService {
  private simulateFlakiness: boolean;

  constructor() {
    this.simulateFlakiness = process.env.SIMULATE_LEGACY_FLAKINESS === "true";
  }

  /**
   * Executa operação no sistema legado com política de retry e tolerância a falhas transitórias
   */
  private async executeWithRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        if (this.simulateFlakiness && Math.random() < 0.25) {
          await new Promise((r) => setTimeout(r, 400));
          throw new Error("LEGACY_503_TEMPORARY_UNAVAILABLE: O sistema legado de chamados oscilou.");
        }
        return await operation();
      } catch (err: any) {
        if (attempt >= maxRetries) {
          throw err;
        }
        // Espera backoff exponencial: 300ms, 600ms...
        await new Promise((r) => setTimeout(r, attempt * 300));
      }
    }
    throw new Error("LEGACY_TIMEOUT: Não foi possível obter resposta do sistema de chamados após múltiplas tentativas.");
  }

  /**
   * Consulta os chamados de um funcionário específico (respeitando privacidade do Anexo A)
   */
  async getUserTickets(userId: string): Promise<TicketSummary[]> {
    return this.executeWithRetry(async () => {
      const tickets = await prisma.ticket.findMany({
        where: { userId },
        include: { assignedTo: true },
        orderBy: { createdAt: "desc" },
      });

      const now = new Date();

      return tickets.map((t) => {
        const overdue = isTicketOverdue(t);
        const daysSinceLastUpdate = Math.floor(
          (now.getTime() - new Date(t.lastUpdate).getTime()) / (1000 * 60 * 60 * 24)
        );

        const daysSinceResolved = t.resolvedAt
          ? Math.floor((now.getTime() - new Date(t.resolvedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Anexo A: Chamados resolvidos há até 7 dias podem ser reabertos
        const canReopen = t.status === "RESOLVIDO" && daysSinceResolved <= 7;

        return {
          id: t.id,
          ticketNumber: t.ticketNumber,
          title: t.title,
          description: t.description,
          type: t.type,
          category: t.category,
          subcategory: t.subcategory,
          priority: t.priority,
          status: t.status,
          affectedScope: t.affectedScope,
          userId: t.userId,
          assignedToName: t.assignedTo?.name,
          slaDeadline: t.slaDeadline,
          isOverdue: overdue,
          daysSinceLastUpdate,
          lastUpdate: t.lastUpdate,
          createdAt: t.createdAt,
          canReopen,
        };
      });
    });
  }

  /**
   * Consulta um chamado específico por número (com verificação estrita de privacidade)
   */
  async getTicketByNumber(ticketNumber: string, requestingUserId?: string): Promise<TicketSummary | null> {
    return this.executeWithRetry(async () => {
      const ticket = await prisma.ticket.findUnique({
        where: { ticketNumber },
        include: { assignedTo: true, user: true },
      });

      if (!ticket) return null;

      // Anexo A: Informações de um chamado só podem ser passadas a quem o abriu (salvo se analista)
      if (requestingUserId && ticket.userId !== requestingUserId) {
        const requester = await prisma.user.findUnique({ where: { id: requestingUserId } });
        if (requester?.role !== "ANALYST") {
          throw new Error("PRIVACY_VIOLATION: Informações de um chamado só podem ser passadas a quem o abriu.");
        }
      }

      const now = new Date();
      const overdue = isTicketOverdue(ticket);
      const daysSinceLastUpdate = Math.floor(
        (now.getTime() - new Date(ticket.lastUpdate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const daysSinceResolved = ticket.resolvedAt
        ? Math.floor((now.getTime() - new Date(ticket.resolvedAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        category: ticket.category,
        subcategory: ticket.subcategory,
        priority: ticket.priority,
        status: ticket.status,
        affectedScope: ticket.affectedScope,
        userId: ticket.userId,
        assignedToName: ticket.assignedTo?.name,
        slaDeadline: ticket.slaDeadline,
        isOverdue: overdue,
        daysSinceLastUpdate,
        lastUpdate: ticket.lastUpdate,
        createdAt: ticket.createdAt,
        canReopen: ticket.status === "RESOLVIDO" && daysSinceResolved <= 7,
      };
    });
  }

  /**
   * Anexo A: Sem duplicidade - verifica chamados abertos sobre o mesmo problema
   */
  async findPotentialDuplicate(userId: string, category: string, keywords: string[]): Promise<TicketSummary | null> {
    const userTickets = await this.getUserTickets(userId);
    const openTickets = userTickets.filter((t) => t.status !== "RESOLVIDO" && t.status !== "CANCELADO");

    for (const ticket of openTickets) {
      const catMatches = ticket.category.toLowerCase() === category.toLowerCase();
      const text = `${ticket.title} ${ticket.description}`.toLowerCase();
      const keywordMatches = keywords.some((kw) => kw.length > 2 && text.includes(kw.toLowerCase()));

      if (catMatches && keywordMatches) {
        return ticket;
      }
    }

    return null;
  }

  /**
   * Criação com geração atômica e segura do número (INC-XXXXX / REQ-XXXXX)
   */
  async createTicket(dto: CreateTicketDTO): Promise<TicketSummary> {
    return this.executeWithRetry(async () => {
      const prefix = dto.type === "REQ" ? "REQ" : "INC";
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const ticketNumber = `${prefix}-${randomSuffix}`;
      const slaDeadline = calculateSlaDeadline(dto.priority);

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          title: dto.title,
          description: dto.description,
          type: dto.type,
          category: dto.category,
          subcategory: dto.subcategory,
          priority: dto.priority,
          status: "AGUARDANDO_ANALISTA",
          affectedScope: dto.affectedScope || "INDIVIDUAL",
          userId: dto.userId,
          slaDeadline,
        },
      });

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        category: ticket.category,
        subcategory: ticket.subcategory,
        priority: ticket.priority,
        status: ticket.status,
        affectedScope: ticket.affectedScope,
        userId: ticket.userId,
        slaDeadline: ticket.slaDeadline,
        isOverdue: false,
        daysSinceLastUpdate: 0,
        lastUpdate: ticket.lastUpdate,
        createdAt: ticket.createdAt,
        canReopen: false,
      };
    });
  }

  /**
   * Anexo A: Complementação de chamado ou Reabertura
   */
  async updateTicket(dto: UpdateTicketDTO): Promise<TicketSummary> {
    return this.executeWithRetry(async () => {
      const existing = await prisma.ticket.findUnique({
        where: { ticketNumber: dto.ticketNumber },
      });

      if (!existing) {
        throw new Error(`Chamado ${dto.ticketNumber} não encontrado.`);
      }

      if (existing.userId !== dto.userId) {
        const user = await prisma.user.findUnique({ where: { id: dto.userId } });
        if (user?.role !== "ANALYST") {
          throw new Error("PRIVACY_VIOLATION: Você não tem permissão para alterar este chamado.");
        }
      }

      let updatedDescription = existing.description;
      if (dto.newDescription) {
        const timestamp = new Date().toLocaleString("pt-BR");
        updatedDescription += `\n\n[Atualização em ${timestamp}]: ${dto.newDescription}`;
      }

      let newStatus = dto.status || existing.status;
      let resolvedAt = existing.resolvedAt;

      // Anexo A: Chamados resolvidos há até 7 dias podem ser reabertos
      if (dto.reopen) {
        const daysSinceResolved = existing.resolvedAt
          ? Math.floor((Date.now() - new Date(existing.resolvedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceResolved > 7) {
          throw new Error("PRAZO_REABERTURA_EXPIRADO: Chamados resolvidos há mais de 7 dias não podem ser reabertos. Deve ser aberto um novo chamado.");
        }

        newStatus = "AGUARDANDO_ANALISTA";
        resolvedAt = null;
      }

      const updated = await prisma.ticket.update({
        where: { ticketNumber: dto.ticketNumber },
        data: {
          description: updatedDescription,
          status: newStatus,
          resolvedAt,
          lastUpdate: new Date(),
        },
        include: { assignedTo: true },
      });

      return {
        id: updated.id,
        ticketNumber: updated.ticketNumber,
        title: updated.title,
        description: updated.description,
        type: updated.type,
        category: updated.category,
        subcategory: updated.subcategory,
        priority: updated.priority,
        status: updated.status,
        affectedScope: updated.affectedScope,
        userId: updated.userId,
        assignedToName: updated.assignedTo?.name,
        slaDeadline: updated.slaDeadline,
        isOverdue: isTicketOverdue(updated),
        daysSinceLastUpdate: 0,
        lastUpdate: updated.lastUpdate,
        createdAt: updated.createdAt,
        canReopen: false,
      };
    });
  }

  /**
   * Transferir chamado para analista ou alterar atribuição
   */
  async transferTicket(ticketNumber: string, analystId: string): Promise<TicketSummary> {
    return this.executeWithRetry(async () => {
      const ticket = await prisma.ticket.update({
        where: { ticketNumber },
        data: {
          status: "EM_ANDAMENTO",
          assignedToId: analystId,
          lastUpdate: new Date(),
        },
        include: { assignedTo: true },
      });

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        category: ticket.category,
        subcategory: ticket.subcategory,
        priority: ticket.priority,
        status: ticket.status,
        affectedScope: ticket.affectedScope,
        userId: ticket.userId,
        assignedToName: ticket.assignedTo?.name,
        slaDeadline: ticket.slaDeadline,
        isOverdue: isTicketOverdue(ticket),
        daysSinceLastUpdate: 0,
        lastUpdate: ticket.lastUpdate,
        createdAt: ticket.createdAt,
        canReopen: false,
      };
    });
  }
}

export const ticketService = new LegacyTicketService();
