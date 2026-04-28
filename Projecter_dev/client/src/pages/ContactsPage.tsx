import React, { useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';

interface Contact {
  last_name: string; first_name: string | null; email: string | null;
  job_title: string | null; organization_code: string | null;
}

export function ContactsPage() {
  const [items, setItems] = useState<{ id: string; attributes: Contact }[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = (search: string) => {
    const url = search ? `/contacts?q=${encodeURIComponent(search)}` : '/contacts';
    api.get<JsonApiList<Contact>>(url)
      .then(r => setItems(r.data))
      .catch(e => setError(e.message));
  };

  useEffect(() => { load(''); }, []);

  return (
    <div>
      <h2>Contacts</h2>
      <div className="card">
        <input
          placeholder="Search by name (e.g. ROUWEZ, PONSELET)…"
          value={q}
          onChange={e => { setQ(e.target.value); load(e.target.value); }}
        />
      </div>
      {error && <div className="error">{error}</div>}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Name</th><th>Org</th><th>Job title</th><th>Email</th></tr></thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td><strong>{it.attributes.last_name}</strong> {it.attributes.first_name || ''}</td>
                <td><span className="badge">{it.attributes.organization_code || '—'}</span></td>
                <td className="muted">{it.attributes.job_title || '—'}</td>
                <td className="muted">{it.attributes.email || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="empty">No contacts.</div>}
      </div>
    </div>
  );
}
