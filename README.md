# Queryx 🔍

**Agent-native web search API.** Pay-per-query in USDC via x402. No accounts, no subscriptions. Structured JSON with AI synthesis.

5–14× cheaper than Perplexity. Native x402 payments. Zero friction for agents.

## Endpoints

| Method | Path | Price | Description |
|--------|------|-------|-------------|
| `GET` | `/v1/search?q=...` | $0.001 | Web search + AI synthesis |
| `GET` | `/v1/search/news?q=...` | $0.001 | News-focused, sorted by recency |
| `POST` | `/v1/search/deep` | $0.005 | Multi-source deep research |
| `GET` | `/health` | Free | Health check |
| `GET` | `/.well-known/agent.json` | Free | Agent manifest |

## Quick Start (agent)

```bash
# Web search
curl "https://queryx.run/v1/search?q=Fed+rate+decision+impact+on+tech+stocks"

# News
curl "https://queryx.run/v1/search/news?q=bitcoin+price+today"

# Deep research
curl -X POST "https://queryx.run/v1/search/deep" \
  -H "Content-Type: application/json" \
  -d '{"q": "impact of AI on software jobs 2025", "subQueries": ["AI software engineer", "AI coding tools market"]}'
```

## Response Format

### Web / News
```json
{
  "query": "your query",
  "results": [
    {
      "title": "Page title",
      "url": "https://...",
      "description": "Snippet text",
      "age": "1 day ago"
    }
  ],
  "synthesis": "AI-generated answer citing [1] [2]...",
  "sources": ["https://...", "..."],
  "searchedAt": "2026-03-04T16:00:00.000Z",
  "durationMs": 1234,
  "model": "openai/gpt-4o-mini"
}
```

### Deep Research
```json
{
  "query": "...",
  "results": [...],
  "synthesis": "Comprehensive analysis...",
  "keyFindings": ["• Finding 1", "• Finding 2", ...],
  "sources": [...],
  "depth": "deep",
  "durationMs": 2345,
  "model": "openai/gpt-4o-mini"
}
```

## x402 Payment

Paid endpoints return `402 Payment Required` with an x402 challenge when ENABLE_PAYMENTS=true. Compatible with any x402-enabled agent client.

## Stack

- **Runtime:** Bun
- **Framework:** Hono (via @lucid-agents/hono)
- **Payments:** @lucid-agents/payments (x402, Base Mainnet USDC)
- **Search:** Brave Search API
- **Synthesis:** OpenRouter → GPT-4o-mini
- **Deploy:** Railway

## Competitive Positioning

|                  | Perplexity | Tavily | **Queryx** |
|------------------|-----------|--------|------------|
| Price/query      | $0.005–0.014 | $0.004 | **$0.001** |
| x402 native      | ❌ | ❌ | ✅ |
| No account needed | ❌ | ❌ | ✅ |
| Agent JSON output | ❌ | ✅ | ✅ |
| AI synthesis     | ✅ | ✅ | ✅ |
| Deep research    | ✅ | ✅ | ✅ |

## Running Locally

```bash
cp .env.example .env
# Fill in BRAVE_SEARCH_API_KEY, OPENROUTER_API_KEY, PRIVATE_KEY, etc.
bun install
bun run dev
```

## License

MIT
