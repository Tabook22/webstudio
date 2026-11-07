import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { localizeError, useI18n } from "../i18n";
import type { Studio } from "../studio";
import type { StaffAccount, WelcomeCopy } from "../types";
import { WELCOME_DEFAULTS, readWelcome } from "../welcome";
import { CourseSettings } from "./CourseSettings";

export function AdminDialog({ studio }: { studio: Studio }) {
  const { tx } = useI18n();
  const close = () => studio.setModal(null);
  const title = !studio.staff
    ? tx("Coordinator sign in", "دخول منسق المقرر")
    : studio.staff.role === "admin"
      ? tx("Admin", "المدير")
      : tx("Course settings", "إعدادات المقررات");
  return (
    <div className="modal-back" onMouseDown={close}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label={tx("Close", "إغلاق")}>×</button>
        </header>
        <div className="modal-body">
          {studio.staff ? <AdminDesk studio={studio} /> : <StaffSignIn studio={studio} />}
        </div>
      </div>
    </div>
  );
}

export function StaffSignIn({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const [setup, setSetup] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let gone = false;
    api.staffStatus().then((status) => {
      if (!gone) setSetup(status.needs_setup);
    }).catch((err) => {
      if (!gone) setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    });
    return () => { gone = true; };
  }, [lang]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (setup) await studio.setupAdmin(username, password, displayName);
      else await studio.signInStaff(username, password);
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  if (setup === null) return <p className="hint">{tx("Checking the coordinator sign-in…", "جارٍ التحقق من دخول المنسق…")}</p>;

  return (
    <form className="stack-form" onSubmit={(event) => void submit(event)}>
      {setup ? (
        <p className="hint">{tx("Create the first admin. This person makes usernames for course settings.", "أنشئ المدير الأول. هذا الشخص ينشئ أسماء الدخول لإعدادات المقررات.")}</p>
      ) : (
        <p className="hint">{tx("Course settings need a coordinator or admin username and password.", "إعدادات المقررات تحتاج اسم مستخدم وكلمة مرور للمنسق أو المدير.")}</p>
      )}
      {setup && <label>{tx("Your name", "اسمك")}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} dir="auto" autoComplete="name" /></label>}
      <label>{tx("Username", "اسم المستخدم")}<input dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
      <label>{tx("Password", "كلمة المرور")}<input dir="ltr" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={setup ? "new-password" : "current-password"} /></label>
      <button className="tb primary" type="submit" disabled={busy}>{setup ? tx("Create admin", "إنشاء المدير") : tx("Sign in", "تسجيل الدخول")}</button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

function AdminDesk({ studio }: { studio: Studio }) {
  const { tx, lang } = useI18n();
  const staff = studio.staff;
  const admin = staff?.role === "admin";
  const [page, setPage] = useState<"accounts" | "courses" | "welcome">(admin ? "accounts" : "courses");
  const [current, setCurrent] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!staff) return;
    let gone = false;
    api.staffMe(staff.token).catch(() => {
      if (!gone) studio.signOutStaff();
    });
    return () => { gone = true; };
    // Confirm the saved sign-in still works.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff?.token]);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!staff) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const updated = await api.staffPassword(staff.token, { current_password: current, password: nextPassword });
      studio.applyStaff(updated, false);
      setCurrent("");
      setNextPassword("");
      setNote(tx("Password changed.", "تم تغيير كلمة المرور."));
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  if (!staff) return null;

  return (
    <div className="admin-desk">
      <p className="hint">{tx(`Signed in as ${staff.displayName} (${staff.username}).`, `تم الدخول باسم ${staff.displayName} (${staff.username}).`)}</p>
      <div className="form-actions">
        {admin && (
          <div className="seg" role="tablist">
            <button type="button" aria-selected={page === "accounts"} onClick={() => setPage("accounts")}>{tx("Accounts", "الحسابات")}</button>
            <button type="button" aria-selected={page === "courses"} onClick={() => setPage("courses")}>{tx("Courses", "المقررات")}</button>
            <button type="button" aria-selected={page === "welcome"} onClick={() => setPage("welcome")}>{tx("Welcome", "الترحيب")}</button>
          </div>
        )}
        <button type="button" className="tb" onClick={studio.signOutStaff}>{tx("Sign out", "تسجيل الخروج")}</button>
      </div>
      {admin && page === "accounts" && <Accounts studio={studio} onStaff={studio.applyStaff} />}
      {admin && page === "welcome" && <WelcomeEditor token={staff.token || ""} />}
      {(!admin || page === "courses") && <CourseSettings studio={studio} />}
      <form className="stack-form" onSubmit={(event) => void changePassword(event)}>
        <h3>{tx("Change your password", "غيّر كلمة مرورك")}</h3>
        <label>{tx("Current password", "كلمة المرور الحالية")}<input dir="ltr" type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" /></label>
        <label>{tx("New password", "كلمة المرور الجديدة")}<input dir="ltr" type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} autoComplete="new-password" /></label>
        <button className="tb" type="submit" disabled={busy}>{tx("Change password", "تغيير كلمة المرور")}</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="hint">{note}</p>}
    </div>
  );
}

