import { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";

import IconSprite from "../components/IconSprite";
import TopNav from "../components/TopNav";
import Hero from "../components/Hero";
import ToolsSection from "../components/ToolsSection";
import CreateToolsSection from "../components/CreateToolsSection";
import FeaturedBanner from "../components/FeaturedBanner";
import TemplateLibrary from "../components/TemplateLibrary";
import RecentDocuments from "../components/RecentDocuments";
import Footer from "../components/Footer";
import useReveal from "../hooks/useReveal";

import "../styles/FockisCreatePage.scss";

export default function FockisCreatePage() {
  const navigate = useNavigate();

  useReveal();

  const handleCreateNavigation = (
    event: MouseEvent<HTMLElement>,
  ) => {
    const target = event.target as HTMLElement;

    const link = target.closest(
      "a, button",
    ) as HTMLElement | null;

    if (!link) {
      return;
    }

    const text =
      link.textContent
        ?.replace(/\s+/g, " ")
        .trim()
        .toLowerCase() || "";

    const href =
      link.getAttribute("href") || "";

    /*
     * ------------------------------------------------------------
     * REAL HASH / EMPTY LINKS
     * ------------------------------------------------------------
     */

    if (
      href === "#" ||
      href === "" ||
      href === "#top" ||
      href === "#tools" ||
      href === "#templates" ||
      href === "#create-tools"
    ) {
      event.preventDefault();
    }

    /*
     * ------------------------------------------------------------
     * HERO
     * ------------------------------------------------------------
     */

    if (
      text.includes("create something") ||
      text.includes("start from scratch")
    ) {
      event.preventDefault();

      navigate(
        "/create/documents/new?type=document",
      );

      return;
    }

    if (
      text.includes("scan a document") ||
      text.includes("scan your first document") ||
      text.includes("scan document")
    ) {
      event.preventDefault();

      navigate("/create/scanner");

      return;
    }

    /*
     * ------------------------------------------------------------
     * DOCUMENT TOOLS
     * ------------------------------------------------------------
     */

    if (
      text.includes("passport") ||
      text.includes("id photo")
    ) {
      event.preventDefault();

      navigate("/create/passport-photo");

      return;
    }

    if (
      text.includes("remove background")
    ) {
      event.preventDefault();

      navigate("/create/background-remover");

      return;
    }

    if (
      text.includes("handwriting")
    ) {
      event.preventDefault();

      navigate("/create/handwriting-to-text");

      return;
    }

    if (
      text.includes("pdf scanner") ||
      text.includes("pdf")
    ) {
      event.preventDefault();

      navigate("/create/pdf");

      return;
    }

    /*
     * ------------------------------------------------------------
     * DESIGN TOOLS
     * ------------------------------------------------------------
     */

    const designRoutes: Array<
      [string, string]
    > = [
      [
        "logo maker",
        "logo",
      ],
      [
        "flyer maker",
        "flyer",
      ],
      [
        "banner maker",
        "banner",
      ],
      [
        "badge maker",
        "badge",
      ],
      [
        "business card",
        "business-card",
      ],
      [
        "poster maker",
        "poster",
      ],
      [
        "invitation maker",
        "invitation",
      ],
      [
        "certificate maker",
        "certificate",
      ],
      [
        "social media post",
        "social-media",
      ],
      [
        "menu maker",
        "menu",
      ],
      [
        "letterhead",
        "letterhead",
      ],
      [
        "brochure maker",
        "brochure",
      ],
    ];

    for (const [label, type] of designRoutes) {
      if (text.includes(label)) {
        event.preventDefault();

        navigate(
          `/create/documents/new?type=${type}`,
        );

        return;
      }
    }

    /*
     * ------------------------------------------------------------
     * TEMPLATE LINKS
     * ------------------------------------------------------------
     */

    if (
      text.includes("use template") ||
      text.includes("browse templates") ||
      text.includes("explore all templates") ||
      text.includes("view all")
    ) {
      event.preventDefault();

      navigate("/create/templates");

      return;
    }

    /*
     * ------------------------------------------------------------
     * ANCHOR SECTIONS
     * ------------------------------------------------------------
     *
     * If a real section link exists, allow normal browser
     * scrolling instead of treating it as a tool.
     */

    if (href === "#tools") {
      document
        .getElementById("tools")
        ?.scrollIntoView({
          behavior: "smooth",
        });

      return;
    }

    if (href === "#templates") {
      document
        .getElementById("templates")
        ?.scrollIntoView({
          behavior: "smooth",
        });

      return;
    }

    if (href === "#create-tools") {
      document
        .getElementById("create-tools")
        ?.scrollIntoView({
          behavior: "smooth",
        });

      return;
    }

    if (href === "#top") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className="fockis-create-page"
      onClick={handleCreateNavigation}
    >
      <IconSprite />

      <TopNav />

      <Hero />

      <ToolsSection />

      <CreateToolsSection />

      <FeaturedBanner />

      <TemplateLibrary />

      <RecentDocuments />

      <Footer />
    </div>
  );
}