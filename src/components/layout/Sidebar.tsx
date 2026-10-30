"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DuoIcon } from "@/components/ui/DuoIcon";
import { useLive } from "./LiveProvider";
import ui from "@/components/ui/ui.module.css";
import styles from "./shell.module.css";
import { BrandLogo } from "@/components/ui/BrandLogo";

// `short` is the label used in the phone tab bar, where five tabs share a narrow screen.
const links: { href: string; label: string; icon: string; short?: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard-3" },
  { href: "/projects", label: "Projects", icon: "folder-3" },
  { href: "/invitations", label: "Invitations", icon: "mail-send", short: "Invites" },
  { href: "/notifications", label: "Notifications", icon: "notification-3", short: "Alerts" },
  { href: "/profile", label: "Profile", icon: "user-3" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { unread, invites } = useLive();
  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard" className={styles.brand}>
        <BrandLogo size="2.6rem" />
      </Link>

      <Link href="/projects/new" className={`${ui.btn} ${ui.dark} ${styles.newBtn}`}>
        <i className="ri-add-line" aria-hidden="true" /> New project
      </Link>

      <nav className={styles.nav} aria-label="Main">
        <span className={styles.navLabel}>Workspace</span>
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} href={link.href} aria-current={isActive ? "page" : undefined} className={`${styles.navLink} ${isActive ? styles.navActive : ""}`}>
              {isActive ? <DuoIcon name={link.icon} size="1.5rem" /> : <i className={`ri-${link.icon}-line`} aria-hidden="true" />}
              <span className={styles.navText}>
                {link.short ? (
                  <>
                    <span className={styles.navFull}>{link.label}</span>
                    <span className={styles.navShort} aria-hidden="true">{link.short}</span>
                  </>
                ) : (
                  link.label
                )}
              </span>
              {link.href === "/notifications" && unread > 0 && (
                <span className={styles.count} aria-label={`${unread} unread`}>
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              {link.href === "/invitations" && invites > 0 && (
                <span className={`${styles.count} ${styles.countYellow}`} aria-label={`${invites} pending`}>
                  {invites > 99 ? "99+" : invites}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.tip}>
        <span className={styles.tipIcon}>
          <DuoIcon name="lightbulb-flash" size="1em" />
        </span>
        <strong>Fix critical bugs first</strong>
        <span>Each unresolved critical bug costs 15 health points, more than most overdue tasks.</span>
      </div>
    </aside>
  );
}