function WelcomeEditor({ token }: { token: string }) {
  const { tx, lang } = useI18n();
  const [form, setForm] = useState<WelcomeCopy>(WELCOME_DEFAULTS);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let gone = false;
    api.welcome()
      .then((copy) => {
        if (!gone) setForm(readWelcome(copy));
      })
      .catch((err) => {
        if (!gone) setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
      })
      .finally(() => {
        if (!gone) setReady(true);
      });
    return () => { gone = true; };
    // Load the saved words once. A language change should not wipe an unsaved edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(key: keyof WelcomeCopy, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: { preventDefault(): void }, next = form) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      const saved = await api.saveWelcome(token, next);
      setForm(readWelcome(saved));
      setNote(tx("Welcome window saved. Refresh the studio to see it.", "تم حفظ نافذة الترحيب. حدّث الصفحة لرؤيتها."));
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p className="hint">{tx("Loading the welcome window…", "جارٍ تحميل نافذة الترحيب…")}</p>;

  return (
    <form className="stack-form welcome-form" onSubmit={(event) => void save(event)}>
      <h3>{tx("Welcome window", "نافذة الترحيب")}</h3>
      <p className="hint">{tx("These boxes start with the words students see now. Change any line, then save. Leave a credit or purpose line empty to take it off the window. An empty name or version keeps the original words.", "هذه الخانات تبدأ بالنص الذي يراه الطلاب الآن. غيّر أي سطر ثم احفظ. اترك خانة التصميم أو الغرض فارغة لإزالتها من النافذة. الاسم أو الإصدار الفارغ يبقي النص الأصلي.")}</p>
      <label>{tx("Version", "الإصدار")}<input dir="ltr" maxLength={40} value={form.version} onChange={(event) => setField("version", event.target.value)} /></label>
      <div className="welcome-fields">
        <label>{tx("Name in English", "الاسم بالإنجليزية")}<input dir="ltr" maxLength={80} value={form.title_en} onChange={(event) => setField("title_en", event.target.value)} /></label>
        <label>{tx("Name in Arabic", "الاسم بالعربية")}<input dir="rtl" maxLength={80} value={form.title_ar} onChange={(event) => setField("title_ar", event.target.value)} /></label>
        <label>{tx("Credit in English", "عبارة التصميم بالإنجليزية")}<input dir="ltr" maxLength={160} value={form.credit_en} onChange={(event) => setField("credit_en", event.target.value)} /></label>
        <label>{tx("Credit in Arabic", "عبارة التصميم بالعربية")}<input dir="rtl" maxLength={160} value={form.credit_ar} onChange={(event) => setField("credit_ar", event.target.value)} /></label>
        <label>{tx("Purpose in English, first line", "الغرض بالإنجليزية، السطر الأول")}<textarea dir="ltr" rows={2} maxLength={220} value={form.line1_en} onChange={(event) => setField("line1_en", event.target.value)} /></label>
        <label>{tx("Purpose in Arabic, first line", "الغرض بالعربية، السطر الأول")}<textarea dir="rtl" rows={2} maxLength={220} value={form.line1_ar} onChange={(event) => setField("line1_ar", event.target.value)} /></label>
        <label>{tx("Purpose in English, second line", "الغرض بالإنجليزية، السطر الثاني")}<textarea dir="ltr" rows={2} maxLength={220} value={form.line2_en} onChange={(event) => setField("line2_en", event.target.value)} /></label>
        <label>{tx("Purpose in Arabic, second line", "الغرض بالعربية، السطر الثاني")}<textarea dir="rtl" rows={2} maxLength={220} value={form.line2_ar} onChange={(event) => setField("line2_ar", event.target.value)} /></label>
      </div>
      <div className="form-actions">
        <button className="tb primary" type="submit" disabled={busy}>{tx("Save welcome window", "حفظ نافذة الترحيب")}</button>
        <button className="tb" type="button" disabled={busy} onClick={(event) => { setForm(WELCOME_DEFAULTS); void save(event, WELCOME_DEFAULTS); }}>{tx("Restore the original words", "إعادة النص الأصلي")}</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="hint">{note}</p>}
    </form>
  );
}

