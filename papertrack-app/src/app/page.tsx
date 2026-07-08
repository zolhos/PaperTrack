"use client";

import { useEffect, useState, useRef } from "react";
import {
  redirectToSpotifyAuth,
  handleAuthCallback,
  searchSpotifyEpisodes,
  logoutSpotify,
  getValidAccessToken,
  SpotifyEpisode,
} from "../lib/spotify";
import {
  filterAndRankEpisodes,
  scoreEpisode,
  ScoredEpisode,
} from "../lib/filter";
import {
  generateAbntCitation,
  generateApaCitation,
  formatHostForAbnt,
  formatHostForApa,
  parseReleaseDate,
  getAbntAccessDate,
} from "../lib/citation";
import {
  refineCitationsWithDeepSeek,
  formatRefinedAbntCitation,
  formatRefinedApaCitation,
  DeepSeekRefinedData,
  DEFAULT_SYSTEM_PROMPT,
  enhanceSearchQuery,
} from "../lib/deepseek";
import {
  Search,
  BookOpen,
  Copy,
  Check,
  LogOut,
  SlidersHorizontal,
  GraduationCap,
  ExternalLink,
  Loader2,
  ListRestart,
  HelpCircle,
  Hash,
  AlertCircle,
  Settings,
  Sparkles,
  Brain
} from "lucide-react";

