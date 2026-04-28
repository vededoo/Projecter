#!/usr/bin/env node
/**
 * Projecter — MCP server (stdio transport)
 *
 * Exposes Projecter's PostgreSQL data as MCP tools so Claude Desktop
 * (or any MCP client) can query projects, contacts, competency centers,
 * and risks directly.
 *
 * Run standalone:  node src/mcp/server.js
 * Wire into Claude Desktop: see docs/MCP-SETUP.md
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { query, pool } = require('../utils/db');

const TRANSFORMER_URL = process.env.TRANSFORMER_URL || 'http://localhost:5044';

// ─────────────────────────────────────────────────────────────────────────
// Server metadata
// ─────────────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: 'projecter',
  version: '0.1.0',
});

// Helper: wrap any JS value as MCP text content (JSON-formatted)
const ok = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});
const err = (message) => ({
  isError: true,
  content: [{ type: 'text', text: `❌ ${message}` }],
});

// ─────────────────────────────────────────────────────────────────────────
// Tool: list_projects
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_projects',
  'List all projects with their status, RAG indicators, and key metadata.',
  {
    status: z.string().optional().describe('Filter by status (e.g. in_progress, idea, briefing_draft)'),
    limit: z.number().int().min(1).max(500).default(50).optional(),
  },
  async ({ status, limit = 50 }) => {
    try {
      const conds = [];
      const params = [];
      if (status) { params.push(status); conds.push(`status = $${params.length}::project_status`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      params.push(limit);
      const { rows } = await query(
        `SELECT id, code, title, slug, status, urgency, priority,
                rag_global, rag_planning, rag_budget, rag_scope, rag_risks,
                status_brief, status_brief_updated_at, updated_at
           FROM projects ${where}
           ORDER BY updated_at DESC LIMIT $${params.length}`,
        params
      );
      return ok({ count: rows.length, projects: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: get_project
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'get_project',
  'Fetch a single project (by id or slug) with all its details: members, risks, recent documents.',
  {
    id_or_slug: z.string().describe('Numeric id or slug of the project'),
  },
  async ({ id_or_slug }) => {
    try {
      const { rows: pj } = await query(
        `SELECT p.*, o.name AS client_name, o.code AS client_code
           FROM projects p LEFT JOIN organizations o ON o.id = p.client_organization_id
          WHERE p.id::text = $1 OR p.slug = $1 LIMIT 1`,
        [id_or_slug]
      );
      if (!pj[0]) return err(`Project not found: ${id_or_slug}`);

      const projectId = pj[0].id;
      const [members, risks, docs] = await Promise.all([
        query(
          `SELECT pm.role, pm.effort_md, c.last_name, c.first_name, c.job_title, o.code AS organization
             FROM project_members pm
             JOIN contacts c ON c.id = pm.contact_id
             LEFT JOIN organizations o ON o.id = c.organization_id
            WHERE pm.project_id = $1 ORDER BY pm.display_order`,
          [projectId]
        ),
        query(
          `SELECT id, label, probability, impact, severity, status, mitigation_plan, due_date
             FROM risks WHERE project_id = $1 ORDER BY severity DESC NULLS LAST, due_date ASC NULLS LAST`,
          [projectId]
        ),
        query(
          `SELECT id, type, title, version, status, drafted_at, signed_at
             FROM documents WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 20`,
          [projectId]
        ),
      ]);

      return ok({
        project: pj[0],
        members: members.rows,
        risks: risks.rows,
        documents: docs.rows,
      });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: search_contacts
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'search_contacts',
  'Search contacts by name (last_name or first_name, case-insensitive substring).',
  {
    q: z.string().min(1).describe('Substring to search'),
    organization: z.string().optional().describe('Filter by organization code (ETNIC, WBE, …)'),
    limit: z.number().int().min(1).max(200).default(50).optional(),
  },
  async ({ q, organization, limit = 50 }) => {
    try {
      const conds = [`(c.last_name ILIKE $1 OR c.first_name ILIKE $1)`];
      const params = [`%${q}%`];
      if (organization) { params.push(organization); conds.push(`o.code = $${params.length}`); }
      params.push(limit);
      const { rows } = await query(
        `SELECT c.id, c.last_name, c.first_name, c.email, c.job_title, o.code AS organization
           FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id
          WHERE ${conds.join(' AND ')}
          ORDER BY c.last_name, c.first_name LIMIT $${params.length}`,
        params
      );
      return ok({ count: rows.length, contacts: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: list_competency_centers
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_competency_centers',
  'Return the ETNIC organizational tree (73 competency centers) with managers and member counts.',
  {
    level: z.enum(['dg', 'division', 'cc', 'team', 'subteam']).optional().describe('Filter by level'),
  },
  async ({ level }) => {
    try {
      const params = [];
      const cond = level ? `WHERE cc.level = $1::cc_level` : '';
      if (level) params.push(level);
      const { rows } = await query(
        `SELECT cc.id, cc.code, cc.label, cc.level, cc.parent_id, cc.is_interim,
                m.last_name AS manager_last_name, m.first_name AS manager_first_name,
                (SELECT COUNT(*) FROM memberships ms WHERE ms.cc_id = cc.id) AS member_count
           FROM competency_centers cc
           LEFT JOIN contacts m ON m.id = cc.manager_contact_id
           ${cond}
           ORDER BY cc.display_order`,
        params
      );
      return ok({ count: rows.length, competency_centers: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: list_risks
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_risks',
  'List risks across all projects (or filtered by project), useful for cross-project dashboards.',
  {
    project_id_or_slug: z.string().optional(),
    status: z.enum(['open', 'mitigating', 'closed', 'accepted']).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  },
  async ({ project_id_or_slug, status, severity }) => {
    try {
      const conds = [];
      const params = [];
      if (project_id_or_slug) {
        params.push(project_id_or_slug);
        conds.push(`(p.id::text = $${params.length} OR p.slug = $${params.length})`);
      }
      if (status)   { params.push(status);   conds.push(`r.status = $${params.length}::risk_status`); }
      if (severity) { params.push(severity); conds.push(`r.severity = $${params.length}::risk_level`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT r.id, r.label, r.probability, r.impact, r.severity, r.status,
                r.due_date, r.mitigation_plan,
                p.slug AS project_slug, p.title AS project_title,
                c.last_name AS owner_last_name, c.first_name AS owner_first_name
           FROM risks r
           JOIN projects p ON p.id = r.project_id
           LEFT JOIN contacts c ON c.id = r.owner_contact_id
           ${where}
           ORDER BY
             CASE r.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
             r.due_date ASC NULLS LAST`,
        params
      );
      return ok({ count: rows.length, risks: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: list_meeting_transcripts (queries Transformer for texts linked to a project)
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_meeting_transcripts',
  'List meeting transcripts (from Transformer) linked to a Projecter project. Returns titles, dates, and summaries — no full transcript bodies.',
  {
    project_id_or_slug: z.string().describe('Numeric id or slug of the Projecter project'),
  },
  async ({ project_id_or_slug }) => {
    try {
      const { rows } = await query(
        `SELECT id, title FROM projects WHERE id::text = $1 OR slug = $1 LIMIT 1`,
        [project_id_or_slug]
      );
      if (!rows[0]) return err(`Project not found: ${project_id_or_slug}`);
      const projectId = rows[0].id;

      const r = await fetch(`${TRANSFORMER_URL}/api/texts`);
      if (!r.ok) return err(`Transformer responded ${r.status}`);
      const body = await r.json();
      const linked = (body.data || [])
        .filter((t) => t.attributes.projecter_project_id === projectId)
        .map((t) => ({
          id: t.id,
          title: t.attributes.title,
          authors: t.attributes.authors,
          recording_date: t.attributes.recording_date,
          executive_summary: t.attributes.executive_summary,
          has_transcript: !!t.attributes.content,
          content_chars: t.attributes.content ? t.attributes.content.length : 0,
        }));
      return ok({
        project: rows[0],
        count: linked.length,
        transcripts: linked,
      });
    } catch (e) { return err(`Transformer unreachable: ${e.message}`); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: get_meeting_transcript (full content from Transformer)
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'get_meeting_transcript',
  'Fetch a single meeting transcript from Transformer. By default returns the executive summary; pass full=true to get the complete transcript body.',
  {
    text_id: z.string().describe('Transformer text id'),
    full: z.boolean().default(false).optional().describe('If true, include the full content (can be long)'),
  },
  async ({ text_id, full = false }) => {
    try {
      const r = await fetch(`${TRANSFORMER_URL}/api/texts/${text_id}`);
      if (!r.ok) return err(`Transformer responded ${r.status}`);
      const body = await r.json();
      const a = body.data.attributes;
      return ok({
        id: body.data.id,
        title: a.title,
        authors: a.authors,
        recording_date: a.recording_date,
        location: a.location,
        executive_summary: a.executive_summary,
        ai_report: a.ai_report,
        projecter_project_id: a.projecter_project_id,
        ...(full ? { content: a.content } : { content_chars: a.content ? a.content.length : 0 }),
      });
    } catch (e) { return err(`Transformer unreachable: ${e.message}`); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: search_meeting_transcripts (full-text search across linked transcripts)
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'search_meeting_transcripts',
  'Search a string across all meeting transcripts (Transformer). Optionally restrict to one Projecter project. Returns each match with surrounding context.',
  {
    q: z.string().min(2).describe('Substring to search (case-insensitive)'),
    project_id_or_slug: z.string().optional().describe('Restrict to transcripts linked to this project'),
    context_chars: z.number().int().min(20).max(500).default(120).optional(),
    max_matches_per_text: z.number().int().min(1).max(20).default(3).optional(),
  },
  async ({ q, project_id_or_slug, context_chars = 120, max_matches_per_text = 3 }) => {
    try {
      let projectId = null;
      if (project_id_or_slug) {
        const { rows } = await query(
          `SELECT id FROM projects WHERE id::text = $1 OR slug = $1 LIMIT 1`,
          [project_id_or_slug]
        );
        if (!rows[0]) return err(`Project not found: ${project_id_or_slug}`);
        projectId = rows[0].id;
      }

      const r = await fetch(`${TRANSFORMER_URL}/api/texts`);
      if (!r.ok) return err(`Transformer responded ${r.status}`);
      const body = await r.json();

      const needle = q.toLowerCase();
      const results = [];
      for (const t of body.data || []) {
        if (projectId && t.attributes.projecter_project_id !== projectId) continue;
        const content = t.attributes.content || '';
        if (!content) continue;
        const lower = content.toLowerCase();
        const matches = [];
        let idx = 0;
        while ((idx = lower.indexOf(needle, idx)) !== -1 && matches.length < max_matches_per_text) {
          const start = Math.max(0, idx - context_chars);
          const end = Math.min(content.length, idx + needle.length + context_chars);
          matches.push({
            offset: idx,
            excerpt: (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : ''),
          });
          idx += needle.length;
        }
        if (matches.length) {
          results.push({
            text_id: t.id,
            title: t.attributes.title,
            recording_date: t.attributes.recording_date,
            match_count: matches.length,
            matches,
          });
        }
      }
      return ok({ query: q, project_filter: project_id_or_slug || null, hits: results.length, results });
    } catch (e) { return err(`Transformer unreachable: ${e.message}`); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: db_query  (read-only escape hatch)
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'db_query',
  'Run a read-only SELECT query against the Projecter database. Rejects anything that is not a single SELECT statement.',
  {
    sql: z.string().describe('A single SELECT statement (no semicolons mid-query, no DML/DDL)'),
    limit: z.number().int().min(1).max(1000).default(100).optional(),
  },
  async ({ sql, limit = 100 }) => {
    try {
      const trimmed = sql.trim().replace(/;+\s*$/, '');
      if (!/^select\b/i.test(trimmed)) return err('Only SELECT statements are allowed.');
      if (/;/.test(trimmed))           return err('Multiple statements are not allowed.');
      if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b/i.test(trimmed)) {
        return err('Write/DDL keywords detected — refusing to execute.');
      }
      const wrapped = `SELECT * FROM (${trimmed}) AS _q LIMIT ${limit}`;
      const { rows, rowCount } = await query(wrapped);
      return ok({ rowCount, rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Resources: org snapshot + project list as readable resources
// ─────────────────────────────────────────────────────────────────────────
server.resource(
  'projecter://schema',
  'projecter://schema',
  { mimeType: 'text/markdown', description: 'Projecter DB schema cheat-sheet (tables + key columns).' },
  async () => {
    const schemaDoc = `# Projecter schema (cheat-sheet)

## Reference tables
- organizations(id, code, name, type)
- competency_centers(id, code, label, level[dg|division|cc|team|subteam], parent_id, manager_contact_id, is_interim)
- roles(id, label)
- public_procurements(id, reference, label)

## Core
- contacts(id, last_name, first_name, email, organization_id, job_title)
- memberships(id, contact_id, cc_id, role[manager|team_leader|member|consultant|advisor|analyst|detached])
- projects(id, code, title, slug, status, urgency, priority,
           client_organization_id, status_brief, rag_*, highlights, concerns, next_steps, attributes)
- project_members(id, project_id, contact_id, role[sponsor_wbe|etnic_project_manager|...])
- risks(id, project_id, label, probability, impact, severity, status, owner_contact_id, mitigation_plan, due_date)
- documents(id, project_id, type[mandate|briefing_note|dip|project_sheet|...], version, status, attributes)
- document_files(id, document_id, storage_path, extracted_text)
- meetings(id, project_id, title, type, start_at, transformer_transcript_id)
- timeline_events(id, project_id, label, type, event_date)

Full DDL: database/migrations/001_init_schema.sql
`;
    return { contents: [{ uri: 'projecter://schema', mimeType: 'text/markdown', text: schemaDoc }] };
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────
async function main() {
  // IMPORTANT: never console.log to stdout — stdio transport uses it.
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Projecter MCP server ready (stdio transport)');
}

main().catch((e) => {
  console.error('❌ MCP server fatal error:', e);
  pool.end().finally(() => process.exit(1));
});

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    console.error(`\n📴 Received ${sig}, shutting down…`);
    try { await pool.end(); } catch {}
    process.exit(0);
  });
}
