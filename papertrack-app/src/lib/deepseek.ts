/**
 * DeepSeek API Client for Episode Metadata Extraction & Citation Refinement
 */

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export interface DeepSeekRefinedData {
  apresentador: string;
  entrevistado: string | null;
  local: string;
  produtora: string;
  nota: string | null;
}

export const DEFAULT_SYSTEM_PROMPT = `Você é um assistente especializado em biblioteconomia e normas da ABNT e APA.
Sua tarefa é analisar o título do episódio, o nome do podcast e a descrição do episódio para extrair metadados úteis para citações bibliográficas.

Você deve extrair e retornar um objeto JSON estrito contendo as seguintes chaves:
- "apresentador": O nome completo do apresentador (locutor/host) do episódio. Tente extrair da descrição ou use o nome do canal se não houver um apresentador específico. Se houver mais de um, separe por vírgula. Formate em Title Case (ex: "Carlos Souza").
- "entrevistado": O nome completo do convidado ou entrevistado (se houver). Caso não haja, retorne null.
- "local": A cidade de produção da gravação. Se não for explicitamente mencionada na descrição, use "[S. l.]" (abreviação ABNT para sem local).
- "produtora": A produtora ou publicadora (padrão: "Spotify").
- "nota": Uma frase curta resumindo o formato especial do episódio (ex: "Entrevista especial com a Dra. Ana Silva", "Painel sobre cosmologia") que possa ser inserida antes do link na citação, ou null se não houver.

Regras Estritas:
1. Retorne APENAS o objeto JSON. Não inclua blocos markdown (como \`\`\`json) ou qualquer texto explicativo.
2. Não invente informações fictícias se não existirem na descrição.`;

/**
 * Calls the DeepSeek API to extract structured bibliographic data from episode description.
 */
export async function refineCitationsWithDeepSeek(
  title: string,
  showName: string,
  description: string,
  customApiKey?: string,
  customSystemPrompt?: string
): Promise<DeepSeekRefinedData> {
  // 1. Resolve API Key (Priority: custom key entered in UI -> env variable)
  const apiKey = customApiKey?.trim() || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Nenhuma chave da API do DeepSeek encontrada. Por favor, adicione sua chave nas configurações para usar o refinamento com IA."
    );
  }

  const userContent = `Título do Episódio: ${title}
Nome do Podcast: ${showName}
Descrição: ${description}`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat", // Maps to deepseek-v4-flash
        messages: [
          {
            role: "system",
            content: customSystemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        response_format: {
          type: "json_object",
        },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      let errMsg = `Status ${response.status}`;
      try {
        const errData = await response.json();
        if (errData.error?.message) {
          errMsg += `: ${errData.error.message}`;
        }
      } catch (_) {}
      throw new Error(`Chamada ao DeepSeek falhou: ${errMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da API do DeepSeek.");
    }

    // Strip markdown blocks if returned by the model
    const cleanContent = content
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/, "")
      .trim();

    const parsed: DeepSeekRefinedData = JSON.parse(cleanContent);
    return parsed;
  } catch (error: any) {
    console.error("Erro no DeepSeek API client:", error);
    throw new Error(error.message || "Falha na comunicação com a API do DeepSeek.");
  }
}

/**
 * Re-formats an ABNT citation using the refined metadata from DeepSeek.
 */
export function formatRefinedAbntCitation(
  title: string,
  releaseDate: string,
  url: string,
  refined: DeepSeekRefinedData,
  accessDateFormatted: string
): string {
  const upperTitle = title.toUpperCase();
  const host = refined.apresentador || "Apresentador Desconhecido";
  const local = refined.local || "[S. l.]";
  const publisher = refined.produtora || "Spotify";
  
  // Format release date cleanly
  // Expected releaseDate: e.g., "12 mar. 2026" or "2026"
  const dateFormatted = releaseDate;

  // Add interviewee if present
  const guestPart = refined.entrevistado 
    ? ` Entrevistado(a): ${refined.entrevistado}.` 
    : "";

  // Add note if present
  const notePart = refined.nota 
    ? ` Nota: ${refined.nota}.` 
    : "";

  return `${upperTitle}. [Locução de]: ${host}.${guestPart} ${local}: ${publisher}, ${dateFormatted}. *Podcast*.${notePart} Disponível em: <${url}>. Acesso em: ${accessDateFormatted}.`;
}

/**
 * Re-formats an APA citation using the refined metadata from DeepSeek.
 */
export function formatRefinedApaCitation(
  title: string,
  releaseDateFormatted: string, // Expected: e.g., "2023, outubro 12"
  showName: string,
  url: string,
  refined: DeepSeekRefinedData
): string {
  const host = refined.apresentador || showName;
  
  const guestPart = refined.entrevistado 
    ? ` [Entrevista com ${refined.entrevistado}]` 
    : "";

  return `${host} (Host). (${releaseDateFormatted}). ${title}${guestPart} [Audio podcast episode]. In ${showName}. Spotify. ${url}`;
}

/**
 * Calls DeepSeek to optimize a generic query by adding academic/scientific keywords.
 */
export async function enhanceSearchQuery(
  query: string,
  customApiKey?: string
): Promise<string> {
  const apiKey = customApiKey?.trim() || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Nenhuma chave da API do DeepSeek encontrada. Por favor, adicione sua chave nas configurações para usar a busca melhorada com IA."
    );
  }

  const ENHANCE_SYSTEM_PROMPT = `Você é um assistente de pesquisa científica. Sua tarefa é receber um termo de busca genérico do usuário e retornar uma consulta otimizada (query) para busca de podcasts acadêmicos.
Expanda o termo adicionando palavras-chave científicas correlatas que costumam aparecer no contexto acadêmico. 
Mantenha a consulta simples, sem aspas, operadores lógicos complexos ou explicações adicionais. Retorne apenas os termos de busca otimizados (máximo de 5 a 6 palavras).
Exemplo de entrada: "física"
Exemplo de saída: "física quântica relatividade partículas astrofísica"`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: ENHANCE_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Termo genérico: ${query}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      let errMsg = `Status ${response.status}`;
      try {
        const errData = await response.json();
        if (errData.error?.message) {
          errMsg += `: ${errData.error.message}`;
        }
      } catch (_) {}
      throw new Error(`Chamada ao DeepSeek falhou: ${errMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da API do DeepSeek.");
    }

    return content.trim().replace(/^["']|["']$/g, ""); // Strip any quotes returned by the model
  } catch (error: any) {
    console.error("Erro ao melhorar busca com DeepSeek:", error);
    throw new Error(error.message || "Falha na comunicação com a API do DeepSeek.");
  }
}
