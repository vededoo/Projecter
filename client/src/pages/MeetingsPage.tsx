import React, { useEffect, useState, useCallback } from 'react';
import { api, JsonApiList } from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';

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

  const flash = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    setFlashMsg({ text, kind });
    setTimeout(() => setFlashMsg(null), 4000);
  }, []);

  useEffect(() => {
    api.get<JsonApiList<Meeting>>('/meetings')
      .then(r => setItems(r.data))
      .catch(e => setError(e.message));
  }, []);

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
    if (selectedId === id) { setSelectedId(null); setTranscriptData(null); return; }
    setSelectedId(id);
    setTranscriptData(null);
    const item = items.find(it => it.id === id);
    if (item?.attributes.transformer_transcript_id) {
      loadTranscript(item.attributes.transformer_transcript_id);
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

  const TRANSFORMER_BASE = process.env.REACT_APP_TRANSFORMER_URL || 'https://msa.hopto.org:6044';

  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Meetings ({items.length})</h2>
      {flashMsg && (
        <div className={flashMsg.kind === 'ok' ? 'flash-success' : 'error'} style={{ marginBottom: 12 }}>
          {flashMsg.text}
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

          {/* Executive summary */}
          {selected.attributes.executive_summary && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
              <strong>Executive summary</strong>
              <p style={{ fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap' }}>{selected.attributes.executive_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


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

export function MeetingsPage() {
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TransformerText | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const { showSuccess, showError } = useNotifications();
  const { confirmAsync, ConfirmDialog } = useConfirm();

  useEffect(() => {
    api.get<JsonApiList<Meeting>>('/meetings')
      .then(r => setItems(r.data))
      .catch(e => setError(e.message));
  }, []);

  const selected = items.find(it => it.id === selectedId) || null;

  const loadTranscript = useCallback(async (transcriptId: number) => {
    setTranscriptLoading(true);
    setTranscriptData(null);
    try {
      const res = await api.getRaw<{ data: { attributes: TransformerText } }>(`/transformer/texts/${transcriptId}`);
      setTranscriptData(res.data.attributes);
    } catch (e: any) {
      showError(e.message || 'Failed to load transcript from Transformer');
    } finally {
      setTranscriptLoading(false);
    }
  }, [showError]);

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); setTranscriptData(null); return; }
    setSelectedId(id);
    setTranscriptData(null);
    const item = items.find(it => it.id === id);
    if (item?.attributes.transformer_transcript_id) {
      loadTranscript(item.attributes.transformer_transcript_id);
    }
  }, [selectedId, items, loadTranscript]);

  const handleInject = useCallback(async () => {
    if (!selected) return;
    const ok = await confirmAsync({
      title: 'Inject into Transformer',
      message: `Create a transcription slot in Transformer for "${selected.attributes.title}"?`,
    });
    if (!ok) return;
    setInjecting(true);
    try {
      const res = await api.postRaw<{ data: { id: string; attributes: { already_linked?: boolean } } }>(
        `/meetings/${selected.id}/inject-transcript`,
        { data: { type: 'inject-transcript', attributes: {} } }
      );
      const textId = Number(res.data.id);
      setItems(prev => prev.map(it =>
        it.id === selected.id
          ? { ...it, attributes: { ...it.attributes, transformer_transcript_id: textId } }
          : it
      ));
      showSuccess(`Linked to Transformer text #${textId}`);
      loadTranscript(textId);
    } catch (e: any) {
      showError(e.message || 'Failed to inject into Transformer');
    } finally {
      setInjecting(false);
    }
  }, [selected, confirmAsync, showSuccess, showError, loadTranscript]);

  const TRANSFORMER_BASE = process.env.REACT_APP_TRANSFORMER_URL || 'https://msa.hopto.org:6044';

  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Meetings ({items.length})</h2>
      <ConfirmDialog />
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
                    className="btn-ghost"
                    style={{ fontSize: 12 }}
                  >
                    Open in Transformer ↗
                  </a>
                </>
              ) : (
                <button
                  className="btn-primary"
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  onClick={handleInject}
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

          {/* Executive summary */}
          {selected.attributes.executive_summary && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
              <strong>Executive summary</strong>
              <p style={{ fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap' }}>{selected.attributes.executive_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

