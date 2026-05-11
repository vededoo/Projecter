import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api, JsonApiList } from '../api';

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
  raw_transcript: string | null;
  executive_summary: string | null;
  ai_report: string | null;
  extraction_status: string;
  minutes: string | null;
  decisions: string | null;
  actions: string | null;
  audio_path: string | null;
  transcription_status: string;
  transcription_error: string | null;
}

interface Attendee { contact_id: number; status: string; last_name: string; first_name: string | null }
interface ContactSuggestion { id: string; last_name: string; first_name: string | null; job_title: string | null; company_name: string | null }
interface MeetingItem { id: string; attributes: Meeting & { attendees?: Attendee[] } }
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

interface TxOptions { language: string; model: string; device: string; diarize: boolean }
const EMPTY_TX_OPTIONS: TxOptions = { language: 'fr', model: 'medium', device: 'mps', diarize: true };

interface TxPhase {
  phase: string;    // 'whisper' | 'parse' | 'diarize' | '__done__' | '__error__' | '__connected__'
  status: string;   // 'running' | 'completed' | 'ok' | 'error'
  detail?: string;
  progress?: number; // 0-100 numeric, présent pendant phase 'whisper'
  timestamp?: number;
}

interface Speaker {
  id: string;
  label: string;              // 'SPEAKER_00'
  display_name: string | null;
  contact_id: number | null;
  suggested_contact_id: number | null;
  suggested_score: number | null;
  suggested_confidence: 'high' | 'low' | 'unknown' | null;
  total_duration_s: number;
  total_pct: number;
  validated_by_user: boolean;
}

