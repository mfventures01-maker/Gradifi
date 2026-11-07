import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { onboardingService } from '../../services/onboardingService';
import { authService } from '../../services/authService';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { CreateVP } from './CreateVP';
import { CreateBursar } from './CreateBursar';
import { CreateTeacher } from './CreateTeacher';
import { CreateStudent } from './CreateStudent';
import { BulkStudentImport } from './BulkStudentImport';
import { CreateParent } from './CreateParent';

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');

  const [schoolId, setSchoolId] = useState<string>('');
  const [institutionId, setInstitutionId] = useState<string>('');

  useEffect(() => {
    const pending = localStorage.getItem('sefaes.pending-root-onboarding');
    if (pending) {
      onboardingService.completePendingRootRegistration()
        .then(() => navigate('/portal/principal', { replace: true }))
        .catch((error) => {
          if (error instanceof Error && error.message !== 'VERIFIED_ROOT_SESSION_REQUIRED') {
            setErrorMessage(error.message);
          }
        });
    }

    authService.resolveCurrentIdentity().then((identity) => {
      if (identity.schoolId) setSchoolId(identity.schoolId);
      if (identity.institutionId) setInstitutionId(identity.institutionId);
    }).catch(() => undefined);
  }, [navigate]);

  // Check for VP view
  if (view === 'create-vp') {
    if (!schoolId || !institutionId) return <div className="p-8">A verified Principal session is required. <button onClick={() => navigate('/login')}>Sign in</button></div>;
    return <CreateVP schoolId={schoolId} institutionId={institutionId} />;
  }

  // Check for Bursar view
  if (view === 'create-bursar') {
    if (!schoolId || !institutionId) return <div className="p-8">A verified Principal session is required. <button onClick={() => navigate('/login')}>Sign in</button></div>;
    return <CreateBursar schoolId={schoolId} institutionId={institutionId} />;
  }

  // Check for Teacher view
  if (view === 'create-teacher') {
    if (!schoolId || !institutionId) return <div className="p-8">A verified Principal session is required. <button onClick={() => navigate('/login')}>Sign in</button></div>;
    return <CreateTeacher schoolId={schoolId} institutionId={institutionId} />;
  }

  // Check for Student view
  if (view === 'create-student') {
    if (!schoolId || !institutionId) return <div className="p-8">A verified Principal session is required. <button onClick={() => navigate('/login')}>Sign in</button></div>;
    return <CreateStudent schoolId={schoolId} institutionId={institutionId} />;
  }

  // Check for Bulk Import view
  if (view === 'bulk-import') {
    if (!schoolId || !institutionId) return <div className="p-8">A verified Principal session is required. <button onClick={() => navigate('/login')}>Sign in</button></div>;
    return <BulkStudentImport schoolId={schoolId} institutionId={institutionId} />;
  }

  // Check for Parent view
  if (view === 'create-parent') {
    if (!schoolId || !institutionId) return <div className="p-8">A verified Principal session is required. <button onClick={() => navigate('/login')}>Sign in</button></div>;
    return <CreateParent schoolId={schoolId} institutionId={institutionId} />;
  }

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    institution_name: '',
    institution_type: 'secondary' as const,
    registration_number: '',
    address: '',
    state: 'Lagos',
    lga: 'Ikeja',
    principal_name: '',
    principal_phone: '',
    principal_email: '',
    principal_password: '',
    class_name: 'JSS 1',
    subject: 'Mathematics'
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      setErrorMessage('');
      const result = await onboardingService.createInstitutionAccount({
        institution_name: formData.institution_name,
        institution_type: formData.institution_type,
        registration_number: formData.registration_number,
        country: 'Nigeria',
        address: formData.address,
        state: formData.state,
        lga: formData.lga,
        phone: formData.principal_phone,
        website: '',
        principal_name: formData.principal_name,
        principal_phone: formData.principal_phone,
        principal_email: formData.principal_email,
        principal_password: formData.principal_password,
      });
      if (result.requires_email_confirmation) {
        setStatusMessage('Check the Principal email inbox and verify the account. Return to this page after verification to finish institution creation.');
      } else {
        navigate('/portal/principal');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Institution registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1: return <Step1 data={formData} setData={setFormData} />;
      case 2: return <Step2 data={formData} setData={setFormData} />;
      case 3: return <Step3 data={formData} setData={setFormData} />;
      case 4: return <Step4 data={formData} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between mb-8 text-xs text-slate-400">
          <span className={step >= 1 ? "text-blue-600 font-bold" : ""}>School Basics</span>
          <span className={step >= 2 ? "text-blue-600 font-bold" : ""}>Admin Account</span>
          <span className={step >= 3 ? "text-blue-600 font-bold" : ""}>First Class</span>
          <span className={step >= 4 ? "text-blue-600 font-bold" : ""}>Review</span>
        </div>
        {renderStep()}
        {statusMessage && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{statusMessage}</p>}
        {errorMessage && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
        <button 
          onClick={handleNext} 
          disabled={loading}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : step === 4 ? 'Launch Institution' : 'Continue'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

const Step1 = ({ data, setData }: any) => (
  <div>
    <h2 className="text-2xl font-bold mb-4">School Basics</h2>
    <input placeholder="Institution Name" value={data.institution_name} onChange={e => setData({...data, institution_name: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <select value={data.institution_type} onChange={e => setData({...data, institution_type: e.target.value})} className="w-full p-3 border rounded-xl mb-3">
      <option value="secondary">Secondary School</option>
      <option value="primary">Primary School</option>
      <option value="k12">K-12 School</option>
      <option value="group_of_schools">Group of Schools</option>
    </select>
    <input placeholder="Registration Number" value={data.registration_number} onChange={e => setData({...data, registration_number: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input placeholder="Address" value={data.address} onChange={e => setData({...data, address: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input placeholder="State" value={data.state} onChange={e => setData({...data, state: e.target.value})} className="w-full p-3 border rounded-xl" />
  </div>
);

const Step2 = ({ data, setData }: any) => (
  <div>
    <h2 className="text-2xl font-bold mb-4">Admin Account</h2>
    <input placeholder="Principal Name" value={data.principal_name} onChange={e => setData({...data, principal_name: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input placeholder="Principal Phone" value={data.principal_phone} onChange={e => setData({...data, principal_phone: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input type="email" placeholder="Principal Email" value={data.principal_email} onChange={e => setData({...data, principal_email: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input type="password" minLength={10} placeholder="Create Principal Password (10+ characters)" value={data.principal_password} onChange={e => setData({...data, principal_password: e.target.value})} className="w-full p-3 border rounded-xl" />
  </div>
);

const Step3 = ({ data, setData }: any) => (
  <div>
    <h2 className="text-2xl font-bold mb-4">First Class</h2>
    <input placeholder="Class Name (e.g. JSS 1)" value={data.class_name} onChange={e => setData({...data, class_name: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input placeholder="Subject (e.g. Mathematics)" value={data.subject} onChange={e => setData({...data, subject: e.target.value})} className="w-full p-3 border rounded-xl" />
  </div>
);

const Step4 = ({ data }: any) => (
  <div>
    <h2 className="text-2xl font-bold mb-4">Review & Launch</h2>
    <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm">
      <p><strong>School:</strong> {data.institution_name}</p>
      <p><strong>Principal:</strong> {data.principal_name}</p>
      <p><strong>Phone:</strong> {data.principal_phone}</p>
      <p><strong>First Class:</strong> {data.class_name}</p>
    </div>
    <p className="text-xs text-slate-500 mt-4">Click "Launch Institution" to finalize your school setup.</p>
  </div>
);
