import React, { useEffect, useState, useCallback } from 'react';
import { api, JsonApiList } from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';

const MEETING_TYPES = [
  { value: 'etnic_excom',          label: 'ETNIC ExCom' },
  { value: 'wbe_excom',            label: 'WBE ExCom' },
  { value: 'governance_committee', label: 'Governance Committee' },
  { value: 'steering_committee',   label: 'Steering Committee' },
  { value: 'portfolio_committee',  label: 'Portfolio Committee' },
  { value: 'technical_wg',         label: 'Technical WG' },
  { value: 'functional_wg',        label: 'Functional WG' },
  { value: 'procurement_wg',       label: 'Procurement WG' },
  { value: 'kickoff',              label: 'Kickoff' },
  { value: 'follow_up',            label: 'Follow-up' },
  { value: 'other',                label: 'Other' },
] as const;

interface Meeting {
  project_id: number | null; type: string; title: string;
  start_at: string; end_at: string | null;
  location: string | null;
  transformer_transcript_id: number | null;
  raw_transcript: string | null;
  executive_summary: string | null;
  ai_report: string | null;
  extraction_status: string;
  minutes: string | null;
  decisions: string | null;
  actions: string | null;
}

interface MeetingItem { id: string; attributes: Meeting }

interface TransformerText {
  title: string;
  content: string;
  recording_date: string | null;
  location: string | null;
  transcript_type: string;
  language_name: string | null;
  authors: string | null;
  has_mp3: boolean;
}

interface ProjectOption { id: string; code: string | null; title: string }

interface EditFields { executive_summary: string; minutes: string }

interface NewMeetingForm {
  title: string;
  type: string;
  start_at: string;
  end_at: string;
  location: string;
  video_link: string;
  project_id: string;
}

const EMPTY_FORM: NewMeetingForm = {
  title: '', type: 'follow_up', start_at: '', end_at: '',
  location: '', video_link: '', project_id: '',
};

