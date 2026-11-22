/**
 * NewsRoutes.tsx — every Fockis News & Media page, lazy-loaded so the main
 * app bundle is unaffected. Mounted in App.tsx as:
 *   <Route path="/news/*" element={<NewsRoutes />} />
 */

import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

const NewsHomePage = lazy(() => import("./NewsHomePage"));
const NewsListPage = lazy(() => import("./NewsListPage"));
const MediaDirectoryPage = lazy(() => import("./MediaDirectoryPage"));
const MediaProfilePage = lazy(() => import("./MediaProfilePage"));
const ArticlePage = lazy(() => import("./ArticlePage"));
const SupportMediaPage = lazy(() => import("./SupportMediaPage"));
const ContactMediaPage = lazy(() => import("./ContactMediaPage"));
const CreateMediaWizard = lazy(() => import("./CreateMediaWizard"));
const RequestTrackingPage = lazy(() => import("./ReaderPages").then((m) => ({ default: m.RequestTrackingPage })));
const MySupportPage = lazy(() => import("./ReaderPages").then((m) => ({ default: m.MySupportPage })));

const AdminShell = lazy(() => import("./admin/AdminShell"));
const MyOutletsPage = lazy(() => import("./admin/AdminDashboard").then((m) => ({ default: m.MyOutletsPage })));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const ArticlesPage = lazy(() => import("./admin/AdminArticles").then((m) => ({ default: m.ArticlesPage })));
const ArticleEditor = lazy(() => import("./admin/AdminArticles").then((m) => ({ default: m.ArticleEditor })));
const TeamPage = lazy(() => import("./admin/AdminTeam").then((m) => ({ default: m.TeamPage })));
const VideosPage = lazy(() => import("./admin/AdminBroadcast").then((m) => ({ default: m.VideosPage })));
const PodcastsPage = lazy(() => import("./admin/AdminBroadcast").then((m) => ({ default: m.PodcastsPage })));
const LiveTvPage = lazy(() => import("./admin/AdminBroadcast").then((m) => ({ default: m.LiveTvPage })));
const RadioPage = lazy(() => import("./admin/AdminBroadcast").then((m) => ({ default: m.RadioPage })));
const MediaLibraryPage = lazy(() => import("./admin/AdminBroadcast").then((m) => ({ default: m.MediaLibraryPage })));
const DonationsPage = lazy(() => import("./admin/AdminSupport").then((m) => ({ default: m.DonationsPage })));
const RequestsPage = lazy(() => import("./admin/AdminSupport").then((m) => ({ default: m.RequestsPage })));
const CategoriesPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.CategoriesPage })));
const SubscribersPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.SubscribersPage })));
const CommentsPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.CommentsPage })));
const AnalyticsPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.AnalyticsPage })));
const AdsPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.AdsPage })));
const SeoPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.SeoPage })));
const WebsiteDesignPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.WebsiteDesignPage })));
const DomainsPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.DomainsPage })));
const SettingsPage = lazy(() => import("./admin/AdminSite").then((m) => ({ default: m.SettingsPage })));

function Loading() {
  return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#7a8599", fontFamily: "system-ui, sans-serif" }}>Loading…</div>;
}

export default function NewsRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<NewsHomePage />} />
        <Route path="latest" element={<NewsListPage mode="latest" />} />
        <Route path="breaking" element={<NewsListPage mode="breaking" />} />
        <Route path="trending" element={<NewsListPage mode="trending" />} />
        <Route path="category/:category" element={<NewsListPage mode="category" />} />
        <Route path="videos" element={<NewsListPage mode="videos" />} />
        <Route path="live" element={<NewsListPage mode="live" />} />
        <Route path="radio" element={<NewsListPage mode="radio" />} />
        <Route path="podcasts" element={<NewsListPage mode="podcasts" />} />
        <Route path="directory" element={<MediaDirectoryPage />} />
        <Route path="create" element={<CreateMediaWizard />} />
        <Route path="my-support" element={<MySupportPage />} />
        <Route path="requests/track" element={<RequestTrackingPage />} />

        <Route path="admin" element={<MyOutletsPage />} />
        <Route path="admin/:outletId" element={<AdminShell />}>
          <Route index element={<AdminDashboard />} />
          <Route path="articles" element={<ArticlesPage />} />
          <Route path="articles/new" element={<ArticleEditor />} />
          <Route path="articles/:articleId" element={<ArticleEditor />} />
          <Route path="breaking" element={<ArticlesPage preset="breaking" />} />
          <Route path="review" element={<ArticlesPage preset="review" />} />
          <Route path="scheduled" element={<ArticlesPage preset="scheduled" />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="journalists" element={<TeamPage filter="journalists" />} />
          <Route path="editors" element={<TeamPage filter="editors" />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="library" element={<MediaLibraryPage />} />
          <Route path="videos" element={<VideosPage />} />
          <Route path="live-tv" element={<LiveTvPage />} />
          <Route path="radio" element={<RadioPage />} />
          <Route path="podcasts" element={<PodcastsPage />} />
          <Route path="ads" element={<AdsPage />} />
          <Route path="subscribers" element={<SubscribersPage />} />
          <Route path="comments" element={<CommentsPage />} />
          <Route path="donations" element={<DonationsPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="seo" element={<SeoPage />} />
          <Route path="website" element={<WebsiteDesignPage />} />
          <Route path="domains" element={<DomainsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<AdminDashboard />} />
        </Route>

        <Route path=":slug" element={<MediaProfilePage />} />
        <Route path=":slug/support" element={<SupportMediaPage />} />
        <Route path=":slug/contact" element={<ContactMediaPage />} />
        <Route path=":slug/:articleSlug" element={<ArticlePage />} />
      </Routes>
    </Suspense>
  );
}
