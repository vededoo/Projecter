import React, { useState } from 'react';

export interface SortablePersonItem {
  id: string;
  name: React.ReactNode;
  role?: React.ReactNode;
  context?: React.ReactNode;
  actions?: React.ReactNode;
}

interface Props {
  items: SortablePersonItem[];
  onReorder: (newIds: string[]) => void;
  headers?: { name?: string; role?: string; context?: string };
}

export function SortablePersonList({ items, onReorder, headers }: Props) {
  const [dragSrc, setDragSrc]   = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!dragSrc || dragSrc === targetId) return;
    const ids = items.map(i => i.id);
    const srcIdx = ids.indexOf(dragSrc);
    const dstIdx = ids.indexOf(targetId);
    if (srcIdx === -1 || dstIdx === -1) return;
    const newIds = [...ids];
    newIds.splice(srcIdx, 1);
    newIds.splice(dstIdx, 0, dragSrc);
    setDragSrc(null);
    setDragOver(null);
    onReorder(newIds);
  };

  const showRole    = items.some(i => i.role    !== undefined);
  const showContext = items.some(i => i.context !== undefined);
  const showActions = items.some(i => i.actions !== undefined);

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      {headers && (
        <thead>
          <tr>
            <th style={{ width: 28 }} />
            <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: 6, paddingLeft: 8 }}>
              {headers.name ?? 'Name'}
            </th>
            {showRole && (
              <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: 6, paddingLeft: 8 }}>
                {headers.role ?? 'Role'}
              </th>
            )}
            {showContext && (
              <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: 6, paddingLeft: 8 }}>
                {headers.context ?? ''}
              </th>
            )}
            {showActions && <th style={{ width: 80 }} />}
          </tr>
        </thead>
      )}
      <tbody>
        {items.map(item => (
          <tr
            key={item.id}
            draggable
            onDragStart={() => setDragSrc(item.id)}
            onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
            onDragOver={e => { e.preventDefault(); setDragOver(item.id); }}
            onDrop={e => { e.preventDefault(); handleDrop(item.id); }}
            style={{
              borderBottom: '1px solid var(--border)',
              background: dragOver === item.id && dragSrc !== item.id ? 'var(--panel-2)' : undefined,
              opacity: dragSrc === item.id ? 0.5 : 1,
              transition: 'background 0.1s, opacity 0.1s',
            }}
          >
            <td
              style={{ width: 28, color: 'var(--muted)', textAlign: 'center', cursor: 'grab', userSelect: 'none', fontSize: 18, padding: '8px 0' }}
              title="Drag to reorder"
            >⠿</td>
            <td style={{ padding: '8px 8px' }}>{item.name}</td>
            {showRole    && <td style={{ padding: '8px 8px' }}>{item.role}</td>}
            {showContext && <td style={{ padding: '8px 8px', color: 'var(--muted)', fontSize: 12 }}>{item.context}</td>}
            {showActions && <td style={{ padding: '8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{item.actions}</td>}
          </tr>
        ))}
        {items.length === 0 && (
          <tr>
            <td colSpan={5} style={{ padding: '12px 8px', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13, textAlign: 'center' }}>
              No items
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
