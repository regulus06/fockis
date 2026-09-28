import { FacultyMember } from '../../types/academy';
import { useAcademyToast } from '../../lib/academyToastStore';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('');
}

export default function FacultyGrid({ faculty }: { faculty: FacultyMember[] }) {
  const showToast = useAcademyToast((s) => s.showToast);

  return (
    <div className="grid grid-3">
      {faculty.map((f) => (
        <div className="card faculty-card" key={f.name}>
          <div className="faculty-photo">{initials(f.name)}</div>
          <h3 style={{ fontSize: 15.5 }}>{f.name}</h3>
          <p style={{ fontSize: 13.5, marginTop: 4 }}>{f.pos}</p>
          <p style={{ fontSize: 13, marginTop: 2 }}>{f.dept}</p>
          <span className="badge badge-gold" style={{ marginTop: 10, display: 'inline-block' }}>{f.tag}</span>
          <div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => showToast(`Opening profile: ${f.name}`)}>
              View Profile
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
