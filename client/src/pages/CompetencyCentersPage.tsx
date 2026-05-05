import React, { useEffect, useState } from 'react';
import { api, JsonApiList } from '../api';

interface CC {
  code: string; label: string; level: string;
  parent_id: number | null; is_interim: boolean;
  manager_last_name: string | null; manager_first_name: string | null;
  display_order: number;
}

interface TreeNode { cc: CC; children: TreeNode[]; }

function buildTree(items: { id: string; attributes: CC }[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  items.forEach(it => byId.set(Number(it.id), { cc: it.attributes, children: [] }));
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
  const { cc } = node;
  const mgr = cc.manager_last_name
    ? `${cc.manager_first_name || ''} ${cc.manager_last_name}${cc.is_interim ? ' (a.i.)' : ''}`
    : null;
  return (
    <div className="tree-node">
      <span className="badge">{cc.level}</span> <strong>{cc.label}</strong>{' '}
      <span className="muted">({cc.code})</span>
      {mgr && <span> — manager: <strong>{mgr.trim()}</strong></span>}
      {node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map(c => <NodeView key={c.cc.code} node={c} />)}
        </div>
      )}
    </div>
  );
}

export function CompetencyCentersPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<JsonApiList<CC>>('/competency-centers')
      .then(r => { setTree(buildTree(r.data)); setCount(r.data.length); })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2>Competency Centers ({count})</h2>
      <div className="card">{tree.map(n => <NodeView key={n.cc.code} node={n} />)}</div>
    </div>
  );
}
