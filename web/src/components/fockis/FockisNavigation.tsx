import {
IconHome,
IconDiscover,
IconFriends,
IconWaves,
IconMessages,
IconNotifications,
IconMarketplace,
IconGroups,
IconSaved,
IconProfile,
IconSettings,
IconHelp,
} from "./FockisIcons";

export type FockisNavigationItem = {
label: string;
href: string;
icon: React.ReactNode;
};

interface FockisNavigationProps {
activePath?: string;
onNavigate?: (href: string) => void;
}

const navigationItems: FockisNavigationItem[] = [
{
label: "Home",
href: "/",
icon: <IconHome size={20} />,
},
{
label: "Discover",
href: "/discover",
icon: <IconDiscover size={20} />,
},
{
label: "Friends",
href: "/friends",
icon: <IconFriends size={20} />,
},
{
label: "Waves",
href: "/waves",
icon: <IconWaves size={20} />,
},
{
label: "Messages",
href: "/messages",
icon: <IconMessages size={20} />,
},
{
label: "Notifications",
href: "/notifications",
icon: <IconNotifications size={20} />,
},
{
label: "Marketplace",
href: "/marketplace",
icon: <IconMarketplace size={20} />,
},
{
label: "Groups",
href: "/groups",
icon: <IconGroups size={20} />,
},
{
label: "Saved",
href: "/saved",
icon: <IconSaved size={20} />,
},
{
label: "Profile",
href: "/profile",
icon: <IconProfile size={20} />,
},
];

const secondaryItems: FockisNavigationItem[] = [
{
label: "Settings",
href: "/settings",
icon: <IconSettings size={20} />,
},
{
label: "Help",
href: "/help",
icon: <IconHelp size={20} />,
},
];

export default function FockisNavigation({
activePath,
onNavigate,
}: FockisNavigationProps) {
const handleNavigation = (
event: React.MouseEvent<HTMLAnchorElement>,
href: string,
) => {
if (onNavigate) {
event.preventDefault();
onNavigate(href);
}
};

const isActive = (href: string) => {
if (!activePath) {
return false;
}

if (href === "/") {
  return activePath === "/";
}

return (
  activePath === href ||
  activePath.startsWith(`${href}/`)
);

};

return ( <nav
   className="fk-navigation"
   aria-label="Fockis main navigation"
 >
{/* MAIN NAVIGATION */} <div className="fk-navigation__main">
{navigationItems.map((item) => {
const active = isActive(item.href);

      return (
        <a
          key={item.href}
          href={item.href}
          className={`fk-navigation__item${
            active ? " is-active" : ""
          }`}
          onClick={(event) =>
            handleNavigation(
              event,
              item.href,
            )
          }
          aria-current={
            active ? "page" : undefined
          }
        >
          <span className="fk-navigation__icon">
            {item.icon}
          </span>

          <span className="fk-navigation__label">
            {item.label}
          </span>
        </a>
      );
    })}
  </div>

  {/* SECONDARY NAVIGATION */}
  <div className="fk-navigation__secondary">
    <div className="fk-navigation__section">
      More
    </div>

    {secondaryItems.map((item) => {
      const active = isActive(item.href);

      return (
        <a
          key={item.href}
          href={item.href}
          className={`fk-navigation__item${
            active ? " is-active" : ""
          }`}
          onClick={(event) =>
            handleNavigation(
              event,
              item.href,
            )
          }
          aria-current={
            active ? "page" : undefined
          }
        >
          <span className="fk-navigation__icon">
            {item.icon}
          </span>

          <span className="fk-navigation__label">
            {item.label}
          </span>
        </a>
      );
    })}
  </div>
</nav>

);
}
