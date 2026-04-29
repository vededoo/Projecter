import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, JsonApiList } from '../api';
import { ContactFormModal, ContactFormValues } from '../components/ContactFormModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────────────────────
interface Contact {
  id: number;
  last_name: string;
  first_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  company_name: string | null;
  organization_id: number | null;
  organization_code: string | null;
  office_location: string | null;
  city: string | null;
  country: string | null;
  employee_id: string | null;
  employee_type: string | null;
  user_type: string | null;
  account_enabled: boolean | null;
  sam_account_name: string | null;
  azure_object_id: string | null;
  active: boolean;
  manager_contact_id: number | null;
  manager_name: string | null;
  graph_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ListResponse extends JsonApiList<Contact> {
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

interface FacetsResponse {
  data: {
    type: 'contact-facets'; id: string;
    attributes: {
      organizations: { id: number; code: string; n: number }[];
      departments: { department: string; n: number }[];
    };
  };
}

// ─── Définition des colonnes ─────────────────────────────────────────────
type ColKey =
  | '#' | 'last_name' | 'first_name' | 'email' | 'phone' | 'job_title'
  | 'department' | 'company_name' | 'organization_code'
  | 'manager_name' | 'office_location' | 'city' | 'country'
  | 'employee_id' | 'sam_account_name' | 'graph_synced_at' | 'updated_at';

interface ColumnDef {
  key: ColKey;
  label: string;
  sortable: boolean;
  defaultVisible: boolean;
  width?: string;
  render: (c: Contact, idx: number) => React.ReactNode;
}

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString() : '—';

const COLUMNS: ColumnDef[] = [
  { key: '#',                 label: '#',          sortable: false, defaultVisible: true,  width: '48px',
    render: (_, idx) => <span className="muted">{idx + 1}</span> },
  { key: 'last_name',         label: 'Last name',  sortable: true,  defaultVisible: true,
    render: (c) => <strong>{c.last_name}</strong> },
  { key: 'first_name',        label: 'First name', sortable: true,  defaultVisible: true,
    render: (c) => c.first_name || '—' },
  { key: 'email',             label: 'Email',      sortable: true,  defaultVisible: true,
    render: (c) => c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span className="muted">—</span> },
  { key: 'phone',             label: 'Phone',      sortable: false, defaultVisible: false,
    render: (c) => c.phone || <span className="muted">—</span> },
  { key: 'job_title',         label: 'Job title',  sortable: true,  defaultVisible: true,
    render: (c) => c.job_title || <span className="muted">—</span> },
  { key: 'department',        label: 'Department', sortable: true,  defaultVisible: true,
    render: (c) => c.department ? <span className="badge">{c.department}</span> : <span className="muted">—</span> },
  { key: 'company_name',      label: 'Company',    sortable: true,  defaultVisible: false,
    render: (c) => c.company_name || <span className="muted">—</span> },
  { key: 'organization_code', label: 'Org',        sortable: true,  defaultVisible: true,
    render: (c) => c.organization_code ? <span className="badge">{c.organization_code}</span> : <span className="muted">—</span> },
  { key: 'manager_name',      label: 'Manager',    sortable: true,  defaultVisible: true,
    render: (c) => c.manager_name || <span className="muted">—</span> },
  { key: 'office_location',   label: 'Office',     sortable: false, defaultVisible: false,
    render: (c) => c.office_location || <span className="muted">—</span> },
  { key: 'city',              label: 'City',       sortable: true,  defaultVisible: false,
    render: (c) => c.city || <span className="muted">—</span> },
  { key: 'country',           label: 'Country',    sortable: true,  defaultVisible: false,
    render: (c) => c.country || <span className="muted">—</span> },
  { key: 'employee_id',       label: 'Emp. ID',    sortable: true,  defaultVisible: false,
    render: (c) => c.employee_id || <span className="muted">—</span> },
  { key: 'sam_account_name',  label: 'SAM',        sortable: false, defaultVisible: false,
    render: (c) => c.sam_account_name || <span className="muted">—</span> },
  { key: 'graph_synced_at',   label: 'Graph sync', sortable: true,  defaultVisible: false,
    render: (c) => fmtDate(c.graph_synced_at) },
  { key: 'updated_at',        label: 'Updated',    sortable: true,  defaultVisible: false,
    render: (c) => fmtDate(c.updated_at) },
];

const LS_KEY = 'projecter.contacts.visibleCols.v1';
const LS_PAGESIZE = 'projecter.contacts.pageSize.v1';

function loadVisible(): Set<ColKey> {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v) return new Set(JSON.parse(v) as ColKey[]);
  } catch {}
  return new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
}

