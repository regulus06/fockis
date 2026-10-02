import { Link } from 'react-router-dom';
import { NetworkMotif } from './icons';

export default function PageHero({ crumb, title, subtitle }: { crumb: string; title: string; subtitle: string }) {
  return (
    <section className="page-hero">
      <NetworkMotif />
      <div className="wrap">
        <div className="breadcrumb">
          <Link to="/academy">Home</Link> <span>/</span> <span>{crumb}</span>
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}
