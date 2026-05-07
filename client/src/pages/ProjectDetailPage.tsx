import React, { useEffect, useRef, useState } from 'react';
import { api, JsonApiList, JsonApiOne } from '../api';

const BASE = '/api';

interface Project {
  code: string | null; title: string; slug: string; status: string;
  urgency: string | null; priority: string | null;
  rag_global: string; rag_planning: string; rag_budget: string;
  rag_scope: string; rag_risks: string;
  status_brief: string | null; status_brief_updated_at: string | null;
  highlights: any[]; concerns: any[]; next_steps: any[];
  attributes: Record<string, any>;
}
interface MemberItem {
  id: string;
  role: string; effort_md: string | null;
  last_name: string; first_name: string; job_title: string;
  organization_code: string | null; cc_label: string | null;
}
interface ContactOption {
  id: string; last_name: string; first_name: string;
  email: string | null; job_title: string | null;
}
interface Risk {
  label: string; probability: string | null; impact: string | null;
  severity: string | null; status: string; due_date: string | null;
}
interface Doc {
  type: string; title: string | null; version: string; status: string;
}
interface Meeting {
  title: string; type: string; start_at: string;
}
interface SourceItem {
  id: string; title: string; source_type: string | null;
  original_filename: string | null; mime_type: string | null;
  file_size_bytes: number | null; extraction_status: string;
}

const PROJECT_ROLES = [
  'sponsor_wbe', 'sponsor_etnic', 'requester', 'responsible_for_request',
  'etnic_project_manager', 'business_project_manager',
  'etnic_portfolio_manager', 'wbe_portfolio_manager',
  'expert', 'it_team_member', 'business_team_member', 'observer',
] as const;

const RAG = ['rag_global', 'rag_planning', 'rag_budget', 'rag_scope', 'rag_risks'] as const;

