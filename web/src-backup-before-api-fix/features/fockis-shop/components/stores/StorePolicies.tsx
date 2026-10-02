import type { Store } from '../../types/store.types';

export function StorePolicies({ store }: { store: Store }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Returns', value: store.policies.returns },
    { label: 'Refunds', value: store.policies.refunds },
    { label: 'Cancellations', value: store.policies.cancellations },
    { label: 'Shipping', value: store.policies.shipping },
    { label: 'Customer support', value: store.policies.customerSupport },
  ];

  return (
    <div className="store-page-policies">
      <h3>Store policies</h3>
      <div className="intl-example">
        {rows.map((row) => (
          <div className="row" key={row.label}>
            <span className="lbl">{row.label}</span>
            <span className="val" style={{ textAlign: 'right', maxWidth: '65%' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
