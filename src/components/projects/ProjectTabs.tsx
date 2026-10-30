"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./project.module.css";

export function ProjectTabs({ projectId, showSettings }: { projectId: string; showSettings: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Overview", icon: "ri-dashboard-line", exact: true },
    { href: `${base}/board`, label: "Board", icon: "ri-kanban-view" },
    { href: `${base}/tasks`, label: "Tasks", icon: "ri-list-check-2" },
    { href: `${base}/team`, label: "Team", icon: "ri-team-line" },
    { href: `${base}/activity`, label: "Activity", icon: "ri-pulse-line" },
    ...(showSettings ? [{ href: `${base}/settings`, label: "Settings", icon: "ri-settings-3-line" }] : []),
  ];
  return (
    <nav className={styles.tabs} aria-label="Project sections">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
            <i className={tab.icon} aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
