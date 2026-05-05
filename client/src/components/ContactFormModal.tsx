import { useEffect, useMemo, useState } from 'react';
import { api, JsonApiOne } from '../api';
import { Modal } from './Modal';

// ─── Types ───────────────────────────────────────────────────────────────
export interface ContactFormValues {
  id?: number;
  last_name: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  company_name: string | null;
  organization_id: number | null;
  manager_contact_id: number | null;
  office_location: string | null;
  city: string | null;
  country: string | null;
  employee_id: string | null;
  notes: string | null;
  active: boolean;
}

interface OrgOption { id: number; code: string; n: number; }

interface ContactFormModalProps {
  open: boolean;
  initial: Partial<ContactFormValues> | null; // null = create mode
  organizations: OrgOption[];
  onClose: () => void;
  onSaved: () => void; // callback to refresh the list
}

// ─── Recherche manager (autocomplete) ────────────────────────────────────
interface ManagerSuggestion { id: number; last_name: string; first_name: string | null; email: string | null; }

function ManagerPicker({
  value, displayName, onChange, excludeId,
}: {
  value: number | null;
  displayName: string | null;
  onChange: (id: number | null, name: string | null) => void;
  excludeId?: number;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ManagerSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r: any = await api.get(`/contacts?q=${encodeURIComponent(q.trim())}&pageSize=10&active=true&sort=last_name`);
        setResults(r.data
          .map((d: any) => ({ ...d.attributes, id: parseInt(d.id, 10) }))
          .filter((c: ManagerSuggestion) => c.id !== excludeId));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, excludeId]);

  if (value && !open) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ flex: 1, padding: '6px 8px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 4 }}>
          {displayName || `Contact #${value}`}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => onChange(null, null)} title="Clear">✕</button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>Change</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        autoFocus={open}
        placeholder="Type at least 2 letters…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && q.trim().length >= 2 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 4,
          maxHeight: 220, overflowY: 'auto', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {loading && <div className="muted" style={{ padding: 8 }}>Searching…</div>}
          {!loading && results.length === 0 && <div className="muted" style={{ padding: 8 }}>No matches</div>}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', color: 'var(--text)',
                padding: '6px 10px', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onClick={() => {
                const name = `${r.last_name} ${r.first_name || ''}`.trim();
                onChange(r.id, name);
                setQ(''); setOpen(false);
              }}
            >
              <strong>{r.last_name}</strong> {r.first_name} <span className="muted">{r.email || ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal CRUD ──────────────────────────────────────────────────────────
const EMPTY: ContactFormValues = {
  last_name: '', first_name: null, email: null, phone: null,
  job_title: null, department: null, company_name: null,
  organization_id: null, manager_contact_id: null,
  office_location: null, city: null, country: null,
  employee_id: null, notes: null, active: true,
};

export function ContactFormModal({
  open, initial, organizations, onClose, onSaved,
}: ContactFormModalProps) {
  const isEdit = !!initial?.id;
  const [values, setValues] = useState<ContactFormValues>(EMPTY);
  const [managerName, setManagerName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({ ...EMPTY, ...(initial || {}) } as ContactFormValues);
      setManagerName((initial as any)?.manager_name || null);
      setErrors({});
      setServerError(null);
    }
  }, [open, initial]);

  const set = <K extends keyof ContactFormValues>(k: K, v: ContactFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const clientValidate = (): boolean => {
    const e: Record<string, string> = {};
    if (!values.last_name?.trim()) e.last_name = 'Required';
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Payload : on ne renvoie au serveur que les champs réellement saisis
  const buildPayload = useMemo(() => () => {
    const out: Record<string, unknown> = {};
    (Object.keys(values) as (keyof ContactFormValues)[]).forEach((k) => {
      if (k === 'id') return;
      const v = values[k];
      out[k] = typeof v === 'string' ? (v.trim() || null) : v;
    });
    return out;
  }, [values]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientValidate()) return;
    setSaving(true); setServerError(null);
    try {
      if (isEdit) {
        await api.patch<JsonApiOne<unknown>>(`/contacts/${initial!.id}`, buildPayload(), 'contact');
      } else {
        await api.post<JsonApiOne<unknown>>('/contacts', buildPayload(), 'contact');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      // Best-effort: extract JSON:API errors
      const msg = String(err?.message || 'Save failed');
      const match = msg.match(/\{.*\}/s);
      if (match) {
        try {
          const j = JSON.parse(match[0]);
          const first = j.errors?.[0];
          if (first) {
            setServerError(first.detail || first.title || msg);
            setSaving(false);
            return;
          }
        } catch { /* ignore */ }
      }
      setServerError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit contact #${initial!.id}` : 'New contact'}
      onClose={onClose}
      size="md"
      footer={
        <>
          {serverError && <div className="muted" style={{ flex: 1, color: 'var(--red)', fontSize: 12 }}>{serverError}</div>}
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="btn" onClick={onSubmit} disabled={saving}>
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create contact')}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} autoComplete="off">
        <div className="grid-2">
          <div>
            <label>Last name *</label>
            <input
              className={errors.last_name ? 'invalid' : ''}
              value={values.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              autoFocus
            />
            {errors.last_name && <div className="field-error">{errors.last_name}</div>}
          </div>
          <div>
            <label>First name</label>
            <input value={values.first_name || ''} onChange={(e) => set('first_name', e.target.value || null)} />
          </div>

          <div>
            <label>Email</label>
            <input
              type="email"
              className={errors.email ? 'invalid' : ''}
              value={values.email || ''}
              onChange={(e) => set('email', e.target.value || null)}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>
          <div>
            <label>Phone</label>
            <input value={values.phone || ''} onChange={(e) => set('phone', e.target.value || null)} />
          </div>

          <div>
            <label>Job title</label>
            <input value={values.job_title || ''} onChange={(e) => set('job_title', e.target.value || null)} />
          </div>
          <div>
            <label>Department</label>
            <input value={values.department || ''} onChange={(e) => set('department', e.target.value || null)} />
          </div>

          <div>
            <label>Organization</label>
            <select
              value={values.organization_id ?? ''}
              onChange={(e) => set('organization_id', e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">— None —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.code}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Company</label>
            <input value={values.company_name || ''} onChange={(e) => set('company_name', e.target.value || null)} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label>Manager</label>
            <ManagerPicker
              value={values.manager_contact_id}
              displayName={managerName}
              excludeId={initial?.id}
              onChange={(id, name) => { set('manager_contact_id', id); setManagerName(name); }}
            />
          </div>

          <div>
            <label>Office</label>
            <input value={values.office_location || ''} onChange={(e) => set('office_location', e.target.value || null)} />
          </div>
          <div>
            <label>City</label>
            <input value={values.city || ''} onChange={(e) => set('city', e.target.value || null)} />
          </div>

          <div>
            <label>Country</label>
            <input value={values.country || ''} onChange={(e) => set('country', e.target.value || null)} />
          </div>
          <div>
            <label>Employee ID</label>
            <input value={values.employee_id || ''} onChange={(e) => set('employee_id', e.target.value || null)} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea rows={3} value={values.notes || ''} onChange={(e) => set('notes', e.target.value || null)} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={values.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              <span style={{ color: 'var(--text)' }}>Active</span>
            </label>
          </div>
        </div>
        {/* Hidden submit pour Enter */}
        <button type="submit" style={{ display: 'none' }} aria-hidden />
      </form>
    </Modal>
  );
}
