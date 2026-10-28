import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentService } from "@/agent/agent-service";

export async function POST(req: NextRequest) {
  try {
    const userIdCookie = req.cookies.get("nexo_user_id")?.value;

    if (!userIdCookie) {
      return NextResponse.json({ error: "Sessão não autenticada. Faça login para continuar." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userIdCookie } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não localizado." }, { status: 401 });
    }

    const { content, draftPayload } = await req.json();

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
