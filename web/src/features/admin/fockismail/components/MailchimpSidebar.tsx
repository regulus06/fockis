import { NavLink, useLocation } from "react-router-dom";
import { NAV_GROUPS, type NavItem } from "./navigation";
import { Icon } from "./ui/Icon";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useViewer } from "../hooks/useMarketingWorkspace";
import { cx } from "../utils/format";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  /** Drawer mode on mobile: always expanded, no collapse button. */
  inDrawer?: boolean;
}

/**
 * Canonical Fockis Marketing route namespace.
 */
function canonicalMarketingPath(path: string): string {
  if (!path) {
    return "/admin/fockismail";
  }

  if (
    path === "/admin/fockismail" ||
    path.startsWith("/admin/fockismail/")
  ) {
    return path;
  }

  if (path === "/marketing/mailchimp") {
    return "/admin/fockismail";
  }

  if (path.startsWith("/marketing/mailchimp/")) {
    return `/admin/fockismail/${path.slice("/marketing/mailchimp/".length)}`;
  }

  if (path === "/marketing/agency") {
    return "/admin/fockismail/agency";
  }

  if (path.startsWith("/marketing/agency/")) {
    return `/admin/fockismail/agency/${path.slice("/marketing/agency/".length)}`;
  }

  if (path === "/marketing/billing") {
    return "/admin/fockismail/billing";
  }

  if (path.startsWith("/marketing/billing/")) {
    return `/admin/fockismail/billing/${path.slice("/marketing/billing/".length)}`;
  }

  if (path === "/marketing") {
    return "/admin/fockismail";
  }

  if (path.startsWith("/marketing/")) {
    return `/admin/fockismail/${path.slice("/marketing/".length)}`;
  }

  return path;
}

function matches(
  pathname: string,
  path: string,
  end?: boolean,
): boolean {
  const canonicalPath = canonicalMarketingPath(path);

  if (end) {
    return pathname === canonicalPath;
  }

  return (
    pathname === canonicalPath ||
    pathname.startsWith(`${canonicalPath}/`)
  );
}

export function MailchimpSidebar({
  collapsed,
  onToggle,
  onNavigate,
  inDrawer,
}: SidebarProps) {
  const { pathname } = useLocation();
  const { can } = useViewer();

  /*
   * Drawer mode is always expanded.
   *
   * On desktop we still respect the collapsed prop so the existing
   * collapse button continues to work.
   */
  const expanded = inDrawer || !collapsed;

  const isActive = (item: NavItem) => {
    return (
      matches(pathname, item.path, item.end) ||
      (item.children ?? []).some((child) =>
        matches(
          pathname,
          child.path,
          child.path === item.path,
        ),
      )
    );
  };

  return (
    <nav
      className={cx(
        "fm-sidebar",
        collapsed && !inDrawer && "is-collapsed",
        inDrawer && "is-drawer",
      )}
      aria-label="Marketing"
    >
      <div className="fm-sidebar__brand">
        <WorkspaceSwitcher
          compact={!expanded}
          onNavigate={onNavigate}
        />
      </div>

      <div className="fm-sidebar__scroll">
        {NAV_GROUPS
          .filter(
            (group) =>
              !group.requires || can(group.requires),
          )
          .map((group) => (
            <section
              key={group.label}
              className="fm-sidebar__group"
              aria-label={group.label}
            >
              {expanded ? (
                <h2 className="fm-sidebar__heading">
                  {group.label}
                </h2>
              ) : (
                <hr className="fm-sidebar__rule" />
              )}

              <ul className="fm-sidebar__list">
                {group.items.map((item) => {
                  const active = isActive(item);
                  const itemPath =
                    canonicalMarketingPath(item.path);

                  return (
                    <li key={item.path + item.label}>
                      <NavLink
                        to={itemPath}
                        end={item.end}
                        className={() =>
                          cx(
                            "fm-navlink",
                            active && "is-active",
                          )
                        }
                        title={
                          !expanded
                            ? item.label
                            : undefined
                        }
                        onClick={onNavigate}
                      >
                        <Icon name={item.icon} />

                        {expanded && (
                          <span>{item.label}</span>
                        )}
                      </NavLink>

                      {item.children &&
                        active &&
                        expanded && (
                          <ul className="fm-sidebar__sub">
                            {item.children.map(
                              (child) => {
                                const childPath =
                                  canonicalMarketingPath(
                                    child.path,
                                  );

                                const childActive =
                                  matches(
                                    pathname,
                                    child.path,
                                    child.path ===
                                      item.path,
                                  );

                                return (
                                  <li
                                    key={child.path}
                                  >
                                    <NavLink
                                      to={childPath}
                                      end
                                      className={() =>
                                        cx(
                                          "fm-sublink",
                                          childActive &&
                                            "is-active",
                                        )
                                      }
                                      onClick={
                                        onNavigate
                                      }
                                    >
                                      {
                                        child.label
                                      }
                                    </NavLink>
                                  </li>
                                );
                              },
                            )}
                          </ul>
                        )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </div>

      {!inDrawer && (
        <button
          type="button"
          className="fm-sidebar__collapse"
          onClick={onToggle}
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          <Icon
            name={
              collapsed
                ? "chevronRight"
                : "chevronLeft"
            }
          />

          {!collapsed && <span>Collapse</span>}
        </button>
      )}
    </nav>
  );
}