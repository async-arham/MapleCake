// End-to-end smoke test over HTTP. Usage: BASE=http://localhost:3100 node tests/e2e/smoke.mjs
const BASE = process.env.BASE ?? "http://localhost:3100";
let passed = 0, failed = 0;
const ok = (cond, name, extra = "") => { cond ? passed++ : failed++; console.log(`${cond ? "  PASS" : "  FAIL"}  ${name}${cond ? "" : "  -> " + extra}`); };

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
class Browser {
  jar = new Map();
  cookieHeader() { return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; "); }
  store(res) { for (const c of res.headers.getSetCookie?.() ?? []) { const [pair] = c.split(";"); const i = pair.indexOf("="); const k = pair.slice(0, i), v = pair.slice(i + 1); v === "" || /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c) ? this.jar.delete(k) : this.jar.set(k, v); } }
  async get(path) { const res = await fetch(BASE + path, { redirect: "manual", headers: { cookie: this.cookieHeader() } }); this.store(res); return { status: res.status, location: res.headers.get("location"), text: await res.text(), res }; }
  async follow(path, max = 5) { let r = await this.get(path); while ([301, 302, 303, 307, 308].includes(r.status) && max--) r = await this.get(new URL(r.location, BASE).pathname + new URL(r.location, BASE).search); return r; }
  // Submit a server-action form exactly like a browser without JS: replay its hidden fields.
  async submit(path, marker, fields, formHtml) {
    const page = formHtml ?? (await this.get(path)).text;
    const forms = page.split("<form").slice(1).map((f) => f.split("</form>")[0]);
    const form = forms.find((f) => new RegExp(`name="${marker}"`).test(f));
    if (!form) throw new Error(`form with field ${marker} not found on ${path}`);
    const data = new FormData();
    for (const tag of form.match(/<input[^>]*>/g) ?? []) { const name = /name="([^"]*)"/.exec(tag)?.[1]; if (name && /type="hidden"/.test(tag)) data.set(decode(name), decode(/value="([^"]*)"/.exec(tag)?.[1] ?? "")); }
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    const res = await fetch(BASE + path, { method: "POST", body: data, redirect: "manual", headers: { cookie: this.cookieHeader(), origin: BASE } });
    this.store(res);
    return { status: res.status, location: res.headers.get("location"), text: await res.text() };
  }
}
const strongPw = "correct-horse-9";
const gauge = (html) => Number(/Health score (\d+) out of 100/.exec(html)?.[1] ?? NaN);

console.log("\n== Public pages and route protection ==");
const anon = new Browser();
ok((await anon.get("/")).text.includes("Create account"), "landing page renders");
for (const p of ["/dashboard", "/projects", "/projects/new", "/notifications"]) { const r = await anon.get(p); ok(r.status === 307 && r.location?.endsWith("/login"), `signed-out ${p} redirects to /login`, `${r.status} ${r.location}`); }
const health = await anon.get("/api/health"); ok(health.status === 200 && health.text.includes('"database":"up"'), "/api/health reports database up");
ok((await anon.get("/api/cron/overdue")).status === 401, "cron endpoint rejects requests without the secret");
anon.jar.set("sb_session", "eyJhbGciOiJIUzI1NiJ9.e30.forged");
ok((await anon.get("/dashboard")).status === 307, "forged session cookie is rejected");

console.log("\n== Registration and login ==");
const alice = new Browser();
let r = await alice.submit("/register", "email", { name: "Alice", email: "alice@example.com", password: "short" });
ok(r.text.includes("at least 10 characters"), "weak password shows an inline error", r.status);
r = await alice.submit("/register", "email", { name: "Alice", email: "alice@example.com", password: strongPw });
ok(r.status === 303 && r.location?.endsWith("/dashboard"), "registering redirects to /dashboard", `${r.status} ${r.location}`);
ok(alice.jar.has("sb_session"), "session cookie is set");
r = await alice.get("/dashboard"); ok(r.status === 200 && r.text.includes("No active projects yet"), "dashboard shows an empty state for a new user");
r = await alice.get("/login"); ok(r.status === 307, "signed-in user is sent away from /login");
const dup = await new Browser().submit("/register", "email", { name: "Alice", email: "ALICE@example.com", password: strongPw });
ok(dup.text.includes("already exists"), "duplicate email (any letter case) is refused");
const bad = await new Browser().submit("/login", "email", { email: "alice@example.com", password: "wrong-password-1" });
ok(bad.text.includes("Incorrect email or password"), "wrong password is refused with a generic message");
const again = new Browser();
r = await again.submit("/login", "email", { email: "alice@example.com", password: strongPw });
ok(r.status === 303 && again.jar.has("sb_session"), "login with correct password works");

