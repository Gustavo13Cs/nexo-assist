import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentService } from "@/agent/agent-service";

export async function POST(req: NextRequest) {
  try {
    const { content, draftPayload, userId: requestedUserId } = await req.json();

    const userIdCookie = req.cookies.get("nexo_user_id")?.value;
    const targetUserId = requestedUserId || userIdCookie;

    let user = targetUserId ? await prisma.user.findUnique({ where: { id: targetUserId } }) : null;
    if (!user) {
      user = await prisma.user.findFirst({ where: { email: "ana.souza@nexo.com.br" } });
    }

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Conteúdo da mensagem é obrigatório." }, { status: 400 });
    }

    const result = await agentService.sendMessage(user.id, content, draftPayload);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json({ error: error.message || "Erro ao processar mensagem." }, { status: 500 });
  }
}
