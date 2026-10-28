import { NextRequest, NextResponse } from "next/server";
import { ticketService } from "@/services/ticket-service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdCookie = req.cookies.get("nexo_user_id")?.value;
    const requestedUserId = searchParams.get("userId") || userIdCookie;

    let user = requestedUserId ? await prisma.user.findUnique({ where: { id: requestedUserId } }) : null;
    if (!user) {
      user = await prisma.user.findFirst({ where: { email: "ana.souza@nexo.com.br" } });
    }

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    const tickets = await ticketService.getUserTickets(user.id);
    return NextResponse.json({ tickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...dto } = body;

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
