import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { authService } from "../../services/authService";
import { actorOnboardingService, ActorType, CreateActorResult } from "../../services/actorOnboardingService";

type AcademicRole = Extract<ActorType, "student" | "hod" | "adviser" | "lecturer">;
type Option = { id: string; name: string };
type AccountSummary = CreateActorResult & { createdAt: string };

const roleLabels: Record<AcademicRole, string> = {
  hod: "Head of Department",
  adviser: "Course Adviser",
  lecturer: "Lecturer",
  student: "Student",
};

const errorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Account provisioning failed.";
  if (message.includes("NUC_DEPARTMENT_NOT_IN_INSTITUTION")) return "That department is not registered under this institution. Refresh the department list and try again.";
  if (message.includes("DEPARTMENT_NOT_IN_INSTITUTION")) return "That adviser department is not registered under this institution. Refresh the department list and try again.";
  if (message.includes("ACTOR_SCHOOL_REQUIRED")) return "The institution's bootstrap campus could not be resolved. Contact the institution administrator.";
  if (message.includes("ACTOR_SCHOOL_OUTSIDE_INSTITUTION")) return "The selected campus does not belong to this institution. No account was created.";
  if (message.includes("LECTURER_EMAIL_REQUIRED")) return "An official email address is required for a lecturer.";
  if (message.includes("CLASS_NOT_IN_SCHOOL")) return "The selected class is not attached to the institution's bootstrap campus.";
  if (message.includes("STUDENT_LAST_NAME_REQUIRED") || message.includes("LECTURER_LAST_NAME_REQUIRED")) return "Enter the person's first name and surname.";
  if (message.includes("DEAN_ROOT_AUTHORITY_LINK_REQUIRED")) return "Your Dean account is missing its VC/Rector authority link. Ask the institution's executive administrator to restore it.";
  return message;
};

