import { useNavigate } from "react-router-dom";

import EventCreateForm from "../components/EventCreateForm";
import EventsShell from "../components/EventsShell";
import { eventsApi } from "../services/eventsApi";

export default function CreateEventPage() {
  const navigate = useNavigate();

  return (
    <EventsShell hideTabs>
      <div className="fke-editor">
        <EventCreateForm
          mode="create"
          submitLabel="Create event"
          onCancel={() => navigate(-1)}
          onSubmit={async (values) => {
            const created = await eventsApi.create(values);

            navigate(`/events/${created.id}`, { replace: true });
          }}
        />
      </div>
    </EventsShell>
  );
}
