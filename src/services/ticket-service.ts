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

// Matriz de prazos segundo Anexo A
export function calculateSlaDeadline(priority: string): Date {
  const now = new Date();
  switch (priority.toUpperCase()) {
    case "CRITICA":
      // 1 hora
      return new Date(now.getTime() + 1 * 60 * 60 * 1000);
    case "ALTA":
      // 4 horas úteis (simplificado para 4 horas)
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case "MEDIA":
      // 3 dias úteis (3 * 24h)
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    case "BAIXA":
    default:
      // 5 dias úteis (5 * 24h)
      return new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  }
}

class LegacyTicketService {
  private simulateLegacyFlakiness: boolean = false;

  constructor() {
    this.simulateLegacyFlakiness = process.env.SIMULATE_LEGACY_FLAKINESS === "true";
  }

  private async checkLegacyHealth() {
    // Simula instabilidade esporádica descrita no PRD:
    // "O sistema de chamados é legado e, de vez em quando, fica indisponível por alguns segundos."
    if (this.simulateLegacyFlakiness && Math.random() < 0.1) {
      await new Promise((r) => setTimeout(r, 1200));
      throw new Error("LEGACY_SYSTEM_TIMEOUT: O sistema legado de chamados não respondeu a tempo (504).");
    }
  }

  /**
   * Consulta os chamados de um funcionário específico (respeitando privacidade do Anexo A)
   */
  async getUserTickets(userId: string): Promise<TicketSummary[]> {
    await this.checkLegacyHealth();

    const tickets = await prisma.ticket.findMany({
      where: { userId },
      include: { assignedTo: true },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    return tickets.map((t) => {
      const isOverdue =
        t.status !== "RESOLVIDO" &&
        t.status !== "CANCELADO" &&
        new Date(t.slaDeadline).getTime() < now.getTime();

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
        isOverdue,
        daysSinceLastUpdate,
        lastUpdate: t.lastUpdate,
        createdAt: t.createdAt,
        canReopen,
      };
    });
  }

  /**
   * Consulta um chamado específico por número (com verificação de privacidade)
   */
  async getTicketByNumber(ticketNumber: string, requestingUserId?: string): Promise<TicketSummary | null> {
    await this.checkLegacyHealth();

    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      include: { assignedTo: true, user: true },
    });

    if (!ticket) return null;

    // Anexo A: Informações de um chamado só podem ser passadas a quem o abriu (salvo se analista)
    if (requestingUserId && ticket.userId !== requestingUserId) {
      const requester = await prisma.user.findUnique({ where: { id: requestingUserId } });
      if (requester?.role !== "ANALYST") {
        throw new Error("PRIVACY_VIOLATION: Você não tem permissão para visualizar chamados de outro colaborador.");
      }
    }

    const now = new Date();
    const isOverdue =
      ticket.status !== "RESOLVIDO" &&
      ticket.status !== "CANCELADO" &&
      new Date(ticket.slaDeadline).getTime() < now.getTime();

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
      isOverdue,
      daysSinceLastUpdate,
      lastUpdate: ticket.lastUpdate,
      createdAt: ticket.createdAt,
      canReopen: ticket.status === "RESOLVIDO" && daysSinceResolved <= 7,
    };
  }

  /**
   * Verifica se já existe um chamado aberto similar para o mesmo usuário (Anexo A: Sem duplicidade)
   */
  async findPotentialDuplicate(userId: string, category: string, keywords: string[]): Promise<TicketSummary | null> {
    const userTickets = await this.getUserTickets(userId);
    const openTickets = userTickets.filter((t) => t.status !== "RESOLVIDO" && t.status !== "CANCELADO");

    for (const ticket of openTickets) {
      if (ticket.category.toLowerCase() === category.toLowerCase()) {
        const textToMatch = `${ticket.title} ${ticket.description}`.toLowerCase();
        const matches = keywords.some((kw) => textToMatch.includes(kw.toLowerCase()));
        if (matches) return ticket;
      }
    }

    return null;
  }

  /**
   * Cria um novo chamado no sistema legado após confirmação do rascunho
   */
  async createTicket(dto: CreateTicketDTO): Promise<TicketSummary> {
    await this.checkLegacyHealth();

    // Gerar número único (ex: INC-20520 ou REQ-10450)
    const count = await prisma.ticket.count();
    const prefix = dto.type === "REQ" ? "REQ" : "INC";
    const baseNumber = prefix === "REQ" ? 10450 : 20520;
    const ticketNumber = `${prefix}-${baseNumber + count}`;

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
  }

  /**
   * Atualiza chamado existente com novas informações ou reabertura (Anexo A)
   */
  async updateTicket(dto: UpdateTicketDTO): Promise<TicketSummary> {
    await this.checkLegacyHealth();

    const existing = await prisma.ticket.findUnique({
      where: { ticketNumber: dto.ticketNumber },
    });

    if (!existing) {
      throw new Error(`Chamado ${dto.ticketNumber} não encontrado.`);
    }

    if (existing.userId !== dto.userId) {
      throw new Error("PRIVACY_VIOLATION: Você não tem permissão para alterar este chamado.");
    }

    let updatedDescription = existing.description;
    if (dto.newDescription) {
      const timestamp = new Date().toLocaleString("pt-BR");
      updatedDescription += `\n\n[Atualização em ${timestamp} pelo colaborador]: ${dto.newDescription}`;
    }

    let newStatus = dto.status || existing.status;
    let resolvedAt = existing.resolvedAt;

    if (dto.reopen) {
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
      isOverdue: false,
      daysSinceLastUpdate: 0,
      lastUpdate: updated.lastUpdate,
      createdAt: updated.createdAt,
      canReopen: false,
    };
  }
}

export const ticketService = new LegacyTicketService();
