import { useMemo } from "react";

import { qrMatrix, qrSvgPath } from "../../organizations/badges/qr";

/** QR ticket drawn locally from the signed ticket code (no image service). */
export default function TicketQr({ code, size = 180, label = "Ticket QR code" }: { code: string; size?: number; label?: string }) {
  const svg = useMemo(() => {
    try {
      const matrix = qrMatrix(code);
      return { path: qrSvgPath(matrix, 2), n: matrix.length + 4 };
    } catch {
      return null;
    }
  }, [code]);

  if (!svg) return null;

  return (
    <svg className="fkr-qr" role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${svg.n} ${svg.n}`} shapeRendering="crispEdges">
      <rect width={svg.n} height={svg.n} fill="#ffffff" />
      <path d={svg.path} fill="#0b1530" />
    </svg>
  );
}
