import React, { useCallback, useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';
import { ProjectFormModal } from '../components/ProjectFormModal';

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
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    api.get<JsonApiList<Project>>('/projects')
      .then(r => { setItems(r.data); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Projects {items.length ? `(${items.length})` : ''}</h2>
        <button className="btn" onClick={() => setModalOpen(true)}>+ New project</button>
      </div>

      {error && <div className="error">{error}</div>}

      {!error && !loading && !items.length && (
        <div className="empty">
          No projects yet. Click <strong>+ New project</strong> to create one.
        </div>
      )}

      {!!items.length && (
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
      )}

      <ProjectFormModal
        open={modalOpen}
        initial={null}
        onClose={() => setModalOpen(false)}
        onSaved={(created) => {
          reload();
          onSelect(created.id);
        }}
      />
    </div>
  );
}