// ─── Hook : debounce ─────────────────────────────────────────────────────
function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// ─── Composant ───────────────────────────────────────────────────────────
export function ContactsPage() {
  // Filtres
  const [q, setQ] = useState('');
  const debQ = useDebounced(q, 300);
  const [organization, setOrganization] = useState('');
  const [department, setDepartment] = useState('');
  const [hasEmail, setHasEmail] = useState<'' | 'true' | 'false'>('');
  const [hasManager, setHasManager] = useState<'' | 'true' | 'false'>('');
  const [activeFlag, setActiveFlag] = useState<'' | 'true' | 'false'>('true');

  // Tri / pagination
  const [sortCol, setSortCol] = useState<ColKey>('last_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem(LS_PAGESIZE) || '50', 10);
    return [25, 50, 100, 200, 500].includes(saved) ? saved : 50;
  });

  // Colonnes visibles
  const [visible, setVisible] = useState<Set<ColKey>>(loadVisible);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement | null>(null);

  // Données
  const [items, setItems] = useState<Contact[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 50, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<FacetsResponse['data']['attributes'] | null>(null);

  // CRUD : modal + confirm
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Partial<ContactFormValues> | null | undefined>(undefined);
  // undefined = closed, null = create, object = edit
  const [toDelete, setToDelete] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const openCreate = () => setEditing(null);
  const openEdit = (c: Contact) => setEditing(c as unknown as ContactFormValues);
  const closeModal = () => setEditing(undefined);

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  };

  const onSaved = () => {
    showFlash(editing && (editing as any).id ? 'Contact updated' : 'Contact created');
    setRefreshKey((k) => k + 1);
  };

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.del(`/contacts/${toDelete.id}`);
      showFlash(`${toDelete.last_name} ${toDelete.first_name || ''} deactivated`);
      setToDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // Persist visible / pageSize
  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify([...visible])); }, [visible]);
  useEffect(() => { localStorage.setItem(LS_PAGESIZE, String(pageSize)); }, [pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debQ, organization, department, hasEmail, hasManager, activeFlag, pageSize]);

  // Click outside : ferme le menu colonnes
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (colMenuOpen && colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [colMenuOpen]);

  // Fetch facets une fois
  useEffect(() => {
    api.get<FacetsResponse>('/contacts/facets')
      .then((r) => setFacets(r.data.attributes))
      .catch(() => {/* silent */});
  }, []);

  // Fetch list
  useEffect(() => {
    const params = new URLSearchParams();
    if (debQ) params.set('q', debQ);
    if (organization) params.set('organization', organization);
    if (department) params.set('department', department);
    if (hasEmail) params.set('has_email', hasEmail);
    if (hasManager) params.set('has_manager', hasManager);
    if (activeFlag) params.set('active', activeFlag);
    params.set('sort', `${sortDir === 'desc' ? '-' : ''}${sortCol}`);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    setLoading(true); setError(null);
    api.get<ListResponse>(`/contacts?${params.toString()}`)
      .then((r) => {
        setItems(r.data.map((d) => ({ id: parseInt(d.id, 10), ...d.attributes })));
        setMeta(r.meta);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [debQ, organization, department, hasEmail, hasManager, activeFlag, sortCol, sortDir, page, pageSize, refreshKey]);

  // Tri par clic header
  const onSort = (col: ColKey) => {
    const def = COLUMNS.find((c) => c.key === col);
    if (!def?.sortable) return;
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const visibleCols = useMemo(() => COLUMNS.filter((c) => visible.has(c.key)), [visible]);

  const resetFilters = () => {
    setQ(''); setOrganization(''); setDepartment('');
    setHasEmail(''); setHasManager(''); setActiveFlag('true');
  };

  const startIdx = (meta.page - 1) * meta.pageSize;
  const endIdx = Math.min(startIdx + items.length, meta.total);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ flex: 1 }}>Contacts</h2>
        {flash && (
          <div style={{
            padding: '6px 12px', background: 'rgba(63,185,80,0.15)',
            border: '1px solid var(--green)', color: 'var(--green)',
            borderRadius: 6, fontSize: 12,
          }}>{flash}</div>
        )}
        <button className="btn" onClick={openCreate}>+ New contact</button>
      </div>

      {/* ─── Barre de filtres ───────────────────────────────────────── */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
        <div>
          <label>Search</label>
          <input
            placeholder="Name, email, job, department, company…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label>Organization</label>
          <select value={organization} onChange={(e) => setOrganization(e.target.value)}>
            <option value="">All</option>
            {facets?.organizations.map((o) => (
              <option key={o.code} value={o.code}>{o.code} ({o.n})</option>
            ))}
          </select>
        </div>
        <div>
          <label>Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All</option>
            {facets?.departments.slice(0, 200).map((d) => (
              <option key={d.department} value={d.department}>{d.department} ({d.n})</option>
            ))}
          </select>
        </div>
        <div>
          <label>Email</label>
          <select value={hasEmail} onChange={(e) => setHasEmail(e.target.value as '' | 'true' | 'false')}>
            <option value="">Any</option>
            <option value="true">With email</option>
            <option value="false">Without</option>
          </select>
        </div>
        <div>
          <label>Manager</label>
          <select value={hasManager} onChange={(e) => setHasManager(e.target.value as '' | 'true' | 'false')}>
            <option value="">Any</option>
            <option value="true">With manager</option>
            <option value="false">Without</option>
          </select>
        </div>
        <div>
          <label>Active</label>
          <select value={activeFlag} onChange={(e) => setActiveFlag(e.target.value as '' | 'true' | 'false')}>
            <option value="">All</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>
        <div>
          <button className="btn" onClick={resetFilters} title="Reset all filters">Reset</button>
        </div>
      </div>

      {/* ─── Toolbar : compteur + colonnes + pageSize ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
        <div className="muted" style={{ flex: 1 }}>
          {loading ? 'Loading…' :
            meta.total === 0 ? 'No results'
            : `Showing ${startIdx + 1}–${endIdx} of ${meta.total.toLocaleString()} contact${meta.total > 1 ? 's' : ''}`}
        </div>

        <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Per page</span>
          <select
            style={{ width: 90 }}
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
          >
            {[25, 50, 100, 200, 500].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <div ref={colMenuRef} style={{ position: 'relative' }}>
          <button className="btn" onClick={() => setColMenuOpen((v) => !v)}>
            Columns ({visibleCols.length}/{COLUMNS.length})
          </button>
          {colMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 8, minWidth: 220, zIndex: 10,
              maxHeight: 360, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}>
              {COLUMNS.map((col) => (
                <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, padding: '4px 6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={visible.has(col.key)}
                    onChange={(e) => {
                      const next = new Set(visible);
                      if (e.target.checked) next.add(col.key); else next.delete(col.key);
                      if (next.size === 0) return; // au moins une colonne
                      setVisible(next);
                    }}
                  />
                  <span style={{ color: 'var(--text)' }}>{col.label}</span>
                </label>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, display: 'flex', gap: 6 }}>
                <button
                  className="btn"
                  style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
                  onClick={() => setVisible(new Set(COLUMNS.map((c) => c.key)))}
                >All</button>
                <button
                  className="btn"
                  style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
                  onClick={() => setVisible(new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)))}
                >Default</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* ─── Table ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {visibleCols.map((col) => {
                const isSorted = sortCol === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => onSort(col.key)}
                    style={{
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      width: col.width,
                    }}
                    title={col.sortable ? 'Click to sort' : ''}
                  >
                    {col.label}
                    {col.sortable && (
                      <span style={{ marginLeft: 4, opacity: isSorted ? 1 : 0.3 }}>
                        {isSorted ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </th>
                );
              })}
              <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={`row-${c.id}`}>
                {visibleCols.map((col) => (
                  <td key={col.key} style={{ whiteSpace: col.key === 'email' ? 'nowrap' : 'normal' }}>
                    {col.render(c, startIdx + i)}
                  </td>
                ))}
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    className="btn btn-ghost"
                    title="Edit"
                    onClick={() => openEdit(c)}
                  >✎</button>
                  <button
                    className="btn btn-ghost"
                    title={c.active ? 'Deactivate' : 'Already inactive'}
                    onClick={() => setToDelete(c)}
                    disabled={!c.active}
                    style={{ color: c.active ? 'var(--red)' : 'var(--muted)' }}
                  >🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && <div className="empty">No contacts match these filters.</div>}
      </div>

      {/* ─── Pagination ─────────────────────────────────────────────── */}
      {meta.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button className="btn" disabled={meta.page <= 1} onClick={() => setPage(1)}>« First</button>
          <button className="btn" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>‹ Prev</button>
          <span className="muted">Page</span>
          <input
            type="number"
            min={1}
            max={meta.totalPages}
            value={meta.page}
            style={{ width: 70, textAlign: 'center' }}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v) && v >= 1 && v <= meta.totalPages) setPage(v);
            }}
          />
          <span className="muted">of {meta.totalPages}</span>
          <button className="btn" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>Next ›</button>
          <button className="btn" disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.totalPages)}>Last »</button>
        </div>
      )}

      {/* ─── Modal CRUD ─────────────────────────────────────────────── */}
      <ContactFormModal
        open={editing !== undefined}
        initial={editing ?? null}
        organizations={facets?.organizations ?? []}
        onClose={closeModal}
        onSaved={onSaved}
      />

      {/* ─── Confirm delete ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!toDelete}
        title="Deactivate contact"
        danger
        busy={deleting}
        confirmLabel="Deactivate"
        message={
          toDelete && (
            <div>
              <p>
                <strong>{toDelete.last_name} {toDelete.first_name}</strong>
                {toDelete.email && <span className="muted"> — {toDelete.email}</span>}
              </p>
              <p className="muted" style={{ fontSize: 12 }}>
                The contact will be marked as inactive and hidden from the default list.
                You can reactivate it later by editing it. No data will be deleted.
              </p>
            </div>
          )
        }
        onConfirm={onConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
