.fk-events-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: clamp(20px, 4vw, 40px) 20px 80px;
  background: radial-gradient(circle at top left, rgba(255, 153, 0, .08), transparent 35%), #f5f6f8;
  color: #151515;
}
.fk-events-container { width: min(1200px, 100%); margin: 0 auto; }
.fk-events-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.fk-events-eyebrow { display: block; margin-bottom: 8px; color: #b96a00; font-size: 12px; font-weight: 800; letter-spacing: .14em; }
.fk-events-header h1 { margin: 0; font-size: clamp(30px, 5vw, 46px); line-height: 1.08; }
.fk-events-header p { margin: 10px 0 0; color: #68707c; }
.fk-event-create-button { border: 0; border-radius: 12px; padding: 13px 20px; background: #ff9900; color: #111; font-weight: 800; cursor: pointer; }
.fk-event-create-button:hover { filter: brightness(.96); }
.fk-event-create-button:focus-visible, .fk-event-back:focus-visible, .fk-event-filters input:focus-visible, .fk-event-filters select:focus-visible { outline: 3px solid rgba(255,153,0,.4); outline-offset: 2px; }
.fk-event-back { margin-bottom: 12px; padding: 0; border: 0; background: transparent; color: #68707c; font-weight: 700; cursor: pointer; }
.fk-event-filters { display: grid; grid-template-columns: minmax(200px, 1fr) minmax(150px, 190px) minmax(140px, 170px); gap: 12px; margin-bottom: 24px; }
.fk-event-filters input, .fk-event-filters select, .fk-event-field input, .fk-event-field textarea, .fk-event-field select { width: 100%; min-width: 0; box-sizing: border-box; border: 1px solid #dfe3e8; border-radius: 12px; padding: 13px 14px; background: #fff; color: #151515; font: inherit; }
.fk-events-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.fk-event-card { min-width: 0; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #e2e5e9; border-radius: 18px; background: #fff; box-shadow: 0 8px 30px rgba(20,25,30,.06); }
.fk-event-card-open { display: block; width: 100%; padding: 0; border: 0; text-align: left; background: transparent; color: inherit; cursor: pointer; }
.fk-event-card-open:focus-visible { outline: 3px solid #ff9900; outline-offset: -3px; }
.fk-event-card-image { position: relative; height: 210px; background: #e9edf1; overflow: hidden; }
.fk-event-card-image img, .fk-event-card-image video { display: block; width: 100%; height: 100%; object-fit: cover; }
.fk-event-card-placeholder { display: grid; place-items: center; width: 100%; height: 100%; background: linear-gradient(135deg,#fff3e0,#ffe0b2); font-size: 52px; }
.fk-event-status { position: absolute; top: 12px; left: 12px; border-radius: 999px; padding: 6px 10px; background: rgba(255,255,255,.95); color: #343434; font-size: 12px; font-weight: 800; }
.fk-event-status.live { background: #fee2e2; color: #991b1b; }
.fk-event-status.cancelled { background: #f3f4f6; color: #4b5563; }
.fk-event-card-body { padding: 18px; }
.fk-event-category { margin-bottom: 8px; color: #9a5a00; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
.fk-event-card-body h3 { margin: 0 0 12px; font-size: 20px; line-height: 1.25; overflow-wrap: anywhere; }
.fk-event-card-description { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 3; -webkit-box-orient: vertical; color: #68707c; line-height: 1.5; }
.fk-event-date, .fk-event-location { margin-top: 9px; color: #4b5563; font-size: 14px; }
.fk-event-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding: 14px 18px 18px; border-top: 1px solid #f0f1f3; color: #68707c; font-size: 13px; }
.fk-event-rsvp { border: 1px solid #ff9900; border-radius: 999px; padding: 8px 13px; background: #ff9900; color: #111; font-weight: 800; cursor: pointer; white-space: nowrap; }
.fk-event-rsvp.going { background: #fff; color: #8a5000; }
.fk-event-rsvp:disabled { opacity: .65; cursor: wait; }
.fk-event-rsvp-wrap { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.fk-event-rsvp-error { max-width: 180px; color: #b91c1c; font-size: 12px; }
.fk-events-state { padding: 36px 20px; text-align: center; border: 1px solid #e5e7eb; border-radius: 16px; background: #fff; color: #4b5563; }
.fk-events-state h2 { color: #111827; }
.fk-events-state.error { color: #991b1b; }
.fk-events-empty-icon { font-size: 42px; }
.fk-event-date-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; }
.fk-event-field label { display: block; margin-bottom: 7px; font-weight: 700; }
.fk-event-field label span { color: #b91c1c; margin-left: 4px; }
@media (max-width: 900px) { .fk-events-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 640px) {
  .fk-events-page { padding: 20px 12px 60px; }
  .fk-events-header { align-items: stretch; flex-direction: column; }
  .fk-event-create-button { width: 100%; }
  .fk-event-filters { grid-template-columns: 1fr; }
  .fk-events-grid { grid-template-columns: minmax(0,1fr); }
  .fk-event-date-grid { grid-template-columns: 1fr; }
  .fk-event-card-image { height: 190px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
