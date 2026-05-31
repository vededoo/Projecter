import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Correction {
  id: number;
  domain: string;
  incorrect: string;
  correct: string;
  notes: string | null;
  source: 'user' | 'mcp';
  confidence: number | null;
  created_at: string;
}

interface Props {
  domain?: string;
}

export default function WhisperCorrectionsPanel({ domain = 'ETNIC' }: Props) {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState({ incorrect: '', correct: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const incorrectRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/whisper-corrections?domain=${encodeURIComponent(domain)}`);
      const json = await r.json();
      setCorrections((json.data ?? []).map((d: any) => ({ id: Number(d.id), ...d.attributes })));
    } catch { setError('Failed to load corrections'); }
    setLoading(false);
  }, [domain]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (editingId !== null) incorrectRef.current?.focus();
  }, [editingId]);

  const startNew = () => {
    setForm({ incorrect: '', correct: '', notes: '' });
    setEditingId('new');
  };

  const startEdit = (c: Correction) => {
    setForm({ incorrect: c.incorrect, correct: c.correct, notes: c.notes ?? '' });
    setEditingId(c.id);
  };

  const cancel = () => { setEditingId(null); setError(null); };

  const save = async () => {
    if (!form.incorrect.trim() || !form.correct.trim()) {
      setError('Both fields are required'); return;
    }
    setSaving(true); setError(null);
    try {
      const isNew = editingId === 'new';
      const url = isNew ? '/api/whisper-corrections' : `/api/whisper-corrections/${editingId}`;
      const method = isNew ? 'POST' : 'PATCH';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { type: 'whisper-correction', attributes: {
            domain, incorrect: form.incorrect.trim().toLowerCase(),
            correct: form.correct.trim(), notes: form.notes.trim() || null,
            source: 'user',
          }},
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setEditingId(null);
      await load();
    } catch (e: any) { setError(e.message || 'Save failed'); }
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!window.confirm) return; // should use useConfirm but keeping minimal
    await fetch(`/api/whisper-corrections/${id}`, { method: 'DELETE' });
    setCorrections(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <strong style={{ fontSize: 13 }}>Corrections dictionary</strong>
        <span style={{
          fontSize: 11, padding: '1px 7px', borderRadius: 8,
          background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--muted)',
        }}>{domain}</span>
        <span style={{ flex: 1 }} />
        <button className="btn-ghost" style={{ fontSize: 12, padding: '3px 10px' }} onClick={startNew}>
          + Add
        </button>
      </div>

      {/* Inline add/edit form */}
      {editingId !== null && (
        <div style={{
          background: 'var(--panel-2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '10px 12px', marginBottom: 10,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end',
        }}>
          <div>
            <label className="field-label">Whisper heard (incorrect)</label>
            <input
              ref={incorrectRef}
              className="input"
              style={{ fontSize: 12 }}
              placeholder="laine"
              value={form.incorrect}
              disabled={typeof editingId === 'number'}
              onChange={e => setForm(f => ({ ...f, incorrect: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            />
          </div>
          <div>
            <label className="field-label">Correct form</label>
            <input
              className="input"
              style={{ fontSize: 12 }}
              placeholder="Lesne"
              value={form.correct}
              onChange={e => setForm(f => ({ ...f, correct: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            />
          </div>
          <div>
            <label className="field-label">Notes (optional)</label>
            <input
              className="input"
              style={{ fontSize: 12 }}
              placeholder="Philippe Lesne, nom propre"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }} onClick={save} disabled={saving}>
              {saving ? '…' : 'Save'}
            </button>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={cancel}>✕</button>
          </div>
          {error && (
            <div className="error" style={{ gridColumn: '1/-1', fontSize: 12, marginTop: 2 }}>{error}</div>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="muted" style={{ fontSize: 12 }}>Loading…</div>
      ) : corrections.length === 0 && editingId === null ? (
        <div className="muted" style={{ fontSize: 12 }}>
          No corrections yet. Add entries to help Whisper recognise domain-specific terms.
        </div>
      ) : corrections.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--muted)', fontWeight: 500 }}>Incorrect (Whisper)</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--muted)', fontWeight: 500 }}>Correct</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--muted)', fontWeight: 500 }}>Notes</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--muted)', fontWeight: 500 }}>Source</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {corrections.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: 'var(--red)' }}>{c.incorrect}</td>
                <td style={{ padding: '5px 8px', fontWeight: 600 }}>{c.correct}</td>
                <td style={{ padding: '5px 8px', color: 'var(--muted)' }}>{c.notes ?? '—'}</td>
                <td style={{ padding: '5px 8px' }}>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 8,
                    background: c.source === 'user' ? 'rgba(63,185,80,.12)' : 'rgba(56,139,253,.12)',
                    color: c.source === 'user' ? 'var(--green)' : 'var(--accent)',
                  }}>{c.source}</span>
                </td>
                <td style={{ padding: '5px 8px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '2px 6px' }}
                      onClick={() => startEdit(c)}
                    >Edit</button>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '2px 6px', color: 'var(--red)' }}
                      onClick={() => remove(c.id)}
                    >✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
