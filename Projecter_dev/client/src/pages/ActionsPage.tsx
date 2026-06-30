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
interface Action {
  description: string;
  deadline: string | null;
  status: string;
  notes: string | null;
  owner_id: number | null;
  owner_name: string | null;
  meeting_id: number | null;
  meeting_title: string | null;
  is_overdue: boolean;
  projects: ProjectLink[];
}
type ActionItem = { id: string; attributes: Action };
interface ProjectOption { id: string; attributes: { title: string; code: string | null } }

const STATUSES = ['open', 'done', 'cancelled', 'overdue'] as const;
const STATUS_ORDER: Record<string, number> = { overdue: 1, open: 2, done: 3, cancelled: 4 };

const EMPTY_FORM = {
  description: '', deadline: '', status: 'open' as string, notes: '',
};

// ─── Composant ───────────────────────────────────────────────────────────────
export function ActionsPage() {
  const [actions, setActions]   = useState<ActionItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortCol, setSortCol] = useState('deadline');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const visibleActions = useMemo(() => {
    const filtered = statusFilter ? actions.filter(a => a.attributes.status === statusFilter) : actions;
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      const attr = (x: ActionItem) => x.attributes as any;
      if (sortCol === 'status') {
        av = STATUS_ORDER[attr(a).status] || 9;
        bv = STATUS_ORDER[attr(b).status] || 9;
      } else if (sortCol === 'deadline') {
        av = attr(a).deadline || '';
        bv = attr(b).deadline || '';
      } else {
        av = (attr(a)[sortCol] || '').toString().toLowerCase();
        bv = (attr(b)[sortCol] || '').toString().toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [actions, statusFilter, sortCol, sortDir]);

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
  const [modalOpen, setModalOpen]     = useState(false);
  const [editItem, setEditItem]       = useState<ActionItem | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ActionItem | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Link project panel
  const [linkTarget, setLinkTarget]     = useState<ActionItem | null>(null);
  const [linkProjectId, setLinkProjectId] = useState('');
  const [linkRole, setLinkRole]         = useState('');
  const [linkContext, setLinkContext]   = useState('');
  const [linking, setLinking]           = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    api.get<JsonApiList<Action>>('/actions')
      .then(r => { setActions(r.data); setError(null); })
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

  const openEdit = (item: ActionItem) => {
    setEditItem(item);
    const a = item.attributes;
    setForm({
      description: a.description,
      deadline: a.deadline ? a.deadline.slice(0, 10) : '',
      status: a.status,
      notes: a.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const attributes = {
        description: form.description.trim(),
        deadline: form.deadline || null,
        status: form.status || 'open',
        notes: form.notes || null,
      };
      if (editItem) {
        await api.patch(`/actions/${editItem.id}`, attributes, 'action');
      } else {
        await api.post('/actions', attributes, 'action');
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
      await api.del(`/actions/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Link / Unlink project ─────────────────────────────────────────────────
  const openLink = (item: ActionItem) => {
    setLinkTarget(item);
    setLinkProjectId(''); setLinkRole(''); setLinkContext('');
  };

  const handleLink = async () => {
    if (!linkTarget || !linkProjectId) return;
    setLinking(true);
    try {
      await api.post(`/actions/${linkTarget.id}/projects/${linkProjectId}`, {
        role: linkRole || null,
        context: linkContext || null,
      }, 'action-project');
      reload();
      setLinkProjectId(''); setLinkRole(''); setLinkContext('');
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (actionId: string, projectId: number) => {
    try {
      await api.del(`/actions/${actionId}/projects/${projectId}`);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (error) return <div className="error">{error}<button className="btn" style={{ marginLeft: 12 }} onClick={() => setError(null)}>Dismiss</button></div>;

  const linkTargetFresh = linkTarget ? actions.find(a => a.id === linkTarget.id) || linkTarget : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Actions ({actions.length})</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={openCreate}>+ New action</button>
        </div>
      </div>

      {/* ── List table ── */}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr>
            <th>Projects</th><SortTh col="description" label="Action" /><SortTh col="owner_name" label="Owner" />
            <SortTh col="deadline" label="Due" /><SortTh col="status" label="Status" /><th style={{ width: 120 }}></th>
          </tr></thead>
          <tbody>
            {visibleActions.map(a => (
              <tr key={a.id}>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {a.attributes.projects?.length
                      ? a.attributes.projects.map(p => (
                          <span key={p.project_id} className="badge" title={p.project_title}>{p.project_code || p.project_title}</span>
                        ))
                      : <span className="muted">—</span>
                    }
                  </div>
                </td>
                <td>
                  <InlineEdit
                    value={a.attributes.description}
                    onSave={async description => {
                      await api.patch(`/actions/${a.id}`, { description }, 'action');
                      setActions(prev => prev.map(x => x.id === a.id ? { ...x, attributes: { ...x.attributes, description } } : x));
                    }}
                  />
                </td>
                <td className="muted">{a.attributes.owner_name || a.attributes.owner_id || '—'}</td>
                <td className="muted" style={a.attributes.is_overdue ? { color: 'var(--red)' } : undefined}>
                  {a.attributes.deadline ? a.attributes.deadline.slice(0, 10) : '—'}
                  {a.attributes.is_overdue && ' ⚠'}
                </td>
                <td><span className="badge">{a.attributes.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openEdit(a)}>Edit</button>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openLink(a)}>🔗</button>
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setDeleteTarget(a)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!actions.length && <div className="empty">No actions yet. Click <strong>+ New action</strong> to create one.</div>}
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal
        open={modalOpen}
        title={editItem ? 'Edit action' : 'New action'}
        onClose={() => !saving && setModalOpen(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn" onClick={handleSave} disabled={saving || !form.description.trim()}>
              {saving ? 'Saving…' : editItem ? 'Save changes' : 'Create action'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Action *</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What needs to be done"
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
                value={form.deadline}
                onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </label>
          </div>

          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Notes</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes"
            />
          </label>
        </div>
      </Modal>

      {/* ── Link project panel ── */}
      {linkTargetFresh && (
        <Modal
          open={true}
          title={`Link projects — ${linkTargetFresh.attributes.description.slice(0, 60)}`}
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
                  placeholder="e.g. lead" />
              </label>
            </div>
            <label>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Context (why this action concerns this project)</span>
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
        title="Delete action"
        message={<>Delete this action? This cannot be undone.</>}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
