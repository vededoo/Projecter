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
interface Decision {
  description: string;
  impact: string | null;
  position: number | null;
  is_reversible: boolean | null;
  driver_contact_id: number | null;
  approver_contact_id: number | null;
  driver_name: string | null;
  approver_name: string | null;
  meeting_id: number | null;
  meeting_title: string | null;
  projects: ProjectLink[];
}
type DecisionItem = { id: string; attributes: Decision };
interface ProjectOption { id: string; attributes: { title: string; code: string | null } }

const EMPTY_FORM = {
  description: '', impact: '', position: '', is_reversible: false,
};

// ─── Composant ───────────────────────────────────────────────────────────────
export function DecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [projects, setProjects]   = useState<ProjectOption[]>([]);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [sortCol, setSortCol] = useState('position');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const visibleDecisions = useMemo(() => {
    return [...decisions].sort((a, b) => {
      let av: any, bv: any;
      const attr = (x: DecisionItem) => x.attributes as any;
      if (sortCol === 'position') {
        av = attr(a).position ?? 9999;
        bv = attr(b).position ?? 9999;
      } else {
        av = (attr(a)[sortCol] || '').toString().toLowerCase();
        bv = (attr(b)[sortCol] || '').toString().toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [decisions, sortCol, sortDir]);

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
  const [editItem, setEditItem]   = useState<DecisionItem | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<DecisionItem | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Link project panel
  const [linkTarget, setLinkTarget]       = useState<DecisionItem | null>(null);
  const [linkProjectId, setLinkProjectId] = useState('');
  const [linkRole, setLinkRole]           = useState('');
  const [linkContext, setLinkContext]     = useState('');
  const [linking, setLinking]             = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    api.get<JsonApiList<Decision>>('/decisions')
      .then(r => { setDecisions(r.data); setError(null); })
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

  const openEdit = (item: DecisionItem) => {
    setEditItem(item);
    const d = item.attributes;
    setForm({
      description: d.description,
      impact: d.impact || '',
      position: d.position != null ? String(d.position) : '',
      is_reversible: !!d.is_reversible,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const attributes = {
        description: form.description.trim(),
        impact: form.impact || null,
        position: form.position ? Number(form.position) : null,
        is_reversible: form.is_reversible,
      };
      if (editItem) {
        await api.patch(`/decisions/${editItem.id}`, attributes, 'decision');
      } else {
        await api.post('/decisions', attributes, 'decision');
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
      await api.del(`/decisions/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Link / Unlink project ─────────────────────────────────────────────────
  const openLink = (item: DecisionItem) => {
    setLinkTarget(item);
    setLinkProjectId(''); setLinkRole(''); setLinkContext('');
  };

  const handleLink = async () => {
    if (!linkTarget || !linkProjectId) return;
    setLinking(true);
    try {
      await api.post(`/decisions/${linkTarget.id}/projects/${linkProjectId}`, {
        role: linkRole || null,
        context: linkContext || null,
      }, 'decision-project');
      reload();
      setLinkProjectId(''); setLinkRole(''); setLinkContext('');
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (decisionId: string, projectId: number) => {
    try {
      await api.del(`/decisions/${decisionId}/projects/${projectId}`);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (error) return <div className="error">{error}<button className="btn" style={{ marginLeft: 12 }} onClick={() => setError(null)}>Dismiss</button></div>;

  const linkTargetFresh = linkTarget ? decisions.find(d => d.id === linkTarget.id) || linkTarget : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Decisions ({decisions.length})</h2>
        <button className="btn" onClick={openCreate}>+ New decision</button>
      </div>

      {/* ── List table ── */}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr>
            <th>Projects</th><SortTh col="description" label="Decision" /><SortTh col="driver_name" label="Driver" />
            <SortTh col="approver_name" label="Approver" /><th>Reversible</th><th style={{ width: 120 }}></th>
          </tr></thead>
          <tbody>
            {visibleDecisions.map(d => (
              <tr key={d.id}>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {d.attributes.projects?.length
                      ? d.attributes.projects.map(p => (
                          <span key={p.project_id} className="badge" title={p.project_title}>{p.project_code || p.project_title}</span>
                        ))
                      : <span className="muted">—</span>
                    }
                  </div>
                </td>
                <td>
                  <InlineEdit
                    value={d.attributes.description}
                    onSave={async description => {
                      await api.patch(`/decisions/${d.id}`, { description }, 'decision');
                      setDecisions(prev => prev.map(x => x.id === d.id ? { ...x, attributes: { ...x.attributes, description } } : x));
                    }}
                  />
                  {d.attributes.impact && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{d.attributes.impact}</div>}
                </td>
                <td className="muted">{d.attributes.driver_name || '—'}</td>
                <td className="muted">{d.attributes.approver_name || '—'}</td>
                <td>{d.attributes.is_reversible == null ? <span className="muted">—</span> : <span className="badge">{d.attributes.is_reversible ? 'reversible' : 'irreversible'}</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openEdit(d)}>Edit</button>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openLink(d)}>🔗</button>
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setDeleteTarget(d)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!decisions.length && <div className="empty">No decisions yet. Click <strong>+ New decision</strong> to create one.</div>}
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal
        open={modalOpen}
        title={editItem ? 'Edit decision' : 'New decision'}
        onClose={() => !saving && setModalOpen(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn" onClick={handleSave} disabled={saving || !form.description.trim()}>
              {saving ? 'Saving…' : editItem ? 'Save changes' : 'Create decision'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Decision *</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="What was decided"
              autoFocus
            />
          </label>

          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Impact</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.impact}
              onChange={e => setForm(p => ({ ...p, impact: e.target.value }))}
              placeholder="Consequences of this decision"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
            <label>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Position</span>
              <input type="number" className="input" style={{ width: '100%' }}
                value={form.position}
                onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.is_reversible}
                onChange={e => setForm(p => ({ ...p, is_reversible: e.target.checked }))} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Reversible</span>
            </label>
          </div>
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
                  placeholder="e.g. impacted" />
              </label>
            </div>
            <label>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Context (why this decision concerns this project)</span>
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
        title="Delete decision"
        message={<>Delete this decision? This cannot be undone.</>}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
