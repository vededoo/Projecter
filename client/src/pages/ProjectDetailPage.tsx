import React, { useEffect, useState } from 'react';
import { api, JsonApiList, JsonApiOne } from '../api';

interface Project {
  code: string | null; title: string; slug: string; status: string;
  urgency: string | null; priority: string | null;
  rag_global: string; rag_planning: string; rag_budget: string;
  rag_scope: string; rag_risks: string;
  status_brief: string | null; status_brief_updated_at: string | null;
  highlights: any[]; concerns: any[]; next_steps: any[];
  attributes: Record<string, any>;
}
interface Member {
  role: string; effort_md: string | null;
  last_name: string; first_name: string; job_title: string;
  organization_code: string | null; cc_label: string | null;
}
interface Risk {
  label: string; probability: string | null; impact: string | null;
  severity: string | null; status: string; due_date: string | null;
  mitigation_plan: string | null;
}
interface Doc {
  type: string; title: string | null; version: string; status: string;
  drafted_at: string | null; signed_at: string | null;
}
interface Meeting {
  title: string; type: string; start_at: string; location: string | null;
}

const RAG = ['rag_global', 'rag_planning', 'rag_budget', 'rag_scope', 'rag_risks'] as const;

export function ProjectDetailPage({ id, onBack }: { id: string; onBack: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<JsonApiOne<Project>>(`/projects/${id}`),
      api.get<JsonApiList<Member>>(`/project-members?project_id=${id}`),
      api.get<JsonApiList<Risk>>(`/risks?project_id=${id}`),
      api.get<JsonApiList<Doc>>(`/documents?project_id=${id}`),
      api.get<JsonApiList<Meeting>>(`/meetings?project_id=${id}`),
    ])
      .then(([p, m, r, d, mt]) => {
        setProject(p.data.attributes);
        setMembers(m.data.map(x => x.attributes));
        setRisks(r.data.map(x => x.attributes));
        setDocs(d.data.map(x => x.attributes));
        setMeetings(mt.data.map(x => x.attributes));
      })
      .catch(e => setError(e.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!project) return <div className="empty">Loading…</div>;

  return (
    <div>
      <p><button className="btn" onClick={onBack}>← Back</button></p>
      <h2>{project.code ? `[${project.code}] ` : ''}{project.title}</h2>
      <p className="muted">slug: {project.slug} · status: <span className="badge">{project.status}</span> · urgency: {project.urgency || '—'} · priority: {project.priority || '—'}</p>

      <div className="row">
        <div className="col">
          <div className="card">
            <h3>RAG status</h3>
            <table>
              <tbody>
                {RAG.map(k => (
                  <tr key={k}>
                    <td className="muted">{k.replace('rag_', '')}</td>
                    <td><span className={`rag ${(project as any)[k]}`} /> {(project as any)[k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      <div className="card">
        <h3>Members ({members.length})</h3>
        {members.length ? (
          <table>
            <thead><tr><th>Role</th><th>Name</th><th>Org</th><th>Job title</th><th>CC</th><th>Effort (MD)</th></tr></thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i}>
                  <td><span className="badge">{m.role}</span></td>
                  <td>{m.first_name} {m.last_name}</td>
                  <td>{m.organization_code || '—'}</td>
                  <td className="muted">{m.job_title || '—'}</td>
                  <td>{m.cc_label || '—'}</td>
                  <td>{m.effort_md || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">No members yet.</div>}
      </div>

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
