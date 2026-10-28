import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentService } from "@/agent/agent-service";

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("nexo_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Sessão não autenticada." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
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
