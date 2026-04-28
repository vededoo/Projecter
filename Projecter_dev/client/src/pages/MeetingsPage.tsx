import React, { useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';

interface Meeting {
  project_id: number; type: string; title: string;
  start_at: string; end_at: string | null;
  location: string | null;
}

export function MeetingsPage() {
  const [items, setItems] = useState<{ id: string; attributes: Meeting }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<JsonApiList<Meeting>>('/meetings')
      .then(r => setItems(r.data))
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Meetings ({items.length})</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>When</th><th>Project</th><th>Type</th><th>Title</th><th>Location</th></tr></thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td className="muted">{new Date(it.attributes.start_at).toLocaleString()}</td>
                <td>#{it.attributes.project_id}</td>
                <td><span className="badge">{it.attributes.type}</span></td>
                <td>{it.attributes.title}</td>
                <td className="muted">{it.attributes.location || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="empty">No meetings.</div>}
      </div>
    </div>
  );
}
