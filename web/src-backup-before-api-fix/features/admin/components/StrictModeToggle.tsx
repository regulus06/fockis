import { useState } from "react";

export default function StrictModeToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <button onClick={() => setEnabled(!enabled)}>
      Strict Mode: {enabled ? "ON" : "OFF"}
    </button>
  );
}