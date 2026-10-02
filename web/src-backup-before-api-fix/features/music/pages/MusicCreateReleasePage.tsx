import '../styles/MusicCreateRelease.scss';

import { MusicCreateReleaseProvider } from '../context/MusicCreateReleaseContext';

import MusicCreateReleaseView from '../components/create-release/MusicCreateReleaseView';

export default function MusicCreateReleasePage() {
  return (
    <MusicCreateReleaseProvider>
      <MusicCreateReleaseView />
    </MusicCreateReleaseProvider>
  );
}