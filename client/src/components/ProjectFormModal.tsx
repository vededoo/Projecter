import { useEffect, useMemo, useState } from 'react';
import { api, JsonApiOne } from '../api';
import { Modal } from './Modal';

// ─── Types ───────────────────────────────────────────────────────────────
export interface ProjectFormValues {
  id?: number;
  code: string | null;
  title: string;
  slug: string;
  status: string;
  urgency: string | null;
  priority: string | null;
}

interface ProjectFormModalProps {
  open: boolean;
  initial: Partial<ProjectFormValues> | null; // null = create mode
  onClose: () => void;
  onSaved: (created: { id: string; slug: string }) => void;
}

// ─── ENUM values (kept in sync with PostgreSQL types) ────────────────────
const STATUS_OPTIONS = [
  'idea',
  'mandate_received',
  'briefing_draft',
  'briefing_review',
  'briefing_approved',
  'sheet_draft',
  'sheet_review',
  'sheet_approved_etnic',
  'sheet_approved_wbe',
  'sheet_signed',
  'in_progress',
  'closed',
  'cancelled',
];
const URGENCY_OPTIONS = ['low', 'medium', 'high'];
const PRIORITY_OPTIONS = ['ca', 'pdi', 'other'];

// ─── Slug helper ─────────────────────────────────────────────────────────
function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const EMPTY: ProjectFormValues = {
  code: null,
  title: '',
  slug: '',
  status: 'idea',
  urgency: null,
  priority: null,
};

export function ProjectFormModal({ open, initial, onClose, onSaved }: ProjectFormModalProps) {
  const isEdit = !!initial?.id;
  const [values, setValues] = useState<ProjectFormValues>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({ ...EMPTY, ...(initial || {}) } as ProjectFormValues);
      setSlugTouched(!!initial?.slug);
      setErrors({});
      setServerError(null);
    }
  }, [open, initial]);

  const set = <K extends keyof ProjectFormValues>(k: K, v: ProjectFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  // Auto-generate slug from title until the user edits it manually
  const onTitleChange = (v: string) => {
    setValues((s) => ({
      ...s,
      title: v,
      slug: !slugTouched && !isEdit ? slugify(v) : s.slug,
    }));
  };

  const clientValidate = (): boolean => {
    const e: Record<string, string> = {};
    if (!values.title?.trim()) e.title = 'Required';
    if (!values.slug?.trim()) e.slug = 'Required';
    else if (!/^[a-z0-9-]+$/.test(values.slug)) e.slug = 'Lowercase letters, digits and dashes only';
    if (!values.status) e.status = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = useMemo(() => () => {
    const out: Record<string, unknown> = {};
    (Object.keys(values) as (keyof ProjectFormValues)[]).forEach((k) => {
      if (k === 'id') return;
      const v = values[k];
      out[k] = typeof v === 'string' ? (v.trim() || null) : v;
    });
    // title is required, never null
    out.title = values.title.trim();
    out.slug = values.slug.trim();
    return out;
  }, [values]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientValidate()) return;
    setSaving(true); setServerError(null);
    try {
      let result: JsonApiOne<{ slug: string }>;
      if (isEdit) {
        result = await api.patch<JsonApiOne<{ slug: string }>>(`/projects/${initial!.id}`, buildPayload(), 'project');
      } else {
        result = await api.post<JsonApiOne<{ slug: string }>>('/projects', buildPayload(), 'project');
      }
      onSaved({ id: result.data.id, slug: result.data.attributes.slug });
      onClose();
    } catch (err: any) {
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
      title={isEdit ? `Edit project #${initial!.id}` : 'New project'}
      onClose={onClose}
      size="md"
      footer={
        <>
          {serverError && <div className="muted" style={{ flex: 1, color: 'var(--red)', fontSize: 12 }}>{serverError}</div>}
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="btn" onClick={onSubmit} disabled={saving}>
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create project')}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} autoComplete="off">
        <div className="grid-2">
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Title *</label>
            <input
              className={errors.title ? 'invalid' : ''}
              value={values.title}
              onChange={(e) => onTitleChange(e.target.value)}
              autoFocus
              placeholder="e.g. Refonte intranet ETNIC"
            />
            {errors.title && <div className="field-error">{errors.title}</div>}
          </div>

          <div>
            <label>Slug *</label>
            <input
              className={errors.slug ? 'invalid' : ''}
              value={values.slug}
              onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }}
              placeholder="auto-generated"
            />
            {errors.slug && <div className="field-error">{errors.slug}</div>}
          </div>
          <div>
            <label>Code</label>
            <input
              value={values.code || ''}
              onChange={(e) => set('code', e.target.value || null)}
              placeholder="e.g. PRJ-2026-001"
            />
          </div>

          <div>
            <label>Status *</label>
            <select
              className={errors.status ? 'invalid' : ''}
              value={values.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.status && <div className="field-error">{errors.status}</div>}
          </div>
          <div>
            <label>Urgency</label>
            <select
              value={values.urgency ?? ''}
              onChange={(e) => set('urgency', e.target.value || null)}
            >
              <option value="">— None —</option>
              {URGENCY_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Priority</label>
            <select
              value={values.priority ?? ''}
              onChange={(e) => set('priority', e.target.value || null)}
            >
              <option value="">— None —</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
