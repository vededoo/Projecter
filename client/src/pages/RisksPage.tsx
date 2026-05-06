import React, { useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';

interface ProjectLink { project_id: number; project_code: string; project_title: string; impact: string | null; context: string | null }
interface Risk {
  label: string;
  probability: string | null; impact: string | null;
  severity: string | null; status: string;
  due_date: string | null;
  projects: ProjectLink[];
}

export function RisksPage() {
  const [risks, setRisks] = useState<{ id: string; attributes: Risk }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<JsonApiList<Risk>>('/risks')
      .then(r => setRisks(r.data))
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Risks (cross-project · {risks.length})</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr>
            <th>Projects</th><th>Label</th><th>Prob</th><th>Impact</th>
            <th>Severity</th><th>Status</th><th>Due</th>
          </tr></thead>
          <tbody>
            {risks.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {r.attributes.projects?.length
                      ? r.attributes.projects.map(p => (
                          <span key={p.project_id} className="badge" title={p.project_title}>{p.project_code}</span>
                        ))
                      : <span className="muted">—</span>
                    }
                  </div>
                </td>
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
