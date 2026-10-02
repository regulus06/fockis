export interface AdminNavItem {
  label: string;
  href: string;
}
export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

// Every entry here routes to a real page built in pages/academy/admin/ —
// no placeholder links. "LMS" and "Courses" intentionally point at the
// same admin page since course records ARE the LMS content (modules,
// assignments); "Online Learning" opens the Content admin filtered to the
// learning-features section.
export const ADMIN_NAV: AdminNavGroup[] = [
  { label: 'Dashboard', items: [{ label: 'Dashboard', href: '/academy/admin' }] },
  {
    label: 'Academy Management',
    items: [
      { label: 'Programs', href: '/academy/admin/programs' },
      { label: 'Courses', href: '/academy/admin/courses' },
      { label: 'Faculty', href: '/academy/admin/faculty' },
      { label: 'Students', href: '/academy/admin/students' },
      { label: 'Events', href: '/academy/admin/events' },
      { label: 'News', href: '/academy/admin/news' },
      { label: 'Admissions', href: '/academy/admin/admissions' },
      { label: 'Careers', href: '/academy/admin/jobs' },
      { label: 'Contact Messages', href: '/academy/admin/messages' },
    ],
  },
  {
    label: 'Learning',
    items: [
      { label: 'Enrollments', href: '/academy/admin/enrollments' },
      { label: 'LMS (Courses & Modules)', href: '/academy/admin/courses' },
      { label: 'Online Learning Content', href: '/academy/admin/content?section=learning-features' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Academy Users', href: '/academy/admin/users' },
      { label: 'Content Sections', href: '/academy/admin/content' },
      { label: 'Settings', href: '/academy/admin/settings' },
    ],
  },
];
