#!/usr/bin/env node
/**
 * Projecter — MCP server (stdio transport)
 *
 * Exposes Projecter's PostgreSQL data as MCP tools so Claude Desktop
 * (or any MCP client) can query projects, contacts, org units,
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
          `SELECT r.id, r.label, r.probability, r.impact, r.severity, r.status,
                  r.mitigation_plan, r.due_date, rp.impact AS project_impact, rp.context AS project_context
             FROM risks r
             JOIN risk_projects rp ON rp.risk_id = r.id
            WHERE rp.project_id = $1
            ORDER BY
              CASE r.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
              r.due_date ASC NULLS LAST`,
          [projectId]
        ),
        query(
          `SELECT id, type, title, version, status, drafted_at, signed_at
             FROM documents WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 20`,
          [projectId]
        ),
      ]);

      const meetings = await query(
        `SELECT m.id, m.title, m.type, m.start_at, m.extraction_status, m.validated_at,
                (SELECT COUNT(*) FROM meeting_actions WHERE meeting_id = m.id AND status = 'open') AS open_actions
           FROM meetings m WHERE m.project_id = $1 ORDER BY m.start_at DESC LIMIT 50`,
        [projectId]
      );

      return ok({
        project: pj[0],
        members: members.rows,
        risks: risks.rows,
        documents: docs.rows,
        meetings: meetings.rows,
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
// Tool: search_contacts_phonetic
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'search_contacts_phonetic',
  'Fuzzy / phonetic search for contacts using trigram similarity (pg_trgm). ' +
  'Use this when a name from a transcript may be badly transcribed by Whisper (e.g. "Kiné" → "KINET", ' +
  '"Vanderhoeven" → "VAN DEN HOEVEN"). Returns the top matches ranked by similarity score (0–1). ' +
  'A score ≥ 0.3 indicates a plausible match. Always verify the returned contact before using its id.',
  {
    q: z.string().min(1).describe('Badly transcribed or approximate name to match'),
    min_score: z.number().min(0).max(1).default(0.1).optional().describe('Minimum similarity score (default 0.1)'),
    limit: z.number().int().min(1).max(50).default(10).optional(),
  },
  async ({ q, min_score = 0.1, limit = 10 }) => {
    try {
      const { rows } = await query(
        `SELECT c.id, c.last_name, c.first_name, c.email, c.job_title, o.code AS organization,
                ROUND(GREATEST(
                  similarity(c.last_name, $1),
                  similarity(c.first_name, $1),
                  similarity(c.last_name || ' ' || c.first_name, $1),
                  similarity(c.first_name || ' ' || c.last_name, $1)
                )::numeric, 3) AS score
           FROM contacts c LEFT JOIN organizations o ON o.id = c.organization_id
          WHERE GREATEST(
                  similarity(c.last_name, $1),
                  similarity(c.first_name, $1),
                  similarity(c.last_name || ' ' || c.first_name, $1),
                  similarity(c.first_name || ' ' || c.last_name, $1)
                ) >= $2
          ORDER BY score DESC
          LIMIT $3`,
        [q, min_score, limit]
      );
      return ok({ count: rows.length, query: q, matches: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: list_org_units
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_org_units',
  'Return the organizational tree (org_units) with managers and member counts. Hierarchy is dynamic (adjacency list + materialized path). Optionally filter by company or max depth.',
  {
    organization_id: z.number().optional().describe('Filter by organization (organizations.id)'),
    max_depth: z.number().optional().describe('Only return units with depth <= this value'),
  },
  async ({ organization_id, max_depth }) => {
    try {
      const params = [];
      const conds = [];
      if (organization_id != null) { params.push(organization_id); conds.push(`u.organization_id = $${params.length}`); }
      if (max_depth != null)  { params.push(max_depth);  conds.push(`u.depth <= $${params.length}`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT u.id, u.organization_id, u.code, u.label, u.level_label, u.depth, u.path,
                u.parent_id, u.is_interim,
                m.last_name AS manager_last_name, m.first_name AS manager_first_name,
                (SELECT COUNT(*) FROM memberships ms WHERE ms.org_unit_id = u.id) AS member_count
           FROM org_units u
           LEFT JOIN contacts m ON m.id = u.manager_contact_id
           ${where}
           ORDER BY u.depth, u.display_order`,
        params
      );
      return ok({ count: rows.length, org_units: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: list_risks
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_risks',
  'List risks across all projects (or filtered by project/status/severity). Risks are N-to-N with projects — one risk can affect multiple projects.',
  {
    project_id_or_slug: z.string().optional().describe('Filter risks linked to this project (numeric id or slug)'),
    status:   z.enum(['open', 'mitigating', 'closed', 'accepted']).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  },
  async ({ project_id_or_slug, status, severity }) => {
    try {
      const conds = [];
      const params = [];
      if (project_id_or_slug) {
        const { rows } = await query(
          `SELECT id FROM projects WHERE id::text = $1 OR slug = $1 LIMIT 1`,
          [project_id_or_slug]
        );
        if (!rows[0]) return err(`Project not found: ${project_id_or_slug}`);
        params.push(rows[0].id);
        conds.push(`r.id IN (SELECT risk_id FROM risk_projects WHERE project_id = $${params.length})`);
      }
      if (status)   { params.push(status);   conds.push(`r.status = $${params.length}::risk_status`); }
      if (severity) { params.push(severity); conds.push(`r.severity = $${params.length}::risk_level`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT *
           FROM v_risks r
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
// Tool: list_open_actions
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_open_actions',
  'List all open actions (status=open) across meetings, with owner, deadline, and project context. Optionally filter by project or overdue only.',
  {
    project_id_or_slug: z.string().optional().describe('Restrict to actions from meetings of this project (numeric id or slug)'),
    overdue_only: z.boolean().default(false).optional().describe('If true, return only overdue actions (deadline < today)'),
    owner_contact_id: z.number().int().optional().describe('Filter by owner contact id'),
    limit: z.number().int().min(1).max(500).default(100).optional(),
  },
  async ({ project_id_or_slug, overdue_only = false, owner_contact_id, limit = 100 }) => {
    try {
      const conds = [];
      const params = [];
      if (project_id_or_slug) {
        const { rows } = await query(
          `SELECT id FROM projects WHERE id::text = $1 OR slug = $1 LIMIT 1`,
          [project_id_or_slug]
        );
        if (!rows[0]) return err(`Project not found: ${project_id_or_slug}`);
        params.push(rows[0].id);
        conds.push(`project_id = $${params.length}`);
      }
      if (overdue_only) {
        conds.push('is_overdue = true');
      }
      if (owner_contact_id) {
        params.push(owner_contact_id);
        conds.push(`id IN (SELECT id FROM v_open_actions WHERE owner_id = $${params.length})`);
      }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      params.push(limit);
      const { rows } = await query(
        `SELECT * FROM v_open_actions ${where} ORDER BY deadline ASC NULLS LAST LIMIT $${params.length}`,
        params
      );
      return ok({ count: rows.length, actions: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: get_meeting_actions
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'get_meeting_actions',
  'Get structured actions, decisions, and topics extracted from a specific meeting.',
  {
    meeting_id: z.number().int().describe('Projecter meeting id'),
  },
  async ({ meeting_id }) => {
    try {
      const [meetingRes, actionsRes, decisionsRes, topicsRes] = await Promise.all([
        query(
          `SELECT m.id, m.title, m.type, m.start_at, m.extraction_status,
                  m.extracted_at, m.validated_at, m.executive_summary,
                  p.code AS project_code, p.title AS project_title
             FROM meetings m LEFT JOIN projects p ON p.id = m.project_id
            WHERE m.id = $1`,
          [meeting_id]
        ),
        query(
          `SELECT a.id, a.description, a.deadline, a.status::text, a.is_overdue,
                  a.owner_raw, a.owner_name, a.owner_email, ma.notes
             FROM v_open_actions a
             LEFT JOIN meeting_actions ma ON ma.id = a.id
            WHERE a.meeting_id = $1
            UNION ALL
           SELECT a.id, a.description, a.deadline, a.status::text,
                  false AS is_overdue, a.owner_raw,
                  c.last_name || ' ' || COALESCE(c.first_name,'') AS owner_name,
                  c.email AS owner_email, a.notes
             FROM meeting_actions a LEFT JOIN contacts c ON c.id = a.owner_id
            WHERE a.meeting_id = $1 AND a.status NOT IN ('open','overdue')
            ORDER BY deadline ASC NULLS LAST`,
          [meeting_id]
        ),
        query(
          `SELECT id, description, impact, position FROM meeting_decisions WHERE meeting_id = $1 ORDER BY position NULLS LAST, id`,
          [meeting_id]
        ),
        query(
          `SELECT id, position, title, summary, type FROM meeting_topics WHERE meeting_id = $1 ORDER BY position, id`,
          [meeting_id]
        ),
      ]);
      if (!meetingRes.rows[0]) return err(`Meeting not found: ${meeting_id}`);
      return ok({
        meeting: meetingRes.rows[0],
        actions:   actionsRes.rows,
        decisions: decisionsRes.rows,
        topics:    topicsRes.rows,
      });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: review_extraction
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'review_extraction',
  'Side-by-side review of a meeting: raw transcript/minutes vs structured extracted data. Useful for validating or debugging an LLM extraction.',
  {
    meeting_id: z.number().int().describe('Projecter meeting id'),
    include_raw: z.boolean().default(true).optional().describe('Include raw_transcript and minutes in the response (can be long)'),
  },
  async ({ meeting_id, include_raw = true }) => {
    try {
      const { rows } = await query(
        `SELECT id, title, type, start_at, extraction_status, extraction_error,
                extracted_at, validated_at, executive_summary,
                transformer_transcript_id,
                ${include_raw ? 'raw_transcript, minutes, decisions AS decisions_raw, actions AS actions_raw,' : ''}
                (SELECT COUNT(*) FROM meeting_actions  WHERE meeting_id = m.id) AS action_count,
                (SELECT COUNT(*) FROM meeting_decisions WHERE meeting_id = m.id) AS decision_count,
                (SELECT COUNT(*) FROM meeting_topics    WHERE meeting_id = m.id) AS topic_count
           FROM meetings m WHERE id = $1`,
        [meeting_id]
      );
      if (!rows[0]) return err(`Meeting not found: ${meeting_id}`);
      const meeting = rows[0];
      const [actionsRes, decisionsRes, topicsRes] = await Promise.all([
        query(`SELECT * FROM meeting_actions WHERE meeting_id = $1 ORDER BY id`, [meeting_id]),
        query(`SELECT * FROM meeting_decisions WHERE meeting_id = $1 ORDER BY position NULLS LAST, id`, [meeting_id]),
        query(`SELECT * FROM meeting_topics WHERE meeting_id = $1 ORDER BY position, id`, [meeting_id]),
      ]);
      return ok({
        meeting,
        structured: {
          actions:   actionsRes.rows,
          decisions: decisionsRes.rows,
          topics:    topicsRes.rows,
        },
      });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: ingest_meeting_extraction
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'ingest_meeting_extraction',
  [
    'Write structured extraction results for a meeting: executive summary, topics, decisions, and actions.',
    'Each call REPLACES all existing structured data for that meeting (idempotent — safe to re-ingest).',
    'owner_raw names will be resolved to contact ids via case-insensitive last_name match.',
    'Returns the inserted counts and any unresolved owner names.',
  ].join(' '),
  {
    meeting_id: z.number().int().describe('Projecter meeting id'),
    executive_summary: z.string().optional().describe('10-line executive summary generated by LLM'),
    raw_transcript: z.string().optional().describe('Full raw text source (transcript or pasted CR). Stored as immutable source of truth.'),
    topics: z.array(z.object({
      position: z.number().int(),
      title: z.string(),
      summary: z.string().optional(),
      type: z.enum(['information', 'decision', 'action', 'risk', 'issue', 'open_point', 'other']).default('other'),
      project_topic_id: z.number().int().optional().describe('Link to an existing project_topics.id (optional)'),
    })).default([]).optional(),
    decisions: z.array(z.object({
      description: z.string(),
      impact: z.string().optional(),
      position: z.number().int().optional(),
    })).default([]).optional(),
    actions: z.array(z.object({
      description: z.string(),
      owner_raw: z.string().optional().describe('Name as extracted by LLM — will be resolved to contacts.id'),
      deadline: z.string().optional().describe('ISO date YYYY-MM-DD'),
      notes: z.string().optional(),
      meeting_topic_id: z.number().int().optional().describe('Position (1-based) or DB id of the meeting_topic this action belongs to — used to build the mail CR table'),
    })).default([]).optional(),
    attendees: z.array(z.object({
      name_raw: z.string().describe('Participant name as detected in transcript'),
      role: z.string().optional().describe('Role in the meeting (sponsor, project manager, etc.)'),
      status: z.enum(['present', 'excused', 'absent', 'invited']).default('present').optional(),
    })).default([]).optional().describe('Participants detected in transcript — resolved to contacts via ILIKE last_name'),
  },
  async ({ meeting_id, executive_summary, raw_transcript, topics = [], decisions = [], actions = [], attendees = [] }) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify meeting exists
      const { rows: [meeting] } = await client.query(
        `SELECT id FROM meetings WHERE id = $1`, [meeting_id]
      );
      if (!meeting) { await client.query('ROLLBACK'); return err(`Meeting not found: ${meeting_id}`); }

      // Update meeting metadata
      const updateFields = ['extraction_status = \'success\'', 'extracted_at = NOW()'];
      const updateParams = [meeting_id];
      if (executive_summary !== undefined) { updateParams.push(executive_summary); updateFields.push(`executive_summary = $${updateParams.length}`); }
      if (raw_transcript !== undefined)    { updateParams.push(raw_transcript);    updateFields.push(`raw_transcript = $${updateParams.length}`); }
      await client.query(
        `UPDATE meetings SET ${updateFields.join(', ')} WHERE id = $1`,
        updateParams
      );

      // Delete existing structured data (idempotent)
      await client.query('DELETE FROM meeting_actions   WHERE meeting_id = $1', [meeting_id]);
      await client.query('DELETE FROM meeting_decisions WHERE meeting_id = $1', [meeting_id]);
      await client.query('DELETE FROM meeting_topics    WHERE meeting_id = $1', [meeting_id]);

      // Insert topics
      for (const t of topics) {
        await client.query(
          `INSERT INTO meeting_topics (meeting_id, position, title, summary, type, commitment_level, project_topic_id)
           VALUES ($1, $2, $3, $4, $5::topic_type, $6::commitment_level, $7)`,
          [meeting_id, t.position, t.title, t.summary || null, t.type || 'other', t.commitment_level || 'mentioned', t.project_topic_id || null]
        );
      }

      // Insert decisions
      for (let i = 0; i < decisions.length; i++) {
        const d = decisions[i];
        await client.query(
          `INSERT INTO meeting_decisions (meeting_id, description, impact, position)
           VALUES ($1, $2, $3, $4)`,
          [meeting_id, d.description, d.impact || null, d.position ?? i + 1]
        );
      }

      // Insert actions — resolve owner names to contacts.id
      const unresolved = [];
      for (const a of actions) {
        let owner_id = null;
        if (a.owner_raw) {
          const nameParts = a.owner_raw.trim().split(/\s+/);
          // Try last_name match first, then first+last
          const { rows: contacts } = await client.query(
            `SELECT id FROM contacts
              WHERE last_name ILIKE $1 OR (last_name ILIKE $2 AND first_name ILIKE $3)
              LIMIT 1`,
            [
              nameParts[nameParts.length - 1],
              nameParts[nameParts.length - 1],
              nameParts[0],
            ]
          );
          if (contacts[0]) {
            owner_id = contacts[0].id;
          } else {
            unresolved.push(a.owner_raw);
          }
        }
        await client.query(
          `INSERT INTO meeting_actions (meeting_id, owner_id, owner_raw, description, deadline, notes, meeting_topic_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [meeting_id, owner_id, a.owner_raw || null, a.description, a.deadline || null, a.notes || null, a.meeting_topic_id || null]
        );
      }

      // Insert / upsert attendees — resolve via ILIKE last_name
      const unresolved_attendees = [];
      for (const att of attendees) {
        const nameParts = att.name_raw.trim().split(/\s+/);
        const { rows: matched } = await client.query(
          `SELECT id FROM contacts
            WHERE last_name ILIKE $1 OR (last_name ILIKE $2 AND first_name ILIKE $3)
            LIMIT 1`,
          [
            nameParts[nameParts.length - 1],
            nameParts[nameParts.length - 1],
            nameParts[0],
          ]
        );
        if (matched[0]) {
          await client.query(
            `INSERT INTO meeting_attendees (meeting_id, contact_id, status, role)
             VALUES ($1, $2, $3::attendance_status, $4)
             ON CONFLICT (meeting_id, contact_id) DO UPDATE
               SET status = EXCLUDED.status,
                   role   = COALESCE(EXCLUDED.role, meeting_attendees.role)`,
            [meeting_id, matched[0].id, att.status || 'present', att.role || null]
          );
        } else {
          unresolved_attendees.push(att.name_raw);
        }
      }

      await client.query('COMMIT');
      return ok({
        meeting_id,
        inserted: { topics: topics.length, decisions: decisions.length, actions: actions.length, attendees: attendees.length - unresolved_attendees.length },
        unresolved_owners: unresolved,
        unresolved_attendees,
      });
    } catch (e) {
      await client.query('ROLLBACK');
      // Mark extraction as failed
      try {
        await pool.query(
          `UPDATE meetings SET extraction_status = 'failed', extraction_error = $2 WHERE id = $1`,
          [meeting_id, e.message]
        );
      } catch {}
      return err(e.message);
    } finally {
      client.release();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: get_project_topics
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'get_project_topics',
  'List strategic topics for a project (project_topics table). These are persistent themes that span multiple meetings. Use this before ingesting a CR to find existing project_topic_id values to link meeting topics.',
  {
    project_id_or_slug: z.string().describe('Numeric id or slug of the project'),
  },
  async ({ project_id_or_slug }) => {
    try {
      const { rows: pj } = await query(
        `SELECT id, title FROM projects WHERE id::text = $1 OR slug = $1 LIMIT 1`,
        [project_id_or_slug]
      );
      if (!pj[0]) return err(`Project not found: ${project_id_or_slug}`);
      const { rows } = await query(
        `SELECT id, title, status, axes, synthesis, confidence, owner, due_date, updated_at
           FROM project_topics
          WHERE project_id = $1
          ORDER BY id`,
        [pj[0].id]
      );
      return ok({ project: pj[0], count: rows.length, project_topics: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: upsert_project_topic
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'upsert_project_topic',
  'Create or update a strategic project topic. Pass id to update an existing one, omit id to create a new one. axes must be an array of project_axis values.',
  {
    project_id: z.number().int().describe('projects.id'),
    id:         z.number().int().optional().describe('project_topics.id — omit to create'),
    title:      z.string().describe('Short label for this strategic topic'),
    status:     z.string().optional().describe('Free-form status or project_status value'),
    axes:       z.array(z.enum(['scope','planning','budget','resources','risk','governance','stakeholder','quality','security','change_management','benefits','dependencies','support_run'])).optional().describe('Axes this topic relates to'),
    synthesis:  z.string().optional().describe('Synthesis / current state narrative'),
    confidence: z.enum(['low','medium','high']).optional().describe('Confidence level in the synthesis'),
    owner:      z.string().optional().describe('Owner name (free text)'),
    due_date:   z.string().optional().describe('ISO date YYYY-MM-DD'),
  },
  async ({ project_id, id, title, status, axes, synthesis, confidence, owner, due_date }) => {
    try {
      if (id) {
        // UPDATE
        const sets = ['updated_at = NOW()'];
        const params = [id];
        if (title      !== undefined) { params.push(title);      sets.push(`title = $${params.length}`); }
        if (status     !== undefined) { params.push(status);     sets.push(`status = $${params.length}`); }
        if (axes       !== undefined) { params.push(axes);       sets.push(`axes = $${params.length}`); }
        if (synthesis  !== undefined) { params.push(synthesis);  sets.push(`synthesis = $${params.length}`); }
        if (confidence !== undefined) { params.push(confidence); sets.push(`confidence = $${params.length}::confidence_level`); }
        if (owner      !== undefined) { params.push(owner);      sets.push(`owner = $${params.length}`); }
        if (due_date   !== undefined) { params.push(due_date || null); sets.push(`due_date = $${params.length}`); }
        const { rows } = await query(
          `UPDATE project_topics SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
          params
        );
        if (!rows[0]) return err(`project_topic not found: ${id}`);
        return ok({ action: 'updated', project_topic: rows[0] });
      } else {
        // INSERT
        const { rows } = await query(
          `INSERT INTO project_topics (project_id, title, status, axes, synthesis, confidence, owner, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7::confidence_level, $8)
           RETURNING *`,
          [project_id, title, status || null, axes || null, synthesis || null,
           confidence || null, owner || null, due_date || null]
        );
        return ok({ action: 'created', project_topic: rows[0] });
      }
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: list_meetings
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_meetings',
  'List meetings, optionally filtered by project and/or extraction status. Returns meeting metadata and extraction state.',
  {
    project_id_or_slug: z.string().optional().describe('Numeric id or slug of the project'),
    extraction_status: z.enum(['pending', 'success', 'failed', 'skipped']).optional().describe('Filter by extraction status'),
    limit: z.number().int().min(1).max(500).default(50).optional(),
  },
  async ({ project_id_or_slug, extraction_status, limit = 50 }) => {
    try {
      const conds = [];
      const params = [];
      if (project_id_or_slug) {
        const { rows } = await query(
          `SELECT id FROM projects WHERE id::text = $1 OR slug = $1 LIMIT 1`,
          [project_id_or_slug]
        );
        if (!rows[0]) return err(`Project not found: ${project_id_or_slug}`);
        params.push(rows[0].id);
        conds.push(`m.project_id = $${params.length}`);
      }
      if (extraction_status) {
        params.push(extraction_status);
        conds.push(`m.extraction_status = $${params.length}::extraction_status`);
      }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      params.push(limit);
      const { rows } = await query(
        `SELECT m.id, m.title, m.type, m.start_at, m.location,
                m.extraction_status, m.extracted_at, m.validated_at,
                p.code AS project_code, p.title AS project_title,
                m.raw_transcript IS NOT NULL AS has_transcript,
                (SELECT COUNT(*) FROM meeting_actions  WHERE meeting_id = m.id) AS action_count,
                (SELECT COUNT(*) FROM meeting_decisions WHERE meeting_id = m.id) AS decision_count
           FROM meetings m
           LEFT JOIN projects p ON p.id = m.project_id
           ${where}
           ORDER BY m.start_at DESC
           LIMIT $${params.length}`,
        params
      );
      return ok({ count: rows.length, meetings: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: set_validated
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'set_validated',
  'Mark a meeting extraction as validated (or unvalidate it). Sets validated_at to NOW() or NULL.',
  {
    meeting_id: z.number().int().describe('Projecter meeting id'),
    validated: z.boolean().describe('true = validate, false = unvalidate'),
  },
  async ({ meeting_id, validated }) => {
    try {
      const { rows } = await query(
        `UPDATE meetings SET validated_at = ${validated ? 'NOW()' : 'NULL'}
         WHERE id = $1
         RETURNING id, title, extraction_status, validated_at`,
        [meeting_id]
      );
      if (!rows[0]) return err(`Meeting not found: ${meeting_id}`);
      return ok({ meeting_id: rows[0].id, title: rows[0].title, validated_at: rows[0].validated_at });
    } catch (e) { return err(e.message); }
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
// Tool: list_sources
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'list_sources',
  'List all reference documents (sources). A source can be linked to multiple projects. Filter by project or source_type.',
  {
    project_id_or_slug: z.string().optional().describe('Filter sources linked to this project (numeric id or slug)'),
    source_type: z.string().optional().describe('Filter by type (pc_list, directive, spec, contract, ...)'),
  },
  async ({ project_id_or_slug, source_type }) => {
    try {
      const conds = []; const params = [];
      if (project_id_or_slug) {
        const { rows: pj } = await query(
          `SELECT id FROM projects WHERE id::text = $1 OR slug = $1 LIMIT 1`,
          [project_id_or_slug]
        );
        if (!pj[0]) return err(`Project not found: ${project_id_or_slug}`);
        params.push(pj[0].id);
        conds.push(`id IN (SELECT source_id FROM source_projects WHERE project_id = $${params.length})`);
      }
      if (source_type) { params.push(source_type); conds.push(`source_type = $${params.length}`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const { rows } = await query(
        `SELECT id, title, source_type, description, extraction_status,
                extracted_chars, original_filename, mime_type, file_size_bytes,
                projects, created_at, updated_at
           FROM v_sources ${where} ORDER BY created_at DESC`,
        params
      );
      return ok({ count: rows.length, sources: rows });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: get_source_content
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'get_source_content',
  'Get the full extracted text of a source document. Use offset/limit for large documents.',
  {
    source_id: z.number().int().describe('sources.id'),
    offset: z.number().int().min(0).default(0).optional().describe('Character offset for pagination'),
    limit:  z.number().int().min(1).max(80000).default(40000).optional().describe('Max characters to return'),
  },
  async ({ source_id, offset = 0, limit = 40000 }) => {
    try {
      const { rows } = await query(
        `SELECT id, title, source_type, description, extraction_status,
                extraction_error, original_filename, mime_type,
                length(extracted_text) AS total_chars,
                substring(extracted_text FROM $2 FOR $3) AS content_chunk,
                created_at, updated_at
           FROM sources WHERE id = $1`,
        [source_id, offset + 1, limit]
      );
      if (!rows[0]) return err(`Source not found: ${source_id}`);
      const r = rows[0];
      return ok({
        id: r.id, title: r.title, source_type: r.source_type,
        description: r.description, extraction_status: r.extraction_status,
        extraction_error: r.extraction_error,
        original_filename: r.original_filename, mime_type: r.mime_type,
        total_chars: r.total_chars,
        offset, returned_chars: (r.content_chunk || '').length,
        has_more: offset + limit < (r.total_chars || 0),
        content: r.content_chunk,
      });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: create_source
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'create_source',
  'Save a reference document (source) from chat context. The source can be linked to one or more projects via project_ids.',
  {
    title:           z.string().describe('Short descriptive title for this document'),
    source_type:     z.string().optional().describe('Category: pc_list | directive | spec | contract | template | procedure | other'),
    description:     z.string().optional().describe('Precise summary: what the document contains, key columns/sections, relevance'),
    extracted_text:  z.string().optional().describe('Full text content extracted from the source document'),
    project_ids:     z.array(z.number().int()).optional().describe('Projects this source is relevant for (can be empty — linked later)'),
    original_filename: z.string().optional().describe('Original filename if known'),
    mime_type:       z.string().optional(),
  },
  async ({ title, source_type, description, extracted_text, project_ids = [], original_filename, mime_type }) => {
    try {
      const status = extracted_text ? 'success' : 'pending';
      const { rows } = await query(
        `INSERT INTO sources
           (title, source_type, description, extracted_text,
            extraction_status, original_filename, mime_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, title, source_type, extraction_status,
                   length(extracted_text) AS extracted_chars, created_at`,
        [title, source_type || null, description || null,
         extracted_text || null, status, original_filename || null, mime_type || null]
      );
      const sourceId = rows[0].id;
      for (const pid of project_ids) {
        await query(
          `INSERT INTO source_projects (source_id, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [sourceId, pid]
        );
      }
      return ok({ created: rows[0], linked_projects: project_ids });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: update_source
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'update_source',
  'Update the content or metadata of an existing source (e.g. after re-reading an updated file).',
  {
    source_id:      z.number().int().describe('sources.id'),
    title:          z.string().optional(),
    source_type:    z.string().optional(),
    description:    z.string().optional(),
    extracted_text: z.string().optional().describe('Full updated text content'),
  },
  async ({ source_id, title, source_type, description, extracted_text }) => {
    try {
      const sets = [];
      const params = [source_id];
      if (title          !== undefined) { params.push(title);          sets.push(`title = $${params.length}`); }
      if (source_type    !== undefined) { params.push(source_type);    sets.push(`source_type = $${params.length}`); }
      if (description    !== undefined) { params.push(description);    sets.push(`description = $${params.length}`); }
      if (extracted_text !== undefined) {
        params.push(extracted_text);
        sets.push(`extracted_text = $${params.length}`);
        sets.push(`extraction_status = 'success'`);
      }
      if (!sets.length) return err('Nothing to update.');
      await query(`UPDATE sources SET ${sets.join(', ')} WHERE id = $1`, params);
      const { rows } = await query(
        `SELECT id, title, source_type, extraction_status,
                length(extracted_text) AS extracted_chars, updated_at
           FROM sources WHERE id = $1`,
        [source_id]
      );
      if (!rows[0]) return err(`Source not found: ${source_id}`);
      return ok({ updated: rows[0] });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: lookup_whisper_corrections
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'lookup_whisper_corrections',
  'Look up a token in the Whisper corrections dictionary and/or search contacts phonetically. ' +
  'Returns dict hits (incorrect→correct) and/or contact suggestions ranked by trigram similarity.',
  {
    token:   z.string().describe('The token as transcribed by Whisper (e.g. "laine", "web be")'),
    domain:  z.string().default('ETNIC').optional().describe('Correction domain (default: ETNIC)'),
    include_contacts: z.boolean().default(true).optional()
      .describe('Also search contacts phonetically (default: true)'),
    list_all: z.boolean().default(false).optional()
      .describe('If true, return all corrections for the domain (ignore token)'),
  },
  async ({ token, domain = 'ETNIC', include_contacts = true, list_all = false }) => {
    try {
      // ── A. Full dict dump (for MCP prompt bootstrap)
      if (list_all) {
        const { rows } = await query(
          `SELECT incorrect, correct, notes FROM whisper_corrections WHERE domain = $1 ORDER BY incorrect`,
          [domain]
        );
        return ok({ domain, corrections: rows });
      }

      // ── B. Dict lookup: exact + trigram near-matches
      const { rows: dictRows } = await query(
        `SELECT incorrect, correct, notes, confidence,
                similarity(LOWER(incorrect), LOWER($1)) AS score
           FROM whisper_corrections
          WHERE domain = $2
            AND similarity(LOWER(incorrect), LOWER($1)) > 0.25
          ORDER BY score DESC
          LIMIT 5`,
        [token, domain]
      );

      // ── C. Phonetic contact search
      let contactRows = [];
      if (include_contacts) {
        const { rows } = await query(
          `SELECT id, last_name, first_name, job_title, department,
                  GREATEST(
                    similarity(LOWER(last_name), LOWER($1)),
                    similarity(LOWER(COALESCE(last_name,'') || ' ' || COALESCE(first_name,'')), LOWER($1))
                  ) AS score
             FROM contacts
            WHERE active = true
              AND (
                similarity(LOWER(last_name), LOWER($1)) > 0.15
                OR similarity(LOWER(COALESCE(last_name,'') || ' ' || COALESCE(first_name,'')), LOWER($1)) > 0.15
              )
            ORDER BY score DESC
            LIMIT 6`,
          [token]
        );
        contactRows = rows;
      }

      const bestDict = dictRows[0] ?? null;
      const bestContact = contactRows[0] ?? null;

      return ok({
        token,
        domain,
        dict_hits: dictRows,
        best_dict: bestDict ? { incorrect: bestDict.incorrect, correct: bestDict.correct, score: bestDict.score } : null,
        contact_hits: contactRows.map(c => ({
          id: c.id, name: `${c.last_name}${c.first_name ? ' ' + c.first_name : ''}`,
          job_title: c.job_title, score: parseFloat(c.score),
        })),
        best_contact: bestContact ? {
          id: bestContact.id,
          name: `${bestContact.last_name}${bestContact.first_name ? ' ' + bestContact.first_name : ''}`,
          score: parseFloat(bestContact.score),
        } : null,
        recommendation: bestDict
          ? { action: 'replace', correct: bestDict.correct, source: 'dict', confidence: bestDict.score }
          : bestContact && bestContact.score > 0.4
            ? { action: 'replace', correct: `${bestContact.last_name}${bestContact.first_name ? ' ' + bestContact.first_name : ''}`, source: 'contact', confidence: parseFloat(bestContact.score) }
            : { action: 'flag_for_user', confidence: 0 },
      });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Tool: store_whisper_suggestions
// ─────────────────────────────────────────────────────────────────────────
server.tool(
  'store_whisper_suggestions',
  'Store a list of suspicious tokens flagged in a meeting transcript so the user can review them interactively. ' +
  'Each suggestion includes the token, suggested correction, context text, and Whisper TC (tc_start/tc_end).',
  {
    meeting_id:  z.number().int().describe('Meeting id'),
    suggestions: z.array(z.object({
      token:        z.string().describe('Token as Whisper wrote it'),
      suggestion:   z.string().optional().describe('Proposed correction'),
      context_text: z.string().optional().describe('Surrounding sentence fragment'),
      tc_start:     z.number().optional().describe('Whisper segment start (seconds)'),
      tc_end:       z.number().optional().describe('Whisper segment end (seconds)'),
      confidence:   z.number().optional().describe('Confidence 0-1'),
      source:       z.enum(['dict', 'phonetic_contact', 'mcp']).optional().default('mcp'),
      contact_id:   z.number().int().optional().describe('If suggestion is a known contact'),
    })).describe('Array of suspicious token objects'),
    clear_pending: z.boolean().default(true).optional()
      .describe('Clear existing pending suggestions before inserting (default: true)'),
  },
  async ({ meeting_id, suggestions, clear_pending = true }) => {
    try {
      if (clear_pending) {
        await query(
          `DELETE FROM meeting_whisper_suggestions WHERE meeting_id = $1 AND status = 'pending'`,
          [meeting_id]
        );
      }

      let stored = 0;
      for (const s of suggestions) {
        await query(
          `INSERT INTO meeting_whisper_suggestions
             (meeting_id, token, context_text, suggestion, contact_id,
              tc_start, tc_end, confidence, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING`,
          [
            meeting_id, s.token, s.context_text ?? null, s.suggestion ?? null,
            s.contact_id ?? null, s.tc_start ?? null, s.tc_end ?? null,
            s.confidence ?? null, s.source ?? 'mcp',
          ]
        );
        stored++;
      }

      return ok({ meeting_id, stored, message: `${stored} suggestions stored. User can now review them in the Transcript tab.` });
    } catch (e) { return err(e.message); }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Prompt: generate_meeting_cr
// ─────────────────────────────────────────────────────────────────────────
server.prompt(
  'generate_meeting_cr',
  {
    meeting_id: z.string().describe('Projecter meeting id (integer)'),
  },
  ({ meeting_id }) => {
    const meetingId = meeting_id || '<meeting_id>';
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `You are generating a structured compte-rendu (CR) for Projecter meeting id=${meetingId}.

STRICT WORKFLOW — execute ALL 7 steps in order. Do NOT skip any step.

STEP 1 — Load the meeting data
Call: review_extraction({ meeting_id: ${meetingId}, include_raw: true })
Read the COMPLETE raw_transcript carefully. If raw_transcript is null or empty, STOP and report it — do not proceed.
If extraction_status is already 'success', ask the user to confirm before re-extracting.

STEP 1.5 — Scan for suspicious tokens and resolve via corrections dictionary
This step improves transcript quality BEFORE any analysis. Do NOT skip it.

a) Load the corrections dictionary:
   Call: lookup_whisper_corrections({ domain: 'ETNIC', list_all: true })
   This gives you all known incorrect→correct mappings. Keep this list in memory.

b) Read the raw_transcript and flag every token that looks suspicious:
   - Proper nouns that seem phonetically mangled (e.g. "laine" when a person named "Lesne" is expected)
   - Acronyms split or distorted (e.g. "web be" → "WBE", "et nique" → "ETNIC")
   - Technical terms from the ETNIC/public-sector domain that sound unusual
   - Any token you are NOT confident about

c) For each flagged token:
   - First check your loaded dict: if there is an exact or near-exact match (incorrect ≈ token), apply it automatically (confidence > 0.7).
   - If uncertain, call: lookup_whisper_corrections({ token: "<token>", domain: 'ETNIC' })
     Use the returned recommendation:
       • action = 'replace', confidence > 0.7 → apply automatically, note it
       • action = 'replace', confidence 0.4-0.7 → flag for user (add to suggestions below)
       • action = 'flag_for_user' → always flag for user

d) Collect all tokens that need user validation (confidence < 0.7 or no match found).
   For each, find its Whisper timecode from the raw_transcript segment data (tc_start / tc_end).
   Then call: store_whisper_suggestions({
     meeting_id: ${meetingId},
     suggestions: [
       { token: "laine", suggestion: "Lesne", context_text: "…rencontre avec laine demain…",
         tc_start: 834.2, tc_end: 835.1, confidence: 0.6, source: "dict" },
       ...
     ]
   })
   Report to the user: "X tokens flagged for your review in the Transcript tab."

STEP 2 — Resolve participant names
First, call: db_query({ sql: "SELECT ms.label, ms.display_name, c.id AS contact_id, c.last_name, c.first_name FROM meeting_speakers ms LEFT JOIN contacts c ON c.id = ms.contact_id WHERE ms.meeting_id = ${meetingId} AND ms.contact_id IS NOT NULL" })
This returns already-validated speaker→contact mappings from previous diarization. Use these directly.
For any remaining unresolved speaker identifiers ([LV], [JD], SPEAKER_00, etc.) not covered above, use search_contacts to resolve their full name and contact id.

STEP 3 — Build the executive summary (5-15 lines)
A concise narrative covering: context, main topics discussed, key decisions, and next steps.

STEP 4 — Build topics (exhaustive)
First call: get_project_topics({ project_id_or_slug: "<project_id>" }) to get existing strategic project topics (project_topics). Note their id values — you will use them as project_topic_id.

For EACH distinct theme/subject discussed: position (1-based), title, summary (2-5 lines), type (see guide), commitment_level (see guide). If the topic clearly corresponds to an existing project_topic, set project_topic_id to its id.

type guide:
- information : évoqué pour partage, sans décision
- decision    : décision prise en séance
- action      : action concrète à faire
- risk        : risque identifié ou évoqué
- issue       : problème actif, blocant ou incident en cours
- open_point  : point non résolu, à suivre
- other       : autre

commitment_level guide:
- mentioned    : évoqué sans engagement ("ça pourrait poser problème")
- acknowledged : pris en compte, à suivre ("je vais vérifier")
- agreed       : accord informel ("on est d'accord")
- decided      : décision formelle prise en séance

Do not omit topics. Err on the side of more topics.
If this meeting introduces a new recurring strategic theme not yet in project_topics, call upsert_project_topic to create it, then use the returned id as project_topic_id.

STEP 5 — Build decisions
For EACH explicit decision or consensus reached: description (what was decided), impact (why it matters), position.

STEP 6 — Build actions
For EACH concrete action item: description (what must be done), owner_raw (last name only, as mentioned in transcript), deadline (YYYY-MM-DD or null if not specified), notes (context if relevant).

STEP 7 — Ingest and verify
Call: ingest_meeting_extraction({
  meeting_id: ${meetingId},
  executive_summary: "...",
  topics: [...],
  decisions: [...],
  actions: [...],
  attendees: [{ name_raw: "...", role: "...", status: "present" }, ...]
})
Then call: get_meeting_actions({ meeting_id: ${meetingId} }) to confirm everything is stored.
Report unresolved_owners and unresolved_attendees to the user.

STRICT RULES:
- Never fabricate actions, decisions, or topics not present in the transcript.
- Never skip a step. If a step cannot be completed, explain why explicitly.
- owner_raw = last name only (e.g. "DEVOOGHT", not "Jean-Pierre DEVOOGHT").
- Dates in ISO format YYYY-MM-DD. If only a relative date ("next week"), compute from the meeting start_at.
- If multiple speakers are unclear, add a note in the relevant topic/action.`,
        },
      }],
    };
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

## ENUMs
- project_status: idea|mandate_received|briefing_draft|briefing_review|briefing_approved|sheet_draft|sheet_review|sheet_approved_etnic|sheet_approved_wbe|sheet_signed|in_progress|closed|cancelled
- urgency_level: high|medium|low
- topic_type: information|decision|action|risk|issue|open_point|other
- commitment_level: mentioned|acknowledged|agreed|decided
- action_status: open|done|cancelled|overdue
- attendance_status: present|excused|absent|invited
- extraction_status: pending|success|failed|skipped
- risk_status: open|mitigating|closed|accepted
- risk_level: low|medium|high|critical
- rag_color: green|amber|red|grey
- confidence_level: low|medium|high
- project_axis: scope|planning|budget|resources|risk|governance|stakeholder|quality|security|change_management|benefits|dependencies|support_run
- meeting_type: etnic_excom|wbe_excom|governance_committee|steering_committee|portfolio_committee|technical_wg|functional_wg|procurement_wg|kickoff|follow_up|other
- document_type: mandate|briefing_note|dip|project_sheet|meeting_minutes|appendix|other
- membership_role: manager|team_leader|member|consultant|advisor|analyst|detached

## Reference tables
- organizations(id, code, name)
- org_units(id, organization_id->organizations, code, label, level_label, depth, path, parent_id, manager_contact_id, is_interim) -- dynamic hierarchy
- roles(id, label)
- public_procurements(id, reference, label)

## Core
- contacts(id, last_name, first_name, email, organization_id, job_title)
- memberships(id, contact_id, org_unit_id, role[membership_role])
- projects(id, code, title, slug, status[project_status], urgency[urgency_level], priority[priority_level],
           client_organization_id, status_brief, status_brief_updated_at,
           rag_global, rag_planning, rag_budget, rag_scope, rag_risks,
           highlights, concerns, next_steps, attributes JSONB)
- project_members(id, project_id, contact_id, role[project_role], effort_md, display_order)
- project_topics(id, project_id, title, status[project_status or free text],
                 axes[] project_axis — ARRAY of project_axis values, e.g. {resources,risk},
                 synthesis TEXT, confidence[confidence_level],
                 owner TEXT, due_date DATE, created_at, updated_at)
  → Persistent strategic topics for a project (not tied to a single meeting).
  → meeting_topics.project_topic_id FK links a meeting topic to a project topic.
- risks(id, label, probability, impact, severity[risk_level], status[risk_status], owner_contact_id, mitigation_plan, due_date) — N-to-N with projects via risk_projects
- risk_projects(id, risk_id, project_id, impact, context)
- v_risks VIEW — risks with projects[] aggregated as JSON + owner_name
- documents(id, project_id, type[document_type], version, status[document_status], attributes JSONB)
- document_files(id, document_id, storage_path, extracted_text)
- meetings(id, project_id, title, type[meeting_type], start_at, location,
           meeting_category TEXT,
           audio_path TEXT, ai_report TEXT,
           transformer_transcript_id,
           extraction_status[extraction_status], executive_summary,
           raw_transcript, minutes, decisions, actions)
- meeting_attendees(id, meeting_id, contact_id, status[attendance_status], role)
- meeting_speakers(id, meeting_id, label, display_name, contact_id→contacts,
                   validated_by_user BOOLEAN, total_duration_s, total_pct,
                   suggested_contact_id, suggested_contact_name, suggested_score, suggested_confidence)
  → Speaker tracks from audio diarization (SPEAKER_00, [LV], etc.).
- meeting_topics(id, meeting_id, position, title, summary,
                 type[topic_type], commitment_level[commitment_level],
                 project_topic_id→project_topics FK (nullable),
                 linked_object_type TEXT (nullable), linked_object_id INT (nullable))
  → project_topic_id links this meeting topic to a strategic project_topic.
  → linked_object_type/id for future links to risks, documents, etc.
- meeting_decisions(id, meeting_id, description, impact, position, driver_contact_id, approver_contact_id, is_reversible)
- meeting_actions(id, meeting_id, owner_id→contacts, owner_raw, description, deadline, status[action_status], notes)
- v_open_actions VIEW — open actions with owner/meeting/project context
- timeline_events(id, project_id, label, type[timeline_event_type], event_date)
- sources(id, title, source_type, description, extracted_text,
          extraction_status[extraction_status], extraction_error,
          storage_path, original_filename, mime_type, file_size_bytes,
          uploaded_by_contact_id, created_at, updated_at) — N-to-N with projects
- source_projects(id, source_id, project_id, context)
- v_sources VIEW — sources with projects[] aggregated as JSON

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