export function MeetingsPage() {
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // ── Transcription ──
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [startingTx, setStartingTx] = useState(false);
  const [showTxOptions, setShowTxOptions] = useState(false);
  const [txOptions, setTxOptions] = useState<TxOptions>(EMPTY_TX_OPTIONS);
  const [txPhase, setTxPhase] = useState<TxPhase | null>(null);
  const [txLastSeen, setTxLastSeen] = useState<number>(0);
  const txEventSourceRef = useRef<EventSource | null>(null);
  const txStallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Attendees ──
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<ContactSuggestion[]>([]);
  const [attendeeLoading, setAttendeeLoading] = useState(false);
  const attendeeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Speakers (diarization / voice-id) ──
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [speakersLoading, setSpeakersLoading] = useState(false);
  const [identifyingVoice, setIdentifyingVoice] = useState(false);
  const [speakerSearch, setSpeakerSearch] = useState<Record<string, string>>({}); // label → search text
  const [speakerSuggestions, setSpeakerSuggestions] = useState<Record<string, ContactSuggestion[]>>({});
  const speakerSearchRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
    api.get<JsonApiList<{ code: string | null; title: string }>>('/projects')
      .then(r => setProjects(r.data.map(p => ({ id: p.id, code: p.attributes.code, title: p.attributes.title }))))
      .catch(() => {});
  }, [loadMeetings]);

  useEffect(() => { return () => {
    txEventSourceRef.current?.close();
    if (txStallTimerRef.current) clearInterval(txStallTimerRef.current);
  }; }, []);

  const stopSSE = useCallback(() => {
    txEventSourceRef.current?.close();
    txEventSourceRef.current = null;
    if (txStallTimerRef.current) { clearInterval(txStallTimerRef.current); txStallTimerRef.current = null; }
    setTxPhase(null);
    setTxLastSeen(0);
  }, []);

  const startSSEProgress = useCallback((meetingId: string) => {
    stopSSE();
    const es = new EventSource(`/api/meetings/${meetingId}/transcription-progress`);
    txEventSourceRef.current = es;
    setTxLastSeen(Date.now());

    // Stall detector : poll DB toutes les 30s si plus d'event depuis 90s
    txStallTimerRef.current = setInterval(async () => {
      setTxLastSeen(prev => {
        if (prev && Date.now() - prev > 90_000) {
          // Re-check DB status
          fetch(`/api/meetings/${meetingId}/transcription-status`)
            .then(r => r.json())
            .then(body => {
              const st = body.data?.attributes?.status;
              if (st && st !== 'running') {
                stopSSE();
                loadMeetings();
              }
            })
            .catch(() => {});
        }
        return prev;
      });
    }, 15_000);

    // Tous les events arrivent sans `event:` name — uniquement via onmessage
    es.onmessage = (e: MessageEvent) => {
      setTxLastSeen(Date.now());
      try {
        const d: TxPhase = JSON.parse(e.data);
        if (d.phase === '__connected__') return; // keepalive initial
        if (d.phase === '__done__') {
          stopSSE();
          loadMeetings();
          if (d.status === 'completed') flash('Transcription complete');
          else flash(d.detail || 'Transcription failed', 'err');
          return;
        }
        if (d.phase === '__error__') {
          stopSSE();
          loadMeetings();
          flash(d.detail || 'Transcription error', 'err');
          return;
        }
        setTxPhase(d);
      } catch { /* event non-JSON, ignorer */ }
    };

    es.onerror = () => {
      // La connexion SSE s'est fermée : vérifier le statut DB
      fetch(`/api/meetings/${meetingId}/transcription-status`)
        .then(r => r.json())
        .then(body => {
          const st = body.data?.attributes?.status;
          if (st && st !== 'running') { stopSSE(); loadMeetings(); }
          // sinon encore running : laisser SSE tenter de se reconnecter
        })
        .catch(() => { stopSSE(); });
    };
  }, [stopSSE, loadMeetings, flash]);

  const projectLabel = (pid: number | null) => {
    if (!pid) return '\u2014';
    const p = projects.find(pr => pr.id === String(pid));
    if (!p) return `#${pid}`;
    return p.code ? `[${p.code}] ${p.title}` : p.title;
  };

  const selected = items.find(it => it.id === selectedId) || null;

  const handleSelect = useCallback((id: string) => {
    if (selectedId === id) { setSelectedId(null); setEditOpen(false); setShowRaw(false); stopSSE(); setSpeakers([]); return; }
    stopSSE();
    setSelectedId(id);
    setShowRaw(false);
    setEditOpen(false);
    setShowTxOptions(false);
    setSpeakers([]);
    const item = items.find(it => it.id === id);
    if (item) {
      setEditFields({
        executive_summary: item.attributes.executive_summary || '',
        minutes: item.attributes.minutes || '',
      });
      if (item.attributes.transcription_status === 'running') startSSEProgress(id);
      // Charger les speakers si la transcription est terminée
      if (item.attributes.transcription_status === 'done') {
        setSpeakersLoading(true);
        fetch(`/api/meetings/${id}/speakers`)
          .then(r => r.json())
          .then(body => setSpeakers((body.data || []).map((d: any) => ({ id: d.id, ...d.attributes }))))
          .catch(() => {})
          .finally(() => setSpeakersLoading(false));
      }
    }
  }, [selectedId, items, stopSSE, startSSEProgress]);

  const handleUploadAudio = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploadingAudio(true);
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const res = await fetch(`/api/meetings/${selectedId}/upload-audio`, { method: 'POST', body: formData });
      if (!res.ok) { const body = await res.json(); throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`); }
      flash(`Audio uploaded: ${file.name}`);
      setItems(prev => prev.map(it =>
        it.id === selectedId ? { ...it, attributes: { ...it.attributes, audio_path: file.name, transcription_status: 'idle' } } : it
      ));
    } catch (err: any) { flash(err.message || 'Upload failed', 'err'); }
    finally { setUploadingAudio(false); e.target.value = ''; }
  }, [selectedId, flash]);

  const handleAttendeeSearch = useCallback((q: string) => {
    setAttendeeSearch(q);
    if (attendeeSearchRef.current) clearTimeout(attendeeSearchRef.current);
    if (!q.trim()) { setContactSuggestions([]); return; }
    attendeeSearchRef.current = setTimeout(async () => {
      try {
        const r = await api.get<{ data: { id: string; attributes: { last_name: string; first_name: string | null; job_title: string | null; company_name: string | null } }[] }>(`/contacts?q=${encodeURIComponent(q)}&limit=10`);
        setContactSuggestions(r.data.map(c => ({ id: c.id, ...c.attributes })));
      } catch { setContactSuggestions([]); }
    }, 250);
  }, []);

  const handleAddAttendee = useCallback(async (contact: ContactSuggestion) => {
    if (!selectedId) return;
    setAttendeeSearch('');
    setContactSuggestions([]);
    try {
      await fetch(`/api/meetings/${selectedId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'meeting-attendee', attributes: { contact_id: Number(contact.id), status: 'invited' } } }),
      });
      const newAttendee: Attendee = { contact_id: Number(contact.id), status: 'invited', last_name: contact.last_name, first_name: contact.first_name };
      setItems(prev => prev.map(it =>
        it.id === selectedId
          ? { ...it, attributes: { ...it.attributes, attendees: [...(it.attributes.attendees || []), newAttendee] } }
          : it
      ));
    } catch { flash('Failed to add attendee', 'err'); }
  }, [selectedId, flash]);

  const handleRemoveAttendee = useCallback(async (contactId: number) => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/meetings/${selectedId}/attendees/${contactId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
      setItems(prev => prev.map(it =>
        it.id === selectedId
          ? { ...it, attributes: { ...it.attributes, attendees: (it.attributes.attendees || []).filter(a => a.contact_id !== contactId) } }
          : it
      ));
    } catch { flash('Failed to remove attendee', 'err'); }
  }, [selectedId, flash]);

  // ── Speakers handlers ──────────────────────────────────────────────────────

  const loadSpeakers = useCallback(async (meetingId: string) => {
    setSpeakersLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/speakers`);
      const body = await res.json();
      setSpeakers((body.data || []).map((d: any) => ({ id: d.id, ...d.attributes })));
    } catch { flash('Failed to load speakers', 'err'); }
    finally { setSpeakersLoading(false); }
  }, [flash]);

  const handleSyncSpeakers = useCallback(async () => {
    if (!selectedId) return;
    setSpeakersLoading(true);
    try {
      const res = await fetch(`/api/meetings/${selectedId}/speakers/sync`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`);
      setSpeakers((body.data || []).map((d: any) => ({ id: d.id, ...d.attributes })));
      flash(`${body.data?.length || 0} speaker(s) synced`);
    } catch (e: any) { flash(e.message || 'Sync failed', 'err'); }
    finally { setSpeakersLoading(false); }
  }, [selectedId, flash]);

  const handleIdentifyVoice = useCallback(async () => {
    if (!selectedId) return;
    setIdentifyingVoice(true);
    try {
      const res = await fetch(`/api/meetings/${selectedId}/speakers/identify`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`);
      // Recharger les speakers avec les suggestions mises à jour
      await loadSpeakers(selectedId);
      flash('Voice-id identification complete');
    } catch (e: any) { flash(e.message || 'Identification failed', 'err'); }
    finally { setIdentifyingVoice(false); }
  }, [selectedId, flash, loadSpeakers]);

  const handleSpeakerContactSearch = useCallback((label: string, query: string) => {
    setSpeakerSearch(prev => ({ ...prev, [label]: query }));
    if (speakerSearchRef.current[label]) clearTimeout(speakerSearchRef.current[label]);
    if (!query.trim()) { setSpeakerSuggestions(prev => ({ ...prev, [label]: [] })); return; }
    speakerSearchRef.current[label] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?q=${encodeURIComponent(query)}&limit=8`);
        const body = await res.json();
        setSpeakerSuggestions(prev => ({
          ...prev,
          [label]: (body.data || []).map((d: any) => ({ id: d.id, ...d.attributes })),
        }));
      } catch { /* ignore */ }
    }, 250);
  }, []);

  const handleAssignSpeaker = useCallback(async (label: string, contact: ContactSuggestion | null) => {
    if (!selectedId) return;
    const displayName = contact ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') : null;
    try {
      const res = await fetch(`/api/meetings/${selectedId}/speakers/${encodeURIComponent(label)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'meeting-speaker', attributes: {
          contact_id: contact ? Number(contact.id) : null,
          display_name: displayName,
          validated_by_user: contact != null,
        }}}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`);
      const updated = { id: body.data.id, ...body.data.attributes };
      setSpeakers(prev => prev.map(s => s.label === label ? { ...s, ...updated, total_pct: s.total_pct } : s));
      setSpeakerSearch(prev => ({ ...prev, [label]: '' }));
      setSpeakerSuggestions(prev => ({ ...prev, [label]: [] }));
    } catch (e: any) { flash(e.message || 'Update failed', 'err'); }
  }, [selectedId, flash]);

  const handleConfirmSuggestion = useCallback(async (sp: Speaker) => {
    if (!sp.suggested_contact_id || !selectedId) return;
    try {
      const cRes = await fetch(`/api/contacts/${sp.suggested_contact_id}`);
      if (!cRes.ok) throw new Error('Contact not found');
      const cBody = await cRes.json();
      const c: ContactSuggestion = { id: cBody.data.id, ...cBody.data.attributes };
      await handleAssignSpeaker(sp.label, c);
    } catch (e: any) { flash(e.message || 'Confirm failed', 'err'); }
  }, [selectedId, flash, handleAssignSpeaker]);

  const handleInjectSpeakers = useCallback(() => {
    if (!selectedId) return;
    const meeting = items.find(it => it.id === selectedId);
    if (!meeting?.attributes.raw_transcript) return;
    // Récupérer les segments depuis le meeting pour reconstruire l'injection
    // On utilise l'endpoint /api/meetings/:id pour avoir transcription_segments
    fetch(`/api/meetings/${selectedId}`)
      .then(r => r.json())
      .then(async body => {
        const segs: Array<{start: number; end: number; text: string; speaker?: string}> =
          body.data?.attributes?.transcription_segments || [];
        if (!segs.length || !speakers.length) { flash('No segments or speakers', 'err'); return; }

        // Map label → display_name
        const nameMap = new Map(speakers.map(s => [s.label, s.display_name || s.label]));

        // Construire ID courts (2 lettres) pour chaque speaker
        const idMap = new Map<string, string>();
        const usedIds = new Set<string>();
        for (const sp of speakers) {
          const name = sp.display_name || sp.label;
          const words = name.trim().split(/\s+/);
          let base = words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();
          let candidate = base;
          let n = 2;
          while (usedIds.has(candidate)) candidate = base.slice(0, 1) + String(n++);
          idMap.set(sp.label, candidate);
          usedIds.add(candidate);
        }

        const mappingLines = ['=== INTERVENANTS ==='];
        for (const sp of speakers) {
          mappingLines.push(`${idMap.get(sp.label) ?? sp.label}: ${nameMap.get(sp.label) || sp.label}`);
        }
        mappingLines.push('===================', '');

        let lastId: string | null = null;
        const bodyLines: string[] = [];
        for (const seg of segs) {
          const id = seg.speaker ? (idMap.get(seg.speaker) ?? null) : null;
          if (id && id !== lastId) {
            if (bodyLines.length > 0) bodyLines.push('');
            bodyLines.push(`[${id}]`);
            lastId = id;
          }
          bodyLines.push((seg.text || '').trim());
        }

        const newTranscript = [...mappingLines, ...bodyLines].join('\n');
        const res = await fetch(`/api/meetings/${selectedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { type: 'meeting', attributes: { raw_transcript: newTranscript } } }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        loadMeetings();
        flash('Speakers injected into transcript');
      })
      .catch((e: any) => flash(e.message || 'Inject failed', 'err'));
  }, [selectedId, speakers, items, flash, loadMeetings]);

  const handleResetSpeakers = useCallback(async () => {
    if (!selectedId) return;
    try {
      await fetch(`/api/meetings/${selectedId}/speakers`, { method: 'DELETE' });
      setSpeakers([]);
      flash('Speakers reset');
    } catch { flash('Reset failed', 'err'); }
  }, [selectedId, flash]);

  const handleStartTranscription = useCallback(async () => {
    if (!selectedId) return;
    setStartingTx(true);
    setShowTxOptions(false);
    try {
      const res = await fetch(`/api/meetings/${selectedId}/start-transcription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'start-transcription', attributes: { language: txOptions.language, model: txOptions.model, device: txOptions.device, diarize: txOptions.diarize } } }),
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`); }
      setItems(prev => prev.map(it =>
        it.id === selectedId ? { ...it, attributes: { ...it.attributes, transcription_status: 'running' } } : it
      ));
      startSSEProgress(selectedId);
      flash('Transcription started\u2026');
    } catch (err: any) { flash(err.message || 'Failed to start transcription', 'err'); }
    finally { setStartingTx(false); }
  }, [selectedId, txOptions, startSSEProgress, flash]);

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

  const txStatus = selected?.attributes.transcription_status ?? 'idle';
  const txStallSeconds = txLastSeen ? Math.floor((Date.now() - txLastSeen) / 1000) : 0;
  const PHASES: { key: string; label: string }[] = [
    { key: 'whisper', label: 'Whisper' },
    { key: 'parse',   label: 'Parse'   },
    { key: 'diarize', label: 'Diarize' },
  ];
  const phaseOrder = PHASES.map(p => p.key);
  const currentPhaseIdx = txPhase ? phaseOrder.indexOf(txPhase.phase) : -1;

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
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 52 }}>#</th><th>When</th><th>Project</th><th>Type</th><th>Title</th>
              <th>Location</th><th>Transcription</th>
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
                <td className="muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>#{it.id}</td>
                <td className="muted">{new Date(it.attributes.start_at).toLocaleString('fr-FR')}</td>
                <td>{projectLabel(it.attributes.project_id)}</td>
                <td><span className="badge">{it.attributes.type}</span></td>
                <td>{it.attributes.title}</td>
                <td className="muted">{it.attributes.location || '—'}</td>
                <td>
                  {it.attributes.transcription_status === 'done'
                    ? <span className="badge" style={{ background: '#e8f5e9', color: '#2e7d32' }}>done</span>
                    : it.attributes.transcription_status === 'running'
                    ? <span className="badge" style={{ background: '#fff3e0', color: '#e65100' }}>running</span>
                    : it.attributes.transcription_status === 'error'
                    ? <span className="badge" style={{ background: '#ffebee', color: '#c62828' }}>error</span>
                    : it.attributes.audio_path
                    ? <span className="muted" style={{ fontSize: 12 }}>audio ready</span>
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
            <button className="btn-ghost" onClick={() => { setSelectedId(null); stopSSE(); }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
            <div><span className="muted">ID : </span><span style={{ fontFamily: 'monospace' }}>#{selected.id}</span></div>
            <div><span className="muted">Date : </span>{new Date(selected.attributes.start_at).toLocaleString('fr-FR')}</div>
            <div><span className="muted">Type : </span><span className="badge">{selected.attributes.type}</span></div>
            <div><span className="muted">Project : </span>{projectLabel(selected.attributes.project_id)}</div>
            <div><span className="muted">Location : </span>{selected.attributes.location || '—'}</div>
            <div><span className="muted">Extraction : </span><span className="badge">{selected.attributes.extraction_status}</span></div>
          </div>

          {/* Participants */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <strong>Participants</strong>
              {attendeeLoading && <span className="muted" style={{ fontSize: 12 }}>…</span>}
              <span className="muted" style={{ fontSize: 12 }}>
                {(selected.attributes.attendees || []).length} attendee{(selected.attributes.attendees || []).length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Current attendees */}
            {(selected.attributes.attendees || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {(selected.attributes.attendees || []).map(a => (
                  <span key={a.contact_id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#e3f2fd', color: '#1565c0',
                    borderRadius: 12, padding: '3px 8px 3px 10px', fontSize: 12,
                  }}>
                    {a.first_name ? `${a.first_name} ${a.last_name}` : a.last_name}
                    <span className="muted" style={{ fontSize: 11, marginLeft: 2 }}>({a.status})</span>
                    <button
                      onClick={() => handleRemoveAttendee(a.contact_id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#1565c0', fontSize: 14, lineHeight: 1, padding: '0 2px',
                      }}
                      title="Remove"
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Add attendee typeahead */}
            <div style={{ position: 'relative', maxWidth: 320 }}>
              <input
                className="input"
                style={{ fontSize: 13, width: '100%' }}
                placeholder="Add participant — search by name or email…"
                value={attendeeSearch}
                onChange={e => handleAttendeeSearch(e.target.value)}
              />
              {contactSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                  background: '#fff', border: '1px solid #ddd', borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,.12)', maxHeight: 220, overflowY: 'auto',
                }}>
                  {contactSuggestions
                    .filter(c => !(selected.attributes.attendees || []).some(a => a.contact_id === Number(c.id)))
                    .map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleAddAttendee(c)}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <span style={{ fontWeight: 500 }}>
                          {c.first_name ? `${c.first_name} ${c.last_name}` : c.last_name}
                        </span>
                        {(c.job_title || c.company_name) && (
                          <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                            {[c.job_title, c.company_name].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Speakers (diarization / voice-id) — visible uniquement si transcription done */}
          {txStatus === 'done' && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <strong>Speakers</strong>
                {speakersLoading && <span className="muted" style={{ fontSize: 12 }}>…</span>}
                {speakers.length > 0 && (
                  <span className="muted" style={{ fontSize: 12 }}>{speakers.length} detected</span>
                )}
                {/* Sync depuis segments (requis si première fois ou re-run diarize) */}
                <button className="btn-ghost" style={{ fontSize: 12 }}
                  onClick={handleSyncSpeakers} disabled={speakersLoading}>
                  {speakers.length === 0 ? '⚙ Load speakers' : '↺ Re-sync'}
                </button>
                {speakers.length > 0 && (
                  <>
                    <button className="btn-ghost" style={{ fontSize: 12 }}
                      onClick={handleIdentifyVoice} disabled={identifyingVoice || speakersLoading}
                      title="Identify speakers using voice-id (wespeaker embeddings)">
                      {identifyingVoice ? 'Identifying…' : '🗣 Auto-identify'}
                    </button>
                    <button className="btn-ghost" style={{ fontSize: 12 }}
                      onClick={handleInjectSpeakers}
                      title="Inject speaker labels into raw transcript">
                      ↗ Inject into transcript
                    </button>
                    <button className="btn-ghost" style={{ fontSize: 12, color: 'var(--muted)' }}
                      onClick={handleResetSpeakers}>
                      Reset
                    </button>
                  </>
                )}
              </div>

              {speakers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {speakers.map(sp => {
                    const assignedName = sp.display_name || (sp.contact_id ? `Contact #${sp.contact_id}` : null);
                    const mins = Math.floor(sp.total_duration_s / 60);
                    const secs = Math.round(sp.total_duration_s % 60);
                    const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                    return (
                      <div key={sp.label} style={{
                        background: 'var(--panel-2)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '8px 12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          {/* Label + stats */}
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{sp.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {duration} ({sp.total_pct}%)
                          </span>
                          {/* Assigned contact */}
                          {assignedName && (
                            <span style={{
                              fontSize: 12, padding: '2px 8px', borderRadius: 10,
                              background: sp.validated_by_user ? 'rgba(63,185,80,.15)' : 'rgba(106,169,255,.12)',
                              color: sp.validated_by_user ? 'var(--green)' : 'var(--accent)',
                              border: `1px solid ${sp.validated_by_user ? 'var(--green)' : 'var(--accent)'}`,
                            }}>
                              {sp.validated_by_user ? '✓ ' : ''}{assignedName}
                              <button style={{
                                marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer',
                                color: 'inherit', padding: 0, fontSize: 11, lineHeight: 1,
                              }} onClick={() => handleAssignSpeaker(sp.label, null)}>×</button>
                            </span>
                          )}
                          {/* Voice-id suggestion */}
                          {!sp.validated_by_user && sp.suggested_contact_id && (
                            <span style={{
                              fontSize: 12, padding: '2px 8px', borderRadius: 10,
                              background: 'rgba(210,153,34,.12)', color: 'var(--amber)',
                              border: '1px solid var(--amber)',
                            }}
                              title={`Confidence: ${sp.suggested_confidence} (score ${((sp.suggested_score || 0) * 100).toFixed(0)}%)`}
                            >
                              💡 Suggested contact #{sp.suggested_contact_id}
                              <button style={{
                                marginLeft: 6, background: 'var(--amber)', border: 'none', cursor: 'pointer',
                                color: '#000', padding: '1px 6px', borderRadius: 4, fontSize: 11,
                              }} onClick={() => handleConfirmSuggestion(sp)}>
                                Confirm
                              </button>
                            </span>
                          )}
                        </div>
                        {/* Contact search */}
                        <div style={{ position: 'relative' }}>
                          <input
                            className="input" style={{ fontSize: 12, width: '100%', padding: '3px 8px' }}
                            placeholder={assignedName ? `Replace: search contact…` : 'Assign contact…'}
                            value={speakerSearch[sp.label] || ''}
                            onChange={e => handleSpeakerContactSearch(sp.label, e.target.value)}
                          />
                          {(speakerSuggestions[sp.label] || []).length > 0 && (
                            <div style={{
                              position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0,
                              background: 'var(--panel)', border: '1px solid var(--border)',
                              borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,.4)', maxHeight: 200, overflow: 'auto',
                            }}>
                              {(speakerSuggestions[sp.label] || []).map(c => {
                                const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
                                return (
                                  <button key={c.id}
                                    style={{
                                      display: 'block', width: '100%', textAlign: 'left',
                                      background: 'none', border: 'none', cursor: 'pointer',
                                      padding: '6px 10px', color: 'var(--text)', fontSize: 13,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    onMouseDown={e => { e.preventDefault(); handleAssignSpeaker(sp.label, c); }}
                                  >
                                    {name || `Contact #${c.id}`}
                                    {c.job_title && <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>{c.job_title}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Transcription */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <strong>Transcription</strong>

              {txStatus === 'done' && <span className="badge" style={{ background: 'rgba(63,185,80,.15)', color: 'var(--green)', borderColor: 'var(--green)' }}>done</span>}
              {txStatus === 'running' && <span className="badge" style={{ background: 'rgba(210,153,34,.15)', color: 'var(--amber)', borderColor: 'var(--amber)' }}>running…</span>}
              {txStatus === 'error' && <span className="badge" style={{ background: 'rgba(248,81,73,.15)', color: 'var(--red)', borderColor: 'var(--red)' }}>error</span>}

              {(txStatus === 'idle' || txStatus === 'error') && !selected.attributes.audio_path && (
                <label className="btn" style={{ fontSize: 12, padding: '4px 12px', cursor: 'pointer' }}>
                  {uploadingAudio ? 'Uploading…' : 'Upload Audio'}
                  <input type="file" accept="audio/*,video/mp4,video/webm" hidden
                    disabled={uploadingAudio} onChange={handleUploadAudio} />
                </label>
              )}

              {(txStatus === 'idle' || txStatus === 'error') && selected.attributes.audio_path && (
                <>
                  <span className="muted" style={{ fontSize: 12 }}>
                    🎵 {selected.attributes.audio_path.split('/').pop()}
                  </span>
                  <button className="btn" style={{ fontSize: 12, padding: '4px 12px' }}
                    onClick={() => setShowTxOptions(v => !v)} disabled={startingTx}>
                    {startingTx ? 'Starting…' : (showTxOptions ? '▲ Options' : '▶ Start Transcription')}
                  </button>
                  <label className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px', cursor: 'pointer' }}>
                    Replace audio
                    <input type="file" accept="audio/*,video/mp4,video/webm" hidden
                      disabled={uploadingAudio} onChange={handleUploadAudio} />
                  </label>
                </>
              )}

              {txStatus === 'done' && selected.attributes.raw_transcript && (
                <>
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowRaw(v => !v)}>
                    {showRaw ? 'Hide transcript' : `Show transcript (${selected.attributes.raw_transcript.length.toLocaleString()} chars)`}
                  </button>
                  <label className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px', cursor: 'pointer' }}>
                    Re-transcribe
                    <input type="file" accept="audio/*,video/mp4,video/webm" hidden
                      disabled={uploadingAudio} onChange={handleUploadAudio} />
                  </label>
                </>
              )}
            </div>

            {showTxOptions && (
              <div style={{
                background: 'var(--panel-2)', borderRadius: 6, padding: 12, marginBottom: 12,
                border: '1px solid var(--border)',
                display: 'grid', gridTemplateColumns: 'auto auto auto 1fr', gap: 16, alignItems: 'end',
              }}>
                <div>
                  <label className="field-label">Language</label>
                  <select className="input" value={txOptions.language}
                    onChange={e => setTxOptions(o => ({ ...o, language: e.target.value }))}>
                    <option value="fr">French</option>
                    <option value="en">English</option>
                    <option value="nl">Dutch</option>
                    <option value="de">German</option>
                    <option value="auto">Auto-detect</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Model</label>
                  <select className="input" value={txOptions.model}
                    onChange={e => setTxOptions(o => ({ ...o, model: e.target.value }))}>
                    <option value="tiny">Tiny (fastest)</option>
                    <option value="base">Base</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium (recommended)</option>
                    <option value="large-v3">Large v3 (best quality)</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Device</label>
                  <select className="input" value={txOptions.device}
                    onChange={e => setTxOptions(o => ({ ...o, device: e.target.value }))}>
                    <option value="mps">GPU — Apple MPS</option>
                    <option value="cpu">CPU</option>
                    <option value="cuda">GPU — CUDA</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={txOptions.diarize}
                      onChange={e => setTxOptions(o => ({ ...o, diarize: e.target.checked }))} />
                    Diarize speakers
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" style={{ fontSize: 12 }}
                      onClick={handleStartTranscription} disabled={startingTx}>
                      {startingTx ? 'Starting…' : '▶ Start'}
                    </button>
                    <button className="btn-ghost" style={{ fontSize: 12 }}
                      onClick={() => setShowTxOptions(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {txStatus === 'running' && (
              <div style={{ marginBottom: 10 }}>
                {/* — Indicateurs de phases — */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  {PHASES.map((p, idx) => {
                    const isActive  = txPhase?.phase === p.key && txPhase?.status === 'running';
                    const isDone    = txPhase?.phase === p.key
                      ? txPhase.status === 'completed'
                      : currentPhaseIdx > idx;
                    const isPending = !isActive && !isDone;
                    return (
                      <span key={p.key} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 10, fontSize: 12,
                        background: isActive ? 'rgba(210,153,34,.15)' : isDone ? 'rgba(63,185,80,.12)' : 'var(--panel-2)',
                        color: isActive ? 'var(--amber)' : isDone ? 'var(--green)' : 'var(--muted)',
                        border: isActive ? '1px solid var(--amber)' : isDone ? '1px solid var(--green)' : '1px solid var(--border)',
                        fontWeight: isActive ? 600 : 400,
                      }}>
                        {isDone ? '✅' : isActive ? '⏳' : '○'} {p.label}
                      </span>
                    );
                  })}
                </div>

                {/* — Barre de progression (si progress numérique disponible) — */}
                {txPhase?.phase === 'whisper' && txPhase.status === 'running' && txPhase.progress != null && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{
                      height: 8, borderRadius: 4, background: 'var(--panel-2)', overflow: 'hidden',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        background: 'linear-gradient(90deg, var(--amber), #ff9800)',
                        width: `${Math.min(100, txPhase.progress)}%`,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, textAlign: 'right' }}>
                      {Math.round(txPhase.progress)} %
                    </div>
                  </div>
                )}

                {/* — Message de la phase courante — */}
                {txPhase?.detail && (
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                    {txPhase.detail}
                  </div>
                )}

                {/* — Avertissement de stall — */}
                {txLastSeen > 0 && txStallSeconds > 90 && (
                  <div style={{ fontSize: 12, color: '#b45309', background: '#fffbeb',
                    border: '1px solid #fde68a', borderRadius: 4, padding: '4px 8px' }}>
                    ⚠️ No update for {txStallSeconds} s — still running or stalled…
                  </div>
                )}
              </div>
            )}

            {txStatus === 'error' && selected.attributes.transcription_error && (
              <div className="error" style={{ fontSize: 13, marginBottom: 8 }}>
                {selected.attributes.transcription_error}
              </div>
            )}

            {showRaw && selected.attributes.raw_transcript && (
              <pre style={{
                maxHeight: 400, overflow: 'auto', fontSize: 12, lineHeight: 1.6,
                background: 'var(--panel-2)', color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap',
              }}>
                {selected.attributes.raw_transcript}
              </pre>
            )}
          </div>

          {/* Executive summary (display) */}
          {selected.attributes.executive_summary && !editOpen && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              <strong>Executive summary</strong>
              <p style={{ fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{selected.attributes.executive_summary}</p>
            </div>
          )}

          {/* Minutes (display) */}
          {selected.attributes.minutes && !editOpen && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              <strong>Minutes</strong>
              <p style={{ fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{selected.attributes.minutes}</p>
            </div>
          )}

          {/* Edit toggle */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
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

