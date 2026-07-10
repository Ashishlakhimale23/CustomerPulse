import { prisma } from "../lib/database";
import { SuggestionStatus } from "../generated/prisma/client";

// Small stopword list so common English filler words never become
// "keyword suggestions". Extend as needed - this is deliberately simple
// (no external NLP dependency) since ticket titles/descriptions are short.
const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","to","of","in","on","for","and","or",
  "my","i","it","this","that","with","please","can","you","not","have","has",
  "be","at","from","as","when","after","before","need","help","issue","issues",
  "problem","problems","not","working","cant","can't","unable","getting",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export const keywordService = {
  /**
   * Matches ticket text against the department's Keyword list (by name
   * or synonym), links every match via TicketKeyword, and logs any
   * "interesting" unmatched tokens as KeywordSuggestion candidates for
   * an admin to review/promote later. This is the "increasing keywords
   * over time" logic.
   */
  async extractAndLinkKeywords(params: { ticketId: string; departmentId: string; text: string }) {
    const { ticketId, departmentId, text } = params;
    const tokens = tokenize(text);
    if (tokens.length === 0) return { matched: [], suggested: [] };

    const deptKeywords = await prisma.keyword.findMany({ where: { departmentId } });

    const matched = deptKeywords.filter((kw) => {
      const haystack = [kw.name.toLowerCase(), ...kw.synonyms.map((s) => s.toLowerCase())];
      return tokens.some((t) => haystack.includes(t)) || haystack.some((h) => text.toLowerCase().includes(h));
    });

    if (matched.length > 0) {
      await prisma.ticketKeyword.createMany({
        data: matched.map((kw) => ({ ticketId, keywordId: kw.id })),
        skipDuplicates: true,
      });
    }

    // Tokens that didn't hit any known keyword or synonym become
    // suggestion candidates, with an occurrence counter so admins can
    // sort by "how often are people typing this word".
    const knownTerms = new Set(deptKeywords.flatMap((k) => [k.name.toLowerCase(), ...k.synonyms.map((s) => s.toLowerCase())]));
    const unmatchedTokens = [...new Set(tokens.filter((t) => !knownTerms.has(t)))];

    const suggested = [];
    for (const term of unmatchedTokens) {
      const suggestion = await prisma.keywordSuggestion.upsert({
        where: { departmentId_term: { departmentId, term } },
        update: { occurrenceCount: { increment: 1 } },
        create: { departmentId, term },
      });
      suggested.push(suggestion);
    }

    return { matched, suggested };
  },

  /** Admin-facing: list candidates worth promoting, most frequent first. */
  async listSuggestions(departmentId: string, status: SuggestionStatus = SuggestionStatus.PENDING) {
    return prisma.keywordSuggestion.findMany({
      where: { departmentId, status },
      orderBy: { occurrenceCount: "desc" },
    });
  },

  /**
   * Turns a mined suggestion into a real Keyword and (optionally)
   * immediately grants it to one or more agents as a skill - this is
   * the same mechanism used when an admin manually onboards an agent
   * with keywords, just triggered from a suggestion instead.
   */
  async promoteSuggestion(params: {
    suggestionId: string;
    reviewedById: string;
    name?: string;
    synonyms?: string[];
    grantToUserIds?: string[];
  }) {
    const { suggestionId, reviewedById, name, synonyms = [], grantToUserIds = [] } = params;
    const suggestion = await prisma.keywordSuggestion.findUniqueOrThrow({ where: { id: suggestionId } });

    return prisma.$transaction(async (tx) => {
      const keyword = await tx.keyword.create({
        data: {
          departmentId: suggestion.departmentId,
          name: name ?? suggestion.term,
          synonyms,
        },
      });

      if (grantToUserIds.length > 0) {
        await tx.userKeyword.createMany({
          data: grantToUserIds.map((userId) => ({ userId, keywordId: keyword.id })),
          skipDuplicates: true,
        });
      }

      await tx.keywordSuggestion.update({
        where: { id: suggestionId },
        data: { status: SuggestionStatus.APPROVED, promotedKeywordId: keyword.id, reviewedById },
      });

      return keyword;
    });
  },

  async rejectSuggestion(suggestionId: string, reviewedById: string) {
    return prisma.keywordSuggestion.update({
      where: { id: suggestionId },
      data: { status: SuggestionStatus.REJECTED, reviewedById },
    });
  },

  /** Admin onboarding an agent with initial skills (as you described). */
  async assignSkillsToAgent(userId: string, keywordIds: string[]) {
    return prisma.userKeyword.createMany({
      data: keywordIds.map((keywordId) => ({ userId, keywordId })),
      skipDuplicates: true,
    });
  },
};
