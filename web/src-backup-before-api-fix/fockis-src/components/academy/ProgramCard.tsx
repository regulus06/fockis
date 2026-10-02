import { Link } from 'react-router-dom';
import { Program } from '../../types/academy';
import { ProgramIcon } from './icons';

export default function ProgramCard({ program, onClick }: { program: Program; onClick?: () => void }) {
  return (
    <div className="card prog-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="thumb">
        <ProgramIcon icon={program.icon} />
      </div>
      <div className="body">
        <div className="prog-meta">
          <span className="badge badge-navy">{program.level}</span>
        </div>
        <h3>{program.name}</h3>
        <p>{program.desc}</p>
        <Link
          className="btn btn-outline btn-sm"
          to={`/academy/programs?program=${program.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          Explore Program
        </Link>
      </div>
    </div>
  );
}
