import React, { useCallback, useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SortablePersonList, SortablePersonItem } from '../components/SortablePersonList';

interface MeetingType {
  code: string;
  label: string;
  category: string;
  sort_order: number;
  active: boolean;
  meetings_count: number;
}

type MeetingTypeItem = { id: string; attributes: MeetingType };

const CATEGORY_OPTIONS = [
  { value: 'formal',   label: 'Formal meeting'    },
  { value: 'informal', label: 'Informal exchange'  },
];
const CATEGORY_LABEL: Record<string, string> = {
  formal:   'Formal meeting',
  informal: 'Informal exchange',
};

const EMPTY_FORM = { code: '', label: '', category: 'formal', active: true };

export function MeetingTypesPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingTypeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MeetingTypeItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteTarget, setDeleteTarget] = useState<MeetingTypeItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = useCallback(() => {
    api.get<JsonApiList<MeetingType>>('/meeting-types')
      .then(r => { setMeetingTypes(r.data); setError(null); })
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (item: MeetingTypeItem) => {
    setEditItem(item);
    setForm({
      code: item.attributes.code,
      label: item.attributes.label,
      category: item.attributes.category || 'formal',
      active: item.attributes.active,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.label.trim()) return;
    setSaving(true);
    try {
      if (editItem) {
        await api.patch(`/meeting-types/${editItem.id}`, form, 'meeting-type');
      } else {
        await api.post('/meeting-types', form, 'meeting-type');
      }
      setModalOpen(false);
      reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const reorder = async (newIds: string[]) => {
    const next = newIds.map(id => meetingTypes.find(mt => mt.id === id)!).filter(Boolean);
    setMeetingTypes(next);
    try {
      await api.patch('/meeting-types/reorder', { order: newIds.map(Number) }, 'meeting-type-order');
      reload();
    } catch (e: any) {
      setError(e.message);
      reload();
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.del(`/meeting-types/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } catch (e: any) {
      setDeleteError(e.message.includes('409')
        ? e.message.replace(/^HTTP \d+ on [^:]+: /, '')
        : e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Meeting Types</h2>
        <button className="btn" onClick={openCreate}>+ Add Meeting Type</button>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', padding: '0 4px' }}>
        {meetingTypes.length === 0 && <div className="empty">No meeting types defined yet.</div>}

        <SortablePersonList
          items={meetingTypes.map((item): SortablePersonItem => ({
            id: item.id,
            name: (
              <span>
                <span style={{ fontWeight: 500 }}>{item.attributes.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{item.attributes.code}</span>
              </span>
            ),
            role: (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                background: item.attributes.category === 'informal' ? 'var(--panel-2)' : 'var(--accent-bg, rgba(99,179,237,.12))',
                color: item.attributes.category === 'informal' ? 'var(--muted)' : 'var(--accent)',
                border: '1px solid',
                borderColor: item.attributes.category === 'informal' ? 'var(--border)' : 'var(--accent)',
                whiteSpace: 'nowrap',
              }}>
                {CATEGORY_LABEL[item.attributes.category] || item.attributes.category}
              </span>
            ),
            context: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge" style={item.attributes.active ? { color: 'var(--green)', borderColor: 'var(--green)' } : undefined}>
                  {item.attributes.active ? 'Active' : 'Inactive'}
                </span>
                <span style={{ color: item.attributes.meetings_count > 0 ? 'var(--accent)' : 'var(--muted)', fontSize: 12, minWidth: 20, textAlign: 'center' }}>
                  {item.attributes.meetings_count > 0 ? `${item.attributes.meetings_count} mtg` : '—'}
                </span>
              </span>
            ),
            actions: (
              <span style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => openEdit(item)}>Edit</button>
                <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setDeleteTarget(item); setDeleteError(null); }}>Delete</button>
              </span>
            ),
          }))}
          onReorder={reorder}
          headers={{ name: 'Label / Code', role: 'Category', context: 'Status' }}
        />
      </div>

      <Modal
        open={modalOpen}
        title={editItem ? 'Edit Meeting Type' : 'New Meeting Type'}
        onClose={() => setModalOpen(false)}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn" onClick={save} disabled={saving || !form.code.trim() || !form.label.trim()}>
              {saving ? 'Saving…' : editItem ? 'Save' : 'Create'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label>Category *</label>
            <select
              className="input"
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
            >
              {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label>Code *</label>
            <input
              value={form.code}
              onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
              placeholder="e.g. follow_up"
              autoFocus={!editItem}
            />
          </div>
          <div>
            <label>Label *</label>
            <input
              value={form.label}
              onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
              placeholder="e.g. Follow-up"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))}
            />
            Active
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete meeting type"
        message={deleteTarget ? (
          <>
            <div>Are you sure you want to delete <strong>{deleteTarget.attributes.label}</strong>?</div>
            {deleteError && <div style={{ marginTop: 8, color: 'var(--red, #c62828)' }}>{deleteError}</div>}
          </>
        ) : ''}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={doDelete}
      />
    </div>
  );
}