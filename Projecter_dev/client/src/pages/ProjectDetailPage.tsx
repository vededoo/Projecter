import React, { useEffect, useRef, useState } from 'react';
import { api, JsonApiList, JsonApiOne } from '../api';
import { InlineEdit } from '../components/InlineEdit';
import { SortablePersonList } from '../components/SortablePersonList';
import { useContactEditor } from '../components/useContactEditor';

const BASE = '/api';

const INP: React.CSSProperties = {
  background: 'var(--panel-2)', border: '1px solid var(--border)',
  color: 'var(--text)', padding: '5px 8px', borderRadius: 4, fontSize: 13,
};

const EditableList = ({
  label, items, newVal, setNewVal, onAdd, onRemove, onRename,
}: {
  label: string;
  items: string[];
  newVal: string;
  setNewVal: (v: string) => void;
  onAdd: (val: string) => void;
  onRemove: (idx: number) => void;
  onRename: (idx: number, newVal: string) => void;
}) => (
  <div style={{ flex: 1, minWidth: 160 }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
    {items.length === 0 && <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>None yet.</div>}
    {items.map((item, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
        <span style={{ color: 'var(--muted)', marginTop: 2 }}>•</span>
        <InlineEdit
          value={item}
          onSave={v => onRename(i, v)}
          style={{ flex: 1, fontSize: 13 }}
        />
        <button
          onClick={() => onRemove(i)}
          title="Remove"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: '0 2px', lineHeight: 1.2, flexShrink: 0 }}
        >✕</button>
      </div>
    ))}
    <form
      onSubmit={e => { e.preventDefault(); onAdd(newVal); }}
      style={{ display: 'flex', gap: 5, marginTop: 6 }}
    >
      <input
        value={newVal}
        onChange={e => setNewVal(e.target.value)}
        placeholder="Add item…"
        style={{ ...INP, flex: 1, fontSize: 12 }}
      />
      <button
        type="submit"
        disabled={!newVal.trim()}
        style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, opacity: !newVal.trim() ? 0.5 : 1 }}
      >+</button>
    </form>
  </div>
);

interface Project {
  code: string | null; title: string; slug: string; status: string;
  urgency: string | null; priority: string | null;
  rag_global: string; rag_planning: string; rag_budget: string;
  rag_scope: string; rag_risks: string;
  status_brief: string | null; status_brief_updated_at: string | null;
  highlights: string[]; concerns: string[]; next_steps: string[];
  attributes: Record<string, any>;
  // Admin fields
  date_first_raised: string | null;
  mantis_submission_date: string | null;
  mantis_id: string | null;
  mantis_reporter: string | null;
  mantis_assignment: string | null;
  stage: string | null;
  phase: string | null;
  phase_progress: string | null;
  project_mandate_date: string | null;
  project_mandate_comment: string | null;
  planview_item_name: string | null;
  planview_id: string | null;
  planview_type: string | null;
  planview_comment: string | null;
  planview_activity: string | null;
}
interface MemberItem {
  id: string;
  contact_id: number;
  role: string; role_id: number | null; role_label: string | null;
  effort_md: string | null;
  last_name: string; first_name: string; job_title: string;
  organization_code: string | null; org_unit_label: string | null;
  display_order: number | null;
}
interface ContactOption {
  id: string; last_name: string; first_name: string;
  email: string | null; job_title: string | null;
  default_role_id: number | null; default_role_label: string | null;
}
interface Risk {
  label: string; probability: string | null; impact: string | null;
  severity: string | null; status: string; due_date: string | null;
}
interface Doc {
  id: string; type: string; title: string | null; version: string;
  status: string; generated_from_template: boolean;
  generated_file_path: string | null;
}
interface DocTemplate {
  id: string; name: string; doc_type: string; description: string | null;
}
interface Meeting {
  id: string; title: string; type: string; start_at: string;
  extraction_status: string; validated_at: string | null;
  open_action_count?: number;
}
interface SourceItem {
  id: string; title: string; source_type: string | null;
  original_filename: string | null; mime_type: string | null;
  file_size_bytes: number | null; extraction_status: string;
}

interface ProjectTopic {
  id: string;
  title: string;
  status: 'open' | 'on_hold' | 'invalidated' | 'closed';
  created_at: string;
  updated_at: string;
  // Migration 015 fields
  axes: string[];
  synthesis: string | null;
  confidence: 'low' | 'medium' | 'high' | null;
  owner: string | null;
  due_date: string | null;
  // Latest snapshot (from most recent linked meeting_topic)
  snapshot_id: number | null;
  snapshot_title: string | null;
  snapshot_summary: string | null;
  snapshot_type: string | null;
  last_meeting_id: number | null;
  last_meeting_title: string | null;
  last_meeting_date: string | null;
  last_meeting_category: string | null;
  // UI-only: history expanded
  history?: TopicSnapshot[];
  historyLoaded?: boolean;
  historyOpen?: boolean;
}

interface TopicSnapshot {
  snapshot_id: number;
  snapshot_title: string;
  snapshot_summary: string | null;
  snapshot_type: string;
  meeting_id: number;
  meeting_title: string;
  meeting_date: string;
  meeting_category: string;
}

const TOPIC_STATUS_COLORS: Record<string, { backgroundColor: string; color: string }> = {
  open:        { backgroundColor: '#e3f2fd', color: '#1565c0' },
  on_hold:     { backgroundColor: '#fff3e0', color: '#e65100' },
  invalidated: { backgroundColor: '#fce4ec', color: '#880e4f' },
  closed:      { backgroundColor: '#e8f5e9', color: '#2e7d32' },
};

const PROJECT_ROLES = [
  'sponsor_wbe', 'sponsor_etnic', 'requester', 'responsible_for_request',
  'etnic_project_manager', 'business_project_manager',
  'etnic_portfolio_manager', 'wbe_portfolio_manager',
  'expert', 'it_team_member', 'business_team_member', 'observer',
] as const;

const RAG_FIELDS = [
  { key: 'rag_global',   label: 'global' },
  { key: 'rag_planning', label: 'planning' },
  { key: 'rag_budget',   label: 'budget' },
  { key: 'rag_scope',    label: 'scope' },
  { key: 'rag_risks',    label: 'risks' },
] as const;

const RAG_DOT_COLORS: Record<string, string> = {
  green: '#4caf50',
  amber: '#ff9800',
  red:   '#f44336',
  grey:  '#9e9e9e',
};

const RAG_VALUES = ['green', 'amber', 'red', 'grey'] as const;

const AXES = [
  'scope', 'planning', 'budget', 'resources', 'risk',
  'governance', 'stakeholder', 'quality', 'security',
  'change_management', 'benefits', 'dependencies', 'support_run',
] as const;

const CONFIDENCE_COLORS: Record<string, string> = {
  low:    '#f44336',
  medium: '#ff9800',
  high:   '#4caf50',
};

const RAG = ['rag_global', 'rag_planning', 'rag_budget', 'rag_scope', 'rag_risks'] as const;

function fmtSize(b: number | null) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

type TabKey = 'overview' | 'topics' | 'stakeholders' | 'meetings' | 'administration' | 'sources' | 'costra';

