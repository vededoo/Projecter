import React, { useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';

interface Risk {
  project_id: number; label: string;
  probability: string | null; impact: string | null;
  severity: string | null; status: string;
  due_date: string | null;
}
interface Project { id: string; attributes: { title: string; slug: string } }

export function RisksPage() {
  const [risks, setRisks] = useState<{ id: string; attributes: Risk }[]>([]);
  const [projects, setProjects] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<JsonApiList<Risk>>('/risks'),
      api.get<JsonApiList<{ title: string; slug: string }>>('/projects'),
    ])
      .then(([r, p]) => {
        setRisks(r.data);
        const m = new Map<number, string>();
        (p.data as Project[]).forEach(it => m.set(Number(it.id), it.attributes.title));
        setProjects(m);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Risks (cross-project · {risks.length})</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr>
            <th>Project</th><th>Label</th><th>Prob</th><th>Impact</th>
            <th>Severity</th><th>Status</th><th>Due</th>
          </tr></thead>
          <tbody>
            {risks.map(r => (
              <tr key={r.id}>
                <td className="muted">{projects.get(r.attributes.project_id) || `#${r.attributes.project_id}`}</td>
                <td>{r.attributes.label}</td>
                <td><span className={`badge ${r.attributes.probability || ''}`}>{r.attributes.probability || '—'}</span></td>
                <td><span className={`badge ${r.attributes.impact || ''}`}>{r.attributes.impact || '—'}</span></td>
                <td><span className={`badge ${r.attributes.severity || ''}`}>{r.attributes.severity || '—'}</span></td>
                <td>{r.attributes.status}</td>
                <td className="muted">{r.attributes.due_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!risks.length && <div className="empty">No risks.</div>}
      </div>
    </div>
  );
}
