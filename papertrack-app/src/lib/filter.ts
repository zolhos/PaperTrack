import { SpotifyEpisode } from "./spotify";

/**
 * Static Whitelist of academic/scientific Spotify Show IDs.
 * These are pre-approved educational, scientific, and institutional podcasts.
 */
export const WHITELISTED_SHOW_IDS = new Set<string>([
  "3H7R1v3D5t7wE9xYZaBcdE", // Example: Scicast
  "2n75O1Uf8K0s1oIvx7q2uG", // Example: Dragões de Garagem
  "4zG9eA9N9cKqG4Xq18rTzA", // Example: Fronteiras da Ciência (UFRGS)
  "5WJvjG0a1QpAqy48fK1qJd", // Example: Naruhodo!
  "0y1MvE599r313L7tW81H1l", // Example: Science Vs
  "7jKo3K3b610F5Kz85H8Q0M", // Example: Huberman Lab
]);

/**
 * Keywords that indicate scientific, educational, or academic relevance.
 */
export const ACADEMIC_KEYWORDS = [
  "ciência", "científico", "pesquisa", "universidade", "professor", "professora",
  "doutor", "doutora", "acadêmico", "estudo", "artigo", "tese", "dissertação",
  "história oral", "entrevista", "painel", "debate", "laboratório", "descoberta",
  "genética", "tecnologia", "física", "química", "biologia", "astronomia",
  "divulgação científica", "educador", "educação", "teoria", "método", "análise",
  "dados", "pesquisador", "pesquisadora", "instituto", "epistemologia"
];

/**
 * Keywords that represent entertainment, commercial noise, or low-relevance topics.
 */
export const EXCLUDED_KEYWORDS = [
  "fofoca", "humor", "comédia", "piada", "futebol", "bbb", "gameplay",
  "react", "cupom de desconto", "patrocínio", "promoção", "videogame",
  "fantasias", "novela", "horóscopo", "signos", "astrologia", "meme",
  "fofocas", "reality show"
];

export interface ScoredEpisode {
  episode: SpotifyEpisode;
  score: number;
  isWhitelisted: boolean;
  matchedKeywords: string[];
}

/**
 * Evaluates an episode and returns a score representing its academic relevance.
 */
export function scoreEpisode(episode: SpotifyEpisode): ScoredEpisode {
  let score = 0;
  const matchedKeywords: string[] = [];
  const isWhitelisted = episode.show?.id ? WHITELISTED_SHOW_IDS.has(episode.show.id) : false;

  // 1. Whitelist bonus
  if (isWhitelisted) {
    score += 100;
  }

  const title = episode.name.toLowerCase();
  const description = episode.description.toLowerCase();
  const showName = (episode.show?.name || "").toLowerCase();

  // 2. Add score for Academic Keywords
  for (const keyword of ACADEMIC_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(title)) {
      score += 15;
      matchedKeywords.push(keyword);
    } else if (regex.test(description)) {
      score += 5;
      matchedKeywords.push(keyword);
    }
  }

  // 3. Deduct score for Excluded Keywords
  for (const keyword of EXCLUDED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(title)) {
      score -= 50;
    } else if (regex.test(description)) {
      score -= 20;
    }
  }

  // 4. Boost show name relevance if it contains university/science terms
  if (showName.includes("universidade") || showName.includes("uf") || showName.includes("lab") || showName.includes("science")) {
    score += 30;
  }

  return {
    episode,
    score,
    isWhitelisted,
    matchedKeywords: Array.from(new Set(matchedKeywords)), // Deduplicate matches
  };
}

/**
 * Filters a list of episodes to return only those of high academic relevance.
 * Minimum score defaults to 5 to weed out pure noise, unless they search explicitly for a whitelisted show.
 */
export function filterAndRankEpisodes(
  episodes: SpotifyEpisode[],
  minScore = 5
): ScoredEpisode[] {
  return episodes
    .map((ep) => scoreEpisode(ep))
    .filter((scored) => scored.isWhitelisted || scored.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
