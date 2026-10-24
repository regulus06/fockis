.fk-event-rail { width: 100%; margin: 24px 0; padding: 20px; box-sizing: border-box; background: var(--fk-card-bg,#fff); border: 1px solid var(--fk-border,#e5e7eb); border-radius: 18px; overflow: hidden; }
.fk-event-rail__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.fk-event-rail__title { margin: 0; color: var(--fk-text-primary,#111827); font-size: 20px; line-height: 1.2; font-weight: 800; }
.fk-event-rail__subtitle { margin: 4px 0 0; color: var(--fk-text-secondary,#6b7280); font-size: 13px; }
.fk-event-rail__view-all { border: 0; border-radius: 8px; padding: 8px 10px; background: transparent; color: #9a5a00; font-weight: 700; cursor: pointer; }
.fk-event-rail__scroller { display: flex; flex-flow: row nowrap; align-items: stretch; gap: 16px; overflow-x: auto; overflow-y: hidden; padding: 4px 4px 14px; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
.fk-event-rail__card { flex: 0 0 280px; width: 280px; min-width: 280px; overflow: hidden; border: 1px solid var(--fk-border,#e5e7eb); border-radius: 16px; background: var(--fk-card-secondary-bg,#f9fafb); }
.fk-event-rail__open { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; text-align: left; color: inherit; cursor: pointer; }
.fk-event-rail__open:focus-visible { outline: 3px solid #ff9900; outline-offset: -3px; }
.fk-event-rail__media { position: relative; height: 155px; background: linear-gradient(135deg,#fff3e0,#ffe0b2); }
.fk-event-rail__media img { display: block; width: 100%; height: 100%; object-fit: cover; }
.fk-event-rail__placeholder { display: grid; place-items: center; height: 100%; font-size: 44px; }
.fk-event-rail__status { position: absolute; top: 10px; left: 10px; padding: 5px 8px; border-radius: 999px; background: #fff; font-size: 10px; font-weight: 800; }
.fk-event-rail__status.live { background: #fee2e2; color: #991b1b; }
.fk-event-rail__content { display: grid; gap: 8px; padding: 14px; font-size: 13px; color: #68707c; }
.fk-event-rail__content strong { color: #111827; font-size: 16px; line-height: 1.3; }
.fk-event-rail__category { color: #9a5a00; text-transform: uppercase; font-size: 10px; font-weight: 800; }
@media (max-width: 640px) { .fk-event-rail { padding: 14px; } .fk-event-rail__card { flex-basis: 250px; width: 250px; min-width: 250px; } }
