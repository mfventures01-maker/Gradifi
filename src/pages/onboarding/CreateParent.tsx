import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Copy, Loader2, Users } from 'lucide-react';
import { onboardingService, type SchoolStudent } from '../../services/onboardingService';

interface CreateParentProps {
  schoolId?: string;
  institutionId?: string;
  preSelectedStudentId?: string;
  onSuccess?: () => void;
}

export const CreateParent: React.FC<CreateParentProps> = ({
  schoolId = '',
  institutionId = '',
  preSelectedStudentId = '',
  onSuccess,
}) => {
  const navigate=useNavigate();
  const [students,setStudents]=useState<SchoolStudent[]>([]);
  const [selectedStudentId,setSelectedStudentId]=useState(preSelectedStudentId);
  const [parentName,setParentName]=useState('');
  const [parentPhone,setParentPhone]=useState('');
  const [parentEmail,setParentEmail]=useState('');
  const [relationship,setRelationship]=useState<'father'|'mother'|'guardian'|'other'>('guardian');
  const [isPrimary,setIsPrimary]=useState(true);
  const [loadingStudents,setLoadingStudents]=useState(true);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [success,setSuccess]=useState<{
    parent_id:string;profile_id:string;parent_name:string;phone:string;email:string;
    student_id:string;pin:string;is_existing:boolean;
  }|null>(null);
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      setLoadingStudents(true);setError(null);
      try{
        if(!schoolId||!institutionId)throw new Error('An authenticated school context is required.');
        const rows=await onboardingService.getSchoolStudents(schoolId);
        if(mounted){
          setStudents(rows);
          if(preSelectedStudentId)setSelectedStudentId(preSelectedStudentId);
          else if(rows.length>0)setSelectedStudentId(rows[0].id);
        }
      }catch(err){
        if(mounted)setError(err instanceof Error?err.message:'Could not load persisted students.');
      }finally{if(mounted)setLoadingStudents(false);}
    })();
    return ()=>{mounted=false;};
  },[schoolId,institutionId,preSelectedStudentId]);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();setError(null);
    if(!schoolId||!institutionId){setError('An authenticated school context is required.');return;}
    if(!selectedStudentId){setError('Select an existing student.');return;}
    setLoading(true);
    try{
      const result=await onboardingService.createParentAccount({
        student_id:selectedStudentId,name:parentName,phone:parentPhone,email:parentEmail,
        relationship,is_primary:isPrimary,
      });
      setSuccess(result);onSuccess?.();
    }catch(err){
      setError(err instanceof Error?err.message:'Parent provisioning failed.');
    }finally{setLoading(false);}
  };

  if(success)return <section className="mx-auto max-w-xl rounded-2xl border bg-white p-6">
    <CheckCircle2 className="h-10 w-10 text-emerald-600"/>
    <h1 className="mt-3 text-2xl font-bold">{success.is_existing?'Parent linked':'Parent account created'}</h1>
    <p className="mt-1 text-sm text-slate-600">The server confirmed the parent identity and student relationship. The invitation was sent to {success.email}.</p>
    <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
      <p><span className="text-slate-500">Parent:</span> <strong>{success.parent_name}</strong></p>
      <p><span className="text-slate-500">Phone:</span> {success.phone}</p>
      <p><span className="text-slate-500">Profile ID:</span> <code className="break-all">{success.profile_id}</code></p>
      <div className="border-t pt-3"><p className="text-xs text-slate-500">One-time 4-digit PIN</p><div className="flex items-center justify-between"><strong className="font-mono text-2xl tracking-widest">{success.pin}</strong><button type="button" onClick={()=>{void navigator.clipboard.writeText(success.pin);setCopied(true);}} className="rounded-lg border px-3 py-2">{copied?'Copied':<Copy className="h-4 w-4"/>}</button></div></div>
    </div>
    <button type="button" onClick={()=>navigate('/portal/principal')} className="mt-5 w-full rounded-xl bg-blue-600 p-3 font-semibold text-white">Back to Dashboard</button>
  </section>;

  return <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 rounded-2xl border bg-white p-6">
    <div className="flex items-center gap-3"><Users className="h-6 w-6 text-amber-600"/><div><h1 className="text-xl font-bold">Invite Parent or Guardian</h1><p className="text-xs text-slate-500">Link a verified parent account to a persisted student record.</p></div></div>
    {error&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4"/>{error}</div>}
    <label className="block text-sm">Student<select required disabled={loadingStudents||students.length===0} value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)} className="mt-1 w-full rounded-lg border p-3"><option value="">{loadingStudents?'Loading persisted students…':'Select a student'}</option>{students.map(student=><option key={student.id} value={student.id}>{student.first_name} {student.last_name} · {student.class_name} · {student.student_number}</option>)}</select></label>
    <label className="block text-sm">Parent or guardian name<input required minLength={2} value={parentName} onChange={e=>setParentName(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label>
    <label className="block text-sm">Phone number<input required minLength={7} value={parentPhone} onChange={e=>setParentPhone(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label>
    <label className="block text-sm">Email address<input required type="email" value={parentEmail} onChange={e=>setParentEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm">Relationship<select value={relationship} onChange={e=>setRelationship(e.target.value as typeof relationship)} className="mt-1 w-full rounded-lg border p-3"><option value="father">Father</option><option value="mother">Mother</option><option value="guardian">Guardian</option><option value="other">Other</option></select></label><label className="text-sm">Primary contact<select value={isPrimary?'true':'false'} onChange={e=>setIsPrimary(e.target.value==='true')} className="mt-1 w-full rounded-lg border p-3"><option value="true">Yes</option><option value="false">No</option></select></label></div>
    <button disabled={loading||loadingStudents||students.length===0||!selectedStudentId} className="w-full rounded-xl bg-amber-600 p-3 font-semibold text-white disabled:opacity-50">{loading?<><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Provisioning parent…</>:'Create parent account and link student'}</button>
  </form>;
};
