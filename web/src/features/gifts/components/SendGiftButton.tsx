import React from "react";

interface Props {
  onClick: () => void;
  disabled?: boolean;
}

export default function SendGiftButton({
  onClick,
  disabled = false,
}: Props) {
  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) {
      return;
    }

    console.log("[SendGiftButton] Opening gift modal");

    onClick();
  };

  return (
    <button
      type="button"
      className="open-gift-button"
      onClick={handleClick}
      disabled={disabled}
      aria-label="Open gifts"
      aria-haspopup="dialog"
    >
      <span
        className="open-gift-icon"
        aria-hidden="true"
      >
        🎁
      </span>

      <span className="open-gift-label">
        Gift
      </span>
    </button>
  );
}