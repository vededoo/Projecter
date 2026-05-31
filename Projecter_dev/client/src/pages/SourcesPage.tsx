import React, { useEffect, useRef, useState } from 'react';
import { JsonApiList, JsonApiOne } from '../api';

const BASE = '/api';

interface ProjectBadge { project_id: number; project_code: string; project_title: string; context: string | null }
interface Source {
  id: string;
  title: string;
  source_type: string | null;
  description: string | null;
  extraction_status: string;
  extraction_error: string | null;
  extracted_chars: number | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  projects: ProjectBadge[];
  created_at: string;
}
interface SourceDetail extends Source {
  total_chars: number;
  returned_chars: number;
  has_more: boolean;
  content: string;
  offset: number;
}
interface Project { id: string; attributes: { title: string; code: string } }

const SOURCE_TYPES = ['pc_list', 'directive', 'spec', 'contract', 'template', 'procedure', 'report', 'other'];
const CHUNK = 40000;

function fmtSize(b: number | null) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    success: 'var(--green)', failed: 'var(--red)',
    skipped: 'var(--amber)', pending: 'var(--grey)',
  };
  return (
    <span style={{ color: color[status] || 'var(--muted)', fontSize: 11, fontWeight: 600 }}>
      {status}
    </span>
  );
}

export function SourcesPage() {
  const [sources, setSources]   = useState<Source[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError]       = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterProject, setFilterProject] = useState('');

  // Upload form state
  const [showUpload, setShowUpload]       = useState(false);
  const [selFile, setSelFile]             = useState<File | null>(null);
  const [uploadTitle, setUploadTitle]     = useState('');
  const [uploadType, setUploadType]       = useState('');
  const [uploadDesc, setUploadDesc]       = useState('');
  const [uploadProjects, setUploadProjects] = useState<string[]>([]);
  const [uploadMsg, setUploadMsg]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Detail panel state
  const [detail, setDetail]           = useState<SourceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOffset, setDetailOffset]   = useState(0);
  const [linkingId, setLinkingId]         = useState<string | null>(null); // source id being edited

  // Delete + preview state
  const [deleteId, setDeleteId]   = useState<string | null>(null); // id en attente de confirm
  const [deleting, setDeleting]   = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // URL pour la modale PDF

  const load = () => {
    const qs = filterProject ? `?project_id=${filterProject}` : '';
    Promise.all([
      fetch(`${BASE}/sources${qs}`).then(r => r.json()) as Promise<JsonApiList<Source>>,
      fetch(`${BASE}/projects`).then(r => r.json()) as Promise<JsonApiList<{ title: string; code: string }>>,
    ])
      .then(([s, p]) => {
        setSources(s.data.map(d => ({ ...d.attributes, id: d.id })));
        setProjects(p.data as Project[]);
      })
      .catch(e => setError(e.message));
  };

  useEffect(() => { load(); }, [filterProject]); // eslint-disable-line

  const loadDetail = (sourceId: string, offset = 0) => {
    setDetailLoading(true);
    fetch(`${BASE}/sources/${sourceId}/content?offset=${offset}&limit=${CHUNK}`)
      .then(r => r.json())
      .then((json: JsonApiOne<SourceDetail>) => {
        setDetail({ ...json.data.attributes, id: sourceId });
        setDetailOffset(offset);
      })
      .catch(e => setError(e.message))
      .finally(() => setDetailLoading(false));
  };

  const openDetail = (s: Source) => {
    if (detail?.id === s.id) { setDetail(null); setLinkingId(null); return; }
    setLinkingId(null);
    loadDetail(s.id, 0);
  };

  const toggleProjectLink = async (sourceId: string, projectId: string, linked: boolean) => {
    const method = linked ? 'DELETE' : 'POST';
    await fetch(`${BASE}/sources/${sourceId}/projects/${projectId}`, { method });
    load();
    // refresh detail panel projects list
    if (detail?.id === sourceId) loadDetail(sourceId, detailOffset);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selFile) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append('file', selFile);
      fd.append('title', uploadTitle || selFile.name.replace(/\.[^.]+$/, ''));
      if (uploadType) fd.append('source_type', uploadType);
      if (uploadDesc) fd.append('description', uploadDesc);
      if (uploadProjects.length) fd.append('project_ids', JSON.stringify(uploadProjects.map(Number)));
      const res = await fetch(`${BASE}/sources/upload`, { method: 'POST', body: fd });
      const json = await res.json() as JsonApiOne<Source>;
      if (!res.ok) throw new Error((json as any)?.errors?.[0]?.detail || 'Upload failed');
      setUploadMsg(`✅ "${json.data.attributes.title}" uploaded (${json.data.attributes.extraction_status})`);
      setSelFile(null); setUploadTitle(''); setUploadType('');
      setUploadDesc(''); setUploadProjects([]);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e: any) {
      setUploadMsg(`❌ ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleProject = (id: string) =>
    setUploadProjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openPreview = (s: Source, e: React.MouseEvent) => {
    e.stopPropagation();
    const isPdf = (s.mime_type || '').includes('pdf');
    if (isPdf) {
      setPreviewUrl(`${BASE}/sources/${s.id}/file`);
    } else {
      // Fichiers Office/autres : téléchargement direct → l'OS ouvre l'app locale
      const a = document.createElement('a');
      a.href = `${BASE}/sources/${s.id}/file`;
      a.download = s.original_filename || s.title;
      a.click();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteId !== id) { setDeleteId(id); return; } // 1er clic : demande confirm
    setDeleting(true);
    try {
      const res = await fetch(`${BASE}/sources/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
      setDeleteId(null);
      if (detail?.id === id) setDetail(null);
      load();
    } catch (err: any) { setError(err.message); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Sources ({sources.length})</h2>
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 8px', borderRadius: 4 }}
        >
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.attributes.code || p.attributes.title}</option>
          ))}
        </select>
        <button
          onClick={() => setShowUpload(v => !v)}
          style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}
        >
          {showUpload ? 'Close' : '+ Upload'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* ── Upload form ────────────────────────────────────────────── */}
      {showUpload && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14 }}>Upload a source document</h3>
          <form onSubmit={handleUpload} style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>FILE *</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,.xlsx,.xls,.pdf,.txt,.csv,.pptx"
                  required
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setSelFile(f);
                    if (f && !uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ''));
                  }}
                  style={{ color: 'var(--text)', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>TYPE</label>
                <select
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value)}
                  style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4 }}
                >
                  <option value="">— select —</option>
                  {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>TITLE</label>
              <input
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="Leave blank to use filename"
                style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>DESCRIPTION <span style={{ fontWeight: 400, opacity: 0.6 }}>(auto-generated from content if left blank)</span></label>
              <textarea
                value={uploadDesc}
                onChange={e => setUploadDesc(e.target.value)}
                rows={2}
                placeholder="Leave blank to auto-generate from document content…"
                style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>LINK TO PROJECTS</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {projects.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={uploadProjects.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                    />
                    <span>{p.attributes.code || p.attributes.title}</span>
                  </label>
                ))}
                {!projects.length && <span className="muted">No projects available</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="submit"
                disabled={uploading || !selFile}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '7px 18px', borderRadius: 6, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              {uploadMsg && <span style={{ fontSize: 12, color: uploadMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{uploadMsg}</span>}
            </div>
          </form>
        </div>
      )}

      {/* ── Sources list ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr>
            <th>Title</th><th>Type</th><th>Description</th>
            <th>Projects</th><th>Extraction</th><th>Size</th><th>Date</th><th></th>
          </tr></thead>
          <tbody>
            {sources.map(s => (
              <React.Fragment key={s.id}>
                <tr style={{ cursor: 'pointer' }} onClick={() => openDetail(s)}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--accent)', textDecoration: detail?.id === s.id ? 'underline' : 'none' }}>
                      {s.title}
                    </div>
                    {s.original_filename && s.original_filename !== s.title && (
                      <div className="muted" style={{ fontSize: 11 }}>{s.original_filename}</div>
                    )}
                  </td>
                  <td>{s.source_type
                    ? <span className="badge">{s.source_type}</span>
                    : <span className="muted">—</span>}
                  </td>
                  <td style={{ maxWidth: 260, fontSize: 12, color: 'var(--muted)' }}>
                    {s.description || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {s.projects?.length
                        ? s.projects.map(p => (
                            <span key={p.project_id} className="badge" title={p.project_title}>
                              {p.project_code || p.project_title}
                            </span>
                          ))
                        : <span className="muted" style={{ fontSize: 11 }}>unlinked</span>
                      }
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={s.extraction_status} />
                    {s.extracted_chars != null && (
                      <div className="muted" style={{ fontSize: 11 }}>{s.extracted_chars.toLocaleString()} chars</div>
                    )}
                    {s.extraction_error && (
                      <div style={{ fontSize: 11, color: 'var(--red)', maxWidth: 180 }} title={s.extraction_error}>
                        {s.extraction_error.slice(0, 60)}…
                      </div>
                    )}
                  </td>
                  <td className="muted">{fmtSize(s.file_size_bytes)}</td>
                  <td className="muted">{new Date(s.created_at).toLocaleDateString('fr-BE')}</td>
                  <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                    <button
                      title="Preview / Download"
                      onClick={e => openPreview(s, e)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 12, cursor: 'pointer', color: 'var(--text)', marginRight: 4 }}
                    >👁</button>
                    {deleteId === s.id ? (
                      <>
                        <button
                          onClick={e => handleDelete(s.id, e)}
                          disabled={deleting}
                          style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 12, cursor: 'pointer', marginRight: 3 }}
                        >{deleting ? '…' : 'Confirm'}</button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(null); }}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 12, cursor: 'pointer', color: 'var(--muted)' }}
                        >Cancel</button>
                      </>
                    ) : (
                      <button
                        title="Delete source"
                        onClick={e => handleDelete(s.id, e)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 12, cursor: 'pointer', color: 'var(--red)' }}
                      >✕</button>
                    )}
                  </td>
                </tr>

                {/* ── Detail panel ─────────────────────────────────── */}
                {detail?.id === s.id && (
                  <tr>
                    <td colSpan={8} style={{ background: 'var(--panel-2)', padding: 0 }}>
                      <div style={{ padding: '16px 20px' }}>
                        {detailLoading && <div className="muted">Loading…</div>}
                        {!detailLoading && detail && (
                          <>
                            {/* Metadata */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16, fontSize: 12 }}>
                              <div><div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>ORIGINAL FILENAME</div>{detail.original_filename || '—'}</div>
                              <div><div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>MIME TYPE</div>{detail.mime_type || '—'}</div>
                              <div><div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>FILE SIZE</div>{fmtSize(detail.file_size_bytes)}</div>
                              <div><div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>TOTAL CHARS</div>{detail.total_chars?.toLocaleString() || '—'}</div>
                            </div>

                            {/* Link/unlink projects */}
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>LINKED PROJECTS — click to toggle</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {projects.map(p => {
                                  const linked = detail.projects?.some(lp => String(lp.project_id) === p.id);
                                  return (
                                    <button
                                      key={p.id}
                                      onClick={e => { e.stopPropagation(); toggleProjectLink(s.id, p.id, linked); }}
                                      style={{
                                        padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                                        background: linked ? 'var(--accent)' : 'var(--panel)',
                                        color: linked ? '#fff' : 'var(--muted)',
                                        border: `1px solid ${linked ? 'var(--accent)' : 'var(--border)'}`,
                                      }}
                                    >
                                      {linked ? '✓ ' : '+ '}{p.attributes.code || p.attributes.title}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Extracted text */}
                            {detail.extraction_status === 'success' && (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                    EXTRACTED TEXT — chars {detailOffset.toLocaleString()}–{(detailOffset + (detail.returned_chars || 0)).toLocaleString()} / {detail.total_chars?.toLocaleString()}
                                  </div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    {detailOffset > 0 && (
                                      <button
                                        onClick={e => { e.stopPropagation(); loadDetail(s.id, Math.max(0, detailOffset - CHUNK)); }}
                                        style={{ fontSize: 11, padding: '2px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer' }}
                                      >
                                        ← Prev
                                      </button>
                                    )}
                                    {detail.has_more && (
                                      <button
                                        onClick={e => { e.stopPropagation(); loadDetail(s.id, detailOffset + CHUNK); }}
                                        style={{ fontSize: 11, padding: '2px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer' }}
                                      >
                                        Next →
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <pre style={{
                                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                  fontSize: 12, lineHeight: 1.6,
                                  maxHeight: 400, overflowY: 'auto',
                                  background: 'var(--panel)', padding: 12, borderRadius: 6,
                                  color: 'var(--text)', margin: 0, fontFamily: 'monospace',
                                }}>
                                  {detail.content}
                                </pre>
                              </div>
                            )}
                            {detail.extraction_status === 'skipped' && (
                              <div className="muted" style={{ fontSize: 12 }}>
                                Extraction skipped — file type not supported for text extraction (e.g. scanned PDF).
                              </div>
                            )}
                            {detail.extraction_status === 'failed' && (
                              <div style={{ fontSize: 12, color: 'var(--red)' }}>
                                Extraction failed: {detail.extraction_error}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {!sources.length && <div className="empty" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No sources yet. Upload your first document.</div>}
      </div>

      {/* ── PDF Preview modal ──────────────────────────────────── */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            zIndex: 1000, display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px' }}>
            <button
              onClick={() => setPreviewUrl(null)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}
            >✕</button>
          </div>
          <iframe
            src={previewUrl}
            title="Source preview"
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, border: 'none', margin: '0 16px 16px' }}
          />
        </div>
      )}
    </div>
  );
}

