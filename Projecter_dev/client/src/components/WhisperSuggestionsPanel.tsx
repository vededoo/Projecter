import React, { useCallback, useEffect, useState } from 'react';

interface Suggestion {
  id: number;
  meeting_id: number;
  token: string;
  context_text: string | null;
  suggestion: string | null;
  contact_id: number | null;
  contact_last_name: string | null;
  contact_first_name: string | null;
  tc_start: number | null;
  tc_end: number | null;
  confidence: number | null;
  source: 'dict' | 'phonetic_contact' | 'mcp';
  status: 'pending' | 'confirmed' | 'rejected' | 'custom';
  user_correction: string | null;
}

interface Props {
  meetingId: number;
  onSeekTo?: (tcSeconds: number) => void;
  onResolved?: (id: number, status: string, correction: string | null) => void;
}

function fmtTime(sec: number | null): string {
  if (sec === null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export default function WhisperSuggestionsPanel({ meetingId, onSeekTo, onResolved }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [customValues, setCustomValues] = useState<Record<number, string>>({});
  const [resolving, setResolving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/meetings/${meetingId}/whisper-suggestions?status=pending`);
      const json = await r.json();
      setSuggestions((json.data ?? []).map((d: any) => ({ id: Number(d.id), ...d.attributes })));
    } catch {}
    setLoading(false);
  }, [meetingId]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: number, status: 'confirmed' | 'rejected' | 'custom') => {
    const correction = status === 'custom' ? (customValues[id] ?? '').trim() : null;
    if (status === 'custom' && !correction) return;
    setResolving(id);
    try {
      const r = await fetch(`/api/meetings/${meetingId}/whisper-suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { type: 'whisper-suggestion', attributes: { status, user_correction: correction } },
        }),
      });
      if (r.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== id));
        onResolved?.(id, status, status === 'custom' ? correction : null);
      }
    } catch {}
    setResolving(null);
  };

  const clearAll = async () => {
    await fetch(`/api/meetings/${meetingId}/whisper-suggestions`, { method: 'DELETE' });
    setSuggestions([]);
  };

  if (loading) return <div className="muted" style={{ fontSize: 12 }}>Loading suggestions…</div>;

  const pending = suggestions.filter(s => s.status === 'pending');

  if (pending.length === 0) {
    return (
      <div style={{
        padding: '10px 14px', borderRadius: 6, fontSize: 12,
        background: 'var(--panel-2)', border: '1px solid var(--border)',
        color: 'var(--muted)',
      }}>
        No pending token suggestions. Run "Generate CR with Copilot" to scan the transcript.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>Suspicious tokens</strong>
        <span style={{
          fontSize: 11, padding: '1px 7px', borderRadius: 8, fontWeight: 600,
          background: 'rgba(210,153,34,.15)', color: 'var(--amber)', border: '1px solid var(--amber)',
        }}>{pending.length}</span>
        <span style={{ flex: 1 }} />
        <button className="btn-ghost" style={{ fontSize: 11, color: 'var(--muted)' }} onClick={clearAll}>
          Clear all
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pending.map(s => (
          <div
            key={s.id}
            style={{
              border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--panel-2)', padding: '8px 12px',
            }}
          >
            {/* Row 1: token + TC + source badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                color: 'var(--red)', background: 'rgba(248,81,73,.08)',
                padding: '1px 6px', borderRadius: 4,
              }}>"{s.token}"</span>

              {s.tc_start !== null && onSeekTo && (
                <button
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => onSeekTo(s.tc_start!)}
                  title={`Seek to ${fmtTime(s.tc_start)}`}
                >
                  ▶ {fmtTime(s.tc_start)}
                </button>
              )}

              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 8,
                background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--muted)',
              }}>
                {s.source === 'dict' ? '📖 dict'
                  : s.source === 'phonetic_contact' ? '👤 contact'
                  : '🤖 mcp'}
              </span>

              {s.confidence !== null && (
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {Math.round(s.confidence * 100)}% conf.
                </span>
              )}
            </div>

            {/* Context */}
            {s.context_text && (
              <div style={{
                fontSize: 11, color: 'var(--muted)', fontStyle: 'italic',
                marginBottom: 6, lineHeight: 1.5, paddingLeft: 4,
                borderLeft: '2px solid var(--border)',
              }}>
                …{s.context_text}…
              </div>
            )}

            {/* Suggestion + action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {s.suggestion && (
                <>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Suggestion:</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>"{s.suggestion}"</span>
                  <button
                    className="btn"
                    style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(63,185,80,.15)', color: 'var(--green)', border: '1px solid var(--green)' }}
                    onClick={() => resolve(s.id, 'confirmed')}
                    disabled={resolving === s.id}
                  >✓ Yes, apply</button>
                </>
              )}

              <button
                className="btn-ghost"
                style={{ fontSize: 11, padding: '3px 10px' }}
                onClick={() => resolve(s.id, 'rejected')}
                disabled={resolving === s.id}
              >✗ Skip</button>

              {/* Custom correction */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  className="input"
                  style={{ fontSize: 11, padding: '3px 8px', width: 120, height: 26 }}
                  placeholder="Custom…"
                  value={customValues[s.id] ?? ''}
                  onChange={e => setCustomValues(prev => ({ ...prev, [s.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') resolve(s.id, 'custom'); }}
                />
                <button
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => resolve(s.id, 'custom')}
                  disabled={resolving === s.id || !(customValues[s.id] ?? '').trim()}
                >Save custom</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
