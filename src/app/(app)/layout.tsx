import { HelpButton } from "@/components/layout/HelpButton";
import { LiveProvider } from "@/components/layout/LiveProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import styles from "@/components/layout/shell.module.css";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "@/server/actions/auth";
import { getLiveBootstrap } from "@/server/queries/live";

function SignOutItem() {
  return (
    <form action={logoutAction}>
      <button type="submit" role="menuitem" className={`${styles.menuItem} ${styles.menuDanger}`}>
        <i className="ri-logout-box-r-line" aria-hidden="true" /> Sign out
      </button>
    </form>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const live = await getLiveBootstrap(user.id);
  return (
    <LiveProvider initial={live}>
    <div className={styles.shell}>
      <a href="#content" className={styles.skip}>
        Skip to content
      </a>
      <Sidebar />
      <div className={styles.content}>
        <TopBar user={{ name: user.name, email: user.email }} signOut={<SignOutItem />} />
        <main id="content" className={styles.main}>
          {children}
        </main>
      </div>
      <HelpButton />
    </div>
    </LiveProvider>
  );
}
