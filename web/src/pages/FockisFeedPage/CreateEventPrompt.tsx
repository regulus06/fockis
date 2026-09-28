interface CreateEventPromptProps {
  onCreate: () => void;
}

export default function CreateEventPrompt({
  onCreate,
}: CreateEventPromptProps) {
  return (
    <section
      className="fk-create-event-prompt"
      aria-label="Create an event"
    >
      <div className="fk-create-event-prompt__icon">
        📅
      </div>

      <div className="fk-create-event-prompt__content">
        <h3>No events yet</h3>

        <p>
          Create an event and invite your
          friends, followers, and community.
        </p>
      </div>

      <button
        type="button"
        className="fk-create-event-prompt__button"
        onClick={onCreate}
      >
        <span aria-hidden="true">
          +
        </span>

        Create Event
      </button>
    </section>
  );
}