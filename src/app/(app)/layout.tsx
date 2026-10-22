import Link from "next/link";
import { MainNav } from "@/components/layout/MainNav";
import styles from "@/components/layout/shell.module.css";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/server/actions/auth";
import { countUnread } from "@/server/queries/notifications";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await countUnread(user.id);
  return (
    <div className={styles.shell}>
      <a href="#content" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/dashboard" className={styles.brand}>
            <span className={styles.lamp} aria-hidden="true" /> SprintBeacon
          </Link>
          <MainNav unread={unread} />
          <div className={styles.user}>
            <span className={styles.userName}>{user.name}</span>
            <form action={logoutAction}>
              <button type="submit" className={styles.signOut}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="content" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
