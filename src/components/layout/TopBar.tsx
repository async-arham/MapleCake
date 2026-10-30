"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { initials } from "@/lib/dates";
import { useLive } from "./LiveProvider";
import styles from "./shell.module.css";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { HELP_EVENT } from "./HelpButton";

type Props = { user: { name: string; email: string }; signOut: ReactNode };

export function TopBar({ user, signOut }: Props) {
  const { unread, invites } = useLive();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className={styles.topbar}>
      <Link href="/dashboard" className={styles.mobileBrand}>
        <BrandLogo size="var(--logo, 2.4rem)" />
      </Link>
      <div className={styles.topActions}>
        <Link href="/notifications" className={styles.bell} aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}>
          <i className="ri-notification-3-line" aria-hidden="true" />
          {unread > 0 && <span className={styles.bellDot} aria-hidden="true" />}
        </Link>
        <div className={styles.userWrap} ref={wrapRef}>
          <button type="button" className={styles.userPill} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <i className="ri-menu-line" aria-hidden="true" />
            <span className={styles.avatar} aria-hidden="true">
              {initials(user.name)}
            </span>
            <span className="visually-hidden">Account menu</span>
          </button>
          {
            <div className={styles.userMenu} role="menu" hidden={!open}>
              <div className={styles.menuHead}>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(user.name)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.menuName}>{user.name}</div>
                  <div className={styles.menuEmail}>{user.email}</div>
                </div>
              </div>
              <Link href="/profile" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
                <i className="ri-user-3-line" aria-hidden="true" /> Profile
              </Link>
              <Link href="/dashboard" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
                <i className="ri-dashboard-3-line" aria-hidden="true" /> Dashboard
              </Link>
              <Link href="/projects" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
                <i className="ri-folder-3-line" aria-hidden="true" /> Projects
              </Link>
              <Link href="/invitations" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
                <i className="ri-mail-send-line" aria-hidden="true" /> Invitations
                {invites > 0 && <span className={`${styles.count} ${styles.countYellow}`}>{invites}</span>}
              </Link>
              <Link href="/notifications" role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
                <i className="ri-notification-3-line" aria-hidden="true" /> Notifications
              </Link>
              <button
                type="button"
                role="menuitem"
                className={`${styles.menuItem} ${styles.menuHelp}`}
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new Event(HELP_EVENT));
                }}
              >
                <i className="ri-question-line" aria-hidden="true" /> How health scores work
              </button>
              {signOut}
            </div>
          }
        </div>
      </div>
    </header>
  );
}
