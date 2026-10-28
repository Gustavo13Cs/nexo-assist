import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentService } from "@/agent/agent-service";

export async function GET(req: NextRequest) {
  try {
    const userIdCookie = req.cookies.get("nexo_user_id")?.value;
    let user = userIdCookie ? await prisma.user.findUnique({ where: { id: userIdCookie } }) : null;

    if (!user) {
      user = await prisma.user.findFirst({ where: { email: "ana.souza@nexo.com.br" } });
    }

    if (!user) {
      return NextResponse.json({ error: "Nenhum usuário ativo." }, { status: 401 });
    }

    const conversation = await agentService.getOrCreateActiveConversation(user.id);

    return NextResponse.json({
      user,
      conversation,
      messages: conversation.messages,
      messageCount: conversation.messageCount,
      status: conversation.status,
    });
  } catch (error: any) {
    console.error("Erro ao carregar chat:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
