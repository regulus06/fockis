import React, { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

/*
 * Fockis Website Studio routes (lazy-loaded so the main app bundle is unaffected).
 *
 * Mounted in App.tsx as:
 *   <Route path="/website-studio/*" element={<WebsiteStudioRoutes />} />
 *   <Route path="/s/:siteSlug/*" element={<PublicWebsiteRoute />} />
 */

const WebsiteStudioHome = lazy(() => import("../pages/WebsiteStudioHome"));
const TemplateMarketplace = lazy(() => import("../pages/TemplateMarketplace"));
const TemplatePreview = lazy(() => import("../pages/TemplatePreview"));
const TemplateCompare = lazy(() => import("../pages/TemplatePreview").then((m) => ({ default: m.TemplateCompare })));
const BuildWithAI = lazy(() => import("../pages/BuildWithAI"));
const MyWebsites = lazy(() => import("../pages/MyWebsites"));
const WebsiteEditor = lazy(() => import("../pages/WebsiteEditor"));
const WebsiteSettings = lazy(() => import("../pages/WebsiteSettings"));
const WebsitePreview = lazy(() => import("../pages/PublicWebsite").then((m) => ({ default: m.WebsitePreview })));
const AdminWebsiteStudio = lazy(() => import("../pages/AdminWebsiteStudio"));
const PublicWebsite = lazy(() => import("../pages/PublicWebsite"));
const HostedWebsite = lazy(() => import("../pages/PublicWebsite").then((m) => ({ default: m.HostedWebsite })));

function Loading() {
  return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: "#888", fontFamily: "system-ui, sans-serif" }}>Loading…</div>;
}

export function WebsiteStudioRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<WebsiteStudioHome />} />
        <Route path="templates" element={<TemplateMarketplace />} />
        <Route path="templates/compare" element={<TemplateCompare />} />
        <Route path="templates/:slug" element={<TemplatePreview />} />
        <Route path="ai" element={<BuildWithAI />} />
        <Route path="my-websites" element={<MyWebsites />} />
        <Route path="editor/:websiteId" element={<WebsiteEditor mode="website" />} />
        <Route path="preview/:websiteId" element={<WebsitePreview />} />
        <Route path="websites/:websiteId/settings" element={<WebsiteSettings />} />
        <Route path="admin" element={<AdminWebsiteStudio />} />
        <Route path="admin/templates/:templateId/edit" element={<WebsiteEditor mode="template" />} />
        <Route path="*" element={<WebsiteStudioHome />} />
      </Routes>
    </Suspense>
  );
}

export function PublicWebsiteRoute() {
  return (
    <Suspense fallback={null}>
      <PublicWebsite />
    </Suspense>
  );
}

/** Renders a published customer website when the app is opened on its subdomain / custom domain. */
export function HostedWebsiteRoute() {
  return (
    <Suspense fallback={null}>
      <HostedWebsite />
    </Suspense>
  );
}

export { isWebsiteStudioHost } from "./hostDetection";
export default WebsiteStudioRoutes;
