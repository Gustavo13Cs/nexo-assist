import { NextRequest, NextResponse } from "next/server";
import { analystService } from "@/services/analyst-service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    let analystId = body.analystId;

    if (!analystId) {
      const analyst = await prisma.user.findFirst({ where: { role: "ANALYST" } });
      analystId = analyst?.id;
    }

    if (!analystId) {
      return NextResponse.json({ error: "Analista não especificado." }, { status: 400 });
    }

    const updated = await analystService.assumeConversation(id, analystId);
    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
