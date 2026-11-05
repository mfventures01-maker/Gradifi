import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { onboardingService, type StaffRole } from '../../services/onboardingService';

interface CreateStaffAccountProps {
  role: StaffRole;
  schoolId: string;
  institutionId: string;
}

const ROLE_LABEL: Record<StaffRole,string> = {
  teacher: 'Teacher',
  vice_principal: 'Vice Principal',
  bursar: 'Bursar',
};

export const CreateStaffAccount: React.FC<CreateStaffAccountProps> = ({ role, schoolId, institutionId }) => {
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [phone,setPhone]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [receipt,setReceipt]=useState<{profile_id:string;full_name:string;email:string;pin:string}|null>(null);
  const [copied,setCopied]=useState(false);

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    setError(null);
    if(!schoolId || !institutionId){
      setError('An authenticated principal with an active school membership is required.');
      return;
    }
    setLoading(true);
    try{
      const result=await onboardingService.createStaffAccount({role,name,email,phone});
      setReceipt(result);
    }catch(err){
      setError(err instanceof Error?err.message:'Staff provisioning failed.');
    }finally{
      setLoading(false);
    }
  };

  if(receipt){
    return <section className="max-w-xl mx-auto rounded-2xl border border-emerald-200 bg-white p-6">
      <CheckCircle2 className="h-10 w-10 text-emerald-600"/>
      <h1 className="mt-3 text-xl font-bold">{ROLE_LABEL[role]} account provisioned</h1>
      <p className="mt-1 text-sm text-slate-600">The database confirmed the profile, identity and school membership. An invitation email was sent.</p>
      <dl className="mt-4 space-y-2 text-sm"><div><dt className="text-slate-500">Name</dt><dd>{receipt.full_name}</dd></div><div><dt className="text-slate-500">Email</dt><dd>{receipt.email}</dd></div><div><dt className="text-slate-500">Profile ID</dt><dd className="font-mono break-all">{receipt.profile_id}</dd></div></dl>
      <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">One-time sign-in PIN</p><div className="flex items-center justify-between"><strong className="font-mono text-2xl tracking-widest">{receipt.pin}</strong><button type="button" onClick={()=>{void navigator.clipboard.writeText(receipt.pin);setCopied(true);}} className="rounded-lg border px-3 py-2 text-sm">{copied?'Copied':'Copy PIN'} <Copy className="inline h-4 w-4"/></button></div></div>
    </section>;
  }

  return <form onSubmit={submit} className="max-w-xl mx-auto rounded-2xl border bg-white p-6 space-y-4">
    <h1 className="text-2xl font-bold">Create {ROLE_LABEL[role]} account</h1>
    {error&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4"/>{error}</div>}
    <label className="block text-sm">Full name<input required minLength={2} value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label>
    <label className="block text-sm">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label>
    <label className="block text-sm">Phone number<input required value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label>
    <button disabled={loading||!schoolId||!institutionId} className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-50">{loading?<><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Provisioning on server…</>:'Create account and send invitation'}</button>
  </form>;
};
