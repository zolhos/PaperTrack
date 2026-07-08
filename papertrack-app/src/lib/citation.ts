import { SpotifyEpisode } from "./spotify";

/**
 * Utility functions for date parsing and translation.
 */
const MONTHS_APA = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

const MONTHS_ABNT = [
  "jan.", "fev.", "mar.", "abr.", "maio", "jun.",
  "jul.", "ago.", "set.", "out.", "nov.", "dez."
];

/**
 * Parses a Spotify release date string (YYYY-MM-DD, YYYY-MM, or YYYY) into components.
 */
function parseReleaseDate(dateStr: string): { year: string; monthNameAPA: string; monthNameABNT: string; day: string } {
  const parts = dateStr.split("-");
  const year = parts[0] || new Date().getFullYear().toString();
  let monthNameAPA = "";
  let monthNameABNT = "";
  let day = "";

  if (parts.length > 1) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      monthNameAPA = MONTHS_APA[monthIdx];
      monthNameABNT = MONTHS_ABNT[monthIdx];
    }
  }

  if (parts.length > 2) {
    day = parseInt(parts[2], 10).toString();
  }

  return { year, monthNameAPA, monthNameABNT, day };
}

/**
 * Formats access date for ABNT (today's date by default).
 */
function getAbntAccessDate(date = new Date()): string {
  const day = date.getDate();
  const monthIdx = date.getMonth();
  const year = date.getFullYear();
  return `${day} ${MONTHS_ABNT[monthIdx]} ${year}`;
}

/**
 * Formats a podcast host/author's name for citation.
 * If the host name looks like a Person Name (First Last), converts it to "LAST, First".
 * If it's a corporate/podcast name (e.g. Scicast), converts to uppercase for ABNT.
 */
export function formatHostForAbnt(publisher: string): string {
  const clean = publisher.trim();
  const words = clean.split(/\s+/);
  
  if (words.length === 2) {
    // Looks like "First Last" -> "LAST, First"
    return `${words[1].toUpperCase()}, ${words[0]}`;
  } else if (words.length === 3 && words[1].length <= 2) {
    // Looks like "First M. Last" -> "LAST, First M."
    return `${words[2].toUpperCase()}, ${words[0]} ${words[1]}`;
  }
  
  // Default: Corporate / Podcast name in uppercase
  return clean.toUpperCase();
}

/**
 * Formats a host name for APA citation (e.g. "Last, F. M." or "Show Name").
 */
export function formatHostForApa(publisher: string): string {
  const clean = publisher.trim();
  const words = clean.split(/\s+/);

  if (words.length >= 2 && words.length <= 3) {
    const last = words[words.length - 1];
    const initials = words
      .slice(0, words.length - 1)
      .map((w) => `${w[0].toUpperCase()}.`)
      .join(" ");
    return `${last}, ${initials}`;
  }

  return clean;
}

/**
 * Generates an ABNT citation string.
 * Example:
 * PIRULA. Evolução Humana e Genômica. Canal do Pirula. [Podcast]. Publicadora: Spotify, 12 out. 2023. Disponível em: <URL>. Acesso em: 8 jul. 2026.
 */
export function generateAbntCitation(episode: SpotifyEpisode): string {
  const title = episode.name.toUpperCase();
  const host = episode.show?.publisher || episode.show?.name || "Apresentador Desconhecido";
  const { year, monthNameABNT, day } = parseReleaseDate(episode.release_date);
  
  const dateFormatted = day && monthNameABNT 
    ? `${day} ${monthNameABNT} ${year}` 
    : monthNameABNT 
      ? `${monthNameABNT} ${year}` 
      : year;

  const url = episode.external_urls.spotify;
  const accessDate = getAbntAccessDate();

  return `${title}. [Locução de]: ${host}. [S. l.]: Spotify, ${dateFormatted}. *Podcast*. Disponível em: <${url}>. Acesso em: ${accessDate}.`;
}

/**
 * Generates an APA citation string.
 * Example:
 * Pirula (Host). (2023, outubro 12). Evolução Humana e Genômica [Audio podcast episode]. In Canal do Pirula. Spotify. URL
 */
export function generateApaCitation(episode: SpotifyEpisode): string {
  const rawHost = episode.show?.publisher || episode.show?.name || "Spotify";
  const host = formatHostForApa(rawHost);
  const title = episode.name;
  const showName = episode.show?.name || "Podcast";
  const { year, monthNameAPA, day } = parseReleaseDate(episode.release_date);

  const dateFormatted = day && monthNameAPA 
    ? `${year}, ${monthNameAPA} ${day}` 
    : monthNameAPA 
      ? `${year}, ${monthNameAPA}` 
      : year;

  const url = episode.external_urls.spotify;

  return `${host} (Host). (${dateFormatted}). ${title} [Audio podcast episode]. In ${showName}. Spotify. ${url}`;
}
