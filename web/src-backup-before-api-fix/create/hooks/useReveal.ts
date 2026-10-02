import { useEffect, type DependencyList } from 'react';

/**
 * Adds the `.in` class to any `.reveal` element once it scrolls into view,
 * mirroring the fade-in-on-scroll behaviour of the original static page.
 */
export default function useReveal(deps: DependencyList = []): void {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('.reveal');

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => obs.observe(el));

    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
