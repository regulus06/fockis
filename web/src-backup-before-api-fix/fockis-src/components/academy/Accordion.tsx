import { useState } from 'react';

export interface AccordionEntry {
  q: string;
  a: string;
}

export default function Accordion({ items }: { items: AccordionEntry[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div>
      {items.map((item, i) => (
        <div className={`accordion-item${openIndex === i ? ' open' : ''}`} key={item.q}>
          <button className="accordion-head" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
            {item.q}
            <span className="chevron">▾</span>
          </button>
          <div className="accordion-body">
            <div className="accordion-body-inner">{item.a}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
