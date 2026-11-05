import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { onboardingService, type CreateInstitutionFormInput } from '../../services/onboardingService';
import { authService } from '../../services/authService';
import { CreateStaffAccount } from './CreateStaffAccount';
import { CreateStudent } from './CreateStudent';
import { BulkStudentImport } from './BulkStudentImport';
import { CreateParent } from './CreateParent';

type WizardData = CreateInstitutionFormInput & { password: string };

const initialData: WizardData = {
  institution_name: '',
  institution_type: 'secondary',
  registration_number: '',
  address: '',
  state: '',
  lga: '',
  phone: '',
  email: '',
  website: '',
  principal_name: '',
  principal_phone: '',
  principal_email: '',
  country: 'Nigeria',
  school_type: 'private',
  class_name: 'JSS 1',
  subject: 'Mathematics',
  password: '',
};

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');
  const [step,setStep]=useState(1);
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [authenticated,setAuthenticated]=useState(false);
  const [schoolId,setSchoolId]=useState('');
  const [institutionId,setInstitutionId]=useState('');
  const [formData,setFormData]=useState<WizardData>(initialData);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);

  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try{
        let user = null;
        try { user = await authService.getCurrentUser(); } catch { /* no session is a valid new-registration state */ }
        const identity = await authService.resolveCurrentIdentity();
        if(!mounted)return;
        setAuthenticated(Boolean(user));
        setSchoolId(identity.schoolId||'');
        setInstitutionId(identity.institutionId||'');
        const saved=window.localStorage.getItem('gradifi-onboarding-draft');
        if(saved){
          try{setFormData({...initialData,...JSON.parse(saved),password:''});}catch{window.localStorage.removeItem('gradifi-onboarding-draft');}
        }
      }catch(err){
        if(mounted)setError(err instanceof Error?err.message:'Could not resolve authenticated identity.');
      }finally{if(mounted)setLoading(false);}
    })();
    return ()=>{mounted=false;};
  },[]);

  const update=(patch:Partial<WizardData>)=>setFormData(current=>({...current,...patch}));

  const launch=async()=>{
    setError(null);setNotice(null);
    if(!formData.institution_name.trim()||!formData.principal_name.trim()||!formData.principal_email.trim()){
      setError('Institution name, principal name and principal email are required.');return;
    }
    if(!authenticated){
      if(formData.password.length<8){setError('Create a password with at least 8 characters for the principal account.');return;}
      setSubmitting(true);
      try{
        window.localStorage.setItem('gradifi-onboarding-draft',JSON.stringify({...formData,password:''}));
        const signup=await authService.signUpWithPassword(formData.principal_email,formData.password,formData.principal_name);
        if(!signup.session){
          setNotice('Your account was created. Confirm the email address, then sign in to resume institution provisioning. Your form draft is saved on this device.');
          return;
        }
        setAuthenticated(true);
      }catch(err){
        setError(err instanceof Error?err.message:'Principal account creation failed.');return;
      }finally{setSubmitting(false);}
    }

    setSubmitting(true);
    try{
      const result=await onboardingService.createInstitutionAccount(formData);
      window.localStorage.removeItem('gradifi-onboarding-draft');
      setSchoolId(result.school_id);
      setInstitutionId(result.institution_id);
      navigate('/portal/principal');
    }catch(err){
      setError(err instanceof Error?err.message:'Institution provisioning failed.');
    }finally{setSubmitting(false);}
  };

  if(loading)return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin"/></div>;

  if(view){
    if(!authenticated||!schoolId||!institutionId){
      return <div className="mx-auto mt-16 max-w-xl rounded-2xl border bg-white p-6"><h1 className="text-xl font-bold">School identity required</h1><p className="mt-2 text-sm text-slate-600">Sign in with an active school account. Demo school identifiers are not accepted.</p><Link className="mt-4 inline-block text-blue-700 underline" to="/login?next=%2Fonboarding">Sign in</Link></div>;
    }
    if(view==='create-teacher')return <CreateStaffAccount role="teacher" schoolId={schoolId} institutionId={institutionId}/>;
    if(view==='create-vp')return <CreateStaffAccount role="vice_principal" schoolId={schoolId} institutionId={institutionId}/>;
    if(view==='create-bursar')return <CreateStaffAccount role="bursar" schoolId={schoolId} institutionId={institutionId}/>;
    if(view==='create-student')return <CreateStudent schoolId={schoolId} institutionId={institutionId}/>;
    if(view==='bulk-import')return <BulkStudentImport schoolId={schoolId} institutionId={institutionId}/>;
    if(view==='create-parent')return <CreateParent schoolId={schoolId} institutionId={institutionId}/>;
  }

  return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-6">
      <div className="flex justify-between mb-8 text-xs text-slate-500 gap-2">
        {['School Basics','Principal Identity','First Class','Review'].map((label,index)=><span key={label} className={step>=index+1?'font-bold text-blue-700':''}>{label}</span>)}
      </div>
      {error&&<div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4"/>{error}</div>}
      {notice&&<div role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{notice}<div className="mt-2"><Link className="underline font-semibold" to="/login?next=%2Fonboarding%3Fresume%3D1">Sign in to resume</Link></div></div>}
      {step===1&&<section className="space-y-3"><h1 className="text-2xl font-bold">School Basics</h1>
        <label className="block text-sm">Institution name<input required value={formData.institution_name} onChange={e=>update({institution_name:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">Institution type<select value={formData.institution_type} onChange={e=>update({institution_type:e.target.value as CreateInstitutionFormInput['institution_type']})} className="mt-1 w-full rounded-lg border p-3"><option value="secondary">Secondary school</option><option value="polytechnic">Polytechnic</option><option value="university">University</option><option value="enterprise">Other institution</option></select></label>
          <label className="block text-sm">School ownership<select value={formData.school_type} onChange={e=>update({school_type:e.target.value})} className="mt-1 w-full rounded-lg border p-3"><option value="private">Private</option><option value="public">Public</option></select></label>
        </div>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Registration number (optional)<input value={formData.registration_number} onChange={e=>update({registration_number:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label><label className="block text-sm">Website (optional)<input type="url" value={formData.website} onChange={e=>update({website:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label></div>
        <label className="block text-sm">Address<input required value={formData.address} onChange={e=>update({address:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm">State<input required value={formData.state} onChange={e=>update({state:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label><label className="block text-sm">LGA<input required value={formData.lga} onChange={e=>update({lga:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label></div>
        <label className="block text-sm">School phone<input required value={formData.phone} onChange={e=>update({phone:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>
      </section>}
      {step===2&&<section className="space-y-3"><h1 className="text-2xl font-bold">Principal Identity</h1>
        <p className="text-sm text-slate-600">The principal must sign in with a confirmed Supabase Auth email. The server binds the institution and membership to that identity.</p>
        <label className="block text-sm">Principal full name<input required value={formData.principal_name} onChange={e=>update({principal_name:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>
        <label className="block text-sm">Principal email<input required type="email" value={formData.principal_email} onChange={e=>update({principal_email:e.target.value,email:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>
        <label className="block text-sm">Principal phone<input required value={formData.principal_phone} onChange={e=>update({principal_phone:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>
        {!authenticated&&<label className="block text-sm">Create password (minimum 8 characters)<input required type="password" minLength={8} value={formData.password} onChange={e=>update({password:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>}
      </section>}
      {step===3&&<section className="space-y-3"><h1 className="text-2xl font-bold">First Class & Subject</h1>
        <label className="block text-sm">First class<input required value={formData.class_name} onChange={e=>update({class_name:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>
        <label className="block text-sm">First subject<input required value={formData.subject} onChange={e=>update({subject:e.target.value})} className="mt-1 w-full rounded-lg border p-3"/></label>
      </section>}
      {step===4&&<section className="space-y-3"><h1 className="text-2xl font-bold">Review & Provision</h1>
        <p><strong>Institution:</strong> {formData.institution_name}</p><p><strong>Principal:</strong> {formData.principal_name} ({formData.principal_email})</p><p><strong>First class:</strong> {formData.class_name}</p><p><strong>First subject:</strong> {formData.subject}</p>
        <p className="text-sm text-slate-600">Provisioning, principal profile, active membership, six secondary classes and the first class-subject mapping commit in one database transaction.</p>
      </section>}
      <p className="mt-5 text-center text-sm text-slate-500">Already have a principal account? <Link className="font-semibold text-blue-700 underline" to="/login?next=%2Fonboarding%3Fresume%3D1">Sign in to continue</Link></p>
      <div className="mt-6 flex gap-3"><button type="button" disabled={submitting||step===1} onClick={()=>setStep(s=>Math.max(1,s-1))} className="rounded-xl border px-5 py-3 disabled:opacity-40">Back</button>
        <button type="button" disabled={submitting} onClick={()=>step<4?setStep(s=>s+1):void launch()} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50">{submitting?<><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Saving…</>:step===4?'Launch Institution':'Continue'}{!submitting&&<ArrowRight className="ml-2 inline h-4 w-4"/>}</button></div>
    </div>
  </div>;
};
