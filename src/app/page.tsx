import styles from "./page.module.css";

const stages = [
  { name: "Project setup and structure", done: true },
  { name: "Database with Supabase and Prisma", done: false },
  { name: "Sign in and permissions", done: false },
  { name: "Projects, tasks and Kanban board", done: false },
  { name: "Health score, analytics and notifications", done: false },
  { name: "Teams and activity history", done: false },
  { name: "Testing and deployment", done: false },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.wordmark}>
          <span className={styles.lamp} aria-hidden="true" />
          SprintBeacon
        </span>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <h1 id="hero-title" className={styles.title}>
            Know which projects are slipping before they ship late.
          </h1>
          <p className={styles.lede}>
            SprintBeacon turns overdue tasks and unresolved critical bugs into one health score
            for every project, and tells you what to fix first.
          </p>
        </div>

        <figure className={styles.gauge}>
          <svg viewBox="0 0 120 120" role="img" aria-label="Example health score of 82 out of 100">
            <circle cx="60" cy="60" r="50" className={styles.gaugeTrack} />
            <circle
              cx="60"
              cy="60"
              r="50"
              className={styles.gaugeValue}
              pathLength={100}
              strokeDasharray="82 100"
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="68" textAnchor="middle" className={styles.gaugeNumber}>
              82
            </text>
          </svg>
          <figcaption className={styles.gaugeCaption}>Example health score</figcaption>
        </figure>
      </section>

      <section className={styles.progress} aria-labelledby="progress-title">
        <h2 id="progress-title" className={styles.progressTitle}>
          Build progress
        </h2>
        <ol className={styles.stageList}>
          {stages.map((stage) => (
            <li key={stage.name} className={stage.done ? styles.stageDone : styles.stageTodo}>
              <span className={styles.stageMark} aria-hidden="true" />
              <span>{stage.name}</span>
              <span className="visually-hidden">{stage.done ? " (complete)" : " (not started)"}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
