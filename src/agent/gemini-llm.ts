import { GoogleGenAI, Type } from "@google/genai";

export interface LLMDecisionOutput {
  intent: string;
  scope: "IT" | "NON_IT";
  confidence: number;
  reasoning: string;
  actionBadges: string[];
  ruleApplied: string;
  replyText: string;
  quickOptions?: { id: string; label: string }[];
  draftTicket?: {
    draftId: string;
    type: "INC" | "REQ";
    title: string;
    description: string;
    category: string;
    subcategory?: string;
    priority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
    slaHours: string;
    affectedScope: "INDIVIDUAL" | "EQUIPE" | "EMPRESA";
  };
  transferToHuman?: boolean;
  transferReason?: string;
  transferSummary?: string;
}

export async function callGeminiAgent(
  apiKey: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: {
    userName: string;
    userTickets: any[];
    kbArticles: any[];
  }
): Promise<LLMDecisionOutput | null> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Você é o Nexo Assist, o agent de atendimento do Service Desk de TI da Nexo (empresa com 2.000 funcionários).
Sua missão:
1. Resolução sem fila: responda dúvidas usando a Central de Ajuda quando possível.
2. Chamados bem abertos: crie rascunho com tipo (INC/REQ), categoria correta, prioridade segundo as regras e sem duplicidade.
3. Transparência: explique claramente suas ações, intenções, regra aplicada e confiança.

REGRAS OBRIGATÓRIAS DO SERVICE DESK (ANEXO A):
- Tipos: INC (incidente, algo quebrou/não funciona) ou REQ (requisição de equipamento, software ou acesso).
- Categorias permitidas: "Acesso", "Rede e VPN", "Hardware", "Software", "E-mail", "Outros".
- Escopo: APENAS TI. Se for RH (férias, salário, benefícios), financeiro ou facilities, recuse educadamente e redirecione.
- Anti-Duplicidade: Se o usuário já tiver chamado aberto sobre o mesmo problema, proponha atualizar o chamado em vez de criar novo.
- Reabertura: Chamados resolvidos há até 7 dias podem ser reabertos.
- Confirmação prévia: NUNCA crie o chamado de imediato; sempre monte um rascunho (draftTicket) e peça confirmação.
- Prioridade e SLA:
  * Crítica: Algo parado para uma equipe ou para a empresa -> 1 hora (plantão 24h). Transfira para analista!
  * Alta: Impede uma pessoa de trabalhar, ou há compromisso/reunião no mesmo dia -> 4 horas úteis.
  * Média: Atrapalha, mas há alternativa -> 3 dias úteis.
  * Baixa: Pedidos e melhorias sem urgência -> 5 dias úteis.
- Transferência para analista: Transfira se o usuário pedir, se o chamado estiver vencido, se for crítico, ou se sua confiança for baixa (< 0.60).

DADOS DO CONTEXTO DO USUÁRIO:
Nome: ${context.userName}
Chamados abertos do usuário: ${JSON.stringify(context.userTickets)}
Artigos da Central de Ajuda: ${JSON.stringify(context.kbArticles.map((a) => ({ title: a.title, content: a.content, os: a.applicableOs })))}

HISTÓRICO DA CONVERSA:
${conversationHistory.map((h) => `${h.role}: ${h.content}`).join("\n")}

Retorne SEMPRE um JSON rigoroso conforme o esquema especificado.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `Mensagem atual do usuário: "${userMessage}"` }] },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING },
            scope: { type: Type.STRING, enum: ["IT", "NON_IT"] },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            actionBadges: { type: Type.ARRAY, items: { type: Type.STRING } },
            ruleApplied: { type: Type.STRING },
            replyText: { type: Type.STRING },
            quickOptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                },
                required: ["id", "label"],
              },
            },
            draftTicket: {
              type: Type.OBJECT,
              properties: {
                draftId: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["INC", "REQ"] },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                subcategory: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ["CRITICA", "ALTA", "MEDIA", "BAIXA"] },
                slaHours: { type: Type.STRING },
                affectedScope: { type: Type.STRING, enum: ["INDIVIDUAL", "EQUIPE", "EMPRESA"] },
              },
              required: ["draftId", "type", "title", "description", "category", "priority", "slaHours", "affectedScope"],
            },
            transferToHuman: { type: Type.BOOLEAN },
            transferReason: { type: Type.STRING },
            transferSummary: { type: Type.STRING },
          },
          required: ["intent", "scope", "confidence", "reasoning", "actionBadges", "ruleApplied", "replyText"],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text) as LLMDecisionOutput;
      return parsed;
    }
    return null;
  } catch (err: any) {
    console.warn("Gemini LLM call failed, falling back to local reasoning engine:", err?.message || err);
    return null;
  }
}