console.log("\n== Projects and tasks (as Alice) ==");
r = await alice.submit("/projects/new", "name", { name: "Apollo", description: "Moon landing" });
ok(r.status === 303 && /\/projects\/[a-z0-9]+$/.test(r.location ?? ""), "creating a project redirects to it", `${r.status} ${r.location}`);
const pid = r.location.split("/").pop();
r = await alice.get(`/projects/${pid}`); ok(r.status === 200 && r.text.includes("Apollo") && gauge(r.text) === 100, "new project has a perfect health score of 100");
const mk = (title, extra) => alice.submit(`/projects/${pid}/tasks/new`, "title", { title, status: "TODO", priority: "MEDIUM", type: "TASK", description: "", dueDate: "", assigneeId: "", ...extra });
r = await mk("Ship it", { dueDate: "2020-01-01", priority: "HIGH" }); ok(r.status === 303, "task with a past due date is created", r.status);
r = await alice.get(`/projects/${pid}`); ok(gauge(r.text) === 91, "overdue high-priority task (very late) lowers health to 91", String(gauge(r.text)));
r = await mk("Server crashes", { type: "BUG", priority: "CRITICAL" });
r = await alice.get(`/projects/${pid}`); ok(gauge(r.text) === 76, "critical bug lowers health to 76", String(gauge(r.text)));
ok(r.text.includes("Why this score?") && r.text.includes("Suggested actions") && r.text.includes("1 unresolved critical bug"), "overview explains the score and suggests actions");
r = await mk("x", {}); ok(r.text.includes("at least 2 characters"), "task title validation shows inline error");
r = await alice.get(`/projects/${pid}/tasks`); ok(r.text.includes("Ship it") && r.text.includes("Server crashes"), "task list shows both tasks");
r = await alice.get(`/projects/${pid}/tasks?q=crash`); ok(r.text.includes("Server crashes") && !r.text.includes("Ship it"), "search filters the task list");
r = await alice.get(`/projects/${pid}/tasks?q=zzzz`); ok(r.text.includes("No tasks match these filters"), "empty search shows an empty state");
r = await alice.get(`/projects/${pid}/board`); ok(r.status === 200 && ["To Do", "In Progress", "In Review", "Done"].every((c) => r.text.includes(c)), "kanban board shows all four columns");
r = await alice.get("/dashboard"); ok(r.text.includes("Overdue tasks") && r.text.includes("Apollo"), "dashboard lists the project and analytics");
const taskId = /\/tasks\/([a-z0-9]{20,})"/.exec((await alice.get(`/projects/${pid}/tasks`)).text)?.[1];

