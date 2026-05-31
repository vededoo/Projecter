import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { api, JsonApiList } from '../api';
import { InlineEdit } from '../components/InlineEdit';
import { ConfirmDialog } from '../components/ConfirmDialog';
import WhisperCorrectionsPanel from '../components/WhisperCorrectionsPanel';
import WhisperSuggestionsPanel from '../components/WhisperSuggestionsPanel';
import { SortablePersonList } from '../components/SortablePersonList';
import { useContactEditor } from '../components/useContactEditor';

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

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  words?: { start: number; end: number; text: string }[];
}

interface Meeting {
  project_id: number | null; type: string; meeting_category: string; title: string;
  start_at: string; end_at: string | null;
  location: string | null;
  raw_transcript: string | null;
  transcription_segments: TranscriptSegment[] | null;
  executive_summary: string | null;
  ai_report: string | null;
  extraction_status: string;
  extracted_at: string | null;
  validated_at: string | null;
  minutes: string | null;
  mail_cr: string | null;
  decisions: string | null;
  actions: string | null;
  audio_path: string | null;
  transcription_status: string;
  transcription_error: string | null;
}

interface MeetingTopic { id: number; position: number; title: string; summary: string | null; type: string; project_topic_id: number | null; commitment_level?: string }
interface MeetingDecision { id: number; description: string; impact: string | null; position: number | null }
interface MeetingAction { id: number; description: string; owner_id: number | null; owner_raw: string | null; deadline: string | null; status: string; notes: string | null; meeting_topic_id: number | null }

interface Attendee { contact_id: number; status: string; last_name: string; first_name: string | null; role: string | null }
interface ContactSuggestion { id: string; last_name: string; first_name: string | null; job_title: string | null; company_name: string | null }
interface MeetingItem {
  id: string;
  attributes: Meeting & {
    attendees?: Attendee[];
    meeting_topics?: MeetingTopic[];
    meeting_decisions?: MeetingDecision[];
    meeting_actions?: MeetingAction[];
  }
}
interface ProjectOption { id: string; code: string | null; title: string }

interface EditFields { executive_summary: string; minutes: string; mail_cr: string }

interface NewMeetingForm {
  title: string;
  type: string;
  meeting_category: string;
  start_at: string;
  end_at: string;
  location: string;
  video_link: string;
  project_id: string;
}

const MEETING_CATEGORIES = [
  { value: 'formal',     label: 'Formal meeting' },
  { value: 'informal',   label: 'Informal exchange' },
  { value: 'phone_call', label: 'Phone call' },
  { value: 'video_call', label: 'Ad-hoc video call' },
] as const;

