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
    const updated = await analystService.assumeConversation(id, auth.user!.id);
    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
