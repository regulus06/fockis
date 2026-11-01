import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function CreateEventCard() {
  return (
    <section className="fkd-card fkd-create">
      <Link to="/events/create" className="fkd-create__btn">
        <PlusCircle size={28} strokeWidth={2} aria-hidden="true" />
        Create Event
      </Link>
      <p>Post and promote your event on Fockis.</p>
    </section>
  );
}
