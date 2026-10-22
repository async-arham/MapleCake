"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./shell.module.css";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/notifications", label: "Notifications" },
];

export function MainNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Main">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`${styles.navLink} ${active ? styles.navActive : ""}`}>
            {link.label}
            {link.href === "/notifications" && unread > 0 && (
              <span className={styles.count} aria-label={`${unread} unread`}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
