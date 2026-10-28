import { NextRequest, NextResponse } from "next/server";
import { analystService } from "@/services/analyst-service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { content, analystId: requestedAnalystId } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Conteúdo obrigatório." }, { status: 400 });
    }

    let analystId = requestedAnalystId;
    if (!analystId) {
      const analyst = await prisma.user.findFirst({ where: { role: "ANALYST" } });
      analystId = analyst?.id;
    }

    const message = await analystService.sendAnalystMessage(id, analystId, content);
    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
