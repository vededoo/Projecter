import React, { useCallback, useEffect, useState } from 'react';
import { api, JsonApiList, JsonApiOne } from '../api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

// ─── Types ───────────────────────────────────────────────────────────────────
interface RoleMember {
  member_id: number;
  project_id: number;
  contact_id: number;
  first_name: string | null;
  last_name: string | null;
  project_title: string | null;
  project_code: string | null;
}

interface Role {
  label: string;
  active: boolean;
  members_count: number;
  members?: RoleMember[];
}

type RoleItem = { id: string; attributes: Role };

const EMPTY_FORM = { label: '', active: true };

// ─── Composant ───────────────────────────────────────────────────────────────
export function RolesPage() {
  const [roles, setRoles]   = useState<RoleItem[]>([]);
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem]   = useState<RoleItem | null>(null);
  const [form, setForm]           = useState({ ...EMPTY_FORM });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState<string | null>(null);

  // Members panel (expanded role)
  const [expanded, setExpanded]             = useState<string | null>(null);
  const [expandedData, setExpandedData]     = useState<RoleItem | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    api.get<JsonApiList<Role>>('/roles')
      .then(r => { setRoles(r.data); setError(null); })
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Expand role → load members ─────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); setExpandedData(null); return; }
    setExpanded(id);
    setExpandedLoading(true);
    api.get<JsonApiOne<Role>>(`/roles/${id}`)
      .then(r => { setExpandedData(r.data); setExpandedLoading(false); })
      .catch(() => setExpandedLoading(false));
  };

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (item: RoleItem) => {
    setEditItem(item);
    setForm({ label: item.attributes.label, active: item.attributes.active });
    setModalOpen(true);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      if (editItem) {
        await api.patch(`/roles/${editItem.id}`, form, 'role');
      } else {
        await api.post('/roles', form, 'role');
      }
      setModalOpen(false);
      reload();
      // Refresh expanded if it was the edited role
      if (editItem && expanded === editItem.id) {
        setExpanded(null); setExpandedData(null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = (item: RoleItem) => {
    setDeleteTarget(item);
    setDeleteError(null);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.del(`/roles/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (expanded === deleteTarget.id) { setExpanded(null); setExpandedData(null); }
      reload();
    } catch (e: any) {
      // 409 = rôle utilisé → message explicite depuis le serveur
      const msg = e.message.includes('409') && e.message.includes('project member')
        ? e.message.replace(/^HTTP \d+ on [^:]+: /, '')
        : e.message;
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Roles</h2>
        <button className="btn" onClick={openCreate}>+ Add Role</button>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: 'var(--panel-2)', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 80px 100px 130px', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Label</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Members</span>
          <span />
        </div>

        {roles.length === 0 && (
          <div className="empty">No roles defined yet.</div>
        )}

        {roles.map(role => {
          const isOpen = expanded === role.id;
          const members = expandedData?.attributes.members ?? [];
          return (
            <React.Fragment key={role.id}>
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 100px 130px',
                  gap: 8,
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: isOpen ? 'var(--panel-2)' : undefined,
                  transition: 'background 0.15s',
                }}
                onClick={() => toggleExpand(role.id)}
              >
                <span style={{ fontWeight: 500 }}>
                  <span style={{ color: 'var(--muted)', marginRight: 6 }}>{isOpen ? '▾' : '▸'}</span>
                  {role.attributes.label}
                </span>
                <span>
                  <span
                    className="badge"
                    style={role.attributes.active
                      ? { color: 'var(--green)', borderColor: 'var(--green)' }
                      : undefined}
                  >
                    {role.attributes.active ? 'Active' : 'Inactive'}
                  </span>
                </span>
                <span style={{ textAlign: 'center', color: role.attributes.members_count > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                  {role.attributes.members_count > 0 ? `${role.attributes.members_count} member${role.attributes.members_count > 1 ? 's' : ''}` : '—'}
                </span>
                <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEdit(role)}>Edit</button>
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => confirmDelete(role)}>Delete</button>
                </span>
              </div>

              {/* Expanded members panel */}
              {isOpen && (
                <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '12px 14px 12px 32px' }}>
                  {expandedLoading ? (
                    <span className="muted">Loading…</span>
                  ) : members.length === 0 ? (
                    <span className="muted" style={{ fontSize: 13 }}>
                      No project members assigned to this role yet.
                      <span style={{ marginLeft: 8, fontSize: 11 }}>(role_id must be set on a project member to appear here)</span>
                    </span>
                  ) : (
                    <table style={{ width: '100%', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: 6 }}>Contact</th>
                          <th style={{ color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: 6 }}>Project</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(m => (
                          <tr key={m.member_id}>
                            <td style={{ padding: '4px 10px 4px 0', borderBottom: '1px solid var(--border)' }}>
                              {m.first_name} {m.last_name}
                            </td>
                            <td style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                              {m.project_code && <span className="badge" style={{ marginRight: 6 }}>{m.project_code}</span>}
                              {m.project_title ?? <span className="muted">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Create / Edit modal ──────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        title={editItem ? 'Edit Role' : 'New Role'}
        onClose={() => setModalOpen(false)}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              className="btn"
              onClick={save}
              disabled={saving || !form.label.trim()}
            >
              {saving ? 'Saving…' : editItem ? 'Save' : 'Create'}
            </button>
          </>
        }
      >
        <div>
          <label>Label *</label>
          <input
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Project Manager"
            autoFocus
          />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="role-active"
              style={{ width: 'auto' }}
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            />
            <label htmlFor="role-active" style={{ margin: 0, cursor: 'pointer' }}>Active</label>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Role"
        message={deleteTarget
          ? (deleteTarget.attributes.members_count > 0
            ? `"${deleteTarget.attributes.label}" is used by ${deleteTarget.attributes.members_count} project member(s). Are you sure you want to delete it?`
            : `Delete role "${deleteTarget.attributes.label}"?`)
          : ''}
        confirmLabel="Delete"
        danger
        onConfirm={doDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
        busy={deleting}
      />
    </div>
  );
}
