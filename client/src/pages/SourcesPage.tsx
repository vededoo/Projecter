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
interface Project { id: string; attributes: { title: string; code: string } }

const SOURCE_TYPES = ['pc_list', 'directive', 'spec', 'contract', 'template', 'procedure', 'report', 'other'];

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

  const load = () => {
    const qs = filterProject ? `?project_id=${filterProject}` : '';
    Promise.all([
      fetch(`${BASE}/sources${qs}`).then(r => r.json()) as Promise<JsonApiList<Source>>,
      fetch(`${BASE}/projects`).then(r => r.json()) as Promise<JsonApiList<{ title: string; code: string }>>,
    ])
      .then(([s, p]) => {
        setSources(s.data.map(d => ({ id: d.id, ...d.attributes })));
        setProjects(p.data as Project[]);
      })
      .catch(e => setError(e.message));
  };

  useEffect(() => { load(); }, [filterProject]); // eslint-disable-line

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

  const displayed = sources;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Sources ({displayed.length})</h2>
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 8px', borderRadius: 4 }}
        >
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.attributes.code} — {p.attributes.title}</option>
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
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>DESCRIPTION</label>
              <textarea
                value={uploadDesc}
                onChange={e => setUploadDesc(e.target.value)}
                rows={2}
                placeholder="What does this document contain? Key columns, scope..."
                style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 8px', borderRadius: 4, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>LINK TO PROJECTS (select multiple)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {projects.map(p => (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={uploadProjects.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                    />
                    <span>{p.attributes.code}</span>
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
            <th>Projects</th><th>Extraction</th><th>Size</th><th>Date</th>
          </tr></thead>
          <tbody>
            {displayed.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.title}</div>
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
                            {p.project_code}
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
              </tr>
            ))}
          </tbody>
        </table>
        {!displayed.length && <div className="empty" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No sources yet. Upload your first document.</div>}
      </div>
    </div>
  );
}