const EMPTY_FORM: NewMeetingForm = {
  title: '', type: 'follow_up', meeting_category: 'formal',
  start_at: '', end_at: '', location: '', video_link: '', project_id: '',
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

type DetailTabKey = 'overview' | 'cr_mail' | 'cr_complet' | 'cr_structure' | 'transcript';

const DETAIL_TABS: { key: DetailTabKey; label: string }[] = [
  { key: 'overview',      label: 'Overview'       },
  { key: 'cr_mail',       label: 'CR mail'         },
  { key: 'cr_complet',    label: 'CR complet'      },
  { key: 'cr_structure',  label: 'CR structuré'    },
  { key: 'transcript',    label: 'Transcript'      },
];

type OutlookStep = 'checking' | 'not_connected' | 'device_flow' | 'connected' | 'events' | 'importing';
interface OutlookEvent {
  id: string;
  attributes: {
    subject: string;
    start: { dateTime: string; timeZone: string };
    end:   { dateTime: string; timeZone: string };
    location: string | null;
    online_meeting_url: string | null;
    web_link: string | null;
    body_preview: string | null;
    is_cancelled: boolean;
    attendees: { name: string | null; email: string | null; type: string | null }[];
  };
}

interface Speaker {
  id: string;
  label: string;              // 'SPEAKER_00'
  display_name: string | null;
  contact_id: number | null;
  contact_name: string | null;
  suggested_contact_id: number | null;
  suggested_contact_name: string | null;
  suggested_score: number | null;
  suggested_confidence: 'high' | 'low' | 'unknown' | null;
  total_duration_s: number;
  total_pct: number;
  validated_by_user: boolean;
  first_segment_start: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SPEAKER_COLORS = [
  '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
  '#c62828', '#00838f', '#558b2f', '#6d4c41',
];

function speakerIdx(label: string): number {
  const m = label.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function speakerColor(label: string): string {
  return SPEAKER_COLORS[speakerIdx(label) % SPEAKER_COLORS.length];
}

function fmtTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MeetingsPage({ initialSelectedId }: { initialSelectedId?: string } = {}) {
  const [items, setItems] = useState<MeetingItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const autoSelectRef = useRef<string | undefined>(initialSelectedId);
  const [sortCol, setSortCol] = useState('start_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const onSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const projectLabel = (pid: number | null) => {
    if (!pid) return '—';
    const p = projects.find(pr => pr.id === String(pid));
    if (!p) return `#${pid}`;
    return p.code ? `[${p.code}] ${p.title}` : p.title;
  };

  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    let av: any, bv: any;
    if (sortCol === 'id') { av = Number(a.id); bv = Number(b.id); }
    else if (sortCol === 'start_at') {
      av = new Date(a.attributes.start_at).getTime();
      bv = new Date(b.attributes.start_at).getTime();
    } else if (sortCol === 'project_id') {
      av = projectLabel(a.attributes.project_id).toLowerCase();
      bv = projectLabel(b.attributes.project_id).toLowerCase();
    } else {
      av = ((a.attributes as any)[sortCol] || '').toLowerCase();
      bv = ((b.attributes as any)[sortCol] || '').toLowerCase();
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  }), [items, sortCol, sortDir, projects]);

  const SortTh = ({ col, label, style }: { col: string; label: string; style?: React.CSSProperties }) => {
    const isSorted = sortCol === col;
    const color = isSorted ? (sortDir === 'asc' ? '#4caf50' : '#f44336') : undefined;
    return (
      <th onClick={() => onSort(col)} style={{ cursor: 'pointer', userSelect: 'none', color, ...style }} title="Click to sort">
        {label} <span style={{ opacity: isSorted ? 1 : 0.3 }}>{isSorted ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
      </th>
    );
  };

  const [error, setError] = useState<string | null>(null);
  const [flashMsg, setFlashMsg] = useState<{ text: string; kind: 'ok' | 'err' } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // ── Transcription ──
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [startingTx, setStartingTx] = useState(false);
  const [showTxOptions, setShowTxOptions] = useState(false);
  const [txOptions, setTxOptions] = useState<TxOptions>(EMPTY_TX_OPTIONS);
  const [txPhase, setTxPhase] = useState<TxPhase | null>(null);
  const [txLastSeen, setTxLastSeen] = useState<number>(0);
  const txEventSourceRef = useRef<EventSource | null>(null);
  const txStallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const txFallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const txOnerrorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Attendees ──
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [contactSuggestions, setContactSuggestions] = useState<ContactSuggestion[]>([]);
  const [attendeeLoading, setAttendeeLoading] = useState(false);
  const attendeeSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState('');
  const editingRoleInputRef = useRef<HTMLInputElement | null>(null);

  // ── Speakers (diarization / voice-id) ──
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [speakersLoading, setSpeakersLoading] = useState(false);
  const [identifyingVoice, setIdentifyingVoice] = useState(false);
  const [speakerSearch, setSpeakerSearch] = useState<Record<string, string>>({}); // label → search text
  const [speakerSuggestions, setSpeakerSuggestions] = useState<Record<string, ContactSuggestion[]>>({});
  const speakerSearchRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // ── Drag attendee → speaker ──
  const [dragOverLabel, setDragOverLabel] = useState<string | null>(null);
  const draggedAttendeeRef = useRef<{ contact_id: number; first_name: string | null; last_name: string } | null>(null);

  // ── Creation form ──
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewMeetingForm>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [outlookFillFormMode, setOutlookFillFormMode] = useState(false);

  // ── Participants DnD reorder ──
  const [dragReorderSrc, setDragReorderSrc] = useState<number | null>(null);
  const [dragReorderOver, setDragReorderOver] = useState<number | null>(null);

  // ── Edit panel ──
  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({ executive_summary: '', minutes: '', mail_cr: '' });
  const [editSaving, setEditSaving] = useState(false);

  // ── Validate CR ──
  const [validating, setValidating] = useState(false);

  // ── Detail tab ──
  const [detailTab, setDetailTab] = useState<DetailTabKey>('overview');
  const [overviewSubTab, setOverviewSubTab] = useState<'summary' | 'participants'>('summary');

  // ── Édition de contact depuis la liste des participants ──
  const { openContactEditor, contactEditor } = useContactEditor();

  // ── Audio player + segment navigation ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioError, setAudioError] = useState(false);
  const [activeSegIdx, setActiveSegIdx] = useState(-1);
  const [segFilter, setSegFilter] = useState<string | null>(null);
  const activeSegRef = useRef<HTMLDivElement | null>(null);
  const segListRef = useRef<HTMLDivElement | null>(null);

  // Topics registry — tous les meeting_topics du projet (promus + orphelins)
  interface RegistryItem { mt_id: number; title: string; meeting_id: number; meeting_title: string; meeting_date: string | null; project_topic_id: number | null; project_topic_title: string | null; }
  const [registry, setRegistry] = useState<RegistryItem[]>([]);
  const [linkingTopicId, setLinkingTopicId] = useState<number | null>(null);
  const [addTopicOpen, setAddTopicOpen] = useState(false);

  // ── Graph (mail/OneNote) ──
  const [graphConnected, setGraphConnected] = useState<boolean | null>(null);
  const [onenoteSectionId, setOnenoteSectionId] = useState(
    () => localStorage.getItem('projecter_onenote_section_id') || ''
  );
  const [crGraphToken, setCrGraphToken] = useState('');
  const [crGraphTokenSaving, setCrGraphTokenSaving] = useState(false);

  // ── Outlook Import ──
  const [outlookModal, setOutlookModal]         = useState(false);
  const [outlookStep, setOutlookStep]           = useState<OutlookStep>('checking');
  const [outlookDeviceFlow, setOutlookDeviceFlow] = useState<{ user_code: string; verification_uri: string; expires_at: string; message: string } | null>(null);
  const [outlookAccount, setOutlookAccount]     = useState<{ display_name: string; username: string } | null>(null);
  const [outlookEvents, setOutlookEvents]       = useState<OutlookEvent[]>([]);
  const [outlookEventsLoading, setOutlookEventsLoading] = useState(false);
  const [outlookFilterStart, setOutlookFilterStart] = useState('');
  const [outlookFilterEnd, setOutlookFilterEnd]   = useState('');
  const [outlookImporting, setOutlookImporting] = useState<string | null>(null);
  const [outlookManualToken, setOutlookManualToken] = useState('');
  const [outlookManualTokenSaving, setOutlookManualTokenSaving] = useState(false);
  const outlookPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicType, setNewTopicType] = useState('open_point');
  const [newTopicCommitment, setNewTopicCommitment] = useState('mentioned');

  // Garde l'ancien state pour les PT promus (utilisé dans le form de création)
  const [projectTopics, setProjectTopics] = useState<{ id: number; title: string }[]>([]);

  // ── Outlook import helpers ──────────────────────────────────────────────
  const checkOutlookConnection = useCallback(async () => {
    setOutlookStep('checking');
    try {
      const r = await fetch('/api/graph/status');
      const body = await r.json();
      const { connected, account } = body.data.attributes;
      if (connected) {
        setOutlookAccount(account);
        setOutlookStep('events');
      } else {
        setOutlookStep('not_connected');
      }
    } catch {
      setOutlookStep('not_connected');
    }
  }, []);

  const loadOutlookEvents = useCallback(async (start?: string, end?: string) => {
    setOutlookEventsLoading(true);
    setOutlookStep('events');
    try {
      const params = new URLSearchParams({ top: '50' });
      if (start) params.set('start', new Date(start).toISOString());
      if (end)   params.set('end',   new Date(end + 'T23:59:59').toISOString());
      const r = await fetch(`/api/graph/events?${params}`);
      if (!r.ok) throw new Error('Failed');
      const body = await r.json();
      setOutlookEvents(body.data || []);
    } catch {
      setOutlookEvents([]);
    } finally {
      setOutlookEventsLoading(false);
    }
  }, []);

  const startOutlookAuth = useCallback(async () => {
    setOutlookStep('device_flow');
    try {
      const r = await fetch('/api/graph/auth/start', { method: 'POST' });
      const body = await r.json();
      setOutlookDeviceFlow(body.data.attributes);
      outlookPollRef.current = setInterval(async () => {
        try {
          const sr = await fetch('/api/graph/auth/status');
          const sb = await sr.json();
          if (sb.data.attributes.acquired) {
            clearInterval(outlookPollRef.current!);
            outlookPollRef.current = null;
            await checkOutlookConnection();
            await loadOutlookEvents();
          }
        } catch { /* ignore */ }
      }, 3000);
    } catch {
      setOutlookStep('not_connected');
    }
  }, [checkOutlookConnection, loadOutlookEvents]);

  const openOutlookModal = useCallback(() => {
    setOutlookModal(true);
    setOutlookDeviceFlow(null);
    setOutlookEvents([]);
    checkOutlookConnection().then(async () => {
      // Si connecté, charger les events immédiatement avec la fenêtre par défaut
      const r = await fetch('/api/graph/status');
      const b = await r.json();
      if (b.data.attributes.connected) loadOutlookEvents();
    }).catch(() => {});
  }, [checkOutlookConnection, loadOutlookEvents]);
  // ─────────────────────────────────────────────────────────────────────────

  const loadProjectTopics = useCallback(async (projectId: number) => {
    const res = await fetch(`/api/project-topics?project_id=${projectId}`);
    if (!res.ok) return;
    const body = await res.json();
    setProjectTopics((body.data || []).map((x: any) => ({ id: Number(x.id), title: x.attributes.title })));
  }, []);

  const loadRegistry = useCallback(async (projectId: number) => {
    const res = await fetch(`/api/topics-registry?project_id=${projectId}`);
    if (!res.ok) return;
    const body = await res.json();
    setRegistry((body.data || []).map((x: any) => ({
      mt_id: Number(x.id),
      title: x.attributes.title,
      meeting_id: Number(x.attributes.meeting_id),
      meeting_title: x.attributes.meeting_title,
      meeting_date: x.attributes.meeting_date,
      project_topic_id: x.attributes.project_topic_id ? Number(x.attributes.project_topic_id) : null,
      project_topic_title: x.attributes.project_topic_title || null,
    })));
  }, []);

  const flash = useCallback((text: string, kind: 'ok' | 'err' = 'ok') => {
    setFlashMsg({ text, kind });
    setTimeout(() => setFlashMsg(null), 4000);
  }, []);

  const loadMeetings = useCallback(() => {
    api.get<JsonApiList<Meeting>>('/meetings')
      .then(r => {
        // Merger les données fraîches avec les données enrichies existantes
        // (attendees, meeting_topics, etc. chargées par handleSelect ne sont pas
        // dans la liste et ne doivent pas être écrasées par un reload de liste)
        setItems(prev => {
          const existingMap = new Map(prev.map(it => [it.id, it]));
          return r.data.map(fresh => {
            const existing = existingMap.get(fresh.id);
            if (!existing) return fresh;
            return {
              ...fresh,
              attributes: {
                ...fresh.attributes,
                attendees:              existing.attributes.attendees              ?? (fresh.attributes as MeetingItem['attributes']).attendees,
                meeting_topics:         existing.attributes.meeting_topics         ?? (fresh.attributes as MeetingItem['attributes']).meeting_topics,
                meeting_decisions:      existing.attributes.meeting_decisions      ?? (fresh.attributes as MeetingItem['attributes']).meeting_decisions,
                meeting_actions:        existing.attributes.meeting_actions        ?? (fresh.attributes as MeetingItem['attributes']).meeting_actions,
                transcription_segments: existing.attributes.transcription_segments ?? fresh.attributes.transcription_segments,
              },
            };
          });
        });
        // Auto-select : si navigation depuis ProjectDetailPage
        const pendingId = autoSelectRef.current;
        if (pendingId && r.data.some(it => it.id === pendingId)) {
          autoSelectRef.current = undefined;
          setSelectedId(pendingId);
          // Charger les données enrichies (attendees, topics, etc.)
          fetch(`/api/meetings/${pendingId}`)
            .then(res => res.json())
            .then(body => {
              const attrs = body.data?.attributes || {};
              setItems(prev => prev.map(it =>
                it.id === pendingId ? { ...it, attributes: { ...it.attributes,
                  attendees: attrs.attendees || [],
                  meeting_topics: attrs.meeting_topics || [],
                  meeting_decisions: attrs.meeting_decisions || [],
                  meeting_actions: attrs.meeting_actions || [],
                }} : it
              ));
            })
            .catch(() => {});
        }
      })
      .catch(e => setError(e.message));
  }, []);

  const importOutlookEvent = useCallback(async (eventId: string) => {
    setOutlookImporting(eventId);
    try {
      const r = await fetch('/api/graph/events/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'outlook-import', attributes: { event_id: eventId } } }),
      });
      const body = await r.json();
      if (!r.ok) {
        flash(body.errors?.[0]?.detail || 'Import failed', 'err');
      } else {
        flash('Meeting imported from Outlook!');
        setOutlookModal(false);
        loadMeetings();
        const newId: string = body.data?.id;
        if (newId) setSelectedId(newId);
      }
    } catch {
      flash('Network error during import', 'err');
    } finally {
      setOutlookImporting(null);
    }
  }, [flash, loadMeetings]);

  useEffect(() => {
    loadMeetings();
    api.get<JsonApiList<{ code: string | null; title: string }>>('/projects')
      .then(r => setProjects(r.data.map(p => ({ id: p.id, code: p.attributes.code, title: p.attributes.title }))))
      .catch(() => {});
  }, [loadMeetings]);

  useEffect(() => { return () => {
    txEventSourceRef.current?.close();
    if (txStallTimerRef.current) clearInterval(txStallTimerRef.current);
    if (txFallbackPollRef.current) clearInterval(txFallbackPollRef.current);
    if (txOnerrorDebounceRef.current) clearTimeout(txOnerrorDebounceRef.current);
  }; }, []);

  const stopSSE = useCallback(() => {
    txEventSourceRef.current?.close();
    txEventSourceRef.current = null;
    if (txStallTimerRef.current) { clearInterval(txStallTimerRef.current); txStallTimerRef.current = null; }
    if (txFallbackPollRef.current) { clearInterval(txFallbackPollRef.current); txFallbackPollRef.current = null; }
    if (txOnerrorDebounceRef.current) { clearTimeout(txOnerrorDebounceRef.current); txOnerrorDebounceRef.current = null; }
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
      // Debounce : éviter le storm de fetch si EventSource reconnecte en boucle rapide
      if (txOnerrorDebounceRef.current) return;
      txOnerrorDebounceRef.current = setTimeout(() => {
        txOnerrorDebounceRef.current = null;
      }, 2_000);

      // La connexion SSE s'est fermée : vérifier le statut DB
      fetch(`/api/meetings/${meetingId}/transcription-status`)
        .then(r => r.json())
        .then(body => {
          const st = body.data?.attributes?.status;
          if (st && st !== 'running') { stopSSE(); loadMeetings(); return; }
          // Encore running mais SSE cassé : basculer sur polling de secours 5s
          // (évite de rester bloqué si le canal SSE ne renverra plus de __done__)
          if (!txFallbackPollRef.current) {
            txEventSourceRef.current?.close();
            txEventSourceRef.current = null;
            txFallbackPollRef.current = setInterval(async () => {
              try {
                const r = await fetch(`/api/meetings/${meetingId}/transcription-status`);
                const b = await r.json();
                const s = b.data?.attributes?.status;
                if (s && s !== 'running') { stopSSE(); loadMeetings(); }
              } catch { stopSSE(); }
            }, 5_000);
          }
        })
        .catch(() => { stopSSE(); });
    };
  }, [stopSSE, loadMeetings, flash]);

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
        mail_cr: item.attributes.mail_cr || '',
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
      // Charger les attendees depuis GET /meetings/:id (la liste ne les inclut pas)
      fetch(`/api/meetings/${id}`)
        .then(r => r.json())
        .then(body => {
          const attrs = body.data?.attributes || {};
          setItems(prev => prev.map(it =>
            it.id === id ? { ...it, attributes: { ...it.attributes,
              attendees: attrs.attendees || [],
              meeting_topics: attrs.meeting_topics || [],
              meeting_decisions: attrs.meeting_decisions || [],
              meeting_actions: attrs.meeting_actions || [],
            } } : it
          ));
        })
        .catch(() => {});
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
      const newAttendee: Attendee = { contact_id: Number(contact.id), status: 'invited', last_name: contact.last_name, first_name: contact.first_name, role: null };
      setItems(prev => prev.map(it =>
        it.id === selectedId
          ? { ...it, attributes: { ...it.attributes, attendees: [...(it.attributes.attendees || []), newAttendee] } }
          : it
      ));
    } catch { flash('Failed to add attendee', 'err'); }
  }, [selectedId, flash]);

  const handleReorderAttendees = useCallback(async (newOrder: number[]) => {
    if (!selectedId) return;
    try {
      await fetch(`/api/meetings/${selectedId}/attendees/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { attributes: { order: newOrder } } }),
      });
      setItems(prev => prev.map(it =>
        it.id === selectedId
          ? { ...it, attributes: { ...it.attributes,
              attendees: newOrder.map(cid =>
                (it.attributes.attendees || []).find(a => a.contact_id === cid)!
              ).filter(Boolean)
            }}
          : it
      ));
    } catch { flash('Failed to reorder', 'err'); }
  }, [selectedId, flash]);

  const fillFormFromOutlookEvent = useCallback((ev: OutlookEvent) => {
    const toLocal = (dt: string) => {
      const d = new Date(dt);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };
    setForm(prev => ({
      ...prev,
      title:      ev.attributes.subject || prev.title,
      start_at:   ev.attributes.start?.dateTime ? toLocal(ev.attributes.start.dateTime) : prev.start_at,
      end_at:     ev.attributes.end?.dateTime   ? toLocal(ev.attributes.end.dateTime)   : prev.end_at,
      location:   ev.attributes.location || prev.location,
      video_link: ev.attributes.online_meeting_url || prev.video_link,
    }));
    setOutlookModal(false);
    setOutlookFillFormMode(false);
    setShowForm(true);
  }, []);

  const handleUpdateAttendeeRole = useCallback(async (contactId: number, role: string) => {
    if (!selectedId) return;
    const trimmed = role.trim() || null;
    try {
      await fetch(`/api/meetings/${selectedId}/attendees/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'meeting-attendee', attributes: { role: trimmed } } }),
      });
      setItems(prev => prev.map(it =>
        it.id === selectedId
          ? { ...it, attributes: { ...it.attributes, attendees: (it.attributes.attendees || []).map(a =>
              a.contact_id === contactId ? { ...a, role: trimmed } : a
            )}}
          : it
      ));
    } catch { flash('Failed to update role', 'err'); }
    setEditingRoleId(null);
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

  // Recharge les participants depuis le serveur (après édition d'un contact)
  const reloadAttendees = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/meetings/${selectedId}`);
      const body = await res.json();
      const attrs = body.data?.attributes || {};
      setItems(prev => prev.map(it =>
        it.id === selectedId
          ? { ...it, attributes: { ...it.attributes, attendees: attrs.attendees || [] } }
          : it
      ));
    } catch { /* silencieux : l'édition a réussi côté serveur */ }
  }, [selectedId]);

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
    } catch (e: any) {
      const msg = e.message || 'Identification failed';
      const isDown = msg.includes('non disponible') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND');
      flash(isDown ? `Voice-id service offline — start voice_id_dev (pm2 start ecosystem.config.js --only voice_id_dev in Services_dev)` : msg, 'err');
    }
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

  // ── Drag attendee pill → speaker card ──────────────────────────────────────

  const handleAttendeeDragStart = useCallback((
    e: React.DragEvent,
    a: { contact_id: number; first_name: string | null; last_name: string },
  ) => {
    draggedAttendeeRef.current = a;
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleSpeakerDragOver = useCallback((e: React.DragEvent, label: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverLabel(label);
  }, []);

  const handleSpeakerDragLeave = useCallback(() => {
    setDragOverLabel(null);
  }, []);

  const handleSpeakerDrop = useCallback(async (e: React.DragEvent, spLabel: string) => {
    e.preventDefault();
    setDragOverLabel(null);
    const a = draggedAttendeeRef.current;
    if (!a) return;
    draggedAttendeeRef.current = null;
    const contact: ContactSuggestion = {
      id: String(a.contact_id),
      first_name: a.first_name,
      last_name: a.last_name,
      job_title: null,
      company_name: null,
    };
    await handleAssignSpeaker(spLabel, contact);
  }, [handleAssignSpeaker]);

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
              mail_cr:           editFields.mail_cr || null,
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

  const handleValidateCR = useCallback(async (validate: boolean) => {
    if (!selectedId) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/meetings/${selectedId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { type: 'meeting', attributes: { validated: validate } } }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`);
      }
      const body = await res.json();
      setItems(prev => prev.map(it => it.id === selectedId
        ? { ...it, attributes: { ...it.attributes, validated_at: body.data.attributes.validated_at } }
        : it
      ));
      flash(validate ? 'CR validated ✓' : 'Validation removed');
    } catch (e: any) {
      flash(e.message || 'Failed to update validation', 'err');
    } finally {
      setValidating(false);
    }
  }, [selectedId, flash]);

  const handleCopyPrompt = useCallback(() => {
    if (!selectedId) return;
    const prompt = `Use the generate_meeting_cr prompt with meeting_id=${selectedId} to generate and ingest the structured CR for this meeting.`;
    navigator.clipboard.writeText(prompt).then(
      () => flash('Prompt copied to clipboard — paste in Copilot Chat'),
      () => flash('Clipboard not available', 'err')
    );
  }, [selectedId, flash]);

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
              title:             form.title.trim(),
              type:              form.type,
              meeting_category:  form.meeting_category,
              start_at:          form.start_at,
              end_at:            form.end_at   || null,
              location:          form.location || null,
              video_link:        form.video_link || null,
              project_id:        form.project_id ? Number(form.project_id) : null,
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

  // ── Audio player callbacks ──────────────────────────────────────────────────

  // Reset detail tab when switching meeting
  useEffect(() => {
    setDetailTab('overview');
    setOverviewSubTab('summary');
  }, [selectedId]);

  // Créer/détruire l'élément audio quand le meeting sélectionné change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null; }
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioPlaying(false);
    setAudioError(false);
    setActiveSegIdx(-1);
    setSegFilter(null);

    if (!selectedId) return;
    const audioUrl = `/api/meetings/${selectedId}/audio`;
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setAudioDuration(audio.duration));
    audio.addEventListener('timeupdate', () => {
      setAudioCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => setAudioPlaying(false));
    audio.addEventListener('error', () => { setAudioError(true); setAudioPlaying(false); });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [selectedId]);

  // Sync activeSegIdx avec le temps audio courant
  useEffect(() => {
    if (!selected?.attributes.transcription_segments) return;
    const segs = selected.attributes.transcription_segments;
    const t = audioCurrentTime;
    // Trouver le segment actif (dernier dont start <= t)
    let idx = -1;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].start <= t) idx = i;
      else break;
    }
    setActiveSegIdx(idx);
  }, [audioCurrentTime, selected?.attributes.transcription_segments]);

  // Auto-scroll vers le segment actif
  useEffect(() => {
    if (activeSegRef.current && segListRef.current) {
      const container = segListRef.current;
      const active = activeSegRef.current;
      const cr = container.getBoundingClientRect();
      const ar = active.getBoundingClientRect();
      if (ar.top < cr.top || ar.bottom > cr.bottom) {
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeSegIdx]);

  const handleAudioSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  }, []);

  const handleSegmentClick = useCallback((seg: TranscriptSegment) => {
    handleAudioSeek(seg.start);
    if (audioRef.current && !audioPlaying) {
      audioRef.current.play().catch(() => {});
      setAudioPlaying(true);
    }
  }, [handleAudioSeek, audioPlaying]);

  const toggleAudioPlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioPlaying) { audioRef.current.pause(); setAudioPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setAudioPlaying(true); }
  }, [audioPlaying]);

  // Jouer un extrait de ~10s pour le locuteur donné (pour identifier sa voix)
  const handlePreviewSpeaker = useCallback((sp: Speaker) => {
    const startSec = sp.first_segment_start ?? 0;
    if (!audioRef.current) return;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    audioRef.current.currentTime = startSec;
    setAudioCurrentTime(startSec);
    audioRef.current.play().catch(() => {});
    setAudioPlaying(true);
    // Arrêt automatique après 10s
    previewTimerRef.current = setTimeout(() => {
      if (audioRef.current) { audioRef.current.pause(); setAudioPlaying(false); }
    }, 10000);
  }, []);

  const audioSkip = useCallback((delta: number) => {
    if (!audioRef.current) return;
    const t = Math.max(0, Math.min(audioDuration, audioRef.current.currentTime + delta));
    handleAudioSeek(t);
  }, [audioDuration, handleAudioSeek]);

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
    <>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Meetings ({items.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={openOutlookModal} title="Import a meeting from Outlook calendar">
            📅 Import from Outlook
          </button>
          <button className="btn" onClick={() => { setShowForm(v => !v); setForm(EMPTY_FORM); }}>
            {showForm ? '✕ Cancel' : '+ New Meeting'}
          </button>
        </div>
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
              <label className="field-label">Category *</label>
              <select className="input" required value={form.meeting_category}
                onChange={e => setF('meeting_category', e.target.value)}>
                {MEETING_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {form.meeting_category === 'formal' && (
              <div>
                <label className="field-label">Type *</label>
                <select className="input" required value={form.type} onChange={e => setF('type', e.target.value)}>
                  {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            )}
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
              <label className="field-label">Date *</label>
              <input className="input" type="datetime-local" required value={form.start_at}
                onChange={e => setF('start_at', e.target.value)} />
            </div>
            {form.meeting_category === 'formal' && (
              <div>
                <label className="field-label">End</label>
                <input className="input" type="datetime-local" value={form.end_at}
                  onChange={e => setF('end_at', e.target.value)} />
              </div>
            )}
            {form.meeting_category === 'formal' && (
              <div>
                <label className="field-label">Location</label>
                <input className="input" value={form.location}
                  onChange={e => setF('location', e.target.value)} placeholder="Room / URL" />
              </div>
            )}
            {form.meeting_category === 'formal' && (
              <div>
                <label className="field-label">Video link</label>
                <input className="input" value={form.video_link}
                  onChange={e => setF('video_link', e.target.value)} placeholder="https://…" />
              </div>
            )}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" style={{ fontSize: 12 }}
                onClick={() => { setOutlookFillFormMode(true); openOutlookModal(); }}>
                📅 From Outlook
              </button>
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
              <th style={{ width: 52 }}>#</th><SortTh col="start_at" label="When" /><SortTh col="project_id" label="Project" /><SortTh col="meeting_category" label="Category" /><SortTh col="type" label="Type" /><SortTh col="title" label="Title" />
              <th>Location</th><th>Transcription</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map(it => (
              <tr
                key={it.id}
                className={selectedId === it.id ? 'selected' : ''}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelect(it.id)}
              >
                <td className="muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>#{it.id}</td>
                <td className="muted">{new Date(it.attributes.start_at).toLocaleString('fr-FR')}</td>
                <td>{projectLabel(it.attributes.project_id)}</td>
                <td>{it.attributes.meeting_category && it.attributes.meeting_category !== 'formal'
                  ? <span className="badge" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>{it.attributes.meeting_category}</span>
                  : <span className="muted">—</span>
                }</td>
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
            <h3 style={{ margin: 0 }}>
              <InlineEdit
                value={selected.attributes.title}
                onSave={async title => {
                  const res = await fetch(`/api/meetings/${selected.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: { type: 'meeting', attributes: { title } } }),
                  });
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  setItems(prev => prev.map(it =>
                    it.id === selected.id ? { ...it, attributes: { ...it.attributes, title } } : it
                  ));
                }}
              />
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="btn btn-danger"
                style={{ fontSize: 12, padding: '3px 10px' }}
                onClick={() => setConfirmDeleteOpen(true)}
              >🗑 Delete</button>
              <button className="btn-ghost" onClick={() => { setSelectedId(null); stopSSE(); }}>✕</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
            <div><span className="muted">ID : </span><span style={{ fontFamily: 'monospace' }}>#{selected.id}</span></div>
            <div><span className="muted">Date : </span>{new Date(selected.attributes.start_at).toLocaleString('fr-FR')}</div>
            <div><span className="muted">Type : </span><span className="badge">{selected.attributes.type}</span></div>
            <div><span className="muted">Category : </span><span className="badge" style={{
              background: selected.attributes.meeting_category !== 'formal' ? 'var(--panel-2)' : undefined,
              color: selected.attributes.meeting_category !== 'formal' ? '#888' : undefined,
            }}>{selected.attributes.meeting_category || 'formal'}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="muted">Project : </span>
              <select
                value={selected.attributes.project_id ?? ''}
                style={{ fontSize: 13, padding: '1px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', cursor: 'pointer' }}
                onChange={async e => {
                  const newProjectId = e.target.value ? Number(e.target.value) : null;
                  const res = await fetch(`/api/meetings/${selectedId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: { type: 'meeting', attributes: { project_id: newProjectId } } }),
                  });
                  if (res.ok) {
                    setItems(prev => prev.map(it => it.id === selectedId
                      ? { ...it, attributes: { ...it.attributes, project_id: newProjectId } }
                      : it
                    ));
                    flash(newProjectId ? `Linked to project #${newProjectId}` : 'Project unlinked');
                  } else {
                    flash('Failed to update project', 'err');
                  }
                }}
              >
                <option value="">— no project —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.title}</option>
                ))}
              </select>
            </div>
            <div><span className="muted">Location : </span>{selected.attributes.location || '—'}</div>
            <div><span className="muted">Extraction : </span><span className="badge">{selected.attributes.extraction_status}</span></div>
          </div>

          {/* ── Detail tab bar ── */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 16, gap: 0, marginTop: 8 }}>
            {DETAIL_TABS.map(t => (
              <button key={t.key} onClick={() => setDetailTab(t.key)} style={{
                background: 'none', border: 'none',
                borderBottom: detailTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -2, padding: '8px 18px', cursor: 'pointer', fontSize: 13,
                fontWeight: detailTab === t.key ? 700 : 400,
                color: detailTab === t.key ? 'var(--text)' : 'var(--muted)',
                transition: 'color 0.15s', whiteSpace: 'nowrap',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Overview sub-tab bar */}
          {detailTab === 'overview' && (
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
            {(['summary', 'participants'] as const).map(st => (
              <button
                key={st}
                onClick={() => setOverviewSubTab(st)}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: overviewSubTab === st ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1, padding: '6px 16px', cursor: 'pointer', fontSize: 12,
                  fontWeight: overviewSubTab === st ? 700 : 400,
                  color: overviewSubTab === st ? 'var(--text)' : 'var(--muted)',
                  transition: 'color 0.15s',
                }}
              >
                {st === 'summary'
                  ? 'Executive summary'
                  : `Participants (${(selected.attributes.attendees || []).length})`}
              </button>
            ))}
          </div>
          )}

          {/* Participants */}
          {detailTab === 'overview' && overviewSubTab === 'participants' && (
          <div style={{ paddingTop: 4, marginBottom: 12 }}>
            {attendeeLoading && <span className="muted" style={{ fontSize: 12 }}>…</span>}

            {/* Attendees table with DND */}
            {(selected.attributes.attendees || []).length > 0 && (
              <SortablePersonList
                items={(selected.attributes.attendees || []).map(a => ({
                  id: String(a.contact_id),
                  name: (
                    <span style={{ fontWeight: 500 }}>
                      {a.first_name ? `${a.first_name} ${a.last_name}` : a.last_name}
                    </span>
                  ),
                  role: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleUpdateAttendeeRole(a.contact_id, a.role === 'Meeting Organiser' ? '' : 'Meeting Organiser'); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 14 }}
                        title={a.role === 'Meeting Organiser' ? 'Remove organiser' : 'Set as organiser'}
                      >{a.role === 'Meeting Organiser' ? '⭐' : '☆'}</button>
                      {editingRoleId === a.contact_id ? (
                        <input
                          ref={editingRoleInputRef}
                          autoFocus
                          value={editingRoleValue}
                          onChange={e => setEditingRoleValue(e.target.value)}
                          onBlur={() => handleUpdateAttendeeRole(a.contact_id, editingRoleValue)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateAttendeeRole(a.contact_id, editingRoleValue);
                            if (e.key === 'Escape') setEditingRoleId(null);
                          }}
                          style={{ fontSize: 12, padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', width: 130 }}
                          placeholder="Role…"
                        />
                      ) : (
                        <span
                          onClick={() => { setEditingRoleId(a.contact_id); setEditingRoleValue(a.role || ''); }}
                          style={{ fontSize: 12, cursor: 'pointer', color: a.role ? 'var(--text)' : 'var(--muted)', fontStyle: a.role ? 'normal' : 'italic', borderBottom: '1px dashed var(--border)' }}
                          title="Click to edit role"
                        >{a.role === 'Meeting Organiser' ? 'Organiser' : (a.role || '+ role')}</span>
                      )}
                    </span>
                  ),
                  context: (
                    <span className="badge" style={{ fontSize: 10 }}>{a.status}</span>
                  ),
                  actions: (
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => openContactEditor(a.contact_id, reloadAttendees)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}
                        title="Edit contact"
                      >✎</button>
                      <button
                        onClick={() => handleRemoveAttendee(a.contact_id)}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }}
                        title="Remove participant"
                      >✕</button>
                    </span>
                  ),
                }))}
                onReorder={newIds => handleReorderAttendees(newIds.map(Number))}
                headers={{ name: 'Name', role: 'Role', context: 'Status' }}
              />
            )}

            {/* Add attendee typeahead */}
            <div style={{ position: 'relative', maxWidth: 320, marginTop: 12 }}>
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
          )}


          {/* Participants draggables — visible dans l'onglet Transcript pour le drag → speaker */}
          {detailTab === 'transcript' && (selected.attributes.attendees || []).length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Drag onto a speaker →</span>
                {(selected.attributes.attendees || []).map(a => (
                  <span
                    key={a.contact_id}
                    draggable
                    onDragStart={e => handleAttendeeDragStart(e, a)}
                    title="Drag onto a speaker to map them"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#e3f2fd', color: '#1565c0',
                      borderRadius: 10, padding: '2px 8px', fontSize: 12,
                      cursor: 'grab',
                    }}
                  >
                    {a.first_name ? `${a.first_name} ${a.last_name}` : a.last_name}
                    {a.role && <span className="muted" style={{ fontSize: 10 }}>· {a.role}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Speakers (diarization / voice-id) — visible uniquement si transcription done */}
          {detailTab === 'transcript' && txStatus === 'done' && (
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
                    const assignedName = sp.display_name || sp.contact_name || (sp.contact_id ? `#${sp.contact_id}` : null);
                    const mins = Math.floor(sp.total_duration_s / 60);
                    const secs = Math.round(sp.total_duration_s % 60);
                    const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                    const hasAudioPreview = sp.first_segment_start !== null && !!selectedId;
                    const isDragOver = dragOverLabel === sp.label;
                    return (
                      <div
                        key={sp.label}
                        onDragOver={e => handleSpeakerDragOver(e, sp.label)}
                        onDragLeave={handleSpeakerDragLeave}
                        onDrop={e => handleSpeakerDrop(e, sp.label)}
                        style={{
                          background: isDragOver ? 'rgba(63,185,80,.07)' : 'var(--panel-2)',
                          border: `1px solid ${isDragOver ? 'var(--green, #3fb950)' : 'var(--border)'}`,
                          borderRadius: 6, padding: '8px 12px',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          {/* Label + stats */}
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{sp.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {duration} ({sp.total_pct}%)
                          </span>
                          {/* Bouton preview audio */}
                          {hasAudioPreview && (
                            <button
                              className="btn-ghost"
                              style={{ fontSize: 11, padding: '1px 7px' }}
                              title={`Preview ${sp.label} — seek to ${fmtTime(sp.first_segment_start ?? 0)} and play 10s`}
                              onClick={() => handlePreviewSpeaker(sp)}
                            >
                              ▶ {fmtTime(sp.first_segment_start ?? 0)}
                            </button>
                          )}
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
                              💡 {sp.suggested_contact_name || `#${sp.suggested_contact_id}`}
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

          {/* ─── Transcript viewer : segments + player audio ─── */}
          {detailTab === 'transcript' && txStatus === 'done' && selected.attributes.transcription_segments && selected.attributes.transcription_segments.length > 0 && (() => {
            const segs = selected.attributes.transcription_segments!;
            // Liste des speakers distincts présents dans les segments
            const speakerLabels = Array.from(new Set(segs.map(s => s.speaker).filter(Boolean) as string[]));
            const hasAudio = !!selected.attributes.audio_path;
            const filteredSegs = segFilter ? segs.filter(s => s.speaker === segFilter) : segs;
            // Correspondance label → display_name depuis speakers chargés
            const speakerName = (label: string) => {
              const sp = speakers.find(s => s.label === label);
              return sp?.display_name || label;
            };

            return (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <strong>Transcript</strong>
                  <span className="badge">{segs.length} segments</span>
                  {fmtTime(segs[segs.length - 1]?.end || 0) && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      {fmtTime(segs[segs.length - 1]?.end || 0)} total
                    </span>
                  )}
                  {/* Filter by speaker */}
                  {speakerLabels.length > 0 && (
                    <>
                      <span className="muted" style={{ fontSize: 12 }}>Filter:</span>
                      <button
                        className={segFilter === null ? 'btn' : 'btn-ghost'}
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => setSegFilter(null)}
                      >All</button>
                      {speakerLabels.map(lbl => (
                        <button key={lbl}
                          className={segFilter === lbl ? 'btn' : 'btn-ghost'}
                          style={{
                            fontSize: 11, padding: '2px 8px',
                            color: segFilter === lbl ? '#fff' : speakerColor(lbl),
                            borderColor: speakerColor(lbl),
                            background: segFilter === lbl ? speakerColor(lbl) : 'transparent',
                          }}
                          onClick={() => setSegFilter(l => l === lbl ? null : lbl)}
                        >{speakerName(lbl)}</button>
                      ))}
                    </>
                  )}
                </div>

                {/* Audio player inline */}
                {hasAudio && !audioError ? (
                  <div style={{
                    background: 'var(--panel-2)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '8px 12px', marginBottom: 10,
                    display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                  }}>
                    {/* Play/Pause */}
                    <button
                      className="btn"
                      style={{ padding: '4px 12px', fontSize: 16, minWidth: 40 }}
                      onClick={toggleAudioPlay}
                    >{audioPlaying ? '⏸' : '▶'}</button>

                    {/* Rewind / Forward */}
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => audioSkip(-10)}>-10s</button>
                    <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => audioSkip(10)}>+10s</button>

                    {/* Progress bar */}
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 100}
                      step={0.5}
                      value={audioCurrentTime}
                      style={{ flex: 1, minWidth: 100, accentColor: 'var(--accent)' }}
                      onChange={e => handleAudioSeek(Number(e.target.value))}
                    />

                    {/* Timecode */}
                    <span style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 90, textAlign: 'right' }}>
                      {fmtTime(audioCurrentTime)} / {fmtTime(audioDuration)}
                    </span>

                    {/* Volume */}
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={audioVolume}
                      style={{ width: 60, accentColor: 'var(--accent)' }}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setAudioVolume(v);
                        if (audioRef.current) { audioRef.current.volume = v; }
                      }}
                    />
                  </div>
                ) : audioError ? (
                  <div style={{ fontSize: 12, color: 'var(--danger, #e55)', marginBottom: 8, fontStyle: 'italic' }}>
                    ⚠ Audio file not found on server — upload a new audio file to enable playback
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, fontStyle: 'italic' }}>
                    No audio file — upload an audio file to enable playback
                  </div>
                )}

                {/* Segment list */}
                <div
                  ref={segListRef}
                  style={{
                    maxHeight: 420, overflowY: 'auto', border: '1px solid var(--border)',
                    borderRadius: 6, background: 'var(--panel-2)',
                  }}
                >
                  {filteredSegs.map((seg, i) => {
                    const realIdx = segs.indexOf(seg);
                    const isActive = realIdx === activeSegIdx;
                    const color = seg.speaker ? speakerColor(seg.speaker) : null;
                    const name = seg.speaker ? speakerName(seg.speaker) : null;
                    return (
                      <div
                        key={realIdx}
                        ref={isActive ? activeSegRef : null}
                        onClick={() => handleSegmentClick(seg)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                          padding: '6px 10px',
                          cursor: hasAudio ? 'pointer' : 'default',
                          borderBottom: '1px solid var(--border)',
                          background: isActive ? 'var(--accent)' : 'transparent',
                          color: isActive ? '#fff' : 'var(--text)',
                          borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--panel)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Timecode */}
                        <span style={{
                          fontFamily: 'monospace', fontSize: 11,
                          background: isActive ? 'rgba(255,255,255,.2)' : 'var(--panel)',
                          border: '1px solid var(--border)',
                          borderRadius: 4, padding: '1px 5px',
                          flexShrink: 0, marginTop: 1,
                          color: isActive ? '#fff' : 'var(--muted)',
                        }}>{fmtTime(seg.start)}</span>

                        {/* Speaker badge */}
                        {name && color && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                            padding: '1px 6px', borderRadius: 8, marginTop: 2,
                            background: isActive ? 'rgba(255,255,255,.25)' : `${color}22`,
                            color: isActive ? '#fff' : color,
                            border: `1px solid ${isActive ? 'rgba(255,255,255,.5)' : color}`,
                          }}>{name}</span>
                        )}

                        {/* Text */}
                        <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>
                          {seg.text.trim()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Transcription */}
          {detailTab === 'transcript' && (
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
                  <label className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px', cursor: uploadingAudio ? 'default' : 'pointer', opacity: uploadingAudio ? 0.6 : 1 }}>
                    {uploadingAudio ? 'Converting…' : 'Replace audio'}
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
                  <label className="btn-ghost" style={{ fontSize: 12, padding: '4px 12px', cursor: uploadingAudio ? 'default' : 'pointer', opacity: uploadingAudio ? 0.6 : 1 }}>
                    {uploadingAudio ? 'Converting…' : 'Re-transcribe'}
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
                {/* — Reconnexion en cours (SSE perdu, txPhase vide) — */}
                {!txPhase && (
                  <div style={{
                    fontSize: 12, color: 'var(--muted)', marginBottom: 8,
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--panel-2)', border: '1px solid var(--border)',
                    borderRadius: 4, padding: '6px 10px',
                  }}>
                    <span style={{ fontSize: 14 }}>⟳</span>
                    Reconnecting to transcription stream…
                    <button className="btn-ghost" style={{ fontSize: 11, marginLeft: 'auto' }}
                      onClick={() => { stopSSE(); loadMeetings(); }}>
                      Check status
                    </button>
                  </div>
                )}
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

            {/* ── Whisper suspicious tokens review ──────────────── */}
            {txStatus === 'done' && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
                <WhisperSuggestionsPanel
                  meetingId={Number(selectedId!)}
                  onSeekTo={handleAudioSeek}
                />
              </div>
            )}

            {/* ── Corrections dictionary ────────────────────────── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
              <WhisperCorrectionsPanel domain="ETNIC" />
            </div>
          </div>
          )}

          {/* ── AI Extraction ─────────────────────────────────────── */}
          {detailTab === 'cr_structure' && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <strong>AI Extraction</strong>

              {/* Status badge */}
              {(() => {
                const st = selected.attributes.extraction_status;
                const colors: Record<string, { bg: string; color: string }> = {
                  success: { bg: '#e8f5e9', color: '#2e7d32' },
                  pending: { bg: '#fff3e0', color: '#e65100' },
                  failed:  { bg: '#ffebee', color: '#c62828' },
                  skipped: { bg: '#f3e5f5', color: '#6a1b9a' },
                };
                const c = colors[st] || { bg: '#f5f5f5', color: '#555' };
                return (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, ...c }}>
                    {st}
                  </span>
                );
              })()}

              {/* Validated badge */}
              {selected.attributes.validated_at && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#e3f2fd', color: '#1565c0' }}>
                  ✓ validated
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button
                className="btn-ghost"
                style={{ fontSize: 12 }}
                onClick={handleCopyPrompt}
                title="Copy the Copilot Chat prompt to generate the CR via MCP"
              >
                📋 Generate CR with Copilot
              </button>

              {selected.attributes.extraction_status === 'success' && (
                selected.attributes.validated_at ? (
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 12, color: '#e65100' }}
                    onClick={() => handleValidateCR(false)}
                    disabled={validating}
                  >
                    {validating ? 'Updating…' : '✗ Unvalidate'}
                  </button>
                ) : (
                  <button
                    className="btn"
                    style={{ fontSize: 12 }}
                    onClick={() => handleValidateCR(true)}
                    disabled={validating}
                  >
                    {validating ? 'Saving…' : '✓ Validate CR'}
                  </button>
                )
              )}
            </div>

            {/* Topics */}
            {selected.attributes.project_id && (() => {
              // Calcul des groupes pour le picker (registry filtré : pas la réunion courante)
              const registryOthers = registry.filter(r => r.meeting_id !== Number(selected.id));
              const promotedPTs: { id: number; title: string }[] = [];
              const seenPTIds = new Set<number>();
              registryOthers.forEach(r => {
                if (r.project_topic_id && !seenPTIds.has(r.project_topic_id)) {
                  seenPTIds.add(r.project_topic_id);
                  promotedPTs.push({ id: r.project_topic_id, title: r.project_topic_title! });
                }
              });
              const orphanSignals = registryOthers.filter(r => !r.project_topic_id);

              return (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                      TOPICS ({selected.attributes.meeting_topics?.length ?? 0})
                    </span>
                    <button
                      style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, border: '1px dashed #aaa', background: 'none', cursor: 'pointer', color: '#888', whiteSpace: 'nowrap' }}
                      onClick={() => { setAddTopicOpen(o => !o); setNewTopicTitle(''); }}
                    >{addTopicOpen ? '✕ Cancel' : '+ Add topic'}</button>
                  </div>

                  {/* Formulaire d'ajout manuel */}
                  {addTopicOpen && (
                    <div style={{ marginBottom: 8, padding: '8px', background: 'var(--panel-2)', borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        autoFocus
                        placeholder="Topic title…"
                        value={newTopicTitle}
                        onChange={e => setNewTopicTitle(e.target.value)}
                        style={{ fontSize: 12, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select
                          value={newTopicType}
                          onChange={e => setNewTopicType(e.target.value)}
                          style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', width: 'auto', flex: 1 }}
                        >
                          <option value="open_point">open_point</option>
                          <option value="information">information</option>
                          <option value="decision">decision</option>
                          <option value="risk">risk</option>
                          <option value="action">action</option>
                        </select>
                        <select
                          value={newTopicCommitment}
                          onChange={e => setNewTopicCommitment(e.target.value)}
                          style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', width: 'auto', flex: 1 }}
                        >
                          <option value="mentioned">mentioned</option>
                          <option value="acknowledged">acknowledged</option>
                          <option value="agreed">agreed</option>
                          <option value="decided">decided</option>
                        </select>
                        <button
                          disabled={!newTopicTitle.trim()}
                          style={{ fontSize: 11, padding: '2px 10px', borderRadius: 4, border: 'none', background: 'var(--accent)', color: '#fff', cursor: newTopicTitle.trim() ? 'pointer' : 'default', opacity: newTopicTitle.trim() ? 1 : 0.4, whiteSpace: 'nowrap' }}
                          onClick={async () => {
                            const r = await fetch('/api/meeting-topics', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ data: { type: 'meeting-topic', attributes: {
                                meeting_id: selected.id, title: newTopicTitle.trim(),
                                type: newTopicType, commitment_level: newTopicCommitment,
                              }}}),
                            });
                            if (!r.ok) { flash('Failed to add topic', 'err'); return; }
                            const body = await r.json();
                            const newMt: MeetingTopic = {
                              id: Number(body.data.id),
                              position: body.data.attributes.position,
                              title: body.data.attributes.title,
                              summary: body.data.attributes.summary,
                              type: body.data.attributes.type,
                              project_topic_id: null,
                              commitment_level: body.data.attributes.commitment_level,
                            };
                            setItems(prev => prev.map(it => it.id === selectedId ? {
                              ...it, attributes: { ...it.attributes, meeting_topics: [...(it.attributes.meeting_topics || []), newMt] },
                            } : it));
                            setAddTopicOpen(false);
                            setNewTopicTitle('');
                            flash('Topic added');
                          }}
                        >Add</button>
                      </div>
                    </div>
                  )}

                  {(selected.attributes.meeting_topics?.length ?? 0) === 0 && !addTopicOpen && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 4 }}>No topics yet — will appear after AI extraction or when added…</div>
                  )}

                  {(selected.attributes.meeting_topics || []).map(t => (
                    <div key={t.id} style={{ marginBottom: 6, padding: '6px 8px', background: 'var(--panel-2)', borderRadius: 4, borderLeft: `3px solid ${t.project_topic_id ? 'var(--green, #4caf50)' : 'var(--accent)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0 }}>
                          {t.position}. {t.title}
                          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>[{t.type}]</span>
                          {t.commitment_level && t.commitment_level !== 'mentioned' && (
                            <span style={{
                              marginLeft: 5, fontSize: 10, padding: '1px 5px', borderRadius: 8,
                              background: t.commitment_level === 'decided' ? '#e3f2fd' : t.commitment_level === 'agreed' ? '#e8f5e9' : '#fff3e0',
                              color:      t.commitment_level === 'decided' ? '#1565c0' : t.commitment_level === 'agreed' ? '#2e7d32' : '#e65100',
                              fontWeight: 600,
                            }}>{t.commitment_level}</span>
                          )}
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          {t.project_topic_id
                            ? <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: '#e8f5e9', color: '#2e7d32' }}>↗ PT#{t.project_topic_id}</span>
                            : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                                {/* Promouvoir en nouveau project_topic standalone */}
                                <button
                                  style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, border: '1px dashed #aaa', background: 'none', cursor: 'pointer', color: '#888', whiteSpace: 'nowrap' }}
                                  onClick={async () => {
                                    const ptRes = await fetch('/api/project-topics', {
                                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ data: { type: 'project-topic', attributes: {
                                        project_id: selected.attributes.project_id, title: t.title, status: 'open',
                                      }}}),
                                    });
                                    if (!ptRes.ok) { flash('Failed to create project topic', 'err'); return; }
                                    const ptBody = await ptRes.json();
                                    const ptId = Number(ptBody.data.id);
                                    await fetch(`/api/meeting-topics/${t.id}`, {
                                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ data: { type: 'meeting-topic', attributes: { project_topic_id: ptId }}}),
                                    });
                                    setItems(prev => prev.map(it => it.id === selectedId ? {
                                      ...it, attributes: { ...it.attributes, meeting_topics: it.attributes.meeting_topics?.map(
                                        mt => mt.id === t.id ? { ...mt, project_topic_id: ptId } : mt
                                      )},
                                    } : it));
                                    flash(`"${t.title}" promoted to PT#${ptId}`);
                                  }}
                                >+ Promote</button>

                                {/* Lier à un topic existant (promu ou signal orphelin) */}
                                {linkingTopicId === t.id ? (
                                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <select
                                      defaultValue=""
                                      style={{ fontSize: 10, padding: '2px 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', width: 'auto', maxWidth: 200 }}
                                      onChange={async e => {
                                        const val = e.target.value;
                                        if (!val) return;
                                        let newPtId: number | null = null;
                                        if (val.startsWith('pt:')) {
                                          const ptId = Number(val.slice(3));
                                          const r = await fetch(`/api/meeting-topics/${t.id}`, {
                                            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ data: { type: 'meeting-topic', attributes: { project_topic_id: ptId }}}),
                                          });
                                          if (!r.ok) { flash('Link failed', 'err'); return; }
                                          newPtId = ptId;
                                          flash(`Linked to PT#${ptId}`);
                                        } else if (val.startsWith('mt:')) {
                                          const srcMtId = Number(val.slice(3));
                                          const r = await fetch(`/api/meeting-topics/${t.id}`, {
                                            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ data: { type: 'meeting-topic', attributes: { link_to_meeting_topic_id: srcMtId }}}),
                                          });
                                          if (!r.ok) { flash('Auto-promote failed', 'err'); return; }
                                          const body = await r.json();
                                          newPtId = Number(body.data.attributes.project_topic_id);
                                          flash(`Signal promoted & linked to PT#${newPtId}`);
                                        }
                                        if (newPtId) {
                                          setItems(prev => prev.map(it => it.id === selectedId ? {
                                            ...it, attributes: { ...it.attributes, meeting_topics: it.attributes.meeting_topics?.map(
                                              mt => mt.id === t.id ? { ...mt, project_topic_id: newPtId } : mt
                                            )},
                                          } : it));
                                        }
                                        setLinkingTopicId(null);
                                      }}
                                    >
                                      <option value="">— select —</option>
                                      {promotedPTs.length > 0 && (
                                        <optgroup label="── Project topics ──">
                                          {promotedPTs.map(pt => (
                                            <option key={`pt:${pt.id}`} value={`pt:${pt.id}`}>{pt.title}</option>
                                          ))}
                                        </optgroup>
                                      )}
                                      {orphanSignals.length > 0 && (
                                        <optgroup label="── Untracked signals ──">
                                          {orphanSignals.map(s => (
                                            <option key={`mt:${s.mt_id}`} value={`mt:${s.mt_id}`}>{s.title} ({s.meeting_title})</option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </select>
                                    <button
                                      style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: '#888' }}
                                      onClick={() => setLinkingTopicId(null)}
                                    >✕</button>
                                  </div>
                                ) : (
                                  <button
                                    style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, border: '1px solid #555', background: 'none', cursor: 'pointer', color: '#888', whiteSpace: 'nowrap' }}
                                    onClick={() => {
                                      loadRegistry(selected.attributes.project_id!);
                                      setLinkingTopicId(t.id);
                                    }}
                                  >↗ Link to topic</button>
                                )}
                              </div>
                            )
                          }
                        </div>
                      </div>
                      {t.summary && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{t.summary}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}


            {/* Decisions */}
            {(selected.attributes.meeting_decisions?.length ?? 0) > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                  DECISIONS ({selected.attributes.meeting_decisions!.length})
                </div>
                {selected.attributes.meeting_decisions!.map((d, i) => (
                  <div key={d.id} style={{ marginBottom: 6, padding: '6px 8px', background: 'var(--panel-2)', borderRadius: 4, borderLeft: '3px solid #f9a825' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{i + 1}. {d.description}</div>
                    {d.impact && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Impact: {d.impact}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {(selected.attributes.meeting_actions?.length ?? 0) > 0 && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
                  ACTIONS ({selected.attributes.meeting_actions!.length})
                </div>
                {selected.attributes.meeting_actions!.map((a, i) => (
                  <div key={a.id} style={{ marginBottom: 6, padding: '6px 8px', background: 'var(--panel-2)', borderRadius: 4, borderLeft: '3px solid #c62828' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {i + 1}. {a.description}
                      {a.status && a.status !== 'open' && (
                        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 400, color: '#555' }}>[{a.status}]</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {a.owner_raw && <span>Owner: {a.owner_raw}</span>}
                      {a.deadline && <span style={{ marginLeft: 8 }}>Due: {a.deadline.slice(0, 10)}</span>}
                      {a.notes && <span style={{ marginLeft: 8 }}>— {a.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
          )}

          {/* Executive summary (display) */}
          {detailTab === 'overview' && overviewSubTab === 'summary' && selected.attributes.executive_summary && !editOpen && (
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>
                {selected.attributes.executive_summary
                  .replace(/([.!?]) +/g, '$1\n')
                  .split('\n')
                  .filter(Boolean)
                  .map((sentence: string, i: number) => (
                    <React.Fragment key={i}>{sentence}<br /></React.Fragment>
                  ))
                }
              </div>
            </div>
          )}

          {/* Edit toggle — overview */}
          {detailTab === 'overview' && overviewSubTab === 'summary' && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditOpen(v => !v)}>
              {editOpen ? '▲ Hide edit' : '✏️ Edit summary'}
            </button>
          </div>
          )}

          {/* Edit form — executive summary only in overview */}
          {detailTab === 'overview' && overviewSubTab === 'summary' && editOpen && (
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
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
                <button className="btn" onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* ── Tab CR mail ──────────────────────────────────────────── */}
          {detailTab === 'cr_mail' && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <strong>CR mail</strong>
              <span className="muted" style={{ fontSize: 12 }}>Généré par l'agent IA · envoyable via Outlook / OneNote</span>
            </div>

            {/* ── Bloc connexion Graph ── */}
            {(() => {
              // Vérifie le statut Graph au rendu de ce bloc
              if (graphConnected === null) {
                fetch('/api/graph/status').then(r => r.json()).then(b => {
                  setGraphConnected(b.data?.attributes?.connected === true);
                }).catch(() => setGraphConnected(false));
              }
              return null;
            })()}

            {graphConnected === false && (
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 6, padding: 12, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>📎 Connecter Microsoft Graph pour envoyer / exporter</div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  Va sur <a href="https://developer.microsoft.com/graph/graph-explorer" target="_blank" rel="noreferrer" style={{ color: 'inherit', fontWeight: 600 }}>Graph Explorer</a>,
                  connecte-toi avec ton compte WBE, onglet <strong>Access token</strong> → copie le token.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    style={{ flex: 1, fontSize: 12, fontFamily: 'monospace' }}
                    placeholder="eyJ0eXAiOiJKV1Q…"
                    value={crGraphToken}
                    onChange={e => setCrGraphToken(e.target.value)}
                  />
                  <button className="btn" style={{ fontSize: 12 }}
                    disabled={!crGraphToken.trim() || crGraphTokenSaving}
                    onClick={async () => {
                      setCrGraphTokenSaving(true);
                      try {
                        const r = await fetch('/api/graph/manual-token', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ data: { attributes: { token: crGraphToken.trim() } } }),
                        });
                        const body = await r.json();
                        if (!r.ok) { flash(body.errors?.[0]?.detail || 'Token invalide', 'err'); return; }
                        setGraphConnected(true);
                        setCrGraphToken('');
                        flash('Graph connecté ✓');
                      } catch { flash('Erreur réseau', 'err'); }
                      finally { setCrGraphTokenSaving(false); }
                    }}>
                    {crGraphTokenSaving ? '…' : 'Connecter'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Actions ── */}
            {selected.attributes.mail_cr && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button className="btn-ghost" style={{ fontSize: 12 }}
                  onClick={() => { navigator.clipboard.writeText(selected.attributes.mail_cr || ''); flash('Copié'); }}>
                  📋 Copier
                </button>

                <button className="btn-ghost" style={{ fontSize: 12 }}
                  disabled={graphConnected !== true}
                  title={graphConnected !== true ? 'Connecter Graph d\'abord' : ''}
                  onClick={async () => {
                    const r = await fetch(`/api/meetings/${selected.id}/send-mail`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ data: { attributes: {
                        to: (selected.attributes.attendees || []).map(a => ({
                          name: [a.first_name, a.last_name].filter(Boolean).join(' '),
                          email: '',
                        })),
                      }}}),
                    });
                    const body = await r.json();
                    if (r.status === 401) { setGraphConnected(false); flash('Token Graph expiré — reconnecte-toi', 'err'); return; }
                    if (!r.ok) { flash(body.errors?.[0]?.detail || 'Échec envoi', 'err'); return; }
                    flash('Mail envoyé via Outlook ✓');
                  }}>
                  📧 Envoyer
                </button>

                {/* Section ID input + bouton OneNote */}
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    className="input"
                    style={{ fontSize: 11, fontFamily: 'monospace', width: 200, padding: '4px 8px' }}
                    placeholder="Section ID OneNote…"
                    value={onenoteSectionId}
                    onChange={e => { setOnenoteSectionId(e.target.value); localStorage.setItem('projecter_onenote_section_id', e.target.value); }}
                    title="Graph Explorer → GET /me/onenote/sections → copie le champ id"
                  />
                  <button className="btn-ghost" style={{ fontSize: 12 }}
                    disabled={graphConnected !== true || !onenoteSectionId.trim()}
                    title={graphConnected !== true ? 'Connecter Graph d\'abord' : !onenoteSectionId.trim() ? 'Entre le Section ID OneNote' : ''}
                    onClick={async () => {
                      const r = await fetch(`/api/meetings/${selected.id}/export-onenote`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: { attributes: { section_id: onenoteSectionId.trim() } } }),
                      });
                      const body = await r.json();
                      if (r.status === 401) { setGraphConnected(false); flash('Token Graph expiré — reconnecte-toi', 'err'); return; }
                      if (!r.ok) { flash(body.errors?.[0]?.detail || 'Échec export OneNote', 'err'); return; }
                      flash('Page créée dans OneNote ✓');
                    }}>
                    📓 OneNote
                  </button>
                </div>
              </div>
            )}

            {/* Affichage mail_cr */}
            {selected.attributes.mail_cr ? (
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 6, padding: 14, margin: 0, fontFamily: 'inherit', color: 'var(--text)' }}>
                {selected.attributes.mail_cr}
              </pre>
            ) : (
              <div className="muted" style={{ fontSize: 13, fontStyle: 'italic', padding: '16px 0' }}>
                Aucun CR mail généré. Demandez à l'agent Copilot de générer le mail CR, puis sauvegardez-le via PATCH /api/meetings/:id (champ <code>mail_cr</code>).
              </div>
            )}

            {/* Édition directe */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 12 }}>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditOpen(v => !v)}>
                {editOpen ? '▲ Fermer l\'éditeur' : '✏️ Éditer le CR mail'}
              </button>
              {editOpen && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    className="input"
                    rows={16}
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, color: 'var(--text, #212121)', background: 'var(--bg, #fff)' }}
                    value={editFields.mail_cr}
                    onChange={e => setEditFields(prev => ({ ...prev, mail_cr: e.target.value }))}
                    placeholder="Bonjour,&#10;&#10;Voici le CR de la réunion…&#10;&#10;| Thème | Sujet | Statut | Q/Actions |&#10;|-------|-------|--------|-----------|"
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button className="btn-ghost" onClick={() => setEditOpen(false)}>Annuler</button>
                    <button className="btn" onClick={handleSaveEdit} disabled={editSaving}>
                      {editSaving ? 'Saving…' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* ── Tab CR complet ───────────────────────────────────────── */}
          {detailTab === 'cr_complet' && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <strong>CR complet</strong>
              <span className="muted" style={{ fontSize: 12 }}>Compte-rendu détaillé</span>
              {selected.attributes.minutes && (
                <button className="btn-ghost" style={{ fontSize: 12 }}
                  onClick={() => { navigator.clipboard.writeText(selected.attributes.minutes || ''); flash('CR complet copié'); }}>
                  📋 Copier
                </button>
              )}
            </div>

            {selected.attributes.minutes ? (
              <p style={{ fontSize: 13, marginTop: 8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                {selected.attributes.minutes}
              </p>
            ) : (
              <div className="muted" style={{ fontSize: 13, fontStyle: 'italic', padding: '16px 0' }}>
                Aucun CR complet. Utilisez l'agent Copilot pour générer le CR, puis sauvegardez-le via PATCH /api/meetings/:id (champ <code>minutes</code>).
              </div>
            )}

            {/* Edit toggle */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 12 }}>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setEditOpen(v => !v)}>
                {editOpen ? '▲ Fermer l\'éditeur' : '✏️ Éditer le CR complet'}
              </button>
              {editOpen && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    className="input"
                    rows={20}
                    style={{ width: '100%', fontFamily: 'inherit', fontSize: 13 }}
                    value={editFields.minutes}
                    onChange={e => setEditFields(prev => ({ ...prev, minutes: e.target.value }))}
                    placeholder="Compte-rendu de réunion…"
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button className="btn-ghost" onClick={() => setEditOpen(false)}>Annuler</button>
                    <button className="btn" onClick={handleSaveEdit} disabled={editSaving}>
                      {editSaving ? 'Saving…' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </div>

    {/* ── Modal Import Outlook ── */}
    {outlookModal && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} onClick={() => { setOutlookModal(false); if (outlookPollRef.current) { clearInterval(outlookPollRef.current); outlookPollRef.current = null; } }}>
        <div style={{
          background: 'var(--bg, #fff)', borderRadius: 10, padding: 28, minWidth: 520, maxWidth: 700,
          maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>📅 Import from Outlook</h3>
            <button className="btn-ghost" onClick={() => { setOutlookModal(false); if (outlookPollRef.current) { clearInterval(outlookPollRef.current); outlookPollRef.current = null; } }}>✕</button>
          </div>

          {/* Checking */}
          {outlookStep === 'checking' && (
            <div className="muted" style={{ textAlign: 'center', padding: '30px 0' }}>Checking connection…</div>
          )}

          {/* Not connected — deux options d'auth */}
          {outlookStep === 'not_connected' && (
            <div>
              {/* Option A — Device Code Flow (nécessite App Azure AD) */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Option A — Microsoft login (Device Code)</div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Nécessite une App Azure AD enregistrée avec <code>AZURE_CLIENT_ID</code> dans le .env.
                </div>
                <button className="btn" onClick={startOutlookAuth}>🔗 Connect with Microsoft</button>
              </div>

              {/* Option B — Token manuel Graph Explorer */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Option B — Token Graph Explorer</div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Va sur <a href="https://developer.microsoft.com/graph/graph-explorer" target="_blank" rel="noreferrer">
                    developer.microsoft.com/graph/graph-explorer
                  </a> → connecte-toi → onglet <strong>Access token</strong> → copie le token → colle ci-dessous.
                  <br/>⚠️ Valable ~1h, à renouveler manuellement.
                </div>
                <textarea
                  className="input"
                  rows={3}
                  style={{ fontFamily: 'monospace', fontSize: 11, width: '100%', boxSizing: 'border-box', marginBottom: 8, resize: 'vertical' }}
                  placeholder="eyJ0eXAiOiJKV1Q..."
                  value={outlookManualToken}
                  onChange={e => setOutlookManualToken(e.target.value)}
                />
                <button className="btn" disabled={!outlookManualToken.trim() || outlookManualTokenSaving}
                  onClick={async () => {
                    setOutlookManualTokenSaving(true);
                    try {
                      const r = await fetch('/api/graph/manual-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: { attributes: { token: outlookManualToken.trim() } } }),
                      });
                      const body = await r.json();
                      if (!r.ok) {
                        flash(body.errors?.[0]?.detail || 'Invalid token', 'err');
                      } else {
                        setOutlookAccount(body.data.attributes.account);
                        setOutlookManualToken('');
                        await loadOutlookEvents();
                      }
                    } catch {
                      flash('Network error', 'err');
                    } finally {
                      setOutlookManualTokenSaving(false);
                    }
                  }}>
                  {outlookManualTokenSaving ? 'Verifying…' : '✅ Use this token'}
                </button>
              </div>
            </div>
          )}

          {/* Device code flow — attente auth */}
          {outlookStep === 'device_flow' && outlookDeviceFlow && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <p style={{ marginBottom: 12 }}>Go to the following URL and enter the code:</p>
              <a href={outlookDeviceFlow.verification_uri} target="_blank" rel="noreferrer"
                style={{ fontWeight: 700, fontSize: 16 }}>
                {outlookDeviceFlow.verification_uri}
              </a>
              <div style={{
                margin: '20px auto', padding: '14px 28px', background: 'var(--bg-alt, #f3f3f3)',
                borderRadius: 8, display: 'inline-block',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>
                  {outlookDeviceFlow.user_code}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                Expires at {new Date(outlookDeviceFlow.expires_at).toLocaleTimeString()} — Waiting for authentication…
              </p>
              <div className="muted" style={{ fontSize: 13 }}>⏳ Polling every 3 seconds…</div>
            </div>
          )}

          {/* Connected — liste des events */}
          {(outlookStep === 'events' || outlookStep === 'importing') && (
            <div>
              {outlookAccount && (
                <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Connected as <strong>{outlookAccount.display_name}</strong> ({outlookAccount.username})
                  </span>
                  <button className="btn-ghost" style={{ fontSize: 11 }} onClick={async () => {
                    await fetch('/api/graph/auth', { method: 'DELETE' });
                    setOutlookAccount(null);
                    setOutlookEvents([]);
                    setOutlookStep('not_connected');
                  }}>Disconnect</button>
                </div>
              )}
              {/* Filtres date */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-end' }}>
                <div>
                  <label className="field-label">From</label>
                  <input type="date" className="input" value={outlookFilterStart}
                    onChange={e => setOutlookFilterStart(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">To</label>
                  <input type="date" className="input" value={outlookFilterEnd}
                    onChange={e => setOutlookFilterEnd(e.target.value)} />
                </div>
                <button className="btn-ghost" onClick={() => loadOutlookEvents(outlookFilterStart || undefined, outlookFilterEnd || undefined)}
                  disabled={outlookEventsLoading}>
                  {outlookEventsLoading ? 'Loading…' : '🔍 Apply'}
                </button>
              </div>
              {/* Liste des events */}
              {outlookEventsLoading ? (
                <div className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>Loading events…</div>
              ) : outlookEvents.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>No events found in this period.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                  {outlookEvents.map(ev => {
                    const startDT = ev.attributes.start?.dateTime ? new Date(ev.attributes.start.dateTime) : null;
                    const endDT   = ev.attributes.end?.dateTime   ? new Date(ev.attributes.end.dateTime)   : null;
                    const isImporting = outlookImporting === ev.id;
                    return (
                      <div key={ev.id} style={{
                        border: '1px solid var(--border)', borderRadius: 7, padding: '10px 14px',
                        opacity: ev.attributes.is_cancelled ? 0.5 : 1,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                            {ev.attributes.subject || '(no subject)'}
                            {ev.attributes.is_cancelled && <span className="badge" style={{ marginLeft: 6 }}>Cancelled</span>}
                          </div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {startDT ? startDT.toLocaleString('fr-BE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            {endDT ? ` → ${endDT.toLocaleTimeString('fr-BE', { timeStyle: 'short' })}` : ''}
                            {ev.attributes.location && <span> · 📍 {ev.attributes.location}</span>}
                            {ev.attributes.online_meeting_url && <span> · 🎥 Teams</span>}
                          </div>
                          {ev.attributes.attendees.length > 0 && (
                            <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                              👥 {ev.attributes.attendees.slice(0, 5).map(a => a.name || a.email).join(', ')}
                              {ev.attributes.attendees.length > 5 && ` +${ev.attributes.attendees.length - 5}`}
                            </div>
                          )}
                        </div>
                        <button className={outlookFillFormMode ? 'btn btn-secondary' : 'btn'} style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}
                          onClick={() => outlookFillFormMode ? fillFormFromOutlookEvent(ev) : importOutlookEvent(ev.id)}
                          disabled={!outlookFillFormMode && (isImporting || !!outlookImporting || ev.attributes.is_cancelled)}>
                          {outlookFillFormMode ? '📝 Pre-fill' : isImporting ? 'Importing…' : '⬇ Import'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}
    <ConfirmDialog
      open={confirmDeleteOpen}
      title="Delete meeting"
      message={selected ? <>Are you sure you want to delete <strong>{selected.attributes.title}</strong>? This action cannot be undone.</> : ''}
      confirmLabel="Delete"
      danger
      busy={deletingMeeting}
      onCancel={() => setConfirmDeleteOpen(false)}
      onConfirm={async () => {
        if (!selectedId) return;
        setDeletingMeeting(true);
        try {
          const res = await fetch(`/api/meetings/${selectedId}`, { method: 'DELETE' });
          if (!res.ok) { const body = await res.json(); throw new Error(body.errors?.[0]?.detail || `HTTP ${res.status}`); }
          setItems(prev => prev.filter(it => it.id !== selectedId));
          setSelectedId(null);
          stopSSE();
          setConfirmDeleteOpen(false);
          flash('Meeting deleted', 'ok');
        } catch (e: any) {
          flash(e.message || 'Delete failed', 'err');
          setConfirmDeleteOpen(false);
        } finally {
          setDeletingMeeting(false);
        }
      }}
    />
    {contactEditor}
    </>
  );
}