export function ProjectDetailPage({ id, onBack, onGoToMeeting }: { id: string; onBack: () => void; onGoToMeeting?: (meetingId: string) => void }) {
  // ── Tab navigation ─────────────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>('overview');

  // ── Core data ──────────────────────────────────────────────────────────────
  const [project, setProject]   = useState<Project | null>(null);
  const [topics, setTopics]     = useState<ProjectTopic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [members, setMembers]   = useState<MemberItem[]>([]);
  const [risks, setRisks]       = useState<Risk[]>([]);
  const [docs, setDocs]         = useState<Doc[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sources, setSources]     = useState<SourceItem[]>([]);
  const [templates, setTemplates] = useState<DocTemplate[]>([]);
  const [error, setError]         = useState<string | null>(null);

  // ── Overview inline-edit state ────────────────────────────────────────────
  const [editingRag, setEditingRag]       = useState<string | null>(null);
  const [statusBriefLocal, setStatusBriefLocal] = useState('');
  const [savingBrief, setSavingBrief]     = useState(false);
  const [newHighlight, setNewHighlight]   = useState('');
  const [newConcern, setNewConcern]       = useState('');
  const [newNextStep, setNewNextStep]     = useState('');

  // ── Topics axis filter ─────────────────────────────────────────────────────
  const [axisFilter, setAxisFilter] = useState<string | null>(null);

  // ── Generate document ─────────────────────────────────────────────────────
  const [showGenerate, setShowGenerate]   = useState(false);
  const [genTemplateId, setGenTemplateId] = useState('');
  const [generating, setGenerating]       = useState(false);

  // ── Add stakeholder form ──────────────────────────────────────────────────
  const [showAddMember, setShowAddMember]     = useState(false);
  const [memberSearch, setMemberSearch]       = useState('');
  const [searchResults, setSearchResults]     = useState<ContactOption[]>([]);
  const [selContact, setSelContact]           = useState<ContactOption | null>(null);
  const [memberRoleId, setMemberRoleId]       = useState('');
  const [memberEffort, setMemberEffort]       = useState('');
  const [addingMember, setAddingMember]       = useState(false);
  const [removingId, setRemovingId]           = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles]   = useState<{id: number; label: string}[]>([]);

  // ── Édition de contact depuis la liste des stakeholders ────────────────────
  const { openContactEditor, contactEditor } = useContactEditor();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Costra state ───────────────────────────────────────────────────────────
  interface CostraAttrs { [key: string]: unknown }
  interface CostraFile  { filename: string; size: number; createdAt: string | null }
  const [costraAttrs,      setCostraAttrs]      = useState<CostraAttrs>({});
  const [costraFiles,      setCostraFiles]      = useState<CostraFile[]>([]);
  const [costraSaving,     setCostraSaving]     = useState(false);
  const [costraGenerating, setCostraGenerating] = useState(false);
  const [costraGenMsg,     setCostraGenMsg]     = useState<string | null>(null);

  const loadCostraAttrs = () =>
    api.get<{ data: { attributes: CostraAttrs } }>(`/projects/${id}/costra/attributes`)
      .then(r => setCostraAttrs(r.data.attributes || {}))
      .catch(() => {});

  const loadCostraFiles = () =>
    api.get<{ data: { id: string; attributes: CostraFile }[] }>(`/projects/${id}/costra/files`)
      .then(r => setCostraFiles(r.data.map(x => x.attributes)))
      .catch(() => {});

  const saveCostraAttrs = async (patch: CostraAttrs) => {
    setCostraSaving(true);
    try {
      const r = await api.patch<{ data: { attributes: CostraAttrs } }>(
        `/projects/${id}/costra/attributes`, patch, 'costra-attributes'
      );
      setCostraAttrs(r.data.attributes || {});
    } finally { setCostraSaving(false); }
  };

  const generateCostra = async () => {
    setCostraGenerating(true);
    setCostraGenMsg(null);
    try {
      await api.post(`/projects/${id}/costra/generate`, {}, 'costra-generate');
      setCostraGenMsg('✅ Fiche generated successfully!');
      loadCostraFiles();
    } catch (e: unknown) {
      setCostraGenMsg('❌ ' + (e instanceof Error ? e.message : 'Generation failed'));
    } finally { setCostraGenerating(false); }
  };

  const loadMembers = () =>
    api.get<JsonApiList<MemberItem>>(`/project-members?project_id=${id}`)
      .then(m => setMembers(m.data.map(x => ({ ...x.attributes, id: x.id }))));

  const loadSources = () =>
    api.get<JsonApiList<SourceItem>>(`/sources?project_id=${id}`)
      .then(s => setSources(s.data.map(x => ({ ...x.attributes, id: x.id }))));

  const loadDocs = () =>
    api.get<JsonApiList<Doc>>(`/documents?project_id=${id}`)
      .then(d => setDocs(d.data.map(x => ({ ...x.attributes, id: x.id }))));

  const loadTopics = () =>
    api.get<JsonApiList<ProjectTopic>>(`/project-topics?project_id=${id}`)
      .then(t => setTopics(t.data.map(x => ({ ...x.attributes, id: x.id }))));

  // ── Project PATCH helper ───────────────────────────────────────────────────
  const patchProject = async (attrs: Partial<Project>) => {
    await api.patch(`/projects/${id}`, attrs as Record<string, unknown>, 'project');
    setProject(prev => prev ? { ...prev, ...attrs } : prev);
  };

  useEffect(() => {
    Promise.all([
      api.get<JsonApiOne<Project>>(`/projects/${id}`),
      api.get<JsonApiList<MemberItem>>(`/project-members?project_id=${id}`),
      api.get<JsonApiList<Risk>>(`/risks?project_id=${id}`),
      api.get<JsonApiList<Doc>>(`/documents?project_id=${id}`),
      api.get<JsonApiList<Meeting>>(`/meetings?project_id=${id}`),
      api.get<JsonApiList<SourceItem>>(`/sources?project_id=${id}`),
      api.get<JsonApiList<DocTemplate>>(`/document-templates`),
      api.get<JsonApiList<ProjectTopic>>(`/project-topics?project_id=${id}`),
      api.get<JsonApiList<{ label: string; active: boolean }>>('/roles'),
    ])
      .then(([p, m, r, d, mt, s, tmpl, tp, roles]) => {
        const proj = p.data.attributes;
        setProject(proj);
        setStatusBriefLocal(proj.status_brief || '');
        setMembers(m.data.map(x => ({ ...x.attributes, id: x.id })));
        setRisks(r.data.map(x => x.attributes));
        setDocs(d.data.map(x => ({ ...x.attributes, id: x.id })));
        setMeetings(mt.data.map(x => ({ ...x.attributes, id: x.id })));
        setSources(s.data.map(x => ({ ...x.attributes, id: x.id })));
        setTemplates(tmpl.data.map(x => ({ ...x.attributes, id: x.id })));
        setTopics(tp.data.map(x => ({ ...x.attributes, id: x.id })));
        setAvailableRoles(roles.data.filter(x => x.attributes.active).map(x => ({ id: Number(x.id), label: x.attributes.label })));
      })
      .catch(e => setError(e.message));
    // Costra (best-effort — non bloquant)
    loadCostraAttrs();
    loadCostraFiles();
  }, [id]); // eslint-disable-line

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTemplateId) return;
    setGenerating(true);
    try {
      await api.post('/documents/generate', {
        template_id: Number(genTemplateId),
        project_id: Number(id),
      }, 'documents');
      setShowGenerate(false);
      setGenTemplateId('');
      await loadDocs();
    } catch (err: any) { setError(err.message); }
    finally { setGenerating(false); }
  };

  // ── Contact search (debounced) ─────────────────────────────────────────────
  const handleMemberSearch = (q: string) => {
    setMemberSearch(q);
    setSelContact(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/contacts?q=${encodeURIComponent(q)}&limit=8`);
        const json = await res.json();
        setSearchResults((json.data || []).map((x: any) => ({ ...x.attributes, id: x.id })));
      } catch { setSearchResults([]); }
    }, 300);
  };

  // Sélection d'un contact dans le typeahead : pré-remplit le rôle avec sa
  // fonction par défaut (default_role_id), modifiable avant validation.
  const selectMemberContact = (c: ContactOption) => {
    setSelContact(c);
    setMemberSearch('');
    setSearchResults([]);
    if (c.default_role_id && !memberRoleId) {
      setMemberRoleId(String(c.default_role_id));
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selContact || !memberRoleId) return;
    setAddingMember(true);
    try {
      await api.post('/project-members', {
        project_id: Number(id),
        contact_id: Number(selContact.id),
        role_id: Number(memberRoleId),
        effort_md: memberEffort ? Number(memberEffort) : null,
      }, 'project-member');
      setShowAddMember(false);
      setMemberSearch(''); setSelContact(null); setMemberRoleId(''); setMemberEffort('');
      setSearchResults([]);
      await loadMembers();
    } catch (err: any) { setError(err.message); }
    finally { setAddingMember(false); }
  };

  const handleRemoveMember = async (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (removingId !== memberId) { setRemovingId(memberId); return; }
    try {
      await api.del(`/project-members/${memberId}`);
      setRemovingId(null);
      await loadMembers();
    } catch (err: any) { setError(err.message); }
  };

  // ── Reorder stakeholders (DND) ─────────────────────────────────────────────
  const handleReorderMembers = async (newIds: string[]) => {
    const reordered = newIds.map(nid => members.find(m => m.id === nid)).filter((m): m is MemberItem => !!m);
    setMembers(reordered);
    try {
      await api.patch('/project-members/reorder', { order: newIds.map(Number) }, 'project-member');
    } catch (err: any) {
      setError(err.message);
      await loadMembers();
    }
  };

  // ── RAG inline edit ────────────────────────────────────────────────────────
  const handleRagChange = async (field: string, value: string) => {
    setEditingRag(null);
    await patchProject({ [field]: value } as any);
  };

  // ── Status brief save on blur ──────────────────────────────────────────────
  const handleBriefBlur = async () => {
    if (!project || statusBriefLocal === (project.status_brief || '')) return;
    setSavingBrief(true);
    try { await patchProject({ status_brief: statusBriefLocal }); }
    finally { setSavingBrief(false); }
  };

  // ── Highlights / Concerns / Next steps ────────────────────────────────────
  const saveList = async (field: 'highlights' | 'concerns' | 'next_steps', list: string[]) => {
    await patchProject({ [field]: list } as any);
  };

  const handleAddItem = async (field: 'highlights' | 'concerns' | 'next_steps', val: string) => {
    if (!val.trim() || !project) return;
    const list = [...(project[field] || []), val.trim()];
    await saveList(field, list);
    if (field === 'highlights') setNewHighlight('');
    if (field === 'concerns')   setNewConcern('');
    if (field === 'next_steps') setNewNextStep('');
  };

  const handleRemoveItem = async (field: 'highlights' | 'concerns' | 'next_steps', idx: number) => {
    if (!project) return;
    const list = (project[field] || []).filter((_: string, i: number) => i !== idx);
    await saveList(field, list);
  };

  const handleRenameItem = async (field: 'highlights' | 'concerns' | 'next_steps', idx: number, newVal: string) => {
    if (!project) return;
    const list = (project[field] || []).map((v: string, i: number) => i === idx ? newVal : v);
    await saveList(field, list);
  };

  // ── Source preview / download ──────────────────────────────────────────────
  const openSource = (s: SourceItem) => {
    const isPdf = (s.mime_type || '').includes('pdf');
    const url = `${BASE}/sources/${s.id}/file`;
    if (isPdf) {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = s.original_filename || s.title;
      a.click();
    }
  };

  if (error) return <div className="error">{error}</div>;
  if (!project) return <div className="empty">Loading…</div>;

  // ─── Tab config ─────────────────────────────────────────────────────────────
  const TABS: { key: TabKey; label: string }[] = [
    { key: 'overview',        label: 'Overview' },
    { key: 'topics',          label: `Topics (${topics.length})` },
    { key: 'stakeholders',    label: `Stakeholders (${members.length})` },
    { key: 'meetings',        label: `Meetings (${meetings.length})` },
    { key: 'administration',  label: '⚙ Administration' },
    { key: 'sources',         label: `Sources (${sources.length})` },
    { key: 'costra',          label: '📋 COSTRA' },
  ];

  const filteredTopics = axisFilter
    ? topics.filter(t => (Array.isArray(t.axes) ? t.axes : []).includes(axisFilter))
    : topics;

  // ─── Inline sub-components ──────────────────────────────────────────────────
  const RagDot = ({ value }: { value: string }) => (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: RAG_DOT_COLORS[value] || '#9e9e9e',
      marginRight: 5, verticalAlign: 'middle', flexShrink: 0,
    }} />
  );

  return (
    <div>
      {/* ── Fixed header ─────────────────────────────────────────────────────── */}
      <p style={{ marginBottom: 8 }}><button className="btn" onClick={onBack}>← Back</button></p>
      <h2 style={{ marginBottom: 4 }}>
        {project.code ? `[${project.code}] ` : ''}
        <InlineEdit
          value={project.title}
          onSave={title => patchProject({ title })}
          as="span"
        />
      </h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        <strong>#{id}</strong> · slug: {project.slug} · status: <span className="badge">{project.status}</span>
        {project.urgency  && <> · urgency: {project.urgency}</>}
        {project.priority && <> · priority: {project.priority}</>}
      </p>

      {/* ── Tab navigation ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 24, gap: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
              padding: '8px 18px',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? 'var(--text)' : 'var(--muted)',
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div>
          {/* ── RAG strip ──────────────────────────────────────────────────── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 8 }}>RAG</span>
              {RAG_FIELDS.map(f => {
                const val = (project as any)[f.key] || 'grey';
                return (
                  <div key={f.key} style={{ position: 'relative' }}>
                    {editingRag === f.key ? (
                      <select
                        autoFocus
                        value={val}
                        onChange={e => handleRagChange(f.key, e.target.value)}
                        onBlur={() => setEditingRag(null)}
                        style={{ ...INP, fontSize: 12, padding: '2px 6px' }}
                      >
                        {RAG_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingRag(f.key)}
                        title="Click to edit"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'var(--panel-2)', border: '1px solid var(--border)',
                          borderRadius: 16, padding: '3px 10px', cursor: 'pointer',
                          fontSize: 12, color: 'var(--text)',
                        }}
                      >
                        <RagDot value={val} />
                        {f.label}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Status brief + H/C/NS ──────────────────────────────────────── */}
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="col">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>Status brief</h3>
                  {savingBrief && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Saving…</span>}
                </div>
                <textarea
                  value={statusBriefLocal}
                  onChange={e => setStatusBriefLocal(e.target.value)}
                  onBlur={handleBriefBlur}
                  placeholder="Write a narrative status summary (for COPIL, ~3 sentences)…"
                  rows={5}
                  style={{ ...INP, width: '100%', resize: 'vertical', lineHeight: 1.6, fontSize: 13 }}
                />
                {project.status_brief_updated_at && (
                  <p className="muted" style={{ fontSize: 11, marginTop: 6, marginBottom: 0 }}>
                    Updated {new Date(project.status_brief_updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="col">
              <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 16 }}>Status report items</h3>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <EditableList
                    label="Highlights"
                    items={project.highlights || []}
                    newVal={newHighlight}
                    setNewVal={setNewHighlight}
                    onAdd={val => handleAddItem('highlights', val)}
                    onRemove={idx => handleRemoveItem('highlights', idx)}
                    onRename={(idx, v) => handleRenameItem('highlights', idx, v)}
                  />
                  <EditableList
                    label="Concerns"
                    items={project.concerns || []}
                    newVal={newConcern}
                    setNewVal={setNewConcern}
                    onAdd={val => handleAddItem('concerns', val)}
                    onRemove={idx => handleRemoveItem('concerns', idx)}
                    onRename={(idx, v) => handleRenameItem('concerns', idx, v)}
                  />
                  <EditableList
                    label="Next steps"
                    items={project.next_steps || []}
                    newVal={newNextStep}
                    setNewVal={setNewNextStep}
                    onAdd={val => handleAddItem('next_steps', val)}
                    onRemove={idx => handleRemoveItem('next_steps', idx)}
                    onRename={(idx, v) => handleRenameItem('next_steps', idx, v)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Risks (résumé sur l'overview) ────────────────────────────────── */}
          {risks.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 14 }}>Risks ({risks.length})</h3>
              <table>
                <thead><tr><th>Label</th><th>Prob</th><th>Impact</th><th>Severity</th><th>Status</th><th>Due</th></tr></thead>
                <tbody>
                  {risks.map((r, i) => (
                    <tr key={i}>
                      <td>{r.label}</td>
                      <td><span className={`badge ${r.probability || ''}`}>{r.probability || '—'}</span></td>
                      <td><span className={`badge ${r.impact || ''}`}>{r.impact || '—'}</span></td>
                      <td><span className={`badge ${r.severity || ''}`}>{r.severity || '—'}</span></td>
                      <td>{r.status}</td>
                      <td className="muted">{r.due_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: TOPICS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'topics' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Topics ({topics.length})</h3>
            <button
              onClick={() => setShowAddTopic(v => !v)}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
            >{showAddTopic ? 'Cancel' : '+ Add topic'}</button>
          </div>

          {/* Axis filter chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              onClick={() => setAxisFilter(null)}
              style={{
                background: axisFilter === null ? 'var(--accent)' : 'var(--panel-2)',
                color: axisFilter === null ? '#fff' : 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 14, padding: '3px 12px', cursor: 'pointer', fontSize: 11,
                fontWeight: axisFilter === null ? 700 : 400,
              }}
            >All ({topics.length})</button>
            {AXES.map(a => {
              const count = topics.filter(t => (Array.isArray(t.axes) ? t.axes : []).includes(a)).length;
              const isActive = axisFilter === a;
              return (
                <button
                  key={a}
                  onClick={() => setAxisFilter(isActive ? null : a)}
                  style={{
                    background: isActive ? 'var(--accent)' : 'var(--panel-2)',
                    color: isActive ? '#fff' : count > 0 ? 'var(--text)' : 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 14, padding: '3px 10px', cursor: 'pointer', fontSize: 11,
                    fontWeight: isActive ? 700 : 400,
                    opacity: count === 0 && !isActive ? 0.5 : 1,
                  }}
                >{a.replace(/_/g, ' ')}{count > 0 ? ` (${count})` : ''}</button>
              );
            })}
          </div>

          {/* Add topic form */}
          {showAddTopic && (
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!newTopicTitle.trim()) return;
                setAddingTopic(true);
                try {
                  await api.post('/project-topics', {
                    project_id: Number(id), title: newTopicTitle.trim(), status: 'open',
                  }, 'project-topic');
                  setNewTopicTitle('');
                  setShowAddTopic(false);
                  await loadTopics();
                } catch { /* ignore */ }
                finally { setAddingTopic(false); }
              }}
              style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'flex-end' }}
            >
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>TITLE *</label>
                <input
                  value={newTopicTitle} onChange={e => setNewTopicTitle(e.target.value)}
                  placeholder="Topic title…"
                  style={{ ...INP, width: '100%' }}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={addingTopic || !newTopicTitle.trim()}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 6, cursor: 'pointer' }}>
                {addingTopic ? '…' : 'Add'}
              </button>
            </form>
          )}

          {filteredTopics.length === 0 && !showAddTopic && (
            <div className="empty">
              {axisFilter
                ? `No topics tagged with axis "${axisFilter.replace(/_/g, ' ')}".`
                : 'No project topics yet. Topics are created automatically when you promote a meeting topic, or manually above.'}
            </div>
          )}

          {filteredTopics.map(t => {
            const sc = TOPIC_STATUS_COLORS[t.status] || TOPIC_STATUS_COLORS.open;
            return (
              <div key={t.id} style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                {/* Topic header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--panel-2)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14 }}>
                    <InlineEdit
                      value={t.title}
                      onSave={async title => {
                        const res = await fetch(`${BASE}/project-topics/${t.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ data: { type: 'project-topic', attributes: { title } } }),
                        });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        setTopics(prev => prev.map(x => x.id === t.id ? { ...x, title } : x));
                      }}
                    />
                  </div>

                  {/* Axis tags */}
                  {(Array.isArray(t.axes) ? t.axes : []).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(Array.isArray(t.axes) ? t.axes : []).map(a => (
                        <span key={a} style={{
                          fontSize: 10, padding: '1px 7px', borderRadius: 10,
                          background: 'var(--panel)', border: '1px solid var(--border)',
                          color: 'var(--muted)', cursor: 'pointer',
                        }} onClick={() => setAxisFilter(a === axisFilter ? null : a)}>
                          {a.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confidence */}
                  {t.confidence && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: CONFIDENCE_COLORS[t.confidence] }}>
                      {t.confidence}
                    </span>
                  )}

                  {/* Owner */}
                  {t.owner && <span style={{ fontSize: 11, color: 'var(--muted)' }}>👤 {t.owner}</span>}

                  {/* Due date */}
                  {t.due_date && (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      📅 {new Date(t.due_date).toLocaleDateString('fr-FR')}
                    </span>
                  )}

                  {/* Status selector */}
                  <select
                    value={t.status}
                    onChange={async e => {
                      const newStatus = e.target.value;
                      const res = await fetch(`${BASE}/project-topics/${t.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: { type: 'project-topic', attributes: { status: newStatus } } }),
                      });
                      if (res.ok) setTopics(prev => prev.map(x => x.id === t.id ? { ...x, status: newStatus as any } : x));
                    }}
                    style={{ fontSize: 11, padding: '2px 6px', borderRadius: 10, border: 'none', fontWeight: 600, cursor: 'pointer', width: 'auto', flexShrink: 0, ...sc }}
                  >
                    <option value="open">open</option>
                    <option value="on_hold">on hold</option>
                    <option value="invalidated">invalidated</option>
                    <option value="closed">closed</option>
                  </select>

                  {/* History toggle */}
                  {t.last_meeting_id && (
                    <button
                      onClick={async () => {
                        if (!t.historyLoaded) {
                          const res = await fetch(`${BASE}/project-topics/${t.id}`);
                          const body = await res.json();
                          const hist: TopicSnapshot[] = (body.data?.attributes?.history || []).map((h: any) => ({
                            snapshot_id: h.id, snapshot_title: h.title, snapshot_summary: h.summary,
                            snapshot_type: h.type, meeting_id: h.meeting_id, meeting_title: h.meeting_title,
                            meeting_date: h.meeting_date, meeting_category: h.meeting_category,
                          }));
                          setTopics(prev => prev.map(x => x.id === t.id
                            ? { ...x, history: hist, historyLoaded: true, historyOpen: true }
                            : x
                          ));
                        } else {
                          setTopics(prev => prev.map(x => x.id === t.id ? { ...x, historyOpen: !x.historyOpen } : x));
                        }
                      }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}
                    >{t.historyOpen ? '▲ history' : '▼ history'}</button>
                  )}
                </div>

                {/* Synthesis */}
                {t.synthesis && (
                  <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 8 }}>Synthesis</span>
                    <span style={{ fontSize: 13, fontStyle: 'italic' }}>{t.synthesis}</span>
                  </div>
                )}

                {/* Latest snapshot */}
                {t.last_meeting_id ? (
                  <div style={{ padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                      Last discussed:{' '}
                      <strong style={{ color: 'var(--text)' }}>
                        {t.last_meeting_date ? new Date(t.last_meeting_date).toLocaleDateString('fr-FR') : '?'}
                      </strong>
                      {' '}— {t.last_meeting_title}
                      {t.last_meeting_category && t.last_meeting_category !== 'formal' && (
                        <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'var(--panel-2)', color: '#888' }}>
                          {t.last_meeting_category}
                        </span>
                      )}
                    </div>
                    {t.snapshot_summary && (
                      <div style={{ fontSize: 13, color: 'var(--text)', fontStyle: 'italic' }}>{t.snapshot_summary}</div>
                    )}
                    {!t.snapshot_summary && t.snapshot_title && (
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.snapshot_title}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                    No meeting snapshot yet.
                  </div>
                )}

                {/* History expanded */}
                {t.historyOpen && t.history && t.history.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px', background: 'var(--bg)' }}>
                    {t.history.map((h, i) => (
                      <div key={h.snapshot_id} style={{ display: 'flex', gap: 10, marginBottom: i < t.history!.length - 1 ? 8 : 0, alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', minWidth: 70, paddingTop: 2 }}>
                          {new Date(h.meeting_date).toLocaleDateString('fr-FR')}
                        </div>
                        <div style={{ flex: 1, borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                            {h.meeting_title}
                            {h.meeting_category !== 'formal' && (
                              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 8, background: 'var(--panel-2)', color: '#888' }}>{h.meeting_category}</span>
                            )}
                          </div>
                          {h.snapshot_summary
                            ? <div style={{ fontSize: 12, fontStyle: 'italic' }}>{h.snapshot_summary}</div>
                            : <div style={{ fontSize: 12, color: 'var(--muted)' }}>{h.snapshot_title}</div>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: STAKEHOLDERS (ex-Members)
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'stakeholders' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Stakeholders ({members.length})</h3>
            <button
              onClick={() => { setShowAddMember(v => !v); setRemovingId(null); }}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
            >{showAddMember ? 'Cancel' : '+ Add stakeholder'}</button>
          </div>

          {/* Add stakeholder form */}
          {showAddMember && (
            <form onSubmit={handleAddMember} style={{ background: 'var(--panel-2)', borderRadius: 6, padding: '12px 16px', marginBottom: 16, display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'end' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>CONTACT *</label>
                  {selContact ? (
                    <div style={{ ...INP, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{selContact.first_name} {selContact.last_name}</span>
                      <button type="button" onClick={() => { setSelContact(null); setMemberSearch(''); setMemberRoleId(''); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0 }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={memberSearch}
                        onChange={e => handleMemberSearch(e.target.value)}
                        placeholder="Search by name…"
                        style={{ ...INP, width: '100%' }}
                      />
                      {searchResults.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: 'var(--panel)', border: '1px solid var(--border)',
                          borderRadius: 4, zIndex: 10, maxHeight: 200, overflowY: 'auto',
                        }}>
                          {searchResults.map(c => (
                            <div
                              key={c.id}
                              onClick={() => { selectMemberContact(c); }}
                              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}
                            >
                              <strong>{c.first_name} {c.last_name}</strong>
                              {c.job_title && <span className="muted"> · {c.job_title}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>ROLE *</label>
                  <select value={memberRoleId} onChange={e => setMemberRoleId(e.target.value)} required style={{ ...INP, width: '100%' }}>
                    <option value="">— select —</option>
                    {availableRoles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>EFFORT (MD)</label>
                  <input
                    type="number" min="0" step="0.5"
                    value={memberEffort} onChange={e => setMemberEffort(e.target.value)}
                    placeholder="—" style={{ ...INP, width: 70 }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingMember || !selContact || !memberRoleId}
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 6, cursor: 'pointer', opacity: (!selContact || !memberRoleId) ? 0.5 : 1 }}
                >{addingMember ? '…' : 'Add'}</button>
              </div>
            </form>
          )}

          {members.length ? (
            <SortablePersonList
              items={members.map(m => ({
                id: m.id,
                name: (
                  <span>
                    <strong>{m.first_name} {m.last_name}</strong>
                    {m.job_title && <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{m.job_title}</span>}
                  </span>
                ),
                role: (
                  editingMemberId === m.id ? (
                    <select
                      autoFocus
                      defaultValue={m.role_id ?? ''}
                      onBlur={() => setEditingMemberId(null)}
                      onChange={async e => {
                        const newRoleId = Number(e.target.value);
                        if (!newRoleId) return;
                        setEditingMemberId(null);
                        await api.patch(`/project-members/${m.id}`, { role_id: newRoleId }, 'project-member');
                        setMembers(prev => prev.map(x => x.id === m.id
                          ? { ...x, role_id: newRoleId, role_label: availableRoles.find(r => r.id === newRoleId)?.label ?? x.role_label }
                          : x
                        ));
                      }}
                      style={{ fontSize: 12, padding: '2px 4px', borderRadius: 4 }}
                    >
                      <option value="">— select —</option>
                      {availableRoles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  ) : (
                    <span
                      className="badge"
                      onClick={() => setEditingMemberId(m.id)}
                      title="Click to change role"
                      style={{ cursor: 'pointer' }}
                    >
                      {m.role_label || m.role.replace(/_/g, ' ')}
                    </span>
                  )
                ),
                context: (
                  <span>
                    {m.organization_code && <span style={{ marginRight: 6 }}>{m.organization_code}</span>}
                    {m.org_unit_label && <span>{m.org_unit_label}</span>}
                    {m.effort_md && <span style={{ marginLeft: 8 }}>· {m.effort_md} MD</span>}
                  </span>
                ),
                actions: (
                  removingId === m.id ? (
                    <>
                      <button onClick={e => handleRemoveMember(m.id, e)}
                        style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', marginRight: 4 }}>
                        Confirm
                      </button>
                      <button onClick={e => { e.stopPropagation(); setRemovingId(null); }}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={e => { e.stopPropagation(); openContactEditor(m.contact_id, loadMembers); }}
                        title="Edit contact"
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--muted)', marginRight: 4 }}>
                        ✎
                      </button>
                      <button onClick={e => handleRemoveMember(m.id, e)}
                        title="Remove from project"
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--red)' }}>
                        ✕
                      </button>
                    </>
                  )
                ),
              }))}
              onReorder={handleReorderMembers}
              headers={{ name: 'Name', role: 'Role', context: 'Org / Unit' }}
            />
          ) : <div className="empty">No stakeholders yet.</div>}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MEETINGS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'meetings' && (
        <div className="row">
          <div className="col">
            <div className="card">
              <h3>Meetings ({meetings.length})</h3>
              {meetings.length ? (
                <table>
                  <thead><tr><th>When</th><th>Title</th><th>Type</th><th>CR</th><th>Actions</th></tr></thead>
                  <tbody>{meetings.map((m, i) => {
                    const st = m.extraction_status;
                    const crColors: Record<string, { bg: string; color: string }> = {
                      success: { bg: '#e8f5e9', color: '#2e7d32' },
                      pending: { bg: '#fff3e0', color: '#e65100' },
                      failed:  { bg: '#ffebee', color: '#c62828' },
                      skipped: { bg: '#f3e5f5', color: '#6a1b9a' },
                    };
                    const cc = crColors[st] || { bg: '#f5f5f5', color: '#555' };
                    return (
                      <tr key={i} style={onGoToMeeting ? { cursor: 'pointer' } : undefined}
                        onClick={onGoToMeeting ? () => onGoToMeeting(m.id) : undefined}>
                        <td className="muted">{new Date(m.start_at).toLocaleDateString()}</td>
                        <td>{m.title}</td>
                        <td><span className="badge">{m.type}</span></td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: cc.bg, color: cc.color }}>
                            {st}
                          </span>
                          {m.validated_at && <span style={{ marginLeft: 4, fontSize: 11, color: '#1565c0' }}>✓</span>}
                        </td>
                        <td className="muted" style={{ textAlign: 'center' }}>
                          {m.open_action_count ? <span style={{ fontWeight: 600, color: '#c62828' }}>{m.open_action_count}</span> : '—'}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              ) : <div className="empty">No meetings yet.</div>}
            </div>
          </div>
          <div className="col">
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Documents ({docs.length})</h3>
                {templates.length > 0 && (
                  <button
                    onClick={() => setShowGenerate(v => !v)}
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                  >{showGenerate ? 'Cancel' : '+ Generate'}</button>
                )}
              </div>
              {showGenerate && (
                <form onSubmit={handleGenerate} style={{ background: 'var(--panel-2)', borderRadius: 6, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>TEMPLATE *</label>
                    <select value={genTemplateId} onChange={e => setGenTemplateId(e.target.value)} required style={{ ...INP, width: '100%' }}>
                      <option value="">— select template —</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name} · {t.doc_type}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={generating || !genTemplateId}
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 6, cursor: 'pointer', opacity: !genTemplateId ? 0.5 : 1, whiteSpace: 'nowrap' }}
                  >{generating ? 'Generating…' : '⚡ Generate'}</button>
                </form>
              )}
              {docs.length ? (
                <table>
                  <thead><tr><th>Type</th><th>Title</th><th>Version</th><th>Status</th><th></th></tr></thead>
                  <tbody>{docs.map((d, i) => (
                    <tr key={i}>
                      <td><span className="badge">{d.type}</span></td>
                      <td>
                        {d.title || <span className="muted">—</span>}
                        {d.generated_from_template && <span className="muted" style={{ fontSize: 10, marginLeft: 6 }}>⚡ generated</span>}
                      </td>
                      <td>{d.version}</td>
                      <td>{d.status}</td>
                      <td>
                        {d.generated_file_path && (
                          <a href={`${BASE}/documents/${d.id}/file`} title="Download .docx"
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 12, cursor: 'pointer', color: 'var(--text)', textDecoration: 'none' }}>⬇</a>
                        )}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <div className="empty">No documents yet.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ADMINISTRATION
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'administration' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Identité du projet ── */}
          <div className="card">
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Project identity</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <label className="field-label">ID</label>
                <div style={{ ...INP, color: 'var(--muted)', fontFamily: 'monospace' }}>#{id}</div>
              </div>
              <div>
                <label className="field-label">Slug</label>
                <AdminField value={project.slug} onSave={v => patchProject({ slug: v })} />
              </div>
              <div>
                <label className="field-label">Status</label>
                <select
                  value={project.status}
                  onChange={e => patchProject({ status: e.target.value })}
                  style={{ ...INP, width: '100%' }}
                >
                  {PROJECT_STATUS_VALUES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Suivi général ── */}
          <div className="card">
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>General tracking</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <AdminDateField label="Date first raised" value={project.date_first_raised} onSave={v => patchProject({ date_first_raised: v || null } as any)} />
              <AdminField label="Stage" value={project.stage ?? ''} onSave={v => patchProject({ stage: v || null } as any)} />
              <AdminField label="Phase" value={project.phase ?? ''} onSave={v => patchProject({ phase: v || null } as any)} />
              <AdminField label="Phase progress" value={project.phase_progress ?? ''} onSave={v => patchProject({ phase_progress: v || null } as any)} />
            </div>
          </div>

          {/* ── Mantis ── */}
          <div className="card">
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Mantis</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <AdminDateField label="Submission date" value={project.mantis_submission_date} onSave={v => patchProject({ mantis_submission_date: v || null } as any)} />
              <AdminField label="Mantis ID" value={project.mantis_id ?? ''} onSave={v => patchProject({ mantis_id: v || null } as any)} maxLength={7} />
              <AdminField label="Reporter" value={project.mantis_reporter ?? ''} onSave={v => patchProject({ mantis_reporter: v || null } as any)} />
              <AdminField label="Assignment" value={project.mantis_assignment ?? ''} onSave={v => patchProject({ mantis_assignment: v || null } as any)} />
            </div>
          </div>

          {/* ── Mandat projet ── */}
          <div className="card">
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Project mandate</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <AdminDateField label="Mandate date" value={project.project_mandate_date} onSave={v => patchProject({ project_mandate_date: v || null } as any)} />
              <div style={{ gridColumn: '1 / -1' }}>
                <AdminTextarea label="Mandate comment" value={project.project_mandate_comment ?? ''} onSave={v => patchProject({ project_mandate_comment: v || null } as any)} rows={3} />
              </div>
            </div>
          </div>

          {/* ── Planview ── */}
          <div className="card">
            <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Planview</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <AdminField label="Item name" value={project.planview_item_name ?? ''} onSave={v => patchProject({ planview_item_name: v || null } as any)} />
              <AdminField label="Planview ID" value={project.planview_id ?? ''} onSave={v => patchProject({ planview_id: v || null } as any)} />
              <AdminField label="Type" value={project.planview_type ?? ''} onSave={v => patchProject({ planview_type: v || null } as any)} />
              <AdminField label="Activity" value={project.planview_activity ?? ''} onSave={v => patchProject({ planview_activity: v || null } as any)} />
              <div style={{ gridColumn: '1 / -1' }}>
                <AdminTextarea label="Comment" value={project.planview_comment ?? ''} onSave={v => patchProject({ planview_comment: v || null } as any)} rows={3} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: SOURCES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'sources' && (
        <div className="card">
          <h3>Sources ({sources.length})</h3>
          {sources.length ? (
            <table>
              <thead><tr><th>Title</th><th>Type</th><th>Size</th><th>Extraction</th><th></th></tr></thead>
              <tbody>
                {sources.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.title}</div>
                      {s.original_filename && s.original_filename !== s.title &&
                        <div className="muted" style={{ fontSize: 11 }}>{s.original_filename}</div>}
                    </td>
                    <td>{s.source_type ? <span className="badge">{s.source_type}</span> : <span className="muted">—</span>}</td>
                    <td className="muted">{fmtSize(s.file_size_bytes)}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, color: s.extraction_status === 'success' ? 'var(--green)' : s.extraction_status === 'failed' ? 'var(--red)' : 'var(--muted)' }}>
                        {s.extraction_status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => openSource(s)}
                        title={(s.mime_type || '').includes('pdf') ? 'Open PDF' : 'Download'}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 12, cursor: 'pointer', color: 'var(--text)' }}
                      >{(s.mime_type || '').includes('pdf') ? '👁' : '⬇'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty">No sources linked to this project.</div>}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DONNÉES DU PROJET (alimente tous les templates)
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'costra' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Génération ── */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>📋 COSTRA Sheet</h3>
              <button className="btn" onClick={generateCostra} disabled={costraGenerating}>
                {costraGenerating ? 'Generating…' : '⬇ Generate .xlsx'}
              </button>
            </div>
            {costraGenMsg && (
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{costraGenMsg}</div>
            )}
            {costraFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>Generated files</div>
                {costraFiles.map(f => (
                  <div key={f.filename} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span className="muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>{f.filename}</span>
                    <a href={`/api/projects/${id}/costra/files/${f.filename}`}
                      download={f.filename}
                      style={{ fontSize: 12, color: 'var(--accent)' }}>⬇ Download</a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 1 : Identification ── */}
          <CostraSection title="1. Identification">
            <>
            <CostraField label="Sub-project number" value={String(costraAttrs.sub_project_number ?? '')}
              onSave={v => saveCostraAttrs({ sub_project_number: v })} saving={costraSaving} />
            <CostraField label="Sub-project name" value={String(costraAttrs.sub_project_name ?? '')}
              onSave={v => saveCostraAttrs({ sub_project_name: v })} saving={costraSaving} />
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Other fields (portfolio, stakeholders) come from project and member data.
            </div>
            </>
          </CostraSection>

          {/* ── Section 2 : Pourquoi ── */}
          <CostraSection title="2. Why (Key Elements)">
            <>
            <CostraTextarea label="Project objectives" rows={4}
              value={String(costraAttrs.objectives ?? '')}
              onSave={v => saveCostraAttrs({ objectives: v })} saving={costraSaving} />
            <CostraTextarea label="Stakes" rows={3}
              value={String(costraAttrs.stakes ?? '')}
              onSave={v => saveCostraAttrs({ stakes: v })} saving={costraSaving} />
            <CostraTextarea label="1.1 Context / Burning platform" rows={5}
              value={String(costraAttrs.context ?? '')}
              onSave={v => saveCostraAttrs({ context: v })} saving={costraSaving} />
            <CostraTextarea label="1.2 Expected results & changes" rows={5}
              value={String(costraAttrs.expected_results ?? '')}
              onSave={v => saveCostraAttrs({ expected_results: v })} saving={costraSaving} />
            <CostraTextarea label="1.3 Expected benefits (SMART)" rows={5}
              value={String(costraAttrs.benefits ?? '')}
              onSave={v => saveCostraAttrs({ benefits: v })} saving={costraSaving} />
            </>
          </CostraSection>

          {/* ── Section 3 : Quoi / Scope ── */}
          <CostraSection title="3. What & Scope">
            <>
            <CostraTextarea label="Functional description (impacted areas)" rows={4}
              value={String(costraAttrs.scope_description ?? '')}
              onSave={v => saveCostraAttrs({ scope_description: v })} saving={costraSaving} />
            <CostraListField label="In scope (max 4)"
              items={(costraAttrs.scope_in as string[]) || []}
              max={4}
              onSave={v => saveCostraAttrs({ scope_in: v })} saving={costraSaving} />
            <CostraListField label="Out of scope (max 4)"
              items={(costraAttrs.scope_out as string[]) || []}
              max={4}
              onSave={v => saveCostraAttrs({ scope_out: v })} saving={costraSaving} />
            </>
          </CostraSection>

          {/* ── Section 4 : Qui ── */}
          <CostraSection title="4. Who (Beneficiaries)">
            <>
            <CostraTextarea label="Direct beneficiaries (users)" rows={3}
              value={String(costraAttrs.direct_beneficiaries ?? '')}
              onSave={v => saveCostraAttrs({ direct_beneficiaries: v })} saving={costraSaving} />
            <CostraTextarea label="Indirect beneficiaries (impacted public)" rows={3}
              value={String(costraAttrs.indirect_beneficiaries ?? '')}
              onSave={v => saveCostraAttrs({ indirect_beneficiaries: v })} saving={costraSaving} />
            </>
          </CostraSection>

          {/* ── Section 5 : Temporalité ── */}
          <CostraSection title="5. Timeline">
            <>
            <CostraTextarea label="4.1 Time constraints / milestones" rows={3}
              value={String(costraAttrs.time_constraints ?? '')}
              onSave={v => saveCostraAttrs({ time_constraints: v })} saving={costraSaving} />
            <div className="muted" style={{ fontSize: 12 }}>
              The desired availability date (4.2) is taken from the project's <strong>Desired end date</strong> field.
            </div>
            </>
          </CostraSection>

          {/* ── Section 6 : Risques ── */}
          <CostraSection title="6. Risks">
            <>
            <CostraTextarea label="5.1 Dependency mitigation (gate 2)" rows={3}
              value={String(costraAttrs.dependency_mitigation ?? '')}
              onSave={v => saveCostraAttrs({ dependency_mitigation: v })} saving={costraSaving} />
            <CostraTextarea label="5.2 Obstacle mitigation (gate 2)" rows={3}
              value={String(costraAttrs.obstacle_mitigation ?? '')}
              onSave={v => saveCostraAttrs({ obstacle_mitigation: v })} saving={costraSaving} />
            <CostraTextarea label="5.3 Consequences of non-execution" rows={3}
              value={String(costraAttrs.non_execution_risk ?? '')}
              onSave={v => saveCostraAttrs({ non_execution_risk: v })} saving={costraSaving} />
            <CostraTextarea label="5.3 Non-execution mitigation (gate 2)" rows={3}
              value={String(costraAttrs.non_execution_mitigation ?? '')}
              onSave={v => saveCostraAttrs({ non_execution_mitigation: v })} saving={costraSaving} />
            <div className="muted" style={{ fontSize: 12 }}>
              Dependencies and obstacles are sourced from the project's <strong>Risks</strong> tab.
            </div>
            </>
          </CostraSection>

          {/* ── Section 7 : Budget T-shirt ── */}
          <CostraSection title="7. Budget (T-shirt Sizing)">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <>{['XS', 'S', 'M', 'L', 'XL'].map(sz => (
                <button
                  key={sz}
                  className={costraAttrs.budget_tshirt === sz ? 'btn' : 'btn-ghost'}
                  style={{ minWidth: 48 }}
                  disabled={costraSaving}
                  onClick={() => saveCostraAttrs({ budget_tshirt: sz })}
                >{sz}</button>
              ))}
              {costraAttrs.budget_tshirt && (
                <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--accent)' }}>
                  Selected: <strong>{String(costraAttrs.budget_tshirt)}</strong>
                </span>
              )}</>
            </div>
          </CostraSection>

          {/* ── Section 8 : Scénarios ── */}
          <CostraSection title="8. Scenarios & Business Case">
            <>
            {([0, 1] as const).map(idx => {
              const scenarios = (costraAttrs.scenarios as Record<string, unknown>[] | undefined) || [];
              const sc = (scenarios[idx] || {}) as { type?: string; status?: string; description?: string };
              return (
                <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>Scenario {idx + 1}</div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label className="field-label">Type</label>
                      <input className="input" style={{ width: '100%' }} defaultValue={sc.type || ''}
                        placeholder="Make / Buy / Minimum viable…"
                        onBlur={e => {
                          const arr = [...scenarios];
                          arr[idx] = { ...sc, type: e.target.value };
                          saveCostraAttrs({ scenarios: arr });
                        }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="field-label">Status</label>
                      <input className="input" style={{ width: '100%' }} defaultValue={sc.status || ''}
                        placeholder="Retenu / Non retenu…"
                        onBlur={e => {
                          const arr = [...scenarios];
                          arr[idx] = { ...sc, status: e.target.value };
                          saveCostraAttrs({ scenarios: arr });
                        }} />
                    </div>
                  </div>
                  <label className="field-label">Description</label>
                  <textarea className="input" rows={4} style={{ width: '100%', resize: 'vertical' }}
                    defaultValue={sc.description || ''}
                    onBlur={e => {
                      const arr = [...scenarios];
                      arr[idx] = { ...sc, description: e.target.value };
                      saveCostraAttrs({ scenarios: arr });
                    }} />
                </div>
              );
            })}
            <CostraTextarea label="General remarks" rows={3}
              value={String(costraAttrs.scenario_remarks ?? '')}
              onSave={v => saveCostraAttrs({ scenario_remarks: v })} saving={costraSaving} />
            </>
          </CostraSection>

          {/* ── Section 9 : Impacts ── */}
          <CostraSection title="9. Impact on Other Projects">
            <CostraTextarea label="Impact on other projects" rows={4}
              value={String(costraAttrs.project_impacts ?? '')}
              onSave={v => saveCostraAttrs({ project_impacts: v })} saving={costraSaving} />
          </CostraSection>

        </div>
      )}
      {contactEditor}
    </div>
  );
}

// ── Composants Admin inline ───────────────────────────────────────────────────

const PROJECT_STATUS_VALUES = [
  'idea',
  'mandate_received',
  'briefing_draft', 'briefing_review', 'briefing_approved',
  'sheet_draft', 'sheet_review',
  'sheet_approved_etnic', 'sheet_approved_wbe', 'sheet_signed',
  'in_progress', 'closed', 'cancelled',
] as const;

function AdminField({ label, value, onSave, maxLength }: {
  label?: string; value: string;
  onSave: (v: string) => void; maxLength?: number;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  return (
    <div>
      {label && <label className="field-label">{label}</label>}
      <input
        className="input"
        style={{ width: '100%' }}
        value={local}
        maxLength={maxLength}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onSave(local); }}
      />
    </div>
  );
}

function AdminDateField({ label, value, onSave }: {
  label: string; value: string | null;
  onSave: (v: string) => void;
}) {
  const fmt = (v: string | null) => (v ? v.substring(0, 10) : '');
  const [local, setLocal] = React.useState(fmt(value));
  React.useEffect(() => { setLocal(fmt(value)); }, [value]);
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type="date"
        className="input"
        style={{ width: '100%' }}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if (local !== fmt(value)) onSave(local); }}
      />
    </div>
  );
}

function AdminTextarea({ label, value, rows, onSave }: {
  label: string; value: string; rows: number;
  onSave: (v: string) => void;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  return (
    <div>
      <label className="field-label">{label}</label>
      <textarea
        className="input"
        rows={rows}
        style={{ width: '100%', resize: 'vertical' }}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onSave(local); }}
      />
    </div>
  );
}


function CostraSection({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card">
      <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>{title}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

function CostraField({ label, value, onSave, saving }: {
  label: string; value: string;
  onSave: (v: string) => void; saving: boolean;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  return (
    <div>
      <label className="field-label">{label}</label>
      <input className="input" style={{ width: '100%' }} value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onSave(local); }}
        disabled={saving} />
    </div>
  );
}

function CostraTextarea({ label, value, rows, onSave, saving }: {
  label: string; value: string; rows: number;
  onSave: (v: string) => void; saving: boolean;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);
  return (
    <div>
      <label className="field-label">{label}</label>
      <textarea className="input" rows={rows} style={{ width: '100%', resize: 'vertical' }}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onSave(local); }}
        disabled={saving} />
    </div>
  );
}

function CostraListField({ label, items, max, onSave, saving }: {
  label: string; items: string[]; max: number;
  onSave: (v: string[]) => void; saving: boolean;
}) {
  const [newVal, setNewVal] = React.useState('');
  const update = (updated: string[]) => onSave(updated);
  return (
    <div>
      <label className="field-label">{label}</label>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center' }}>
          <span className="muted">•</span>
          <input className="input" style={{ flex: 1, fontSize: 13 }} defaultValue={item}
            disabled={saving}
            onBlur={e => {
              if (e.target.value !== item) {
                const arr = [...items]; arr[i] = e.target.value; update(arr);
              }
            }} />
          <button onClick={() => { const arr = items.filter((_, j) => j !== i); update(arr); }}
            disabled={saving}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>✕</button>
        </div>
      ))}
      {items.length < max && (
        <form onSubmit={e => { e.preventDefault(); if (newVal.trim()) { update([...items, newVal.trim()]); setNewVal(''); } }}
          style={{ display: 'flex', gap: 5, marginTop: 4 }}>
          <input className="input" style={{ flex: 1, fontSize: 12 }} value={newVal}
            onChange={e => setNewVal(e.target.value)} placeholder="Add item…" disabled={saving} />
          <button type="submit" className="btn" style={{ fontSize: 12 }} disabled={!newVal.trim() || saving}>+</button>
        </form>
      )}
    </div>
  );
}
