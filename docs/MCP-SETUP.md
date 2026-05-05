# Projecter — MCP server setup

The Projecter MCP server exposes the project/contact/CC/risks data as **tools** that Claude Desktop (or any MCP client) can call.

## What is MCP?

**Model Context Protocol** is an open standard from Anthropic that lets LLMs talk to external systems through a uniform JSON-RPC interface over stdio (or SSE/HTTP).

A server exposes three things:

- **Tools** — actions the LLM can invoke (e.g. `list_projects`, `search_contacts`, `db_query`)
- **Resources** — read-only documents the LLM can fetch (e.g. `projecter://schema`)
- **Prompts** — pre-baked prompt templates (not used yet)

The client (Claude Desktop, Cursor, Continue, …) discovers the schema, lets the LLM pick a tool, and forwards the JSON result back into the conversation.

## What this server exposes

| Tool                      | Purpose                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `list_projects`           | List projects with RAG status, optional `status` filter             |
| `get_project`             | Full project + members + risks + recent documents                   |
| `search_contacts`         | Substring search by name, optional org filter                       |
| `list_competency_centers` | ETNIC org tree (73 CCs), optional level filter                      |
| `list_risks`              | Cross-project risk dashboard, filter by project / status / severity |
| `db_query`                | Read-only escape hatch — runs a single SELECT (rejects DML/DDL)     |

| Resource           | URI                  |
| ------------------ | -------------------- |
| Schema cheat-sheet | `projecter://schema` |

## Smoke-test from terminal (no Claude Desktop needed)

```bash
cd /Users/ldurpel/Development/Projects/Projecter/Projecter_dev/server
npm run mcp
# Outputs: "🚀 Projecter MCP server ready (stdio transport)" on stderr
# Server is now listening on stdin for JSON-RPC messages.
# Send a tools/list request:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run --silent mcp
```

A faster way is the official MCP inspector:

```bash
npx -y @modelcontextprotocol/inspector node src/mcp/server.js
```

This opens a web UI where you can browse tools, fill arguments and inspect responses.

## Wiring into Claude Desktop

1. Open Claude Desktop config:
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
2. Add the `projecter` entry inside `mcpServers`:
   ```json
   {
     "mcpServers": {
       "projecter": {
         "command": "node",
         "args": [
           "/Users/ldurpel/Development/Projects/Projecter/Projecter_dev/server/src/mcp/server.js"
         ]
       }
     }
   }
   ```
3. Quit + relaunch Claude Desktop. A 🔌 plug icon should appear in the chat input. Click it → you'll see `projecter` listed with its 6 tools.

## Example prompts to try in Claude Desktop

- "Lists all ETNIC competency centers managed by an interim manager."
- "Show me the open risks across all projects, sorted by severity."
- "Who is the WBE sponsor of the GED project? Search for sponsor_wbe in project_members."
- "Use db_query to count contacts per organization."

## Architecture notes

- **Transport**: stdio (recommended for Claude Desktop). Could also expose SSE later.
- **Logging**: must go to **stderr** (`console.error`), never stdout — stdout is the JSON-RPC channel.
- **DB**: same `pg` pool as the REST server; reads `.env` from `server/.env`.
- **Safety**: `db_query` rejects any non-SELECT statement; all other tools use parameterized queries.

## Next steps

- Add `create_risk`, `update_project_status_brief` (write-tools — opt-in, behind a flag)
- Add `generate_document` tool that runs docxtemplater on a template
- Expose `meetings.minutes` as resources for RAG-style queries
