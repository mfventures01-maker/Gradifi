import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Loader2, User } from 'lucide-react';
import { onboardingService, EnrollStudentResponse, SchoolClass } from '../../services/onboardingService';

interface CreateStudentProps {
  schoolId: string;
  institutionId: string;
  onSuccess?: (student: EnrollStudentResponse) => void;
  onNavigateToDashboard?: () => void;
}

export const CreateStudent: React.FC<CreateStudentProps> = ({schoolId,institutionId,onSuccess,onNavigateToDashboard}) => {
  const [firstName,setFirstName]=useState('');
  const [lastName,setLastName]=useState('');
  const [classId,setClassId]=useState('');
  const [gender,setGender]=useState<'male'|'female'>('male');
  const [dateOfBirth,setDateOfBirth]=useState('');
  const [classes,setClasses]=useState<SchoolClass[]>([]);
  const [loadingClasses,setLoadingClasses]=useState(true);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [student,setStudent]=useState<EnrollStudentResponse|null>(null);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      setLoadingClasses(true);setError(null);
      try{
        if(!schoolId||!institutionId)throw new Error('Authenticated school context is required.');
        const rows=await onboardingService.getSchoolClasses(schoolId);
        if(rows.length===0)throw new Error('No persisted classes are available. Complete academic structure setup first.');
        if(mounted){setClasses(rows);setClassId(rows[0].id);}
      }catch(err){
        if(mounted)setError(err instanceof Error?err.message:'Could not load persisted classes.');
      }finally{if(mounted)setLoadingClasses(false);}
    })();
    return ()=>{mounted=false;};
  },[schoolId,institutionId]);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setError(null);
    if(!schoolId||!institutionId){setError('An active school membership is required.');return;}
    setLoading(true);
    try{
      const result=await onboardingService.enrollStudent({
        first_name:firstName,last_name:lastName,class_id:classId,school_id:schoolId,
        institution_id:institutionId,gender,date_of_birth:dateOfBirth||undefined,
      });
      setStudent(result);onSuccess?.(result);
    }catch(err){setError(err instanceof Error?err.message:'Student enrollment failed.');}
    finally{setLoading(false);}
  };

  if(student)return <section className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-6">
    <CheckCircle2 className="h-10 w-10 text-emerald-600"/><h1 className="mt-3 text-2xl font-bold">Student Enrollment Confirmed</h1>
    <p className="mt-1 text-sm text-slate-600">The server returned the persisted student record and authoritative student number.</p>
    <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4"><div><p className="text-xs text-slate-500">Student</p><strong>{firstName} {lastName}</strong></div><div><p className="text-xs text-slate-500">Student number</p><div className="flex items-center gap-3"><strong className="font-mono text-lg">{student.student_number}</strong><button type="button" onClick={()=>{void navigator.clipboard.writeText(student.student_number);setCopied(true);}} className="rounded-lg border p-2">{copied?'Copied':<Copy className="h-4 w-4"/>}</button></div></div><div><p className="text-xs text-slate-500">Database ID</p><code className="break-all">{student.student_id}</code></div><div><p className="text-xs text-slate-500">Class</p>{classes.find(row=>row.id===student.class_id)?.name||student.class_id}</div></div>
    <button type="button" onClick={()=>onNavigateToDashboard?.()} className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white">Continue</button>
  </section>;

  return <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-white p-6">
    <h1 className="text-2xl font-bold">Student Enrollment</h1>
    {error&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4"/>{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">First name<input required minLength={1} value={firstName} onChange={e=>setFirstName(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label><label className="text-sm">Last name<input required minLength={1} value={lastName} onChange={e=>setLastName(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label></div>
    <label className="block text-sm">Class<select required disabled={loadingClasses||classes.length===0} value={classId} onChange={e=>setClassId(e.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="">{loadingClasses?'Loading persisted classes…':'Select a class'}</option>{classes.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Gender<select value={gender} onChange={e=>setGender(e.target.value as 'male'|'female')} className="mt-1 w-full rounded-lg border p-3"><option value="male">Male</option><option value="female">Female</option></select></label><label className="text-sm">Date of birth<input type="date" value={dateOfBirth} onChange={e=>setDateOfBirth(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label></div>
    <button disabled={loading||loadingClasses||classes.length===0||!classId} className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-50">{loading?<><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Saving student…</>:'Enroll student'}</button>
  </form>;
};
