import { MediaLibrary } from "../components/MediaLibrary";
import { PageHeader } from "../components/ui/Layout";
import { Notice } from "../components/ui/Feedback";
import { useMailchimp } from "../hooks/useMailchimp";

export default function ContentPage() {
  const { isMock } = useMailchimp();
  return (
    <div className="fm-page">
      <PageHeader title="Content" description="Images, video, logos, and documents for your emails and pages." />
      {isMock && <Notice>In demo mode, uploads stay in this browser tab and disappear on reload. Connect the backend to store them with the Fockis upload service.</Notice>}
      <MediaLibrary />
    </div>
  );
}
