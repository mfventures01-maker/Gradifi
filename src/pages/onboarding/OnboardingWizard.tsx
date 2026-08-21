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
    authService.resolveCurrentIdentity().then((identity) => {
      if (identity.schoolId) setSchoolId(identity.schoolId);
      if (identity.institutionId) setInstitutionId(identity.institutionId);
    });
  }, []);

  // Check for VP view
  if (view === 'create-vp') {
    return <CreateVP schoolId={schoolId || 'sch_demo_01'} institutionId={institutionId || 'inst_demo_01'} />;
  }

  // Check for Bursar view
  if (view === 'create-bursar') {
    return <CreateBursar schoolId={schoolId || 'sch_demo_01'} institutionId={institutionId || 'inst_demo_01'} />;
  }

  // Check for Teacher view
  if (view === 'create-teacher') {
    return <CreateTeacher schoolId={schoolId || 'sch_demo_01'} institutionId={institutionId || 'inst_demo_01'} />;
  }

  // Check for Student view
  if (view === 'create-student') {
    return <CreateStudent schoolId={schoolId || 'sch_demo_01'} institutionId={institutionId || 'inst_demo_01'} />;
  }

  // Check for Bulk Import view
  if (view === 'bulk-import') {
    return <BulkStudentImport schoolId={schoolId || 'sch_demo_01'} institutionId={institutionId || 'inst_demo_01'} />;
  }

  // Check for Parent view
  if (view === 'create-parent') {
    return <CreateParent schoolId={schoolId || 'sch_demo_01'} institutionId={institutionId || 'inst_demo_01'} />;
  }

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    institution_name: '',
    address: '',
    state: 'Lagos',
    lga: 'Ikeja',
    principal_name: '',
    principal_phone: '',
    principal_email: '',
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
      await onboardingService.createInstitutionAccount({
        _institution_name: formData.institution_name,
        _institution_type: 'secondary',
        _registration_number: 'REG-001',
        _school_type: 'private',
        _country: 'Nigeria',
        _address: formData.address,
        _state: formData.state,
        _lga: formData.lga,
        _phone: formData.principal_phone,
        _email: formData.principal_email,
        _website: '',
        _principal_name: formData.principal_name,
        _principal_phone: formData.principal_phone,
        _principal_email: formData.principal_email
      });
      navigate('/portal/principal');
    } catch (err) {
      console.error(err);
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
    <input placeholder="Address" value={data.address} onChange={e => setData({...data, address: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input placeholder="State" value={data.state} onChange={e => setData({...data, state: e.target.value})} className="w-full p-3 border rounded-xl" />
  </div>
);

const Step2 = ({ data, setData }: any) => (
  <div>
    <h2 className="text-2xl font-bold mb-4">Admin Account</h2>
    <input placeholder="Principal Name" value={data.principal_name} onChange={e => setData({...data, principal_name: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input placeholder="Principal Phone" value={data.principal_phone} onChange={e => setData({...data, principal_phone: e.target.value})} className="w-full p-3 border rounded-xl mb-3" />
    <input placeholder="Principal Email" value={data.principal_email} onChange={e => setData({...data, principal_email: e.target.value})} className="w-full p-3 border rounded-xl" />
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
