---
name: source-research
description: "How to research a technology claim with MCP documentation servers and the web, rank sources, and record citations. Use in any research subagent before searching."
user-invocable: false
---

# Source research

## Order of sources

1. **Microsoft Learn MCP** (`microsoft_docs_search`, then `microsoft_docs_fetch` for the full
   page) — anything Microsoft, Azure, .NET, and architecture guidance (Azure Architecture
   Center, Well-Architected Framework).
2. **Context7 MCP** (`resolve-library-id`, then `query-docs`) — library and framework docs.
3. **WebFetch** on the official site — vendor docs, release pages, LICENSE files, pricing.
4. **WebSearch** — only to find an official page you couldn't reach directly, or for
   adoption signals.

If an MCP server is unavailable, fall back to the next step and keep going. Don't fail.

## Source quality

Prefer, in order: official docs → official release notes / repository → vendor blog →
well-known community sources. Never cite search result pages, AI summaries or
content farms. A version number or release date must come from an official page
(release notes, package registry, repository releases).

## Recording

- Note each source as you use it: title, URL, today's date, and `via`
  (`mcp:mslearn` | `mcp:context7` | `web`).
- Number sources `[S1]`, `[S2]` … in order of first use; cite inline after each claim.
- One fact per bullet. If you couldn't verify something, say so under Open issues
  instead of guessing.

## Budget

At most about 12 fetches per artifact. Stop when every candidate has a cited answer for
every constraint you own, or when the budget runs out (list the gaps under Open issues).
