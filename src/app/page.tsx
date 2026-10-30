import { redirect } from "next/navigation";
import Link from "next/link";
import { LinkButton } from "@/components/ui/LinkButton";
import { CurrentYear } from "@/components/ui/CurrentYear";
import { DuoIcon } from "@/components/ui/DuoIcon";
import { GithubLink } from "@/components/ui/GithubLink";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { Reveal } from "@/components/ui/Reveal";
import { getCurrentUser } from "@/lib/auth/session";
import styles from "./page.module.css";
import { BrandLogo } from "@/components/ui/BrandLogo";

const floaters = [
  { cls: "f1", name: "Payments API", score: 94, dot: "dotOk", tone: 0 },
  { cls: "f2", name: "Mobile app v2", score: 71, dot: "dotWarn", tone: 1 },
  { cls: "f3", name: "Docs site", score: 88, dot: "dotOk", tone: 2 },
  { cls: "f4", name: "Auth service", score: 52, dot: "dotBad", tone: 3 },
  { cls: "f5", name: "Data pipeline", score: 63, dot: "dotWarn", tone: 4 },
  { cls: "f6", name: "Design system", score: 97, dot: "dotOk", tone: 5 },
];

const features = [
  { icon: "heart-pulse", tone: "red", title: "Explained health scores", text: "See exactly which overdue tasks and critical bugs cost points, and what to do first." },
  { icon: "layout-column", tone: "yellow", title: "Kanban that stays honest", text: "To Do, In Progress, In Review and Done, with drag and drop and keyboard-friendly controls." },
  { icon: "shield-user", tone: "blue", title: "Roles and permissions", text: "Owner, admin, member and viewer access, enforced on the server for every action." },
  { icon: "notification-3", tone: "purple", title: "In-app notifications", text: "Assignments, overdue tasks, team changes and health drops, all in one place." },
  { icon: "bar-chart-grouped", tone: "green", title: "Clear analytics", text: "Status, priority and weekly completion charts that update with real data." },
  { icon: "search-eye", tone: "yellow", title: "Search and filters", text: "Find any project or task fast with search, filters, sorting and pagination." },
];

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <BrandLogo size="var(--logo, 2.5rem)" />
          </Link>
          <nav className={styles.links} aria-label="Sections">
            <a href="#health">Health score</a>
            <a href="#board">Board</a>
            <a href="#roles">Teams</a>
            <a href="#features">Features</a>
          </nav>
          <div className={styles.navCta}>
            <LinkButton href="/login" variant="ghost" small>Log in</LinkButton>
            <LinkButton href="/register" small>Sign up</LinkButton>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          {floaters.map((f) => (
            <div key={f.name} className={`${styles.fc} ${styles[f.cls]}`} aria-hidden="true">
              <span className={`${styles.fcAvatar} ${styles[`tone${f.tone}`]}`}>{f.name.charAt(0)}</span>
              <div>
                <div className={styles.fcName}>{f.name}</div>
                <div className={styles.fcMeta}><span className={styles[f.dot]} /> Health {f.score}</div>
              </div>
            </div>
          ))}
          <div className={styles.heroCopy}>
            <span className={styles.pill}><b>New</b> Project health scores for developers</span>
            <h1 id="hero-title" className={styles.title}>
              Know which projects are <em>slipping</em> before they ship late.
            </h1>
            <p className={styles.lede}>
              Maplecake turns overdue tasks and unresolved critical bugs into one health score for every project, and tells you what to fix first.
            </p>
            <div className={styles.cta}>
              <LinkButton href="/register" large iconAfter="ri-arrow-right-line">Start tracking free</LinkButton>
              <LinkButton href="/login" variant="secondary" large>Sign in</LinkButton>
            </div>
            <div className={styles.assure}>
              <span><i className="ri-checkbox-circle-fill" aria-hidden="true" /> No credit card</span>
              <span><i className="ri-checkbox-circle-fill" aria-hidden="true" /> Set up in a minute</span>
              <span><i className="ri-checkbox-circle-fill" aria-hidden="true" /> Private by default</span>
            </div>
          </div>
        </section>

        <div className={styles.sections}>
          <Reveal>
            <section id="health" className={styles.panel}>
              <p className={styles.eyebrow}>Health score</p>
              <h2 className={styles.h2}>One number your whole team understands.</h2>
              <p className={styles.sub}>Every project starts at 100. Overdue tasks and critical bugs take points away, and the score tells you why.</p>
              <div className={styles.stage}>
                <div className={`${styles.chip} ${styles.p1}`}>
                  <DuoIcon name="bug" tone="red" size="1.7rem" />
                  <span>Card number lost on error<span className={styles.chipSub}>Critical bug · unassigned</span></span>
                </div>
                <div className={`${styles.chip} ${styles.p2}`}>
                  <DuoIcon name="alarm-warning" tone="yellow" size="1.7rem" />
                  <span>Migration guide<span className={styles.chipSub}>9 days late</span></span>
                </div>
                <div className={`${styles.chip} ${styles.p3}`}>
                  <DuoIcon name="notification-3" tone="green" size="1.7rem" />
                  <span>Owner notified<span className={styles.chipSub}>Health dropped below 60</span></span>
                </div>
                <div className={styles.mcard}>
                  <div className={styles.mHead}>
                    <span className={`${styles.fcAvatar} ${styles.tone0}`}>C</span>
                    <span className={styles.mTitle}>Checkout Rebuild</span>
                    <span className={styles.mBadge}>At risk</span>
                  </div>
                  <div className={styles.mBody}>
                    <HealthGauge score={51} band="at_risk" size={118} />
                    <div className={styles.factors}>
                      <div className={styles.factor}><span><i className="ri-bug-line" /> 2 critical bugs</span><b>-30</b></div>
                      <div className={styles.factor}><span><i className="ri-alarm-warning-line" /> 2 overdue tasks</span><b>-19</b></div>
                    </div>
                  </div>
                  <div className={styles.suggest}><i className="ri-lightbulb-flash-line" /> Fix the 2 critical bugs first. They cost the most points.</div>
                </div>
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section id="board" className={styles.panel}>
              <p className={styles.eyebrow}>Kanban board</p>
              <h2 className={styles.h2}>Move work forward, visibly.</h2>
              <p className={styles.sub}>Drag cards between columns, or use the keyboard menu on every card. Changes are saved and logged instantly.</p>
              <div className={styles.stage}>
                <div className={`${styles.chip} ${styles.p2}`} style={{ top: "-1.5rem" }}>
                  <DuoIcon name="check-double" tone="green" size="1.7rem" />
                  <span>Moved to In Review<span className={styles.chipSub}>Saved just now</span></span>
                </div>
                <div className={styles.kanban}>
                  <div className={styles.kCol}>
                    <div className={styles.kHead}><i className="ri-circle-fill" style={{ color: "#8a8a98" }} /> To Do</div>
                    <div className={styles.kCard}>Add Apple Pay<span className={`${styles.kTag} ${styles.cPurple}`}>Feature</span></div>
                    <div className={styles.kCard}>Update error copy<span className={`${styles.kTag} ${styles.cBlue}`}>Task</span></div>
                  </div>
                  <div className={styles.kCol}>
                    <div className={styles.kHead}><i className="ri-circle-fill" style={{ color: "#2563eb" }} /> In Progress</div>
                    <div className={styles.kCard}>Single page checkout<span className={`${styles.kTag} ${styles.cYellow}`}>High</span></div>
                  </div>
                  <div className={styles.kCol}>
                    <div className={styles.kHead}><i className="ri-circle-fill" style={{ color: "#1f9d57" }} /> Done</div>
                    <div className={styles.kCard}>Set up feature flag<span className={`${styles.kTag} ${styles.cGreen}`}>Done</span></div>
                    <div className={styles.kCard}>Design review<span className={`${styles.kTag} ${styles.cGreen}`}>Done</span></div>
                  </div>
                </div>
                <div className={styles.drag}>Load test payments<i className="ri-cursor-fill" /></div>
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section id="roles" className={styles.panel}>
              <p className={styles.eyebrow}>Teams and roles</p>
              <h2 className={styles.h2}>The right access for everyone.</h2>
              <p className={styles.sub}>Invite teammates and choose what each person can do. Projects stay private to the people you add.</p>
              <div className={styles.stage}>
                <div className={styles.faces}>
                  <span><span className={`${styles.av} ${styles.tone0}`}>AK</span><span className={`${styles.av} ${styles.tone1}`}>JS</span><span className={`${styles.av} ${styles.tone2}`}>MR</span></span>
                  Your team
                </div>
                <div className={styles.roles}>
                  <div className={styles.role}>
                    <span className={styles.roleIcon}><DuoIcon name="eye" tone="blue" size="1em" /></span>
                    <div className={styles.roleName}>Viewer</div>
                    <ul className={styles.roleList}>
                      <li><i className={`ri-check-line ${styles.yes}`} /> See projects and boards</li>
                      <li><i className={`ri-check-line ${styles.yes}`} /> Read the activity history</li>
                      <li><i className={`ri-close-line ${styles.no}`} /> Edit tasks</li>
                    </ul>
                    <div className={styles.roleTag}>Read only</div>
                  </div>
                  <div className={`${styles.role} ${styles.roleFeatured}`}>
                    <span className={styles.roleIcon}><DuoIcon name="user" tone="yellow" size="1em" /></span>
                    <div className={styles.roleName}>Member</div>
                    <ul className={styles.roleList}>
                      <li><i className={`ri-check-line ${styles.yes}`} /> Everything a viewer can</li>
                      <li><i className={`ri-check-line ${styles.yes}`} /> Create and edit tasks</li>
                      <li><i className={`ri-check-line ${styles.yes}`} /> Move cards on the board</li>
                    </ul>
                    <div className={styles.roleTag}>Day to day work</div>
                  </div>
                  <div className={styles.role}>
                    <span className={styles.roleIcon}><DuoIcon name="shield-star" tone="purple" size="1em" /></span>
                    <div className={styles.roleName}>Admin</div>
                    <ul className={styles.roleList}>
                      <li><i className={`ri-check-line ${styles.yes}`} /> Everything a member can</li>
                      <li><i className={`ri-check-line ${styles.yes}`} /> Manage the team</li>
                      <li><i className={`ri-check-line ${styles.yes}`} /> Archive the project</li>
                    </ul>
                    <div className={styles.roleTag}>Full management</div>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className={styles.panel}>
              <p className={styles.eyebrow}>Activity and alerts</p>
              <h2 className={styles.h2}>Never ask &ldquo;what changed?&rdquo; again.</h2>
              <p className={styles.sub}>Every change is written to the project history, and the right people get a notification.</p>
              <div className={styles.stage}>
                <div className={styles.bell}><i className="ri-notification-3-fill" /> 3 new</div>
                <div className={styles.mcard} style={{ width: "min(100%, 32rem)" }}>
                  <ul className={styles.feed}>
                    <li><DuoIcon name="user-add" tone="blue" size="1.7rem" />Sam assigned you “Load test”<time>2m ago</time></li>
                    <li><DuoIcon name="alarm-warning" tone="red" size="1.7rem" />“Migration guide” is overdue<time>1h ago</time></li>
                    <li><DuoIcon name="check-double" tone="green" size="1.7rem" />Ada moved “Feature flag” to Done<time>3h ago</time></li>
                  </ul>
                </div>
              </div>
            </section>
          </Reveal>
        </div>

        <Reveal>
          <section className={styles.principles} aria-labelledby="principles-title">
            <h2 id="principles-title">
              Designed for developers, <span>not for managers.</span>
            </h2>
            <div className={styles.checks}>
              <p className={styles.check}><i className="ri-checkbox-circle-line" /><span><b>Scores you can explain.</b> No black box. Every point lost links to the task that caused it.</span></p>
              <p className={styles.check}><i className="ri-checkbox-circle-line" /><span><b>Private by default.</b> Only people you add can see a project. Everyone else gets nothing.</span></p>
              <p className={styles.check}><i className="ri-checkbox-circle-line" /><span><b>Everything is logged.</b> A full history of who changed what, with no digging through chat.</span></p>
              <p className={styles.check}><i className="ri-checkbox-circle-line" /><span><b>Fast and focused.</b> Quick forms, clear errors and no clutter between you and the work.</span></p>
            </div>
          </section>
        </Reveal>

        <section id="features" className={styles.features} aria-labelledby="features-title">
          <Reveal>
            <h2 id="features-title">
              Everything you need to keep projects on track.
            </h2>
          </Reveal>
          <div className={styles.fgrid}>
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <article className={styles.feature}>
                  <span className={styles.featureIcon}><DuoIcon name={f.icon} tone={f.tone as "red" | "yellow" | "blue" | "green" | "purple"} size="1em" /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <section className={styles.band}>
            <div className={styles.bandInner}>
              <h2>See how healthy your projects really are.</h2>
              <LinkButton href="/register" variant="dark" large iconAfter="ri-arrow-right-line">Create your free account</LinkButton>
            </div>
          </section>
        </Reveal>
      </main>

      <footer className={styles.footer}>
        <span>© <CurrentYear initial={new Date().getFullYear()} /> Maplecake</span>
        <nav aria-label="Account">
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
          <GithubLink />
        </nav>
      </footer>
    </div>
  );
}
