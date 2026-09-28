export default function TopNav() {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <div className="nav-left">
          <a className="brand" href="#top" aria-label="Fockis home">
            <span className="brand-mark" aria-hidden="true">F</span>
            <span className="brand-name">FOCKIS</span>
          </a>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="#top">Home</a>
            <span className="sep">/</span>
            <span className="current">Fockis Create</span>
          </nav>
        </div>
        <div className="nav-actions">
          <a href="#tools" className="btn btn-secondary btn-sm">Scan a Document</a>
          <a href="#create-tools" className="btn btn-primary btn-sm">Create Something</a>
        </div>
      </div>
    </header>
  );
}