export function MeetingsPage() {
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TransformerText | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Creation form ──
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewMeetingForm>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  // ── Edit panel ──
  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({ executive_summary: '', minutes: '' });
  const [editSaving, setEditSaving] = useState(false);

  const flash = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    setFlashMsg({ text, kind });
    setTimeout(() => setFlashMsg(null), 4000);
  }, []);

  const loadMeetings = useCallback(() => {
    api.get<JsonApiList<Meeting>>('/meetings')
      .then(r => setItems(r.data))
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    loadMeetings();
    // Charger la liste des projets pour le select du formulaire
    api.get<JsonApiList<{ code: string | null; title: string }>>('/projects')
      .then(r => setProjects(r.data.map(p => ({ id: p.id, code: p.attributes.code, title: p.attributes.title }))))
      .catch(() => {/* non bloquant */});
  }, [loadMeetings]);

  const selected = items.find(it => it.id === selectedId) || null;

  const loadTranscript = useCallback(async (transcriptId: number) => {
    setTranscriptLoading(true);
    setTranscriptData(null);
    try {
      const res = await fetch(`/api/transformer/texts/${transcriptId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setTranscriptData(body.data?.attributes || null);
    } catch (e: any) {
      flash(e.message || 'Failed to load transcript from Transformer', 'err');
    } finally {
      setTranscriptLoading(false);
    }
  }, [flash]);

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); setTranscriptData(null); setEditOpen(false); return; }
    setSelectedId(id);
    setTranscriptData(null);
    setEditOpen(false);
    const item = items.find(it => it.id === id);
    if (item) {
      setEditFields({
        executive_summary: item.attributes.executive_summary || '',
        minutes: item.attributes.minutes || '',
      });
      if (item.attributes.transformer_transcript_id) {
        loadTranscript(item.attributes.transformer_transcript_id);
      }
    }
  }, [selectedId, items, loadTranscript]);

  const doInject = useCallback(async () => {
    if (!selected) return;
    setConfirmOpen(false);
    setInjecting(true);
    try {
      const res = await fetch(`/api/meetings/${selected.id}/inject-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'inject-transcript', attributes: {} } }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`);
      }
      const body = await res.json();
      const textId = Number(body.data?.id);
      setItems(prev => prev.map(it =>
        it.id === selected.id
          ? { ...it, attributes: { ...it.attributes, transformer_transcript_id: textId } }
          : it
      ));
      flash(`Linked to Transformer text #${textId}`);
      loadTranscript(textId);
    } catch (e: any) {
      flash(e.message || 'Failed to inject into Transformer', 'err');
    } finally {
      setInjecting(false);
    }
  }, [selected, flash, loadTranscript]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedId) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/meetings/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            type: 'meeting',
            attributes: {
              executive_summary: editFields.executive_summary || null,
              minutes:           editFields.minutes || null,
            },
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`);
      }
      const body = await res.json();
      setItems(prev => prev.map(it => it.id === selectedId
        ? { ...it, attributes: { ...it.attributes, ...body.data.attributes } }
        : it
      ));
      setEditOpen(false);
      flash('Meeting updated');
    } catch (e: any) {
      flash(e.message || 'Failed to update meeting', 'err');
    } finally {
      setEditSaving(false);
    }
  }, [selectedId, editFields, flash]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.type || !form.start_at) {
      flash('Title, type and start date are required', 'err');
      return;
    }
    setFormSaving(true);
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            type: 'meeting',
            attributes: {
              title:      form.title.trim(),
              type:       form.type,
              start_at:   form.start_at,
              end_at:     form.end_at   || null,
              location:   form.location || null,
              video_link: form.video_link || null,
              project_id: form.project_id ? Number(form.project_id) : null,
            },
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`);
      }
      const body = await res.json();
      setItems(prev => [{ id: body.data.id, attributes: body.data.attributes }, ...prev]);
      flash(`Meeting "${body.data.attributes.title}" created`);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      flash(e.message || 'Failed to create meeting', 'err');
    } finally {
      setFormSaving(false);
    }
  }, [form, flash]);

  const setF = useCallback((k: keyof NewMeetingForm, v: string) => {
    setForm(prev => ({ ...prev, [k]: v }));
  }, []);

  const TRANSFORMER_BASE = process.env.REACT_APP_TRANSFORMER_URL || 'https://msa.hopto.org:6044';

  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Meetings ({items.length})</h2>
        <button className="btn" onClick={() => { setShowForm(v => !v); setForm(EMPTY_FORM); }}>
          {showForm ? '✕ Cancel' : '+ New Meeting'}
        </button>
      </div>

      {flashMsg && (
        <div className={flashMsg.kind === 'ok' ? 'flash-success' : 'error'} style={{ marginBottom: 12 }}>
          {flashMsg.text}
        </div>
      )}

      {/* ── New Meeting form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>New Meeting</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Title *</label>
              <input className="input" required value={form.title}
                onChange={e => setF('title', e.target.value)} placeholder="Meeting title" />
            </div>
            <div>
              <label className="field-label">Type *</label>
              <select className="input" required value={form.type} onChange={e => setF('type', e.target.value)}>
                {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Project</label>
              <select className="input" value={form.project_id} onChange={e => setF('project_id', e.target.value)}>
                <option value="">— None —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Start *</label>
              <input className="input" type="datetime-local" required value={form.start_at}
                onChange={e => setF('start_at', e.target.value)} />
            </div>
            <div>
              <label className="field-label">End</label>
              <input className="input" type="datetime-local" value={form.end_at}
                onChange={e => setF('end_at', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input className="input" value={form.location}
                onChange={e => setF('location', e.target.value)} placeholder="Room / URL" />
            </div>
            <div>
              <label className="field-label">Video link</label>
              <input className="input" value={form.video_link}
                onChange={e => setF('video_link', e.target.value)} placeholder="https://…" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={formSaving}>
                {formSaving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Create in Transformer"
        message={`Create a transcription slot in Transformer for "${selected?.attributes.title}"?`}
        confirmLabel="Create"
        busy={injecting}
        onConfirm={doInject}
        onCancel={() => setConfirmOpen(false)}
      />
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>When</th><th>Project</th><th>Type</th><th>Title</th>
              <th>Location</th><th>Transcript</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr
                key={it.id}
                className={selectedId === it.id ? 'selected' : ''}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelect(it.id)}
              >
                <td className="muted">{new Date(it.attributes.start_at).toLocaleString('fr-FR')}</td>
                <td>{it.attributes.project_id ? `#${it.attributes.project_id}` : '—'}</td>
                <td><span className="badge">{it.attributes.type}</span></td>
                <td>{it.attributes.title}</td>
                <td className="muted">{it.attributes.location || '—'}</td>
                <td>
                  {it.attributes.transformer_transcript_id
                    ? <span className="badge" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                        #{it.attributes.transformer_transcript_id}
                      </span>
                    : <span className="muted">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="empty">No meetings.</div>}
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{selected.attributes.title}</h3>
            <button className="btn-ghost" onClick={() => { setSelectedId(null); setTranscriptData(null); }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
            <div><span className="muted">Date : </span>{new Date(selected.attributes.start_at).toLocaleString('fr-FR')}</div>
            <div><span className="muted">Type : </span><span className="badge">{selected.attributes.type}</span></div>
            <div><span className="muted">Location : </span>{selected.attributes.location || '—'}</div>
            <div><span className="muted">Extraction : </span><span className="badge">{selected.attributes.extraction_status}</span></div>
          </div>

          {/* Transformer section */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <strong>Transformer transcript</strong>
              {selected.attributes.transformer_transcript_id ? (
                <>
                  <span className="badge" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                    Text #{selected.attributes.transformer_transcript_id}
                  </span>
                  <a
                    href={`${TRANSFORMER_BASE}/texts/${selected.attributes.transformer_transcript_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--primary)' }}
                  >
                    Open in Transformer ↗
                  </a>
                </>
              ) : (
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  onClick={() => setConfirmOpen(true)}
                  disabled={injecting}
                >
                  {injecting ? 'Creating…' : '+ Create in Transformer'}
                </button>
              )}
            </div>

            {transcriptLoading && <div className="muted" style={{ fontSize: 13 }}>Loading transcript…</div>}

            {transcriptData && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                  {transcriptData.language_name && <span style={{ marginRight: 12 }}>Lang: {transcriptData.language_name}</span>}
                  {transcriptData.authors && <span style={{ marginRight: 12 }}>Speakers: {transcriptData.authors}</span>}
                  {transcriptData.has_mp3 && <span style={{ color: '#1976d2' }}>🎵 Audio available</span>}
                </div>
                {transcriptData.content ? (
                  <>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 12, marginBottom: 8 }}
                      onClick={() => setShowRaw(v => !v)}
                    >
                      {showRaw ? 'Hide' : 'Show'} transcript ({transcriptData.content.length.toLocaleString()} chars)
                    </button>
                    {showRaw && (
                      <pre style={{
                        maxHeight: 400, overflow: 'auto', fontSize: 12, lineHeight: 1.6,
                        background: '#f8f8f8', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap',
                      }}>
                        {transcriptData.content}
                      </pre>
                    )}
                  </>
                ) : (
                  <div className="muted" style={{ fontSize: 13 }}>No transcript yet — upload audio in Transformer.</div>
                )}
              </div>
            )}
          </div>

          {/* Executive summary (display) */}
          {selected.attributes.executive_summary && !editOpen && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
              <strong>Executive summary</strong>
              <p style={{ fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap' }}>{selected.attributes.executive_summary}</p>
            </div>
          )}

          {/* Minutes (display) */}
          {selected.attributes.minutes && !editOpen && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
              <strong>Minutes</strong>
              <p style={{ fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap' }}>{selected.attributes.minutes}</p>
            </div>
          )}

          {/* Edit toggle */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditOpen(v => !v)}>
              {editOpen ? '▲ Hide edit' : '✏️ Edit summary / minutes'}
            </button>
          </div>

          {/* Edit form */}
          {editOpen && (
            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">Executive summary</label>
                <textarea
                  className="input"
                  rows={5}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: 13 }}
                  value={editFields.executive_summary}
                  onChange={e => setEditFields(prev => ({ ...prev, executive_summary: e.target.value }))}
                  placeholder="10-line executive summary…"
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label className="field-label">Minutes</label>
                <textarea
                  className="input"
                  rows={8}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: 13 }}
                  value={editFields.minutes}
                  onChange={e => setEditFields(prev => ({ ...prev, minutes: e.target.value }))}
                  placeholder="Meeting minutes…"
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
                <button className="btn" onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

