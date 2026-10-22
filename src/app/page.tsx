import { redirect } from "next/navigation";
import { LinkButton } from "@/components/ui/LinkButton";
import { getCurrentUser } from "@/lib/auth/session";
import styles from "./page.module.css";

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.wordmark}>
          <span className={styles.lamp} aria-hidden="true" />
          SprintBeacon
        </span>
        <nav className={styles.headerLinks} aria-label="Account">
          <LinkButton href="/login" variant="ghost">
            Sign in
          </LinkButton>
          <LinkButton href="/register" small>
            Create account
          </LinkButton>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <h1 id="hero-title" className={styles.title}>
            Know which projects are slipping before they ship late.
          </h1>
          <p className={styles.lede}>
            SprintBeacon turns overdue tasks and unresolved critical bugs into one health score for every
            project, and tells you what to fix first.
          </p>
          <div className={styles.cta}>
            <LinkButton href="/register">Start tracking free</LinkButton>
            <LinkButton href="/login" variant="secondary">
              Sign in
            </LinkButton>
          </div>
        </div>

        <figure className={styles.gauge}>
          <svg viewBox="0 0 120 120" role="img" aria-label="Example health score of 82 out of 100">
            <circle cx="60" cy="60" r="50" className={styles.gaugeTrack} />
            <circle cx="60" cy="60" r="50" className={styles.gaugeValue} pathLength={100} strokeDasharray="82 100" transform="rotate(-90 60 60)" />
            <text x="60" y="68" textAnchor="middle" className={styles.gaugeNumber}>
              82
            </text>
          </svg>
          <figcaption className={styles.gaugeCaption}>Example health score</figcaption>
        </figure>
      </section>

      <section className={styles.features} aria-label="Features">
        <div>
          <h2>Kanban that stays honest</h2>
          <p>Move work through To Do, In Progress, In Review and Done with drag and drop.</p>
        </div>
        <div>
          <h2>A score you can explain</h2>
          <p>See exactly which overdue tasks and critical bugs cost points, and what to do about them.</p>
        </div>
        <div>
          <h2>Built for teams</h2>
          <p>Owner, admin, member and viewer roles, plus an activity history and in-app notifications.</p>
        </div>
      </section>
    </main>
  );
}
