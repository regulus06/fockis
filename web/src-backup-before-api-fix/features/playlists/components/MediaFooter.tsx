import { Link } from 'react-router-dom';

/**
 * New component (not in the original file list): consistent footer for the
 * marketplace section of the site, factored out for the same reason as
 * MediaMasthead — shared across every page in this feature.
 */
export function MediaFooter() {
  return (
    <footer className="fk-footer">
      <div className="fk-container">
        <div className="fk-footer__grid">
          <div>
            <div className="fk-footer__heading">Discover</div>
            <Link className="fk-footer__link" to="/media/music">Music</Link>
            <Link className="fk-footer__link" to="/media/videos">Videos</Link>
            <Link className="fk-footer__link" to="/media/premium">Premium</Link>
            <Link className="fk-footer__link" to="/media/producers">Producers</Link>
          </div>
          <div>
            <div className="fk-footer__heading">Creators</div>
            <Link className="fk-footer__link" to="/media/my-playlists">Creator Dashboard</Link>
            <Link className="fk-footer__link" to="/media/my-playlists">Publish a Playlist</Link>
            <Link className="fk-footer__link" to="/media/producers">Producer Directory</Link>
          </div>
          <div>
            <div className="fk-footer__heading">Your Account</div>
            <Link className="fk-footer__link" to="/media/library">My Library</Link>
            <Link className="fk-footer__link" to="/media/favorites">Favorites</Link>
          </div>
          <div>
            <div className="fk-footer__heading">Fockis</div>
            <Link className="fk-footer__link" to="/about">About</Link>
            <Link className="fk-footer__link" to="/support">Support</Link>
          </div>
        </div>
        <div className="fk-footer__base">
          <span>&copy; {new Date().getFullYear()} Fockis. All rights reserved.</span>
          <span>Fockis Media Marketplace</span>
        </div>
      </div>
    </footer>
  );
}