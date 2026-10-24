
import FockisMark from "../../components/fockis/FockisMark";export default function Footer() {
  return (
    <footer>
      <div className="wrap footer-inner">
        <div className="brand">
          <span className="brand-mark sm" aria-hidden="true"><FockisMark /></span>
          <span className="brand-name sm">FOCKIS</span>
        </div>
        <p>Design-model preview · not the production page</p>
      </div>
    </footer>
  );
}