export const HigherEducationOnboarding: React.FC = () => {
  const [institutionId, setInstitutionId] = useState("");
  const [bootstrapCampus, setBootstrapCampus] = useState<Option | null>(null);
  const [faculties, setFaculties] = useState<Option[]>([]);
  const [nucDepartments, setNucDepartments] = useState<Option[]>([]);
  const [adviserDepartments, setAdviserDepartments] = useState<Option[]>([]);
  const [classes, setClasses] = useState<Option[]>([]);
  const [role, setRole] = useState<AcademicRole>("hod");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [supervisor, setSupervisor] = useState(false);
  const [maxStudents, setMaxStudents] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [latestAccount, setLatestAccount] = useState<AccountSummary | null>(null);
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const identity = await authService.resolveCurrentIdentity();
        if (!identity.isAuthenticated || !identity.institutionId) {
          throw new Error("Sign in with the institution's Dean account to manage academic accounts.");
        }
        if (identity.role !== "dean") {
          throw new Error("Only the institution's Dean can provision HOD, Adviser, Lecturer and Student accounts.");
        }
        if (!(identity.actor as any)?.authority_user_id) {
          throw new Error("DEAN_ROOT_AUTHORITY_LINK_REQUIRED");
        }
        const db = supabase as any;
        const [schoolRes, facultyRes, nucDepartmentRes, adviserDepartmentRes] = await Promise.all([
          db.from("schools")
            .select("id,school_name,school_type,created_at")
            .eq("institution_id", identity.institutionId)
            .order("created_at", { ascending: true }),
          db.from("nuc_faculties").select("id,name").eq("institution_id", identity.institutionId).order("name"),
          db.from("nuc_departments").select("id,name").eq("institution_id", identity.institutionId).order("name"),
          db.from("departments").select("id,name").eq("institution_id", identity.institutionId).order("name"),
        ]);
        if (schoolRes.error) throw schoolRes.error;
        if (facultyRes.error) throw facultyRes.error;
        if (nucDepartmentRes.error) throw nucDepartmentRes.error;
        if (adviserDepartmentRes.error) throw adviserDepartmentRes.error;
        const schoolRows = schoolRes.data || [];
        const campusRow = schoolRows.find((row: any) =>
          row.school_type === "tertiary" && / main campus$/i.test(row.school_name || "")
        ) || schoolRows.find((row: any) => row.school_type === "tertiary") || schoolRows[0];
        if (!campusRow) throw new Error("The bootstrap campus created during institution registration could not be found.");
        if (!active) return;
        setInstitutionId(identity.institutionId);
        setBootstrapCampus({ id: campusRow.id, name: campusRow.school_name });
        setFaculties((facultyRes.data || []).map((row: any) => ({ id: row.id, name: row.name })));
        setNucDepartments((nucDepartmentRes.data || []).map((row: any) => ({ id: row.id, name: row.name })));
        setAdviserDepartments((adviserDepartmentRes.data || []).map((row: any) => ({ id: row.id, name: row.name })));
        const classRes = await db.from("classes").select("id,name")
          .eq("school_id", campusRow.id).order("name");
        if (classRes.error) throw classRes.error;
        if (!active) return;
        setClasses((classRes.data || []).map((row: any) => ({ id: row.id, name: row.name })));
        setReady(true);
      } catch (caught) {
        if (active) setError(errorMessage(caught));
      }
    })();
    return () => { active = false; };
  }, []);

  const departments = useMemo(
    () => role === "adviser" ? adviserDepartments : nucDepartments,
    [role, adviserDepartments, nucDepartments]
  );

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setFacultyId("");
    setDepartmentId("");
    setClassId("");
    setTitle("");
    setRank("");
    setSpecialization("");
    setSupervisor(false);
    setMaxStudents("");
    setError("");
    setNotice("");
  };

  const changeRole = (nextRole: AcademicRole) => {
    setRole(nextRole);
    setDepartmentId("");
    setFacultyId("");
    setClassId("");
    setError("");
    setNotice("");
  };

  const copyValue = async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(""), 1800);
    } catch {
      setError("Clipboard access was blocked. Select and copy the credential manually.");
    }
  };

  const validate = () => {
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 2 && (role === "student" || role === "lecturer")) {
      throw new Error("Enter the person's first name and surname.");
    }
    if (!institutionId || !bootstrapCampus?.id) throw new Error("Institution and bootstrap campus context are required.");
    if ((role === "hod" || role === "adviser") && !departmentId) {
      throw new Error(role === "hod" ? "Select the department this HOD will lead." : "Select the adviser's department.");
    }
    if (role === "lecturer" && !email.trim()) throw new Error("An official email address is required for a lecturer.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new Error("Enter a valid email address.");
    }
    if (supervisor && (!maxStudents || !Number.isInteger(Number(maxStudents)) || Number(maxStudents) < 1)) {
      throw new Error("Enter a whole number of at least 1 for maximum supervisees.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      validate();
      const result = await actorOnboardingService.create({
        actor_type: role,
        institution_id: institutionId,
        // The deployed Edge Function requires this exact campus for lecturers.
        // It is the Main Campus row created by bootstrap_higher_institution.
        school_id: ["student", "lecturer"].includes(role) ? bootstrapCampus!.id : null,
        class_id: role === "student" ? classId : null,
        full_name: fullName.trim().replace(/\s+/g, " "),
        email: email.trim() || null,
        phone: phone.trim() || null,
        faculty_id: facultyId || null,
        department_id: departmentId || null,
        title: title.trim() || null,
        rank: rank.trim() || null,
        specialization: specialization.trim() || null,
        is_graduate_student_supervisor: role === "lecturer" && supervisor,
        max_students: role === "lecturer" && supervisor ? Number(maxStudents) : null,
      });
      const account: AccountSummary = { ...result, createdAt: new Date().toISOString() };
      setAccounts(current => [account, ...current]);
      setLatestAccount(account);
      resetForm();
      setNotice(roleLabels[role] + " account provisioned successfully.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const roleCount = (selectedRole: AcademicRole) => accounts.filter(account => account.actor_type === selectedRole).length;

  if (!ready && !error) {
    return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-5xl rounded-2xl border bg-white p-8 text-sm text-slate-600">Loading your institution, bootstrap campus and academic structure…</div></main>;
  }

  if (error && !institutionId) {
    return <main className="min-h-screen bg-slate-50 p-6"><section className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6"><h1 className="text-xl font-bold text-slate-900">Dean administration unavailable</h1><p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p><p className="mt-4 text-sm text-slate-600">No account has been created. Sign in with the Dean account associated with this institution.</p></section></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Gradifi · Higher Education</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Dean administration</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Provision department leadership, academic advisers, lecturers and students. Every account is independently authenticated and linked to the institution's VC/Rector authority.</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Bootstrap campus</p>
            <p className="mt-1 font-semibold">{bootstrapCampus?.name || "Resolving campus…"}</p>
            <p className="mt-1 text-xs text-indigo-700">Used for lecturer and student records</p>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          {(["hod", "adviser", "lecturer", "student"] as AcademicRole[]).map(item => (
            <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{roleLabels[item]}</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{roleCount(item)}</p>
              <p className="mt-1 text-xs text-slate-400">Created this session</p>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Create an academic account</h2>
                <p className="mt-1 text-sm text-slate-500">Select a role to see its required information.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Dean access</span>
            </div>

            {error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
            {notice && <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{notice}</div>}

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="academic-role" className="block text-sm font-semibold text-slate-800">Account type</label>
                <select id="academic-role" value={role} onChange={event => changeRole(event.target.value as AcademicRole)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                  <option value="hod">Head of Department</option>
                  <option value="adviser">Course Adviser</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div>
                <label htmlFor="full-name" className="block text-sm font-semibold text-slate-800">Full name <span className="text-rose-600">*</span></label>
                <input id="full-name" autoComplete="name" required minLength={role === "student" || role === "lecturer" ? 3 : 2} value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Enter first name and surname" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                {(role === "student" || role === "lecturer") && <p className="mt-1 text-xs text-slate-500">First name and surname are required for the academic record.</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-800">Email {role === "lecturer" && <span className="text-rose-600">*</span>}</label>
                  <input id="email" type="email" autoComplete="email" required={role === "lecturer"} value={email} onChange={event => setEmail(event.target.value)} placeholder={role === "lecturer" ? "lecturer@institution.edu.ng" : "Optional"} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-800">Phone number</label>
                  <input id="phone" type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="Optional" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              {(role === "hod" || role === "adviser" || role === "lecturer") && (
                <div>
                  <label htmlFor="department" className="block text-sm font-semibold text-slate-800">Department {(role === "hod" || role === "adviser") && <span className="text-rose-600">*</span>}</label>
                  <select id="department" required={role === "hod" || role === "adviser"} value={departmentId} onChange={event => setDepartmentId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select department</option>
                    {departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">{role === "adviser" ? "Uses the institution's academic departments register." : "Uses the institution's NUC department register."}</p>
                  {departments.length === 0 && <p className="mt-2 text-xs text-amber-700">No departments are available for this role yet. Add the institution's department records before provisioning.</p>}
                </div>
              )}

              {role === "lecturer" && (
                <>
                  <div>
                    <label htmlFor="faculty" className="block text-sm font-semibold text-slate-800">Faculty</label>
                    <select id="faculty" value={facultyId} onChange={event => setFacultyId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                      <option value="">Select faculty (optional)</option>
                      {faculties.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="academic-title" className="block text-sm font-semibold text-slate-800">Academic title</label>
                      <input id="academic-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Dr., Prof., Mr." className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div>
                      <label htmlFor="academic-rank" className="block text-sm font-semibold text-slate-800">Academic rank</label>
                      <input id="academic-rank" value={rank} onChange={event => setRank(event.target.value)} placeholder="Senior Lecturer" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="specialization" className="block text-sm font-semibold text-slate-800">Specialization</label>
                    <input id="specialization" value={specialization} onChange={event => setSpecialization(event.target.value)} placeholder="e.g. Computer Networks" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
                    <input type="checkbox" checked={supervisor} onChange={event => { setSupervisor(event.target.checked); if (!event.target.checked) setMaxStudents(""); }} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
                    <span><strong className="block text-slate-800">Graduate student supervisor</strong><span className="text-xs text-slate-500">Enable this lecturer to supervise graduate students.</span></span>
                  </label>
                  {supervisor && (
                    <div>
                      <label htmlFor="max-students" className="block text-sm font-semibold text-slate-800">Maximum supervisees <span className="text-rose-600">*</span></label>
                      <input id="max-students" type="number" min="1" step="1" required value={maxStudents} onChange={event => setMaxStudents(event.target.value)} placeholder="e.g. 5" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                  )}
                </>
              )}

              {(role === "lecturer" || role === "student") && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Institution bootstrap campus</p>
                  <p className="mt-1 font-semibold text-indigo-950">{bootstrapCampus?.name}</p>
                  <p className="mt-1 text-xs text-indigo-800">This is the campus record created by VC/Rector institution registration. The lecturer and student records are attached to this campus, not to an arbitrary school.</p>
                </div>
              )}

              {role === "student" && (
                <div>
                  <label htmlFor="student-class" className="block text-sm font-semibold text-slate-800">Class / academic cohort <span className="text-xs font-normal text-slate-500">(optional)</span></label>
                  <select id="student-class" value={classId} onChange={event => setClassId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                    <option value="">{classes.length ? "Assign a class or leave unassigned" : "No class records yet · continue without assignment"}</option>
                    {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">Higher-education students can be created before class or cohort structures are configured. You can assign a class later.</p>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                <button type="submit" disabled={loading || !ready} className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {loading ? "Creating secure account…" : "Create " + roleLabels[role] + " account"}
                </button>
                <button type="button" onClick={resetForm} disabled={loading} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Clear form</button>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">The system generates an independent Login ID and temporary PIN. Staff receive a 6-digit PIN; students receive a 4-digit PIN. The account holder must replace the temporary PIN at first sign-in.</p>
            </form>
          </section>

          <aside className="space-y-6">
            {latestAccount && (
              <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-700"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold">✓</span><h2 className="font-bold">Account created</h2></div>
                <p className="mt-2 text-sm text-slate-600">Share these temporary credentials securely with {latestAccount.full_name}. The PIN is shown only in this session.</p>
                <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs text-slate-500">Account holder</p>
                    <p className="font-semibold text-slate-900">{latestAccount.full_name}</p>
                    <p className="text-xs text-slate-500">{roleLabels[latestAccount.actor_type as AcademicRole] || latestAccount.actor_type}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-xs text-slate-500">Generated Login ID</p><p className="font-mono text-lg font-bold text-slate-950">{latestAccount.login_id}</p></div>
                    <button type="button" onClick={() => copyValue("login", latestAccount.login_id)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{copiedField === "login" ? "Copied" : "Copy ID"}</button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-xs text-slate-500">Temporary {latestAccount.actor_type === "student" ? "4" : "6"}-digit PIN</p><p className="font-mono text-2xl font-bold tracking-widest text-slate-950">{latestAccount.pin}</p></div>
                    <button type="button" onClick={() => copyValue("pin", latestAccount.pin)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{copiedField === "pin" ? "Copied" : "Copy PIN"}</button>
                  </div>
                  {latestAccount.student_number && <div><p className="text-xs text-slate-500">Student number</p><p className="font-mono font-semibold text-slate-900">{latestAccount.student_number}</p></div>}
                </div>
                <p className="mt-3 text-xs text-amber-700">Security note: deliver the Login ID and PIN privately. Do not post credentials in a group chat.</p>
                <button type="button" onClick={() => setLatestAccount(null)} className="mt-4 text-sm font-semibold text-indigo-700 hover:text-indigo-900">Dismiss credentials</button>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-950">Accounts created this session</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{accounts.length}</span></div>
              {accounts.length === 0 ? <p className="mt-4 text-sm text-slate-500">Newly provisioned accounts will appear here with their role and generated Login ID.</p> : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {accounts.map(account => (
                    <li key={account.user_id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{account.full_name}</p><p className="mt-0.5 text-xs text-slate-500">{roleLabels[account.actor_type as AcademicRole] || account.actor_type} · {account.login_id}</p></div>
                        <button type="button" onClick={() => setLatestAccount(account)} className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">View credentials</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-slate-950">Authority and access</h2>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li><strong className="text-slate-800">1. VC / Rector</strong> · institutional authority</li>
                <li><strong className="text-slate-800">2. Dean</strong> · creates academic accounts</li>
                <li><strong className="text-slate-800">3. HOD, Adviser, Lecturer, Student</strong> · independent PIN identities</li>
              </ol>
              <p className="mt-3 text-xs text-slate-500">The Dean can provision only the four roles shown here. The server enforces this restriction and attaches each account to the root VC/Rector authority.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};
