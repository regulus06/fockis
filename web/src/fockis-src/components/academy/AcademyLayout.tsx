import { useEffect, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import AcademyNavbar from './AcademyNavbar';
import AcademyFooter from './AcademyFooter';
import AcademyToast from './AcademyToast';
import '../../styles/academy.scss';
import '../../styles/academy-learn.scss';
import '../../styles/academy-market.scss';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&family=Cinzel:wght@600;700&family=Great+Vibes&family=Cormorant+Garamond:wght@500;700&display=swap';
const FONTS_LINK_ID = 'academy-fonts';

/**
 * Wraps every /academy/* route. Everything Academy-specific — nav, footer,
 * and the whole design-system stylesheet — lives inside this one
 * `.academy` wrapper div, so none of it leaks into the rest of the app
 * (which already has its own FockisNavigation / FockisTopBar / FockisSidebar).
 *
 * Loads its Google Fonts link on mount and removes it on unmount, so it
 * doesn't need react-helmet or a change to your public/index.html. If you'd
 * rather add it there permanently instead, delete this useEffect and add
 * the <link> from FONTS_HREF above to index.html's <head>.
 */
function useAcademyFonts() {
  useEffect(() => {
    if (document.getElementById(FONTS_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONTS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    document.head.appendChild(link);
    return () => {
      document.getElementById(FONTS_LINK_ID)?.remove();
    };
  }, []);
}

export default function AcademyLayout() {
  useAcademyFonts();

  return (
    <div className="academy">
      <AcademyNavbar />
      <main>
        <Outlet />
      </main>
      <AcademyFooter />
      <AcademyToast />
    </div>
  );
}

/**
 * Full-page Academy screens that bring their own chrome (dashboard sidebar,
 * builder header): fonts + styles + toast, without the public navbar/footer.
 */
export function AcademyFullPage({ children }: { children: ReactNode }) {
  useAcademyFonts();
  return (
    <div className="academy academy-full">
      {children}
      <AcademyToast />
    </div>
  );
}
