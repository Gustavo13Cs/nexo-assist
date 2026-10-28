import { prisma } from "@/lib/prisma";

export interface ArticleResult {
  id: string;
  title: string;
  content: string;
  category: string;
  applicableOs?: string | null;
  matchScore: number;
}

export class KnowledgeBaseService {
  async searchArticles(query: string, userOs?: string): Promise<ArticleResult[]> {
    const articles = await prisma.knowledgeArticle.findMany();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .map((w) => w.replace(/[.,?!]/g, ""));

    const scored: ArticleResult[] = [];

    for (const article of articles) {
      let score = 0;
      const titleLower = article.title.toLowerCase();
      const contentLower = article.content.toLowerCase();
      const tagsLower = article.tags.toLowerCase();

      // Pontuação por palavras-chave
      for (const word of queryWords) {
        if (titleLower.includes(word)) score += 5;
        if (tagsLower.includes(word)) score += 3;
        if (contentLower.includes(word)) score += 1;
      }

      // Verificação de sistema operacional compatível
      if (userOs && article.applicableOs) {
        if (userOs.toLowerCase() !== article.applicableOs.toLowerCase()) {
          // Ex: se o artigo é só para Windows 10 e o usuário usa Windows 11
          score = Math.max(0, score - 2);
        } else {
          score += 4;
        }
      }

      if (score > 0) {
        scored.push({
          id: article.id,
          title: article.title,
          content: article.content,
          category: article.category,
          applicableOs: article.applicableOs,
          matchScore: score,
        });
      }
    }

    return scored.sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const kbService = new KnowledgeBaseService();
