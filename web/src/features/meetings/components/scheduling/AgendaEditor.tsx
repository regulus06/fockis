import { useState } from "react";
import { Plus, X, GripVertical } from "lucide-react";
import type { MeetingAgendaItem } from "../../types";
import "../../styles/components/scheduling.scss";

export function AgendaEditor({
  items,
  onChange,
}: {
  items: MeetingAgendaItem[];
  onChange: (items: MeetingAgendaItem[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const title = draft.trim();

    if (!title) {
      return;
    }

    const newItem: MeetingAgendaItem = {
      id: `agenda-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      order: items.length + 1,
      title,
    };

    onChange([...items, newItem]);
    setDraft("");
  };

  const removeItem = (id: string) => {
    onChange(
      items
        .filter((item) => item.id !== id)
        .map((item, index) => ({
          ...item,
          order: index + 1,
        })),
    );
  };

  return (
    <div className="fm-agenda">
      <span className="fm-field__label">
        Meeting agenda
      </span>

      <ol className="fm-agenda__list">
        {items.map((item, index) => {
          /*
           * Backend records may not have an id.
           * Always provide React with a stable fallback key.
           */
          const itemKey =
            item.id ||
            `agenda-item-${index}-${item.title}`;

          return (
            <li
              key={itemKey}
              className="fm-agenda__item"
            >
              <GripVertical
                size={14}
                className="fm-agenda__grip"
              />

              <span className="fm-agenda__index">
                {index + 1}
              </span>

              <span className="fm-agenda__title">
                {item.title}
              </span>

              <button
                type="button"
                className="fm-agenda__remove"
                aria-label={`Remove ${item.title}`}
                onClick={() => {
                  if (item.id) {
                    removeItem(item.id);
                    return;
                  }

                  onChange(
                    items.filter(
                      (_, itemIndex) =>
                        itemIndex !== index,
                    ),
                  );
                }}
              >
                <X size={14} />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="fm-agenda__add">
        <input
          className="fm-input"
          placeholder="Add agenda item"
          value={draft}
          onChange={(e) =>
            setDraft(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />

        <button
          type="button"
          className="fm-agenda__add-btn"
          onClick={addItem}
        >
          <Plus size={15} />
          Add agenda item
        </button>
      </div>
    </div>
  );
}

export default AgendaEditor;