export default function Home() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [episodes, setEpisodes] = useState<SpotifyEpisode[]>([]);
  const [scoredEpisodes, setScoredEpisodes] = useState<ScoredEpisode[]>([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // Filters state
  const [minScore, setMinScore] = useState(10);
  const [onlyWhitelisted, setOnlyWhitelisted] = useState(false);
  
  // Citation Modal state
  const [selectedEpisode, setSelectedEpisode] = useState<SpotifyEpisode | null>(null);
  const [copiedAbnt, setCopiedAbnt] = useState(false);
  const [copiedApa, setCopiedApa] = useState(false);

  // DeepSeek AI states
  const [customDeepSeekKey, setCustomDeepSeekKey] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refinedCitations, setRefinedCitations] = useState<Record<string, DeepSeekRefinedData>>({});
  const [refineError, setRefineError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Enhancements states
  const [customWhitelist, setCustomWhitelist] = useState<string[]>([]);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [citationHistory, setCitationHistory] = useState<string[]>([]);
  
  // Search pagination & AI query states
  const [searchOffset, setSearchOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [useAiSearch, setUseAiSearch] = useState(false);
  const [isEnhancingQuery, setIsEnhancingQuery] = useState(false);
  const [enhancedQueryText, setEnhancedQueryText] = useState("");
  const [newWhitelistId, setNewWhitelistId] = useState("");
  
  // Load initial auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if this is an OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        
        if (code) {
          setIsAuthenticating(true);
          const tokens = await handleAuthCallback(code);
          setIsAuthenticating(false);
          
          // Clean URL params
          window.history.replaceState({}, document.title, window.location.pathname);
          
          if (tokens) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setSearchError("Falha na autenticação com o Spotify. Tente novamente.");
          }
          return;
        }
        
        // Regular check
        const token = await getValidAccessToken();
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error("Erro na verificação de autenticação:", error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();

    // Load saved DeepSeek API key from sessionStorage
    const savedKey = sessionStorage.getItem("deepseek_api_key");
    if (savedKey) {
      setCustomDeepSeekKey(savedKey);
    }

    // Load custom whitelist from localStorage
    const savedWhitelist = localStorage.getItem("papertrack_custom_whitelist");
    if (savedWhitelist) {
      try {
        setCustomWhitelist(JSON.parse(savedWhitelist));
      } catch (_) {}
    }

    // Load custom system prompt from localStorage
    const savedPrompt = localStorage.getItem("papertrack_custom_prompt");
    setCustomSystemPrompt(savedPrompt || DEFAULT_SYSTEM_PROMPT);

    // Load citation history from localStorage
    const savedHistory = localStorage.getItem("papertrack_citation_history");
    if (savedHistory) {
      try {
        setCitationHistory(JSON.parse(savedHistory));
      } catch (_) {}
    }
  }, []);

  // Update filtered & ranked episodes when minScore, onlyWhitelisted, customWhitelist, or raw episodes change
  useEffect(() => {
    if (episodes.length > 0) {
      const whitelistSet = new Set(customWhitelist);
      let filtered = episodes.map((ep) => scoreEpisode(ep, whitelistSet));
      
      if (onlyWhitelisted) {
        filtered = filtered.filter((se) => se.isWhitelisted);
      } else {
        filtered = filtered.filter((se) => se.score >= minScore);
      }
      
      filtered.sort((a, b) => b.score - a.score);
      setScoredEpisodes(filtered);
    } else {
      setScoredEpisodes([]);
    }
  }, [episodes, minScore, onlyWhitelisted, customWhitelist]);

  const handleLogin = async () => {
    await redirectToSpotifyAuth();
  };

  const handleLogout = () => {
    logoutSpotify();
    setIsAuthenticated(false);
    setEpisodes([]);
    setScoredEpisodes([]);
  };

  const fetchEpisodes = async (queryToSearch: string, offset: number, append: boolean) => {
    setIsLoadingSearch(true);
    setSearchError("");
    try {
      const results = await searchSpotifyEpisodes(queryToSearch, 10, offset);
      if (append) {
        setEpisodes((prev) => [...prev, ...results]);
      } else {
        setEpisodes(results);
      }
      setHasMore(results.length === 10);
      if (!append && results.length === 0) {
        setSearchError("Nenhum episódio encontrado para a busca especificada.");
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || "Erro desconhecido ao buscar episódios.");
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setEpisodes([]);
    setScoredEpisodes([]);
    setSearchOffset(0);
    setEnhancedQueryText("");
    
    let activeQuery = searchQuery.trim();

    if (useAiSearch) {
      setIsEnhancingQuery(true);
      setSearchError("");
      try {
        const enhanced = await enhanceSearchQuery(activeQuery, customDeepSeekKey);
        setEnhancedQueryText(enhanced);
        activeQuery = enhanced;
      } catch (err: any) {
        console.error(err);
        setSearchError(`Falha ao otimizar consulta com IA: ${err.message}. Prosseguindo com busca original.`);
      } finally {
        setIsEnhancingQuery(false);
      }
    }

    await fetchEpisodes(activeQuery, 0, false);
  };

  const handleLoadMore = async () => {
    const nextOffset = searchOffset + 10;
    setSearchOffset(nextOffset);
    const activeQuery = enhancedQueryText || searchQuery.trim();
    await fetchEpisodes(activeQuery, nextOffset, true);
  };

  const handleCopy = async (text: string, type: "abnt" | "apa") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "abnt") {
        setCopiedAbnt(true);
        setTimeout(() => setCopiedAbnt(false), 2000);
      } else {
        setCopiedApa(true);
        setTimeout(() => setCopiedApa(false), 2000);
      }

      setCitationHistory((prev) => {
        const cleaned = text.trim();
        const filtered = prev.filter((item) => item !== cleaned);
        const updated = [cleaned, ...filtered].slice(0, 20);
        localStorage.setItem("papertrack_citation_history", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Falha ao copiar texto: ", err);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}min`;
    }
    return `${minutes} min`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleSaveDeepSeekKey = (key: string) => {
    sessionStorage.setItem("deepseek_api_key", key.trim());
    setCustomDeepSeekKey(key.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRefineCitation = async (episode: SpotifyEpisode) => {
    setIsRefining(true);
    setRefineError("");
    try {
      const data = await refineCitationsWithDeepSeek(
        episode.name,
        episode.show?.name || "Podcast",
        episode.description,
        customDeepSeekKey,
        customSystemPrompt
      );
      setRefinedCitations((prev) => ({
        ...prev,
        [episode.id]: data,
      }));
    } catch (err: any) {
      console.error(err);
      setRefineError(err.message || "Erro de processamento da IA.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleAddWhitelistId = (showId: string) => {
    const cleaned = showId.trim();
    if (!cleaned) return;
    if (customWhitelist.includes(cleaned)) return;
    const updated = [...customWhitelist, cleaned];
    setCustomWhitelist(updated);
    localStorage.setItem("papertrack_custom_whitelist", JSON.stringify(updated));
  };

  const handleRemoveWhitelistId = (showId: string) => {
    const updated = customWhitelist.filter((id) => id !== showId);
    setCustomWhitelist(updated);
    localStorage.setItem("papertrack_custom_whitelist", JSON.stringify(updated));
  };

  const handleSaveSystemPrompt = (prompt: string) => {
    const cleaned = prompt.trim();
    setCustomSystemPrompt(cleaned);
    localStorage.setItem("papertrack_custom_prompt", cleaned);
  };

  const handleResetSystemPrompt = () => {
    setCustomSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    localStorage.removeItem("papertrack_custom_prompt");
  };

  const handleClearHistory = () => {
    setCitationHistory([]);
    localStorage.removeItem("papertrack_citation_history");
  };

  // Render initial loader
  if (isAuthenticated === null || isAuthenticating) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center bg-[#121212] text-white">
        <Loader2 className="w-12 h-12 text-[#1DB954] animate-spin mb-4" />
        <p className="text-[#b3b3b3] text-lg font-medium">
          {isAuthenticating ? "Conectando ao Spotify..." : "Carregando aplicativo..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow min-h-screen bg-[#121212] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 border-b border-[#2a2a2a] backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#1DB954] p-2 rounded-lg text-black">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">PaperTrack</h1>
            <p className="text-xs text-[#b3b3b3] hidden sm:block">
              Pesquisa e Citação de Ciência Falada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center justify-center p-2 rounded-full border transition duration-300 ${
                showSettings ? "border-[#1DB954] text-[#1DB954]" : "border-[#2a2a2a] hover:border-[#b3b3b3] text-[#b3b3b3] hover:text-white"
              }`}
              title="Configurações da API"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2a2a2a] hover:border-red-500 hover:text-red-500 transition duration-300 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Desconectar</span>
            </button>
          )}
        </div>
      </header>

      {/* SETTINGS PANEL */}
      {showSettings && isAuthenticated && (
        <div className="bg-[#181818] border-b border-[#2a2a2a] px-6 py-6 animate-in slide-in-from-top duration-200">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: API Key & Whitelist */}
            <div className="flex flex-col gap-6">
              {/* DeepSeek API Key */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#1DB954]" /> Chave da API do DeepSeek
                </h3>
                <p className="text-xs text-[#b3b3b3] mb-3">
                  Salva localmente no navegador para chamadas diretas ao DeepSeek AI (refinamento e busca melhorada).
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={customDeepSeekKey}
                    onChange={(e) => setCustomDeepSeekKey(e.target.value)}
                    placeholder={process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ? "Chave local ativa (.env)" : "Insira sua chave (sk-...)"}
                    className="flex-grow bg-[#282828] text-white border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#1DB954]"
                  />
                  <button
                    onClick={() => handleSaveDeepSeekKey(customDeepSeekKey)}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs px-4 py-1.5 rounded-lg transition duration-300 flex items-center justify-center gap-1.5"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Salvo!
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Whitelist */}
              <div className="border-t border-[#2a2a2a] pt-6">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#1DB954]" /> White List Personalizada (IDs de Podcasts)
                </h3>
                <p className="text-xs text-[#b3b3b3] mb-3">
                  Cadastre IDs de shows do Spotify para que recebam o bônus de pontuação (+100) automaticamente.
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newWhitelistId}
                    onChange={(e) => setNewWhitelistId(e.target.value)}
                    placeholder="Cole o ID do show do Spotify"
                    className="flex-grow bg-[#282828] text-white border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#1DB954]"
                  />
                  <button
                    onClick={() => {
                      handleAddWhitelistId(newWhitelistId);
                      setNewWhitelistId("");
                    }}
                    className="bg-white text-black hover:bg-[#b3b3b3] font-bold text-xs px-4 py-1.5 rounded-lg transition duration-300"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Whitelist Show List */}
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3 max-h-40 overflow-y-auto">
                  {customWhitelist.length === 0 ? (
                    <p className="text-xs text-[#7f7f7f] text-center py-2">
                      Sua White List personalizada está vazia.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {customWhitelist.map((id) => (
                        <li key={id} className="flex items-center justify-between text-xs bg-[#181818] px-2.5 py-1.5 rounded border border-[#2a2a2a]">
                          <span className="font-mono text-gray-300 truncate mr-2" title={id}>{id}</span>
                          <button
                            onClick={() => handleRemoveWhitelistId(id)}
                            className="text-red-400 hover:text-red-500 font-bold hover:underline"
                          >
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: System Prompt Editor */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#1DB954]" /> Editor de Prompt do DeepSeek
                </h3>
                <button
                  onClick={handleResetSystemPrompt}
                  className="text-xs text-[#b3b3b3] hover:text-white hover:underline flex items-center gap-1"
                >
                  <ListRestart className="w-3.5 h-3.5" /> Resetar Padrão
                </button>
              </div>
              <p className="text-xs text-[#b3b3b3]">
                Ajuste as instruções de sistema passadas ao modelo de IA para extrair os metadados de citação e formatar as notas explicativas.
              </p>
              <textarea
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                rows={8}
                className="w-full bg-[#282828] text-white border border-[#2a2a2a] rounded-xl p-3 text-xs outline-none focus:border-[#1DB954] resize-none font-mono leading-relaxed"
              />
              <button
                onClick={() => handleSaveSystemPrompt(customSystemPrompt)}
                className="bg-white text-black hover:bg-[#b3b3b3] font-bold text-xs py-2 rounded-xl transition duration-300 self-end px-6"
              >
                Salvar Prompt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-grow flex flex-col items-center px-4 py-8 max-w-6xl w-full mx-auto">
        {!isAuthenticated ? (
          /* LANDING SCREEN (UNAUTHENTICATED) */
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto py-12">
            <GraduationCap className="w-20 h-20 text-[#1DB954] mb-6 animate-pulse" />
            <h2 className="text-4xl font-extrabold sm:text-5xl tracking-tight leading-tight mb-4">
              Transforme Áudios e Podcasts em Citações Acadêmicas
            </h2>
            <p className="text-lg text-[#b3b3b3] mb-8 leading-relaxed">
              O PaperTrack analisa episódios de divulgação científica no Spotify, filtra ruídos e gera referências estruturadas prontas nos padrões <strong>ABNT</strong> e <strong>APA</strong> para seu TCC, artigo ou tese.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mb-10 text-left">
              <div className="p-5 rounded-2xl bg-[#181818] border border-[#2a2a2a]">
                <div className="text-[#1DB954] font-bold text-lg mb-2">01. Conecte</div>
                <p className="text-sm text-[#b3b3b3]">Autentique com sua conta do Spotify de forma segura e com privacidade total.</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#181818] border border-[#2a2a2a]">
                <div className="text-[#1DB954] font-bold text-lg mb-2">02. Filtre</div>
                <p className="text-sm text-[#b3b3b3]">Nossa lógica de relevância separa conteúdos científicos de entretenimento.</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#181818] border border-[#2a2a2a]">
                <div className="text-[#1DB954] font-bold text-lg mb-2">03. Cite</div>
                <p className="text-sm text-[#b3b3b3]">Copie a citação formatada com as regras de tempo e hosts atualizadas.</p>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="flex items-center gap-3 bg-[#1DB954] text-black font-bold text-lg px-8 py-4 rounded-full hover:scale-105 hover:bg-[#1ed760] transition-all duration-300 shadow-lg shadow-[#1db954]/20"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg"
                alt="Spotify logo"
                className="w-6 h-6"
              />
              Entrar com o Spotify
            </button>
            <p className="text-xs text-[#b3b3b3] mt-4">
              Usamos o fluxo seguro PKCE. Nenhuma senha ou secret é compartilhado.
            </p>
          </div>
        ) : (
          /* DASHBOARD (AUTHENTICATED) */
          <div className="w-full flex flex-col gap-8">
            
            {/* SEARCH AND FILTERS */}
            <div className="p-6 rounded-2xl bg-[#181818] border border-[#2a2a2a] shadow-xl">
              <form onSubmit={handleSearch} className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b3b3b3]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Busque por temas (ex: genômica, buraco negro, história oral)..."
                      className="w-full bg-[#282828] text-white border border-transparent rounded-full py-4 pl-12 pr-6 outline-none focus:border-[#1DB954] transition duration-300 font-medium placeholder-[#7f7f7f]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoadingSearch || isEnhancingQuery}
                    className="bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-[#3e3e3e] text-black font-bold px-8 py-4 rounded-full transition duration-300 flex items-center justify-center gap-2"
                  >
                    {isLoadingSearch || isEnhancingQuery ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      "Pesquisar"
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 px-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-300">
                    <input
                      type="checkbox"
                      checked={useAiSearch}
                      onChange={(e) => setUseAiSearch(e.target.checked)}
                      className="rounded border-[#2a2a2a] text-[#1DB954] focus:ring-0 focus:ring-offset-0 bg-[#282828] w-4 h-4 cursor-pointer"
                    />
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" /> Busca Melhorada com IA (DeepSeek)
                    </span>
                  </label>
                </div>
              </form>

              {isEnhancingQuery && (
                <div className="text-xs text-[#1DB954] mb-4 flex items-center gap-2 animate-pulse px-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>DeepSeek otimizando termos de busca para o contexto científico...</span>
                </div>
              )}

              {enhancedQueryText && (
                <div className="text-xs text-[#b3b3b3] mb-4 bg-[#121212] px-4 py-2.5 rounded-lg border border-[#2a2a2a] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#1DB954] flex-shrink-0" />
                  <span>Busca otimizada por IA: <strong>{enhancedQueryText}</strong></span>
                </div>
              )}

              {/* Advanced Controls */}
              <div className="border-t border-[#2a2a2a] pt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-[#b3b3b3]">
                  <SlidersHorizontal className="w-4 h-4 text-[#1DB954]" />
                  <span className="font-semibold text-white">Configurações de Curadoria</span>
                </div>

                <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
                  {/* Min Score Slider */}
                  <div className="flex items-center gap-3 flex-grow md:flex-grow-0">
                    <span className="text-xs text-[#b3b3b3] whitespace-nowrap">Score Mínimo:</span>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={minScore}
                      disabled={onlyWhitelisted}
                      onChange={(e) => setMinScore(parseInt(e.target.value))}
                      className="accent-[#1DB954] h-1 bg-[#282828] rounded-lg appearance-none cursor-pointer disabled:opacity-30"
                    />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded bg-[#282828] text-[#1DB954] ${onlyWhitelisted ? "opacity-30" : ""}`}>
                      {minScore}
                    </span>
                  </div>

                  {/* Whitelist Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={onlyWhitelisted}
                      onChange={(e) => setOnlyWhitelisted(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="relative w-9 h-5 bg-[#282828] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#b3b3b3] after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1DB954] peer-checked:after:bg-black"></div>
                    <span className="text-xs text-[#b3b3b3] font-medium">Apenas White List</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ERROR DISPLAY */}
            {searchError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{searchError}</p>
              </div>
            )}

            {/* RESULTS LIST */}
            {scoredEpisodes.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-lg font-bold tracking-tight">
                    Resultados Curados ({scoredEpisodes.length})
                  </h3>
                  <p className="text-xs text-[#b3b3b3]">
                    Ordenados por relevância acadêmica
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {scoredEpisodes.map(({ episode, score, isWhitelisted, matchedKeywords }) => (
                    <div
                      key={episode.id}
                      onClick={() => setSelectedEpisode(episode)}
                      className="spotify-card cursor-pointer p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 shadow-md"
                    >
                      {/* Cover Art */}
                      <img
                        src={episode.images[0]?.url || "https://placehold.co/150"}
                        alt={episode.name}
                        className="w-20 h-20 rounded-lg flex-shrink-0 object-cover border border-[#2a2a2a]"
                        style={{ borderRadius: "8px" }}
                      />

                      {/* Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {isWhitelisted && (
                            <span className="bg-[#1DB954]/10 text-[#1DB954] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#1DB954]/20">
                              White List
                            </span>
                          )}
                          <span className="bg-[#282828] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Hash className="w-3 h-3" /> Score: {score}
                          </span>
                          <span className="text-xs text-[#b3b3b3]">
                            {episode.show?.name || "Podcast"}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white leading-snug truncate">
                          {episode.name}
                        </h4>

                        <div className="text-xs text-[#b3b3b3] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Publicado: {formatDate(episode.release_date)}</span>
                          <span>•</span>
                          <span>Duração: {formatDuration(episode.duration_ms)}</span>
                        </div>

                        {/* Description Preview */}
                        {episode.description && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                            {episode.description}
                          </p>
                        )}

                        {/* Keyword Matches */}
                        {matchedKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {matchedKeywords.map((kw) => (
                              <span
                                key={kw}
                                className="bg-[#282828] text-[#b3b3b3] text-[9px] px-1.5 py-0.5 rounded"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => setSelectedEpisode(episode)}
                        className="w-full md:w-auto bg-white text-black hover:bg-[#b3b3b3] transition duration-300 font-bold text-xs px-5 py-2.5 rounded-full flex items-center justify-center gap-2 self-stretch md:self-auto"
                      >
                        <BookOpen className="w-4 h-4" />
                        Gerar Citação
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pagination Button */}
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoadingSearch}
                      className="bg-[#282828] hover:bg-[#383838] border border-[#2a2a2a] text-white text-xs font-bold px-8 py-3 rounded-full transition duration-300 flex items-center gap-2"
                    >
                      {isLoadingSearch ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#1DB954]" />
                          <span>Carregando mais...</span>
                        </>
                      ) : (
                        <span>Carregar Mais Resultados</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CITATION HISTORY PANEL */}
            <div className="p-6 rounded-2xl bg-[#181818] border border-[#2a2a2a] shadow-xl mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#1DB954]" /> Citações Recentes (Histórico)
                </h3>
                {citationHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-red-400 hover:text-red-500 font-semibold hover:underline"
                  >
                    Limpar Histórico
                  </button>
                )}
              </div>
              
              {citationHistory.length === 0 ? (
                <p className="text-xs text-[#7f7f7f] text-center py-6 bg-[#121212] rounded-xl border border-dashed border-[#2a2a2a]">
                  Nenhuma citação copiada recentemente. Suas citações copiadas aparecerão aqui.
                </p>
              ) : (
                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                  {citationHistory.map((citation, index) => (
                    <div key={index} className="bg-[#121212] p-4 rounded-xl border border-[#2a2a2a] flex items-start justify-between gap-4 group">
                      <p className="text-xs text-gray-300 leading-relaxed font-mono select-all truncate flex-grow">
                        {citation}
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(citation);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="text-[10px] text-[#1DB954] hover:text-[#1ed760] font-bold border border-[#1DB954]/20 hover:border-[#1ed760]/40 px-2.5 py-1 rounded bg-[#1DB954]/5 flex-shrink-0 transition duration-300"
                      >
                        Copiar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

       {/* EPISODE DETAILS & CITATION MODAL */}
      {selectedEpisode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181818] border border-[#2a2a2a] w-full max-w-4xl rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#2a2a2a] pb-4 mb-4 flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Detalhes do Episódio & Citação
                </h3>
              </div>
              <button
                onClick={() => setSelectedEpisode(null)}
                className="text-[#b3b3b3] hover:text-white font-medium text-sm px-3 py-1.5 bg-[#282828] rounded-md transition duration-300"
              >
                Fechar
              </button>
            </div>

            {/* Modal Content - Scrollable if too large */}
            <div className="flex-grow overflow-y-auto pr-1 flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Full Episode Info */}
              <div className="flex-grow flex-1 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <img
                    src={selectedEpisode.images[0]?.url || "https://placehold.co/150"}
                    alt={selectedEpisode.name}
                    className="w-24 h-24 rounded-lg object-cover border border-[#2a2a2a] flex-shrink-0"
                    style={{ borderRadius: "8px" }}
                  />
                  <div className="min-w-0">
                    <span className="text-xs text-[#1DB954] font-bold block mb-1">
                      {selectedEpisode.show?.name || "Podcast"}
                    </span>
                    <h4 className="text-lg font-bold text-white leading-tight">
                      {selectedEpisode.name}
                    </h4>
                    <span className="text-xs text-[#b3b3b3] mt-1 block">
                      Publicador: {selectedEpisode.show?.publisher || "Não especificado"}
                    </span>
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-[#282828] text-white px-2.5 py-1 rounded-full">
                    Publicado em: {formatDate(selectedEpisode.release_date)}
                  </span>
                  <span className="bg-[#282828] text-white px-2.5 py-1 rounded-full">
                    Duração: {formatDuration(selectedEpisode.duration_ms)}
                  </span>
                  <span className="bg-[#282828] text-[#1DB954] px-2.5 py-1 rounded-full font-bold">
                    Relevância Score: {scoreEpisode(selectedEpisode).score}
                  </span>
                </div>

                {/* Full Description */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <span className="text-xs font-bold text-[#b3b3b3]">Descrição Completa</span>
                  <div className="bg-[#121212] p-4 rounded-xl border border-[#2a2a2a] text-sm text-gray-300 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {selectedEpisode.description || "Nenhuma descrição fornecida pelo Spotify."}
                  </div>
                </div>
              </div>

              {/* Right Column: Citation Generator */}
              <div className="flex-grow flex-1 flex flex-col gap-6 justify-between border-t md:border-t-0 md:border-l border-[#2a2a2a] pt-6 md:pt-0 md:pl-6">
                
                {/* AI Refinement Status and Actions */}
                <div className="flex flex-col gap-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-[#1DB954]" /> Refinamento com IA
                    </span>
                    {refinedCitations[selectedEpisode.id] && (
                      <span className="bg-[#1DB954]/10 text-[#1DB954] text-[10px] font-bold px-2 py-0.5 rounded border border-[#1DB954]/20 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 animate-pulse" /> Refinado pelo DeepSeek
                      </span>
                    )}
                  </div>

                  {/* Refine button */}
                  {!refinedCitations[selectedEpisode.id] && (
                    <button
                      onClick={() => handleRefineCitation(selectedEpisode)}
                      disabled={isRefining}
                      className="w-full bg-[#282828] hover:bg-[#383838] border border-[#2a2a2a] disabled:bg-[#1f1f1f] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-300"
                    >
                      {isRefining ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#1DB954]" />
                          <span>Analisando descrição com IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-[#1DB954]" />
                          <span>Refinar Referência com DeepSeek</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Error Display */}
                  {refineError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-red-300 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                      <span>{refineError}</span>
                    </div>
                  )}
                </div>

                {/* Citations block */}
                {(() => {
                  const isRefined = !!refinedCitations[selectedEpisode.id];
                  const refinedData = refinedCitations[selectedEpisode.id];

                  // ABNT calculations
                  let abntText = "";
                  if (isRefined && refinedData) {
                    const { year, monthNameABNT, day } = parseReleaseDate(selectedEpisode.release_date);
                    const dateFormatted = day && monthNameABNT 
                      ? `${day} ${monthNameABNT} ${year}` 
                      : monthNameABNT 
                        ? `${monthNameABNT} ${year}` 
                        : year;
                    abntText = formatRefinedAbntCitation(
                      selectedEpisode.name,
                      dateFormatted,
                      selectedEpisode.external_urls.spotify,
                      refinedData,
                      getAbntAccessDate()
                    );
                  } else {
                    abntText = generateAbntCitation(selectedEpisode);
                  }

                  // APA calculations
                  let apaText = "";
                  if (isRefined && refinedData) {
                    const { year, monthNameAPA, day } = parseReleaseDate(selectedEpisode.release_date);
                    const dateFormatted = day && monthNameAPA 
                      ? `${year}, ${monthNameAPA} ${day}` 
                      : monthNameAPA 
                        ? `${year}, ${monthNameAPA}` 
                        : year;
                    apaText = formatRefinedApaCitation(
                      selectedEpisode.name,
                      dateFormatted,
                      selectedEpisode.show?.name || "Podcast",
                      selectedEpisode.external_urls.spotify,
                      refinedData
                    );
                  } else {
                    apaText = generateApaCitation(selectedEpisode);
                  }

                  return (
                    <div className="flex flex-col gap-5 flex-grow">
                      {/* ABNT */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1DB954]">Norma ABNT</span>
                          <button
                            onClick={() => handleCopy(abntText, "abnt")}
                            className="flex items-center gap-1.5 text-xs text-[#b3b3b3] hover:text-white bg-[#282828] px-2.5 py-1 rounded transition duration-300"
                          >
                            {copiedAbnt ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#1DB954]" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copiar
                              </>
                            )}
                          </button>
                        </div>
                        <div className={`p-4 rounded-xl border text-xs leading-relaxed select-all transition duration-300 ${
                          isRefined 
                            ? "bg-[#1db954]/5 border-[#1db954]/20 text-gray-100" 
                            : "bg-[#121212] border-[#2a2a2a] text-gray-200"
                        }`}>
                          {abntText}
                        </div>
                      </div>

                      {/* APA */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1DB954]">Norma APA (7ª Ed.)</span>
                          <button
                            onClick={() => handleCopy(apaText, "apa")}
                            className="flex items-center gap-1.5 text-xs text-[#b3b3b3] hover:text-white bg-[#282828] px-2.5 py-1 rounded transition duration-300"
                          >
                            {copiedApa ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#1DB954]" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copiar
                              </>
                            )}
                          </button>
                        </div>
                        <div className={`p-4 rounded-xl border text-xs leading-relaxed select-all transition duration-300 ${
                          isRefined 
                            ? "bg-[#1db954]/5 border-[#1db954]/20 text-gray-100" 
                            : "bg-[#121212] border-[#2a2a2a] text-gray-200"
                        }`}>
                          {apaText}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Link on Spotify */}
                <a
                  href={selectedEpisode.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs font-bold text-black bg-[#1DB954] hover:bg-[#1ed760] py-3 rounded-full transition duration-300 mt-4 flex-shrink-0"
                >
                  Ouvir no Spotify <ExternalLink className="w-4 h-4" />
                </a>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#121212] border-t border-[#2a2a2a] py-6 px-6 text-center">
        <p className="text-xs text-[#7f7f7f]">
          PaperTrack &copy; {new Date().getFullYear()} • Feito com foco em descolonização do saber e valorização de fontes orais.
        </p>
      </footer>
    </div>
  );
}
