import React, { useCallback, useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProjectLink {
  project_id: number; project_code: string; project_title: string;
  impact: string | null; context: string | null;
}
interface Risk {
  label: string; description: string | null;
  probability: string | null; impact: string | null;
  severity: string | null; status: string;
  mitigation_plan: string | null; due_date: string | null;
  owner_name: string | null;
  projects: ProjectLink[];
}
type RiskItem = { id: string; attributes: Risk };
interface ProjectOption { id: string; attributes: { title: string; code: string | null } }

const LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['open', 'mitigating', 'closed', 'accepted'] as const;

const EMPTY_FORM = {
  label: '', description: '', probability: '' as string,
  impact: '' as string, severity: '' as string,
  status: 'open' as string,
  mitigation_plan: '', due_date: '',
};

// ─── Composant ───────────────────────────────────────────────────────────────
export function RisksPage() {
  const [risks, setRisks]       = useState<RiskItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  // Create / Edit modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editItem, setEditItem]       = useState<RiskItem | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RiskItem | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Link project panel
  const [linkTarget, setLinkTarget]     = useState<RiskItem | null>(null);
  const [linkProjectId, setLinkProjectId] = useState('');
  const [linkImpact, setLinkImpact]     = useState('');
  const [linkContext, setLinkContext]   = useState('');
  const [linking, setLinking]           = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    api.get<JsonApiList<Risk>>('/risks')
      .then(r => { setRisks(r.data); setError(null); })
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

  const openEdit = (item: RiskItem) => {
    setEditItem(item);
    const a = item.attributes;
    setForm({
      label: a.label,
      description: a.description || '',
      probability: a.probability || '',
      impact: a.impact || '',
      severity: a.severity || '',
      status: a.status,
      mitigation_plan: a.mitigation_plan || '',
      due_date: a.due_date ? a.due_date.slice(0, 10) : '',
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
        probability: form.probability || null,
        impact: form.impact || null,
        severity: form.severity || null,
        status: form.status || 'open',
        mitigation_plan: form.mitigation_plan || null,
        due_date: form.due_date || null,
      };
      if (editItem) {
        await api.patch(`/risks/${editItem.id}`, attributes, 'risk');
      } else {
        await api.post('/risks', attributes, 'risk');
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
      await api.del(`/risks/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Link / Unlink project ─────────────────────────────────────────────────
  const openLink = (item: RiskItem) => {
    setLinkTarget(item);
    setLinkProjectId(''); setLinkImpact(''); setLinkContext('');
  };

  const handleLink = async () => {
    if (!linkTarget || !linkProjectId) return;
    setLinking(true);
    try {
      await api.post(`/risks/${linkTarget.id}/projects/${linkProjectId}`, {
        impact: linkImpact || null,
        context: linkContext || null,
      }, 'risk-project');
      reload();
      // Refresh linkTarget from updated list
      setLinkTarget(prev => {
        if (!prev) return null;
        return prev; // will be refreshed on next render via risks state
      });
      setLinkProjectId(''); setLinkImpact(''); setLinkContext('');
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (riskId: string, projectId: number) => {
    try {
      await api.del(`/risks/${riskId}/projects/${projectId}`);
      reload();
    } catch (e: any) {
      setError(e.response?.data?.errors?.[0]?.detail || e.message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (error) return <div className="error">{error}<button className="btn" style={{ marginLeft: 12 }} onClick={() => setError(null)}>Dismiss</button></div>;

  // Updated linkTarget from fresh risks state
  const linkTargetFresh = linkTarget ? risks.find(r => r.id === linkTarget.id) || linkTarget : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Risks ({risks.length})</h2>
        <button className="btn" onClick={openCreate}>+ New risk</button>
      </div>

      {/* ── List table ── */}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr>
            <th>Projects</th><th>Label</th><th>Prob</th><th>Impact</th>
            <th>Severity</th><th>Status</th><th>Due</th><th style={{ width: 120 }}></th>
          </tr></thead>
          <tbody>
            {risks.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {r.attributes.projects?.length
                      ? r.attributes.projects.map(p => (
                          <span key={p.project_id} className="badge" title={p.project_title}>{p.project_code || p.project_title}</span>
                        ))
                      : <span className="muted">—</span>
                    }
                  </div>
                </td>
                <td>{r.attributes.label}</td>
                <td><span className={`badge ${r.attributes.probability || ''}`}>{r.attributes.probability || '—'}</span></td>
                <td><span className={`badge ${r.attributes.impact || ''}`}>{r.attributes.impact || '—'}</span></td>
                <td><span className={`badge ${r.attributes.severity || ''}`}>{r.attributes.severity || '—'}</span></td>
                <td><span className="badge">{r.attributes.status}</span></td>
                <td className="muted">{r.attributes.due_date ? r.attributes.due_date.slice(0, 10) : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => openLink(r)}>🔗</button>
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => setDeleteTarget(r)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!risks.length && <div className="empty">No risks yet. Click <strong>+ New risk</strong> to create one.</div>}
      </div>

      {/* ── Create / Edit modal ── */}
      <Modal
        open={modalOpen}
        title={editItem ? 'Edit risk' : 'New risk'}
        onClose={() => !saving && setModalOpen(false)}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn" onClick={handleSave} disabled={saving || !form.label.trim()}>
              {saving ? 'Saving…' : editItem ? 'Save changes' : 'Create risk'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Label *</span>
            <input
              className="input" style={{ width: '100%' }}
              value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              placeholder="Risk label"
              autoFocus
            />
          </label>

          <label>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Description</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {(['probability', 'impact', 'severity'] as const).map(field => (
              <label key={field}>
                <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{field}</span>
                <select className="input" style={{ width: '100%' }} value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}>
                  <option value="">—</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            ))}
          </div>

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
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Mitigation plan</span>
            <textarea
              className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
              value={form.mitigation_plan}
              onChange={e => setForm(p => ({ ...p, mitigation_plan: e.target.value }))}
              placeholder="Optional mitigation plan"
            />
          </label>
        </div>
      </Modal>

      {/* ── Link project panel ── */}
      {linkTargetFresh && (
        <Modal
          open={true}
          title={`Link projects — ${linkTargetFresh.attributes.label}`}
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
                    {p.impact && <span className={`badge ${p.impact}`} style={{ fontSize: 10 }}>{p.impact}</span>}
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
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Impact on project</span>
                <select className="input" style={{ width: '100%' }} value={linkImpact}
                  onChange={e => setLinkImpact(e.target.value)}>
                  <option value="">—</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Context (why this risk affects this project)</span>
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
        title="Delete risk"
        message={<>Delete <strong>{deleteTarget?.attributes.label}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
