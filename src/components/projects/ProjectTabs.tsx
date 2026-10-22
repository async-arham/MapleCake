"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./project.module.css";

export function ProjectTabs({ projectId, showSettings }: { projectId: string; showSettings: boolean }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Overview", exact: true },
    { href: `${base}/board`, label: "Board" },
    { href: `${base}/tasks`, label: "Tasks" },
    { href: `${base}/team`, label: "Team" },
    { href: `${base}/activity`, label: "Activity" },
    ...(showSettings ? [{ href: `${base}/settings`, label: "Settings" }] : []),
  ];
  return (
    <nav className={styles.tabs} aria-label="Project sections">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