console.log("\n== Authorization: Bob is a stranger ==");
const bob = new Browser();
await bob.submit("/register", "email", { name: "Bob", email: "bob@example.com", password: strongPw });
// Next.js streams, so a notFound() page is sent as HTTP 200 with <meta name="robots" content="noindex">.
// What matters is that the response shows only the not-found screen and none of Alice's data anywhere
// (including the embedded React payload).
// (The project/task ids are not listed: they are the request's own URL parameters, which Next.js echoes back.)
const SECRETS = ["Apollo", "Moon landing", "Server crashes", "Ship it", "Alice", "alice@example.com"];
for (const p of ["", "/board", "/tasks", "/tasks/new", `/tasks/${taskId}`, "/team", "/activity", "/settings"]) {
  const x = await bob.get(`/projects/${pid}${p}`);
  const leaked = SECRETS.filter((v) => x.text.includes(v));
  const showsProjectUi = x.text.includes("Project sections") || /Health score \d+ out of 100/.test(x.text);
  ok(x.status !== 307 && !showsProjectUi && leaked.length === 0 && /noindex/.test(x.text), `Bob gets the not-found page, no project UI and no data for /projects/<alice's>${p}`, `status ${x.status}, leaked: ${leaked.join(",")}`);
}
ok(!(await bob.get("/projects")).text.includes("Apollo"), "Alice's project is absent from Bob's project list");
ok(!(await bob.get("/dashboard")).text.includes("Apollo"), "Alice's project is absent from Bob's dashboard");
// Attack: take Alice's real edit-form (with valid action ids) and submit it with Bob's cookie.
const aliceEdit = (await alice.get(`/projects/${pid}/tasks/${taskId}`)).text;
r = await bob.submit(`/projects/${pid}/tasks/${taskId}`, "title", { title: "HACKED", status: "DONE", priority: "LOW", type: "TASK" }, aliceEdit);
ok(/not found/i.test(r.text), "Bob cannot edit Alice's task by replaying her form", r.text.slice(0, 100));
const aliceSettings = (await alice.get(`/projects/${pid}/settings`)).text;
r = await bob.submit(`/projects/${pid}/settings`, "name", { name: "HACKED", description: "" }, aliceSettings);
ok(/not found/i.test(r.text), "Bob cannot rename Alice's project by replaying her form");
r = await bob.submit(`/projects/${pid}/settings`, "confirmName", { confirmName: "Apollo" }, aliceSettings);
ok(/not found/i.test(r.text), "Bob cannot delete Alice's project by replaying her form");
const still = (await alice.get(`/projects/${pid}/tasks/${taskId}`)).text;
ok(!still.includes("HACKED"), "Alice's data is unchanged after the attacks");

console.log("\n== Team roles (Bob becomes a viewer) ==");
r = await alice.submit(`/projects/${pid}/team`, "email", { email: "bob@example.com", role: "VIEWER" });
ok(r.text.includes("Member added"), "Alice adds Bob as Viewer");
ok((await bob.get(`/projects/${pid}`)).status === 200, "Bob can now open the project");
ok((await bob.get("/notifications")).text.includes("added to"), "Bob received an in-app notification");
{ const x = await bob.get(`/projects/${pid}/tasks/new`); ok(/noindex/.test(x.text) && !x.text.includes('name="title"'), "viewer cannot open the new-task form"); }
ok((await bob.get(`/projects/${pid}/settings`)).text.includes("Only owners and admins"), "viewer sees a permission message on Settings");
const viewerEdit = (await bob.get(`/projects/${pid}/tasks/${taskId}`)).text;
ok(!viewerEdit.includes('name="title"'), "viewer sees a read-only task (no edit form)");
r = await bob.submit(`/projects/${pid}/tasks/${taskId}`, "title", { title: "HACKED", status: "DONE", priority: "LOW", type: "TASK" }, aliceEdit);
ok(/permission/i.test(r.text), "viewer replaying an editor's form is refused", r.text.slice(0, 80));
r = await alice.get(`/projects/${pid}/activity`); ok(r.text.includes("created the project") && r.text.includes("added Bob"), "activity history records what happened");

console.log("\n== Archive and sign out ==");
r = await alice.submit(`/projects/${pid}/settings`, "projectId", {}, (await alice.get(`/projects/${pid}/settings`)).text.split("<form").filter((f) => f.includes("Archive project")).map((f) => "<form" + f).join(""));
ok(r.text.includes("archived"), "owner archives the project");
r = await alice.get(`/projects/${pid}/tasks/new`); ok(r.text.includes("archived"), "archived project blocks new tasks");
r = await alice.submit("/dashboard", "\\$ACTION_ID_[^\"]*", {});
ok(r.status === 303 && r.location?.endsWith("/login") && !alice.jar.has("sb_session"), "sign out clears the session and goes to /login", `${r.status} ${r.location}`);
ok((await alice.get("/dashboard")).status === 307, "after sign out, /dashboard needs login again");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