function fmtSize(b: number | null) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectDetailPage({ id, onBack }: { id: string; onBack: () => void }) {
  const [project, setProject]   = useState<Project | null>(null);
  const [members, setMembers]   = useState<MemberItem[]>([]);
  const [risks, setRisks]       = useState<Risk[]>([]);
  const [docs, setDocs]         = useState<Doc[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sources, setSources]   = useState<SourceItem[]>([]);
  const [error, setError]       = useState<string | null>(null);

  // Add member form
  const [showAddMember, setShowAddMember]   = useState(false);
  const [memberSearch, setMemberSearch]     = useState('');
  const [searchResults, setSearchResults]   = useState<ContactOption[]>([]);
  const [selContact, setSelContact]         = useState<ContactOption | null>(null);
  const [memberRole, setMemberRole]         = useState('');
  const [memberEffort, setMemberEffort]     = useState('');
  const [addingMember, setAddingMember]     = useState(false);
  const [removingId, setRemovingId]         = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMembers = () =>
    api.get<JsonApiList<MemberItem>>(`/project-members?project_id=${id}`)
      .then(m => setMembers(m.data.map(x => ({ ...x.attributes, id: x.id }))));

  const loadSources = () =>
    api.get<JsonApiList<SourceItem>>(`/sources?project_id=${id}`)
      .then(s => setSources(s.data.map(x => ({ ...x.attributes, id: x.id }))));

  useEffect(() => {
    Promise.all([
      api.get<JsonApiOne<Project>>(`/projects/${id}`),
      api.get<JsonApiList<MemberItem>>(`/project-members?project_id=${id}`),
      api.get<JsonApiList<Risk>>(`/risks?project_id=${id}`),
      api.get<JsonApiList<Doc>>(`/documents?project_id=${id}`),
      api.get<JsonApiList<Meeting>>(`/meetings?project_id=${id}`),
      api.get<JsonApiList<SourceItem>>(`/sources?project_id=${id}`),
    ])
      .then(([p, m, r, d, mt, s]) => {
        setProject(p.data.attributes);
        setMembers(m.data.map(x => ({ ...x.attributes, id: x.id })));
        setRisks(r.data.map(x => x.attributes));
        setDocs(d.data.map(x => x.attributes));
        setMeetings(mt.data.map(x => x.attributes));
        setSources(s.data.map(x => ({ ...x.attributes, id: x.id })));
      })
      .catch(e => setError(e.message));
  }, [id]); // eslint-disable-line

  // ── Contact search (debounced) ─────────────────────────────────────────────
  const handleMemberSearch = (q: string) => {
    setMemberSearch(q);
    setSelContact(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${BASE}/contacts?q=${encodeURIComponent(q)}&limit=8`);
        const json = await res.json();
        setSearchResults((json.data || []).map((x: any) => ({ ...x.attributes, id: x.id })));
      } catch { setSearchResults([]); }
    }, 300);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selContact || !memberRole) return;
    setAddingMember(true);
    try {
      await api.post('/project-members', {
        project_id: Number(id),
        contact_id: Number(selContact.id),
        role: memberRole,
        effort_md: memberEffort ? Number(memberEffort) : null,
      }, 'project-member');
      setShowAddMember(false);
      setMemberSearch(''); setSelContact(null); setMemberRole(''); setMemberEffort('');
      setSearchResults([]);
      await loadMembers();
    } catch (err: any) { setError(err.message); }
    finally { setAddingMember(false); }
  };

  const handleRemoveMember = async (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (removingId !== memberId) { setRemovingId(memberId); return; }
    try {
      await api.del(`/project-members/${memberId}`);
      setRemovingId(null);
      await loadMembers();
    } catch (err: any) { setError(err.message); }
  };

  // ── Source preview / download ──────────────────────────────────────────────
  const openSource = (s: SourceItem) => {
    const isPdf = (s.mime_type || '').includes('pdf');
    const url = `${BASE}/sources/${s.id}/file`;
    if (isPdf) {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = s.original_filename || s.title;
      a.click();
    }
  };

  if (error) return <div className="error">{error}</div>;
  if (!project) return <div className="empty">Loading…</div>;

  const INP: React.CSSProperties = {
    background: 'var(--panel-2)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '5px 8px', borderRadius: 4, fontSize: 13,
  };

  return (
    <div>
      <p><button className="btn" onClick={onBack}>← Back</button></p>
      <h2>{project.code ? `[${project.code}] ` : ''}{project.title}</h2>
      <p className="muted">slug: {project.slug} · status: <span className="badge">{project.status}</span> · urgency: {project.urgency || '—'} · priority: {project.priority || '—'}</p>

      <div className="row">
        <div className="col">
          <div className="card">
            <h3>RAG status</h3>
            <table><tbody>
              {RAG.map(k => (
                <tr key={k}>
                  <td className="muted">{k.replace('rag_', '')}</td>
                  <td><span className={`rag ${(project as any)[k]}`} /> {(project as any)[k]}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="card">
            <h3>Status brief</h3>
            <p>{project.status_brief || <span className="muted">No brief yet.</span>}</p>
            {project.status_brief_updated_at &&
              <p className="muted">Updated {new Date(project.status_brief_updated_at).toLocaleString()}</p>}
          </div>
        </div>
        <div className="col">
          <div className="card">
            <h3>Highlights / concerns / next steps</h3>
            <p><strong>Highlights:</strong> {project.highlights?.length || 0}</p>
            <p><strong>Concerns:</strong> {project.concerns?.length || 0}</p>
            <p><strong>Next steps:</strong> {project.next_steps?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* ── Members ─────────────────────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Members ({members.length})</h3>
          <button
            onClick={() => { setShowAddMember(v => !v); setRemovingId(null); }}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
          >{showAddMember ? 'Cancel' : '+ Add member'}</button>
        </div>

        {/* Add member form */}
        {showAddMember && (
          <form onSubmit={handleAddMember} style={{ background: 'var(--panel-2)', borderRadius: 6, padding: '12px 16px', marginBottom: 16, display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8, alignItems: 'end' }}>
              {/* Contact search */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>CONTACT *</label>
                {selContact ? (
                  <div style={{ ...INP, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{selContact.first_name} {selContact.last_name}</span>
                    <button type="button" onClick={() => { setSelContact(null); setMemberSearch(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0 }}>✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={memberSearch}
                      onChange={e => handleMemberSearch(e.target.value)}
                      placeholder="Search by name…"
                      style={{ ...INP, width: '100%' }}
                    />
                    {searchResults.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        borderRadius: 4, zIndex: 10, maxHeight: 200, overflowY: 'auto',
                      }}>
                        {searchResults.map(c => (
                          <div
                            key={c.id}
                            onClick={() => { setSelContact(c); setMemberSearch(''); setSearchResults([]); }}
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                          >
                            <strong>{c.first_name} {c.last_name}</strong>
                            {c.job_title && <span className="muted"> · {c.job_title}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Role */}
              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>ROLE *</label>
                <select value={memberRole} onChange={e => setMemberRole(e.target.value)} required style={{ ...INP, width: '100%' }}>
                  <option value="">— select —</option>
                  {PROJECT_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              {/* Effort */}
              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>EFFORT (MD)</label>
                <input
                  type="number" min="0" step="0.5"
                  value={memberEffort} onChange={e => setMemberEffort(e.target.value)}
                  placeholder="—" style={{ ...INP, width: 70 }}
                />
              </div>
              <button
                type="submit"
                disabled={addingMember || !selContact || !memberRole}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '5px 14px', borderRadius: 6, cursor: 'pointer', opacity: (!selContact || !memberRole) ? 0.5 : 1 }}
              >{addingMember ? '…' : 'Add'}</button>
            </div>
          </form>
        )}

        {members.length ? (
          <table>
            <thead><tr><th>Role</th><th>Name</th><th>Org</th><th>Job title</th><th>CC</th><th>Effort (MD)</th><th></th></tr></thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td><span className="badge">{m.role.replace(/_/g, ' ')}</span></td>
                  <td>{m.first_name} {m.last_name}</td>
                  <td>{m.organization_code || '—'}</td>
                  <td className="muted">{m.job_title || '—'}</td>
                  <td>{m.cc_label || '—'}</td>
                  <td>{m.effort_md || '—'}</td>
                  <td>
                    {removingId === m.id ? (
                      <>
                        <button onClick={e => handleRemoveMember(m.id, e)}
                          style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', marginRight: 4 }}>
                          Confirm
                        </button>
                        <button onClick={e => { e.stopPropagation(); setRemovingId(null); }}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button onClick={e => handleRemoveMember(m.id, e)}
                        title="Remove from project"
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--red)' }}>
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">No members yet.</div>}
      </div>

      {/* ── Risks ───────────────────────────────────────────────────────────── */}
      <div className="card">
        <h3>Risks ({risks.length})</h3>
        {risks.length ? (
          <table>
            <thead><tr><th>Label</th><th>Prob</th><th>Impact</th><th>Severity</th><th>Status</th><th>Due</th></tr></thead>
            <tbody>
              {risks.map((r, i) => (
                <tr key={i}>
                  <td>{r.label}</td>
                  <td><span className={`badge ${r.probability || ''}`}>{r.probability || '—'}</span></td>
                  <td><span className={`badge ${r.impact || ''}`}>{r.impact || '—'}</span></td>
                  <td><span className={`badge ${r.severity || ''}`}>{r.severity || '—'}</span></td>
                  <td>{r.status}</td>
                  <td className="muted">{r.due_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">No risks yet.</div>}
      </div>

      {/* ── Sources ─────────────────────────────────────────────────────────── */}
      <div className="card">
        <h3>Sources ({sources.length})</h3>
        {sources.length ? (
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Size</th><th>Extraction</th><th></th></tr></thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.title}</div>
                    {s.original_filename && s.original_filename !== s.title &&
                      <div className="muted" style={{ fontSize: 11 }}>{s.original_filename}</div>}
                  </td>
                  <td>{s.source_type ? <span className="badge">{s.source_type}</span> : <span className="muted">—</span>}</td>
                  <td className="muted">{fmtSize(s.file_size_bytes)}</td>
                  <td><span style={{ fontSize: 11, fontWeight: 600, color: s.extraction_status === 'success' ? 'var(--green)' : s.extraction_status === 'failed' ? 'var(--red)' : 'var(--muted)' }}>{s.extraction_status}</span></td>
                  <td>
                    <button
                      onClick={() => openSource(s)}
                      title={(s.mime_type || '').includes('pdf') ? 'Open PDF' : 'Download'}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 12, cursor: 'pointer', color: 'var(--text)' }}
                    >{(s.mime_type || '').includes('pdf') ? '👁' : '⬇'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">No sources linked to this project.</div>}
      </div>

      {/* ── Documents + Meetings ────────────────────────────────────────────── */}
      <div className="row">
        <div className="col">
          <div className="card">
            <h3>Documents ({docs.length})</h3>
            {docs.length ? (
              <table>
                <thead><tr><th>Type</th><th>Title</th><th>Version</th><th>Status</th></tr></thead>
                <tbody>{docs.map((d, i) => (
                  <tr key={i}>
                    <td><span className="badge">{d.type}</span></td>
                    <td>{d.title || <span className="muted">—</span>}</td>
                    <td>{d.version}</td>
                    <td>{d.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <div className="empty">No documents yet.</div>}
          </div>
        </div>
        <div className="col">
          <div className="card">
            <h3>Meetings ({meetings.length})</h3>
            {meetings.length ? (
              <table>
                <thead><tr><th>When</th><th>Title</th><th>Type</th></tr></thead>
                <tbody>{meetings.map((m, i) => (
                  <tr key={i}>
                    <td className="muted">{new Date(m.start_at).toLocaleString()}</td>
                    <td>{m.title}</td>
                    <td><span className="badge">{m.type}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <div className="empty">No meetings yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
