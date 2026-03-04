/**
 * Queryx — Search logic
 * Uses Brave Search API for web results, OpenRouter for AI synthesis.
 */

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  synthesis: string;
  sources: string[];
  searchedAt: string;
  durationMs: number;
  model: string;
}

export interface NewsSearchResponse extends WebSearchResponse {
  newsCount: number;
}

export interface DeepSearchResponse {
  query: string;
  results: SearchResult[];
  synthesis: string;
  sources: string[];
  keyFindings: string[];
  searchedAt: string;
  durationMs: number;
  model: string;
  depth: "deep";
}

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const SYNTHESIS_MODEL = process.env.SYNTHESIS_MODEL ?? "openai/gpt-4o-mini";

/**
 * Call Brave Search API
 */
async function braveSearch(
  query: string,
  options: { count?: number; freshness?: string; type?: "web" | "news" } = {}
): Promise<SearchResult[]> {
  const { count = 10, freshness, type = "web" } = options;

  const params = new URLSearchParams({
    q: query,
    count: String(count),
    safesearch: "off",
    text_decorations: "false",
    ...(freshness ? { freshness } : {}),
  });

  const endpoint =
    type === "news"
      ? "https://api.search.brave.com/res/v1/news/search"
      : "https://api.search.brave.com/res/v1/web/search";

  const response = await fetch(`${endpoint}?${params}`, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": BRAVE_API_KEY,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brave Search API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as any;

  if (type === "news") {
    const articles = data?.results ?? [];
    return articles.slice(0, count).map((a: any) => ({
      title: a.title ?? "",
      url: a.url ?? "",
      description: a.description ?? "",
      age: a.age ?? undefined,
    }));
  }

  const webResults = data?.web?.results ?? [];
  return webResults.slice(0, count).map((r: any) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    description: r.description ?? "",
    age: r.age ?? undefined,
  }));
}

/**
 * Synthesize search results with an LLM
 */
async function synthesize(
  query: string,
  results: SearchResult[],
  mode: "quick" | "deep" = "quick"
): Promise<{ synthesis: string; keyFindings?: string[] }> {
  const context = results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}`
    )
    .join("\n\n");

  const systemPrompt =
    mode === "deep"
      ? `You are a research analyst. Given web search results, produce a comprehensive analysis with key findings. Be thorough and cite sources by number. Format findings as bullet points.`
      : `You are a helpful assistant. Given web search results, produce a concise, accurate synthesis that directly answers the query. Be brief. Cite sources by number [1], [2], etc.`;

  const userPrompt =
    mode === "deep"
      ? `Query: "${query}"\n\nSearch Results:\n${context}\n\nProvide:\n1. A comprehensive synthesis (2-3 paragraphs)\n2. Key Findings (5-7 bullet points starting with "•")\n\nFormat exactly:\n[SYNTHESIS]\n<synthesis text>\n[KEY_FINDINGS]\n• finding 1\n• finding 2\n...`
      : `Query: "${query}"\n\nSearch Results:\n${context}\n\nProvide a concise synthesis answering the query.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://queryx.run",
      "X-Title": "Queryx Search API",
    },
    body: JSON.stringify({
      model: SYNTHESIS_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: mode === "deep" ? 1500 : 600,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM synthesis error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as any;
  const text = data.choices?.[0]?.message?.content ?? "";

  if (mode === "deep") {
    // Parse synthesis and key findings
    const synthMatch = text.match(/\[SYNTHESIS\]([\s\S]*?)\[KEY_FINDINGS\]/);
    const findingsMatch = text.match(/\[KEY_FINDINGS\]([\s\S]*)/);

    const synthesis = synthMatch ? synthMatch[1].trim() : text;
    const findingsRaw = findingsMatch ? findingsMatch[1].trim() : "";
    const keyFindings = findingsRaw
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.startsWith("•"))
      .map((l: string) => l.slice(1).trim());

    return { synthesis, keyFindings };
  }

  return { synthesis: text.trim() };
}

/**
 * Standard web search + synthesis
 */
export async function webSearch(query: string): Promise<WebSearchResponse> {
  const start = Date.now();

  const results = await braveSearch(query, { count: 10 });
  const { synthesis } = await synthesize(query, results, "quick");

  return {
    query,
    results,
    synthesis,
    sources: results.map((r) => r.url),
    searchedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    model: SYNTHESIS_MODEL,
  };
}

/**
 * News search (sorted by recency)
 */
export async function newsSearch(query: string): Promise<NewsSearchResponse> {
  const start = Date.now();

  const results = await braveSearch(query, {
    count: 10,
    type: "news",
    freshness: "pw", // past week
  });

  const { synthesis } = await synthesize(query, results, "quick");

  return {
    query,
    results,
    synthesis,
    sources: results.map((r) => r.url),
    newsCount: results.length,
    searchedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    model: SYNTHESIS_MODEL,
  };
}

/**
 * Deep multi-query research
 */
export async function deepSearch(
  query: string,
  subQueries?: string[]
): Promise<DeepSearchResponse> {
  const start = Date.now();

  // Build sub-queries for broader coverage
  const queries = subQueries && subQueries.length > 0
    ? subQueries
    : [
        query,
        `${query} overview`,
        `${query} analysis`,
      ];

  // Run all queries in parallel
  const allResultsArrays = await Promise.all(
    queries.map((q) => braveSearch(q, { count: 8 }))
  );

  // Deduplicate by URL
  const seen = new Set<string>();
  const allResults: SearchResult[] = [];
  for (const arr of allResultsArrays) {
    for (const r of arr) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        allResults.push(r);
      }
    }
  }

  // Cap at 20 results for synthesis
  const topResults = allResults.slice(0, 20);

  const { synthesis, keyFindings } = await synthesize(query, topResults, "deep");

  return {
    query,
    results: topResults,
    synthesis,
    sources: topResults.map((r) => r.url),
    keyFindings: keyFindings ?? [],
    searchedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    model: SYNTHESIS_MODEL,
    depth: "deep",
  };
}
