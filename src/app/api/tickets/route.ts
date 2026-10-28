import { NextRequest, NextResponse } from "next/server";
import { ticketService } from "@/services/ticket-service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userIdCookie = req.cookies.get("nexo_user_id")?.value;
    if (!userIdCookie) {
      return NextResponse.json({ error: "Sessão não autenticada." }, { status: 401 });
    }

    const sessionUser = await prisma.user.findUnique({ where: { id: userIdCookie } });
    if (!sessionUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");

    let targetUserId = sessionUser.id;
    if (requestedUserId && requestedUserId !== sessionUser.id) {
      if (sessionUser.role !== "ANALYST") {
        return NextResponse.json(
          { error: "PRIVACY_VIOLATION: Você não tem permissão para visualizar chamados de outro colaborador." },
          { status: 403 }
        );
      }
      targetUserId = requestedUserId;
    }

    const tickets = await ticketService.getUserTickets(targetUserId);
    return NextResponse.json({ tickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userIdCookie = req.cookies.get("nexo_user_id")?.value;
    if (!userIdCookie) {
      return NextResponse.json({ error: "Sessão não autenticada." }, { status: 401 });
    }

    const body = await req.json();
    const { action, ...dto } = body;

    // Força o userId do usuário autenticado para evitar spoofing
    dto.userId = userIdCookie;

    if (action === "update") {
      const updated = await ticketService.updateTicket(dto);
      return NextResponse.json({ success: true, ticket: updated });
    } else {
      const created = await ticketService.createTicket(dto);
      return NextResponse.json({ success: true, ticket: created });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
