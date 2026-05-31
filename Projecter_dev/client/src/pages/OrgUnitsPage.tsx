import React, { useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';

interface OrgUnit {
  organization_id: number;
  parent_id: number | null;
  code: string;
  label: string;
  level_label: string | null;
  depth: number;
  path: string | null;
  is_interim: boolean;
  manager_last_name: string | null;
  manager_first_name: string | null;
  organization_name: string | null;
  display_order: number;
}

interface TreeNode { id: number; unit: OrgUnit; children: TreeNode[]; }

function buildTree(items: { id: string; attributes: OrgUnit }[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  items.forEach(it => byId.set(Number(it.id), { id: Number(it.id), unit: it.attributes, children: [] }));
  const roots: TreeNode[] = [];
  items.forEach(it => {
    const node = byId.get(Number(it.id))!;
    if (it.attributes.parent_id) {
      const parent = byId.get(it.attributes.parent_id);
      (parent ? parent.children : roots).push(node);
    } else roots.push(node);
  });
  return roots;
}

function NodeView({ node }: { node: TreeNode }) {
  const { unit } = node;
  const mgr = unit.manager_last_name
    ? `${unit.manager_first_name || ''} ${unit.manager_last_name}${unit.is_interim ? ' (a.i.)' : ''}`
    : null;
  return (
    <div className="tree-node">
      {unit.level_label && <span className="badge">{unit.level_label}</span>}{' '}
      <strong>{unit.label}</strong>{' '}
      <span className="muted">({unit.code})</span>
      {mgr && <span> — manager: <strong>{mgr.trim()}</strong></span>}
      {node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map(c => <NodeView key={c.id} node={c} />)}
        </div>
      )}
    </div>
  );
}

export function OrgUnitsPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<JsonApiList<OrgUnit>>('/org-units')
      .then(r => { setTree(buildTree(r.data)); setCount(r.data.length); })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Organization ({count} units)</h2>
      <div className="card">{tree.map(n => <NodeView key={n.id} node={n} />)}</div>
    </div>
  );
}