function Accounts({ studio, onStaff }: { studio: Studio; onStaff: (user: StaffAccount, open: boolean) => void }) {
  const { tx, lang } = useI18n();
  const token = studio.staff?.token || "";
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "coordinator">("coordinator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const list = await api.staffAccounts(token);
    setAccounts(list);
  }

  useEffect(() => {
    let gone = false;
    load().catch((err) => {
      if (!gone) setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    });
    return () => { gone = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      await api.staffCreate(token, { username, password, display_name: displayName, role });
      setDisplayName("");
      setUsername("");
      setPassword("");
      setRole("coordinator");
      await load();
      setNote(tx("Account created.", "تم إنشاء الحساب."));
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  async function save(account: StaffAccount, patch: { display_name?: string; role?: string; active?: boolean; password?: string }) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const updated = await api.staffUpdate(token, account.id, patch);
      if (updated.username === studio.staff?.username && updated.token) onStaff(updated, false);
      await load();
      setNote(tx("Account saved.", "تم حفظ الحساب."));
    } catch (err) {
      setError(localizeError(err instanceof Error ? err.message : "Request failed", lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-accounts">
      <form className="stack-form" onSubmit={(event) => void create(event)}>
        <h3>{tx("New account", "حساب جديد")}</h3>
        <p className="hint">{tx("A coordinator manages courses and exams. An admin can also create accounts.", "المنسق يدير المقررات والاختبارات. المدير يستطيع أيضًا إنشاء الحسابات.")}</p>
        <label>{tx("Name", "الاسم")}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} dir="auto" /></label>
        <div className="form-row">
          <label>{tx("Username", "اسم المستخدم")}<input dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" /></label>
          <label>{tx("Password", "كلمة المرور")}<input dir="ltr" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>
        </div>
        <label>{tx("Role", "الدور")}<select value={role} onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "coordinator")}>
          <option value="coordinator">{tx("Coordinator", "منسق المقرر")}</option>
          <option value="admin">{tx("Admin", "مدير")}</option>
        </select></label>
        <button className="tb primary" type="submit" disabled={busy}>{tx("Create account", "إنشاء الحساب")}</button>
      </form>
      <div className="account-list">
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} self={account.username === studio.staff?.username} busy={busy} onSave={(patch) => save(account, patch)} />
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="hint">{note}</p>}
    </div>
  );
}

function AccountCard({
  account,
  self,
  busy,
  onSave,
}: {
  account: StaffAccount;
  self: boolean;
  busy: boolean;
  onSave: (patch: { display_name?: string; role?: string; active?: boolean; password?: string }) => Promise<void>;
}) {
  const { tx } = useI18n();
  const [name, setName] = useState(account.display_name);
  const [role, setRole] = useState(account.role);
  const [password, setPassword] = useState("");

  useEffect(() => {
    setName(account.display_name);
    setRole(account.role);
    setPassword("");
  }, [account.display_name, account.role, account.active]);

  return (
    <form className="account-card" onSubmit={(event) => { event.preventDefault(); void onSave({ display_name: name, role, password }); }}>
      <header>
        <strong dir="auto">{account.display_name}</strong>
        <span dir="ltr">{account.username} · {account.active ? tx("On", "مفعّل") : tx("Off", "متوقف")}</span>
      </header>
      <div className="form-row">
        <label>{tx("Name", "الاسم")}<input value={name} onChange={(event) => setName(event.target.value)} dir="auto" /></label>
        <label>{tx("Role", "الدور")}<select value={role} onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "coordinator")}>
          <option value="coordinator">{tx("Coordinator", "منسق المقرر")}</option>
          <option value="admin">{tx("Admin", "مدير")}</option>
        </select></label>
      </div>
      <label>{tx("New password, or leave blank", "كلمة مرور جديدة، أو اتركها فارغة")}<input dir="ltr" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label>
      <div className="form-actions">
        <button className="tb primary" type="submit" disabled={busy}>{tx("Save account", "حفظ الحساب")}</button>
        {!self && (
          <button className="tb" type="button" disabled={busy} onClick={() => void onSave({ active: !account.active })}>
            {account.active ? tx("Turn off", "إيقاف") : tx("Turn on", "تشغيل")}
          </button>
        )}
      </div>
    </form>
  );
}
