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
interface Issue {
  label: string;
  description: string | null;
  severity: string;
  status: string;
  owner_contact_id: number | null;
  owner_name: string | null;
  resolution: string | null;
  due_date: string | null;
  resolved_at: string | null;
  is_overdue: boolean;
  meeting_id: number | null;
  meeting_title: string | null;
  projects: ProjectLink[];
}
type IssueItem = { id: string; attributes: Issue };
interface ProjectOption { id: string; attributes: { title: string; code: string | null } }

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['open', 'investigating', 'resolved', 'closed', 'cancelled'] as const;
const SEV_ORDER: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
const SEV_COLOR: Record<string, string> = {
  critical: '#c62828', high: '#ef6c00', medium: '#f9a825', low: '#558b2f',
};

const EMPTY_FORM = {
  label: '', description: '', severity: 'medium' as string, status: 'open' as string,
  due_date: '', resolution: '',
};

// ─── Composant ───────────────────────────────────────────────────────────────
export function IssuesPage() {
  const [issues, setIssues]     = useState<IssueItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [statusFilter, setStatusFilter]     = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [sortCol, setSortCol] = useState('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const visibleIssues = useMemo(() => {
    let filtered = issues;
    if (statusFilter)   filtered = filtered.filter(x => x.attributes.status === statusFilter);
    if (severityFilter) filtered = filtered.filter(x => x.attributes.severity === severityFilter);
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      const attr = (x: IssueItem) => x.attributes as any;
      if (sortCol === 'severity') {
        av = SEV_ORDER[attr(a).severity] || 9;
        bv = SEV_ORDER[attr(b).severity] || 9;
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
  }, [issues, statusFilter, severityFilter, sortCol, sortDir]);

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
  const [editItem, setEditItem]   = useState<IssueItem | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<IssueItem | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Link project panel
  const [linkTarget, setLinkTarget]       = useState<IssueItem | null>(null);
  const [linkProjectId, setLinkProjectId] = useState('');
  const [linkRole, setLinkRole]           = useState('');
  const [linkContext, setLinkContext]     = useState('');
  const [linking, setLinking]             = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    api.get<JsonApiList<Issue>>('/issues')
      .then(r => { setIssues(r.data); setError(null); })
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

  const openEdit = (item: IssueItem) => {
    setEditItem(item);
    const x = item.attributes;
    setForm({
      label: x.label,
      description: x.description || '',
      severity: x.severity,
      status: x.status,
      due_date: x.due_date ? x.due_date.slice(0, 10) : '',
      resolution: x.resolution || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      const attributes = {
        label: form.label.trim(),
        description: form.description || null,
        severity: form.severity || 'medium',
        status: form.status || 'open',
        due_date: form.due_date || null,
        resolution: form.resolution || null,
      };
      if (editItem) {
        await api.patch(`/issues/${editItem.id}`, attributes, 'issue');
      } else {
        await api.post('/issues', attributes, 'issue');
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
      await api.del(`/issues/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Link / Unlink project ─────────────────────────────────────────────────
  const openLink = (item: IssueItem) => {
    setLinkTarget(item);
    setLinkProjectId(''); setLinkRole(''); setLinkContext('');
  };

  const handleLink = async () => {
    if (!linkTarget || !linkProjectId) return;
    setLinking(true);
    try {
      await api.post(`/issues/${linkTarget.id}/projects/${linkProjectId}`, {
        role: linkRole || null,
        context: linkContext || null,
      }, 'issue-project');
      reload();
      setLinkProjectId(''); setLinkRole(''); setLinkContext('');
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (issueId: string, projectId: number) => {
    try {
      await api.del(`/issues/${issueId}/projects/${projectId}`);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (error) return <div className="error">{error}<button className="btn" style={{ marginLeft: 12 }} onClick={() => setError(null)}>Dismiss</button></div>;

  const linkTargetFresh = linkTarget ? issues.find(x => x.id === linkTarget.id) || linkTarget : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Issues ({issues.length})</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
            <option value="">All severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn" onClick={openCreate}>+ New issue</button>
        </div>
      </div>

      {/* ── List table ── */}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr>
            <th>Projects</th><SortTh col="label" label="Issue" /><SortTh col="severity" label="Severity" />
            <SortTh col="owner_name" label="Owner" /><SortTh col="due_date" label="Due" /><SortTh col="status" label="Status" />
            <th style={{ width: 120 }}></th>
          </tr></thead>
          <tbody>
            {visibleIssues.map(x => (
              <tr key={x.id}>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {x.attributes.projects?.length
                      ? x.attributes.projects.map(p => (
                          <span key={p.project_id} className="badge" title={p.project_title}>{p.project_code || p.project_title}</span>
                        ))
                      : <span className="muted">—</span>
                    }
                  </div>
                </td>
                <td>
                  <InlineEdit
                    value={x.attributes.label}
                    onSave={async label => {
                      await api.patch(`/issues/${x.id}`, { label }, 'issue');
                      setIssues(prev => prev.map(it => it.id === x.id ? { ...it, attributes: { ...it.attributes, label } } : it));
                    }}
                  />
                  {x.attributes.resolution && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>↳ {x.attributes.resolution}</div>}
                </td>
                <td><span className="badge" style={{ background: SEV_COLOR[x.attributes.severity], color: '#fff' }}>{x.attributes.severity}</span></td>
                <td className="muted">{x.attributes.owner_name || '—'}</td>
                <td className="muted" style={x.attributes.is_overdue ? { color: 'var(--red)' } : undefined}>
                  {x.attributes.due_date ? x.attributes.due_date.slice(0, 10) : '—'}
                  {x.attributes.is_overdue && ' ⚠'}
                </td>
                <td><span className="badge">{x.attributes.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openEdit(x)}>Edit</button>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openLink(x)}>🔗</button>
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setDeleteTarget(x)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!issues.length && <div className="empty">No issues yet. Click <strong>+ New issue</strong> to create one.</div>}
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal
        open={modalOpen}
        title={editItem ? 'Edit issue' : 'New issue'}
        onClose={() => !saving && setModalOpen(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn" onClick={handleSave} disabled={saving || !form.label.trim()}>
              {saving ? 'Saving…' : editItem ? 'Save changes' : 'Create issue'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Issue *</span>
            <input
              className="input" style={{ width: '100%' }}
              value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              placeholder="Short title of the problem"
              autoFocus
            />
          </label>

          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Description</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What happened"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Severity</span>
              <select className="input" style={{ width: '100%' }} value={form.severity}
                onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
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
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Resolution</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.resolution}
              onChange={e => setForm(p => ({ ...p, resolution: e.target.value }))}
              placeholder="How it was resolved"
            />
          </label>
        </div>
      </Modal>

      {/* ── Link project panel ── */}
      {linkTargetFresh && (
        <Modal
          open={true}
          title={`Link projects — ${linkTargetFresh.attributes.label.slice(0, 60)}`}
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
                  placeholder="e.g. impacted" />
              </label>
            </div>
            <label>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Context (why this issue concerns this project)</span>
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
        title="Delete issue"
        message={<>Delete this issue? This cannot be undone.</>}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
