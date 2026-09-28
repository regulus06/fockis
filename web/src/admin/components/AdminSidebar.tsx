import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_SECTIONS } from '../permissions/permissionGroups';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { hasAnyPermission } from '../permissions/permissionHelpers';

export function AdminSidebar() {
  const permissions = useAdminSessionStore((s) => s.permissions);
  const switchToken = useAdminSessionStore((s) => s.switchToken);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const visibleSections = NAV_SECTIONS.filter((section) =>
    hasAnyPermission(permissions, section.anyOf),
  );

  return (
    <aside key={switchToken} className="fk-sidebar fk-scrollbar fk-sidebar--pulse">
      <div className="fk-sidebar__brand">
        <div className="fk-sidebar__mark">F</div>
        <div>
          <div className="fk-sidebar__brand-text">Fockis</div>
          <div className="fk-sidebar__brand-sub">Administration</div>
        </div>
      </div>

      <nav>
        {visibleSections.map((section) => {
          const children = section.children?.filter((c) => hasAnyPermission(permissions, c.anyOf));
          const isGroup = !!children;
          const sectionOpen = openSections[section.label] ?? true;

          if (!isGroup && section.path) {
            return (
              <div className="fk-navsection" key={section.label}>
                <NavLink
                  to={section.path}
                  className={({ isActive }) => `fk-navitem ${isActive ? 'active' : ''}`}
                >
                  <span className="fk-navitem__dot" />
                  <span className="fk-navitem__label">{section.label}</span>
                </NavLink>
              </div>
            );
          }

          if (isGroup && children.length > 0) {
            return (
              <div className="fk-navsection" key={section.label}>
                <button
                  className="fk-navsection__toggle"
                  onClick={() =>
                    setOpenSections((s) => ({ ...s, [section.label]: !sectionOpen }))
                  }
                >
                  <span className="fk-navitem__dot" />
                  <span className="fk-navitem__label">{section.label}</span>
                </button>
                {sectionOpen && (
                  <div className="fk-navsection__children">
                    {children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => `fk-navitem ${isActive ? 'active' : ''}`}
                      >
                        <span className="fk-navitem__label">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </nav>
    </aside>
  );
}
