import { Link } from 'react-router-dom';

import MusicCreateReleaseHeader from './MusicCreateReleaseHeader';
import MusicCreateReleaseAlert from './MusicCreateReleaseAlert';
import MusicCreateReleaseProgress from './MusicCreateReleaseProgress';

import MusicCreateReleaseContentMode from './MusicCreateReleaseContentMode';
import MusicCreateReleaseContentType from './MusicCreateReleaseContentType';
import MusicCreateReleaseInformation from './MusicCreateReleaseInformation';

import MusicCreateReleaseSeriesEpisodes from './MusicCreateReleaseSeriesEpisodes';
import MusicCreateReleaseSingleMedia from './MusicCreateReleaseSingleMedia';
import MusicCreateReleaseSeriesArtwork from './MusicCreateReleaseSeriesArtwork';

import MusicCreateReleaseAccess from './MusicCreateReleaseAccess';
import MusicCreateReleaseSeriesRelease from './MusicCreateReleaseSeriesRelease';
import MusicCreateReleasePublishing from './MusicCreateReleasePublishing';

import MusicCreateReleaseSidebar from './MusicCreateReleaseSidebar';
import MusicCreateReleaseFooter from './MusicCreateReleaseFooter';

/*
 * IMPORTANT:
 * This guarantees the Create Release stylesheet is loaded
 * whenever this view is rendered.
 */
import '../../styles/MusicCreateRelease.scss';

export default function MusicCreateReleaseView() {
  return (
    <main className="music-create-page">
      <div className="music-create-shell">

        {/* Producer navigation */}
        <nav
          className="music-create-navigation"
          aria-label="Producer navigation"
        >
          <Link
            to="/music/producer/dashboard"
            className="music-create-navigation__back"
          >
            ← Back to Producer Studio
          </Link>

          <Link
            to="/music/become-producer"
            className="music-create-navigation__profile"
          >
            ◎ Producer Profile
          </Link>
        </nav>

        <MusicCreateReleaseHeader />

        <MusicCreateReleaseAlert />

        <MusicCreateReleaseProgress />

        <form
          className="music-create-layout"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <div className="music-create-main">
            <MusicCreateReleaseContentMode />

            <MusicCreateReleaseContentType />

            <MusicCreateReleaseInformation />

            <MusicCreateReleaseSeriesEpisodes />

            <MusicCreateReleaseSingleMedia />

            <MusicCreateReleaseSeriesArtwork />

            <MusicCreateReleaseAccess />

            <MusicCreateReleaseSeriesRelease />

            <MusicCreateReleasePublishing />
          </div>

          <MusicCreateReleaseSidebar />

          <MusicCreateReleaseFooter />
        </form>
      </div>
    </main>
  );
}