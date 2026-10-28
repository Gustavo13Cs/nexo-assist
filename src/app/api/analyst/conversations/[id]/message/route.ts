import { NextRequest, NextResponse } from "next/server";
import { analystService } from "@/services/analyst-service";
import { requireAnalyst } from "@/lib/auth-helper";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAnalyst(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Conteúdo da resposta é obrigatório." }, { status: 400 });
    }

    const message = await analystService.sendAnalystMessage(id, auth.user!.id, content);
    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
