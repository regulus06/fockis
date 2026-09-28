import {
  useEffect,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

export default function BuyCoinsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(
      "/checkout",
      {
        replace: true,
        state: {
          type: "coins",
        },
      },
    );
  }, [navigate]);

  return (
    <div
      className="buy-coins-page"
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div
        className="buy-coins-loading"
        style={{
          maxWidth: "420px",
          width: "100%",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            lineHeight: 1,
            marginBottom: "16px",
          }}
          aria-hidden="true"
        >
          🪙
        </div>

        <h2>
          Opening secure checkout...
        </h2>

        <p>
          Preparing your Fockis Coin
          purchase.
        </p>
      </div>
    </div>
  );
}