import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { authService } from "../../services/authService";
import { actorOnboardingService, ActorType, CreateActorResult } from "../../services/actorOnboardingService";

type AcademicRole = Extract<ActorType, "dean" | "hod" | "adviser" | "lecturer">;
type Option = { id: string; name: string };

export const HigherEducationOnboarding: React.FC = () => {
  const [institutionId, setInstitutionId] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState<Option[]>([]);
  const [faculties, setFaculties] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [role, setRole] = useState<AcademicRole>("lecturer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [supervisor, setSupervisor] = useState(false);
  const [maxStudents, setMaxStudents] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreateActorResult | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const identity = await authService.resolveCurrentIdentity();
        if (!identity.isAuthenticated || !identity.institutionId) throw new Error("Sign in with an institution administrator account first.");
        if (!active) return;
        setInstitutionId(identity.institutionId);
        const db = supabase as any;
        const [schoolRes, facultyRes, departmentRes] = await Promise.all([
          db.from("schools").select("id,school_name").eq("institution_id", identity.institutionId).order("school_name"),
          db.from("nuc_faculties").select("id,name").eq("institution_id", identity.institutionId).order("name"),
          db.from("nuc_departments").select("id,name").eq("institution_id", identity.institutionId).order("name"),
        ]);
        if (schoolRes.error) throw schoolRes.error;
        if (facultyRes.error) throw facultyRes.error;
        if (departmentRes.error) throw departmentRes.error;
        if (!active) return;
        setSchools((schoolRes.data || []).map((x: any) => ({ id: x.id, name: x.school_name })));
        setFaculties(facultyRes.data || []);
        setDepartments(departmentRes.data || []);
        if (schoolRes.data?.[0]) setSchoolId(schoolRes.data[0].id);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load institution structure.");
      }
    })();
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!institutionId) throw new Error("Institution context is required.");
      if (!fullName.trim()) throw new Error("Full name is required.");
      if (role === "dean" && !facultyId) throw new Error("Select the faculty this Dean will lead.");
      if (role === "hod" && !departmentId) throw new Error("Select the department this HOD will lead.");
      if (role === "adviser" && !departmentId) throw new Error("Select the adviser's department.");
      if (role === "lecturer" && (!schoolId || !email.trim())) throw new Error("Lecturer requires a campus and official email.");
      const result = await actorOnboardingService.create({
        actor_type: role,
        institution_id: institutionId,
        school_id: role === "lecturer" ? schoolId : null,
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        faculty_id: facultyId || null,
        department_id: departmentId || null,
        title: title.trim() || null,
        rank: rank.trim() || null,
        specialization: specialization.trim() || null,
        is_graduate_student_supervisor: supervisor,
        max_students: maxStudents ? Number(maxStudents) : null,
      });
      setCreated(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account provisioning failed.");
    } finally {
      setLoading(false);
    }
  };

  if (created) return <main className="mx-auto max-w-xl p-6"><section className="rounded-2xl border bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-bold text-slate-900">Academic account created</h1>
    <p className="mt-2 text-sm text-slate-600">Give these credentials to the account holder. The temporary PIN must be changed at first sign-in.</p>
    <dl className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
      <div><dt className="text-slate-500">Role</dt><dd className="font-semibold">{created.actor_type}</dd></div>
      <div><dt className="text-slate-500">Name</dt><dd className="font-semibold">{created.full_name}</dd></div>
      <div><dt className="text-slate-500">Generated Login ID</dt><dd className="font-mono font-bold">{created.login_id}</dd></div>
      <div><dt className="text-slate-500">Temporary 6-digit PIN</dt><dd className="font-mono text-xl font-bold">{created.pin}</dd></div>
    </dl>
    <button className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-white" onClick={() => { setCreated(null); setFullName(""); setEmail(""); setPhone(""); }}>Create another account</button>
  </section></main>;

  return <main className="mx-auto max-w-2xl p-6"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-bold text-slate-900">Higher Institution Staff Onboarding</h1>
    <p className="mt-1 text-sm text-slate-600">Provision Dean, Head of Department, Course Adviser and Lecturer accounts with generated IDs and temporary PINs.</p>
    {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">Academic role
        <select value={role} onChange={e => setRole(e.target.value as AcademicRole)} className="mt-1 w-full rounded-lg border p-2">
          <option value="dean">Dean</option><option value="hod">Head of Department</option><option value="adviser">Course Adviser</option><option value="lecturer">Lecturer</option>
        </select>
      </label>
      <label className="block text-sm font-medium">Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Official email<input type="email" required={role==="lecturer"} value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
        <label className="block text-sm font-medium">Phone<input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
      </div>
      {(role==="dean" || role==="lecturer") && <label className="block text-sm font-medium">Faculty
        <select value={facultyId} onChange={e=>setFacultyId(e.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Select faculty</option>{faculties.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </label>}
      {(role==="hod" || role==="adviser" || role==="lecturer") && <label className="block text-sm font-medium">Department
        <select value={departmentId} onChange={e=>setDepartmentId(e.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Select department</option>{departments.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </label>}
      {role==="lecturer" && <>
        <label className="block text-sm font-medium">Campus / School
          <select value={schoolId} onChange={e=>setSchoolId(e.target.value)} required className="mt-1 w-full rounded-lg border p-2"><option value="">Select campus</option>{schools.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Academic title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Dr., Prof., Mr." className="mt-1 w-full rounded-lg border p-2"/></label>
          <label className="block text-sm font-medium">Academic rank<input value={rank} onChange={e=>setRank(e.target.value)} placeholder="Senior Lecturer" className="mt-1 w-full rounded-lg border p-2"/></label>
        </div>
        <label className="block text-sm font-medium">Specialization<input value={specialization} onChange={e=>setSpecialization(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={supervisor} onChange={e=>setSupervisor(e.target.checked)}/> Graduate student supervisor</label>
        {supervisor && <label className="block text-sm font-medium">Maximum supervisees<input type="number" min="1" value={maxStudents} onChange={e=>setMaxStudents(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>}
      </>}
      <button disabled={loading || !institutionId} className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Provisioning..." : "Create academic account"}</button>
    </form>
  </section></main>;
};
