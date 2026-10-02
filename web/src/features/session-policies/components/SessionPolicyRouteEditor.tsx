import React from 'react';

interface Props {
  routes: string[];
  onChange: (routes: string[]) => void;
}

export default function SessionPolicyRouteEditor({
  routes,
  onChange,
}: Props) {
  function update(index: number, value: string) {
    const next = [...routes];
    next[index] = value;
    onChange(next);
  }

  function add() {
    onChange([...routes, '']);
  }

  function remove(index: number) {
    onChange(routes.filter((_, i) => i !== index));
  }

  return (
    <div className="session-policy-route-editor">
      <div className="session-policy-route-editor__header">
        <div>
          <strong>Route patterns</strong>
          <span>Use /area/** for an entire area.</span>
        </div>
        <button type="button" onClick={add}>
          Add route
        </button>
      </div>

      {routes.map((route, index) => (
        <div className="session-policy-route-editor__row" key={`${index}-${route}`}>
          <input
            value={route}
            onChange={(e) => update(index, e.target.value)}
            placeholder="/academy/**"
          />
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}

      {!routes.length && <p>No route patterns configured.</p>}
    </div>
  );
}
