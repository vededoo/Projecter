import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, JsonApiList } from '../api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InlineEdit } from '../components/InlineEdit';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProjectLink {
  project_id: number; project_code: string; project_title: string;
  role: string | null;
}
interface AskedTo { contact_id: number; contact_name: string }
interface Question {
  title: string;
  status: string;
  owner_contact_id: number | null;
  owner_name: string | null;
  due_date: string | null;
  answer: string | null;
  answered_at: string | null;
  is_overdue: boolean;
  asked_to: AskedTo[];
  meeting_id: number | null;
  meeting_title: string | null;
  projects: ProjectLink[];
}
type QuestionItem = { id: string; attributes: Question };
interface ProjectOption { id: string; attributes: { title: string; code: string | null } }

const STATUSES = ['to_ask', 'asked', 'reminded', 'partially_answered', 'answered', 'cancelled'] as const;
const STATUS_ORDER: Record<string, number> = {
  reminded: 1, to_ask: 2, asked: 3, partially_answered: 4, answered: 5, cancelled: 6,
};

const EMPTY_FORM = {
  title: '', status: 'to_ask' as string, due_date: '', answer: '',
};

// ─── Composant ───────────────────────────────────────────────────────────────
export function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [projects, setProjects]   = useState<ProjectOption[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortCol, setSortCol] = useState('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const visibleQuestions = useMemo(() => {
    const filtered = statusFilter ? questions.filter(q => q.attributes.status === statusFilter) : questions;
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      const attr = (x: QuestionItem) => x.attributes as any;
      if (sortCol === 'status') {
        av = STATUS_ORDER[attr(a).status] || 9;
        bv = STATUS_ORDER[attr(b).status] || 9;
      } else if (sortCol === 'due_date') {
        av = attr(a).due_date || '';
        bv = attr(b).due_date || '';
      } else {
        av = (attr(a)[sortCol] || '').toString().toLowerCase();
        bv = (attr(b)[sortCol] || '').toString().toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [questions, statusFilter, sortCol, sortDir]);

  const SortTh = ({ col, label, style }: { col: string; label: string; style?: React.CSSProperties }) => {
    const isSorted = sortCol === col;
    const color = isSorted ? (sortDir === 'asc' ? '#4caf50' : '#f44336') : undefined;
    return (
      <th onClick={() => onSort(col)} style={{ cursor: 'pointer', userSelect: 'none', color, ...style }} title="Click to sort">
        {label} <span style={{ opacity: isSorted ? 1 : 0.3 }}>{isSorted ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </th>
    );
  };

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem]   = useState<QuestionItem | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<QuestionItem | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Link project panel
  const [linkTarget, setLinkTarget]       = useState<QuestionItem | null>(null);
  const [linkProjectId, setLinkProjectId] = useState('');
  const [linkRole, setLinkRole]           = useState('');
  const [linkContext, setLinkContext]     = useState('');
  const [linking, setLinking]             = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    api.get<JsonApiList<Question>>('/questions')
      .then(r => { setQuestions(r.data); setError(null); })
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    reload();
    api.get<JsonApiList<{ title: string; code: string | null }>>('/projects')
      .then(r => setProjects(r.data as ProjectOption[]))
      .catch(() => {});
  }, [reload]);

  // ── Create / Edit helpers ─────────────────────────────────────────────────
  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (item: QuestionItem) => {
    setEditItem(item);
    const q = item.attributes;
    setForm({
      title: q.title,
      status: q.status,
      due_date: q.due_date ? q.due_date.slice(0, 10) : '',
      answer: q.answer || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const attributes = {
        title: form.title.trim(),
        status: form.status || 'to_ask',
        due_date: form.due_date || null,
        answer: form.answer || null,
      };
      if (editItem) {
        await api.patch(`/questions/${editItem.id}`, attributes, 'question');
      } else {
        await api.post('/questions', attributes, 'question');
      }
      setModalOpen(false);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/questions/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Link / Unlink project ─────────────────────────────────────────────────
  const openLink = (item: QuestionItem) => {
    setLinkTarget(item);
    setLinkProjectId(''); setLinkRole(''); setLinkContext('');
  };

  const handleLink = async () => {
    if (!linkTarget || !linkProjectId) return;
    setLinking(true);
    try {
      await api.post(`/questions/${linkTarget.id}/projects/${linkProjectId}`, {
        role: linkRole || null,
        context: linkContext || null,
      }, 'question-project');
      reload();
      setLinkProjectId(''); setLinkRole(''); setLinkContext('');
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (questionId: string, projectId: number) => {
    try {
      await api.del(`/questions/${questionId}/projects/${projectId}`);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (error) return <div className="error">{error}<button className="btn" style={{ marginLeft: 12 }} onClick={() => setError(null)}>Dismiss</button></div>;

  const linkTargetFresh = linkTarget ? questions.find(q => q.id === linkTarget.id) || linkTarget : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Questions ({questions.length})</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={openCreate}>+ New question</button>
        </div>
      </div>

      {/* ── List table ── */}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr>
            <th>Projects</th><SortTh col="title" label="Question" /><SortTh col="owner_name" label="Owner" />
            <th>Asked to</th><SortTh col="due_date" label="Due" /><SortTh col="status" label="Status" />
            <th style={{ width: 120 }}></th>
          </tr></thead>
          <tbody>
            {visibleQuestions.map(q => (
              <tr key={q.id}>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {q.attributes.projects?.length
                      ? q.attributes.projects.map(p => (
                          <span key={p.project_id} className="badge" title={p.project_title}>{p.project_code || p.project_title}</span>
                        ))
                      : <span className="muted">—</span>
                    }
                  </div>
                </td>
                <td>
                  <InlineEdit
                    value={q.attributes.title}
                    onSave={async title => {
                      await api.patch(`/questions/${q.id}`, { title }, 'question');
                      setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, attributes: { ...x.attributes, title } } : x));
                    }}
                  />
                  {q.attributes.answer && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>↳ {q.attributes.answer}</div>}
                </td>
                <td className="muted">{q.attributes.owner_name || '—'}</td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {q.attributes.asked_to?.length
                    ? q.attributes.asked_to.map(c => c.contact_name).join(', ')
                    : '—'}
                </td>
                <td className="muted" style={q.attributes.is_overdue ? { color: 'var(--red)' } : undefined}>
                  {q.attributes.due_date ? q.attributes.due_date.slice(0, 10) : '—'}
                  {q.attributes.is_overdue && ' ⚠'}
                </td>
                <td><span className="badge">{q.attributes.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openEdit(q)}>Edit</button>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openLink(q)}>🔗</button>
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setDeleteTarget(q)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!questions.length && <div className="empty">No questions yet. Click <strong>+ New question</strong> to create one.</div>}
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal
        open={modalOpen}
        title={editItem ? 'Edit question' : 'New question'}
        onClose={() => !saving && setModalOpen(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn" onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving…' : editItem ? 'Save changes' : 'Create question'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Question *</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="What needs to be clarified"
              autoFocus
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Status</span>
              <select className="input" style={{ width: '100%' }} value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Due date</span>
              <input type="date" className="input" style={{ width: '100%' }}
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </label>
          </div>

          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Answer</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.answer}
              onChange={e => setForm(p => ({ ...p, answer: e.target.value }))}
              placeholder="Answer once received"
            />
          </label>
        </div>
      </Modal>

      {/* ── Link project panel ── */}
      {linkTargetFresh && (
        <Modal
          open={true}
          title={`Link projects — ${linkTargetFresh.attributes.title.slice(0, 60)}`}
          onClose={() => setLinkTarget(null)}
          size="md"
          footer={<button className="btn btn-secondary" onClick={() => setLinkTarget(null)}>Close</button>}
        >
          {/* Existing links */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Linked projects</p>
            {linkTargetFresh.attributes.projects?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {linkTargetFresh.attributes.projects.map(p => (
                  <span key={p.project_id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>
                    <strong>{p.project_code || p.project_title}</strong>
                    {p.role && <span className="badge" style={{ fontSize: 10 }}>{p.role}</span>}
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 0, lineHeight: 1, fontSize: 14 }}
                      title="Unlink"
                      onClick={() => handleUnlink(linkTargetFresh.id, p.project_id)}
                    >×</button>
                  </span>
                ))}
              </div>
            ) : <span className="muted" style={{ fontSize: 12 }}>No projects linked yet.</span>}
          </div>

          {/* Add link form */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Link to a project</p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <label>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Project *</span>
                <select className="input" style={{ width: '100%' }} value={linkProjectId}
                  onChange={e => setLinkProjectId(e.target.value)}>
                  <option value="">— select —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.attributes.code ? `[${p.attributes.code}] ` : ''}{p.attributes.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Role</span>
                <input className="input" style={{ width: '100%' }} value={linkRole}
                  onChange={e => setLinkRole(e.target.value)}
                  placeholder="e.g. concerned" />
              </label>
            </div>
            <label>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Context (why this question concerns this project)</span>
              <input className="input" style={{ width: '100%' }} value={linkContext}
                onChange={e => setLinkContext(e.target.value)}
                placeholder="Optional context note" />
            </label>
            <div>
              <button className="btn" onClick={handleLink} disabled={!linkProjectId || linking}>
                {linking ? 'Linking…' : '+ Link project'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete question"
        message={<>Delete this question? This cannot be undone.</>}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
