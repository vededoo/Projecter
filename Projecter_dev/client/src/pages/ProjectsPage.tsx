import React, { useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';

interface Project {
  code: string | null;
  title: string;
  slug: string;
  status: string;
  urgency: string | null;
  priority: string | null;
  rag_global: string;
  rag_planning: string;
  rag_budget: string;
  rag_scope: string;
  rag_risks: string;
  status_brief: string | null;
  updated_at: string;
}

const RAG_KEYS = ['rag_global', 'rag_planning', 'rag_budget', 'rag_scope', 'rag_risks'] as const;

export function ProjectsPage({ onSelect }: { onSelect: (id: string) => void }) {
  const [items, setItems] = useState<{ id: string; attributes: Project }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<JsonApiList<Project>>('/projects')
      .then(r => setItems(r.data))
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!items.length) return <div className="empty">No projects yet. Use the API or MCP to create one.</div>;

  return (
    <div>
      <h2>Projects ({items.length})</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Status</th>
              <th>Urgency</th>
              <th>Priority</th>
              <th>RAG (global / plan / budget / scope / risks)</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(it.id)}>
                <td className="muted">{it.attributes.code || '—'}</td>
                <td><a href="#">{it.attributes.title}</a></td>
                <td><span className="badge">{it.attributes.status}</span></td>
                <td>{it.attributes.urgency || '—'}</td>
                <td>{it.attributes.priority || '—'}</td>
                <td>
                  {RAG_KEYS.map(k => (
                    <span key={k} className={`rag ${it.attributes[k]}`} title={`${k}: ${it.attributes[k]}`} />
                  ))}
                </td>
                <td className="muted">{new Date(it.attributes.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
