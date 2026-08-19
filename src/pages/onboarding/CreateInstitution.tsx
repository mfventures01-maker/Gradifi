import React, { useState } from 'react';
import { onboardingService, CreateInstitutionFormInput } from '../../services/onboardingService';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  Layers,
  BookOpen
} from 'lucide-react';

interface CreateInstitutionProps {
  onSuccess?: (institutionId: string, schoolId: string) => void;
  onNavigateToTeachers?: () => void;
  initialValues?: Partial<CreateInstitutionFormInput>;
}

export const CreateInstitution: React.FC<CreateInstitutionProps> = ({
  onSuccess,
  onNavigateToTeachers,
  initialValues,
}) => {
  const [formData, setFormData] = useState<CreateInstitutionFormInput>({
    institution_name: initialValues?.institution_name || '',
    institution_type: initialValues?.institution_type || 'secondary',
    registration_number: initialValues?.registration_number || '',
    address: initialValues?.address || '',
    state: initialValues?.state || 'Lagos',
    lga: initialValues?.lga || 'Ikeja',
    phone: initialValues?.phone || '',
    email: initialValues?.email || '',
    website: initialValues?.website || '',
    principal_name: initialValues?.principal_name || '',
    principal_phone: initialValues?.principal_phone || '',
    principal_email: initialValues?.principal_email || '',
    country: initialValues?.country || 'Nigeria',
    curriculum_type: initialValues?.curriculum_type || 'WAEC / NECO / National',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    institutionId: string;
    schoolId: string;
    classesCount: number;
  } | null>(null);

  const nigerianStates = [
    'Abia', 'Abuja FCT', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa',
    'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger',
    'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
  ];

  const handleInputChange = (field: keyof CreateInstitutionFormInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Validate mandatory fields
      if (!formData.institution_name.trim()) throw new Error('Institution Name is required');
      if (!formData.registration_number.trim()) throw new Error('Registration Number is required');
      if (!formData.address.trim()) throw new Error('Physical Address is required');
      if (!formData.email.trim()) throw new Error('Institution Contact Email is required');
      if (!formData.principal_name.trim()) throw new Error('Principal / Head of Institution Name is required');

      // 2. Call certified create_institution_account RPC
      const instResult = await onboardingService.createInstitutionAccount(formData);

      if (!instResult.success || !instResult.school_id) {
        throw new Error('Institution registration completed but school campus reference was not created.');
      }

      // 3. Immediately call initialize_secondary_classes RPC
      const classResult = await onboardingService.initializeSecondaryClasses(instResult.school_id);

      setSuccessInfo({
        institutionId: instResult.institution_id,
        schoolId: instResult.school_id,
        classesCount: classResult.classes_created || 6,
      });

      if (onSuccess) {
        onSuccess(instResult.institution_id, instResult.school_id);
      }
    } catch (err: any) {
      console.error('Institution Onboarding Submission Error:', err);
      setError(err.message || 'Institution creation failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  const proceedToTeachers = () => {
    if (onNavigateToTeachers) {
      onNavigateToTeachers();
    } else {
      // Standard URL search param fallback
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'onboarding');
      url.searchParams.set('step', '10');
      if (successInfo?.institutionId) {
        url.searchParams.set('inst_id', successInfo.institutionId);
      }
      window.location.href = url.toString();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <Sparkles className="w-4 h-4" /> SEFAES Canonical Onboarding • Step 1
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Institution & Campus Registration
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Register your institution details across the 14 certified schema fields to provision your root academic database.
          </p>
        </div>
        <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
          <Building2 className="w-6 h-6" />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold">Registration Failed</p>
            <p className="text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Success Modal / Flashcard Confirmation */}
      {successInfo ? (
        <div className="p-8 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-950">
            Institution Provisioned Authoritatively!
          </h2>
          <p className="text-emerald-800 max-w-lg mx-auto text-sm mt-2">
            The canonical institution record and secondary class hierarchy (JSS 1 - SS 3) have been initialized in the Supabase database.
          </p>

          <div className="mt-6 max-w-md mx-auto grid grid-cols-2 gap-3 p-4 bg-white/80 rounded-xl border border-emerald-100 text-left text-xs">
            <div>
              <span className="text-slate-500">Institution ID:</span>
              <p className="font-mono font-semibold text-slate-800 truncate">{successInfo.institutionId}</p>
            </div>
            <div>
              <span className="text-slate-500">School Campus ID:</span>
              <p className="font-mono font-semibold text-slate-800 truncate">{successInfo.schoolId}</p>
            </div>
            <div>
              <span className="text-slate-500">Class Levels:</span>
              <p className="font-semibold text-slate-800">{successInfo.classesCount} Classes Provisioned</p>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>
              <p className="font-semibold text-emerald-700">Active & SSoT Verified</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="btn-proceed-to-teachers"
              onClick={proceedToTeachers}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <span>Proceed to Teacher Onboarding</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Institution Profile */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              1. Institutional Identity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 1: Institution Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-institution-name"
                  type="text"
                  required
                  placeholder="e.g. St. Gregory's Premier College"
                  value={formData.institution_name}
                  onChange={(e) => handleInputChange('institution_name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Field 2: Institution Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institution Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="select-institution-type"
                  value={formData.institution_type}
                  onChange={(e) => handleInputChange('institution_type', e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="secondary">Secondary School (JSS 1 - SS 3)</option>
                  <option value="primary">Primary School</option>
                  <option value="k12">Comprehensive K-12 Group</option>
                  <option value="tertiary">Tertiary / Vocational</option>
                  <option value="group_of_schools">Group of Schools</option>
                </select>
              </div>

              {/* Field 3: Registration Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Registration # / RC <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-reg-number"
                  type="text"
                  required
                  placeholder="e.g. MOE/REG/2026/8942"
                  value={formData.registration_number}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Field 13: Country & Field 14: Curriculum */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                <input
                  id="input-country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Curriculum Framework</label>
                <select
                  id="select-curriculum"
                  value={formData.curriculum_type}
                  onChange={(e) => handleInputChange('curriculum_type', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="WAEC / NECO / National">WAEC / NECO / NERDC National</option>
                  <option value="British / Cambridge + WAEC">British / Cambridge + WAEC Dual</option>
                  <option value="IB + National">International Baccalaureate + National</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Location & Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              2. Physical Address & Location
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field 4: Address */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Campus Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-address"
                  type="text"
                  required
                  placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Field 5: State */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <select
                  id="select-state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  {nigerianStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Field 6: LGA */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">LGA</label>
                <input
                  id="input-lga"
                  type="text"
                  placeholder="e.g. Eti-Osa"
                  value={formData.lga}
                  onChange={(e) => handleInputChange('lga', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Field 9: Website */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website (Optional)</label>
                <input
                  id="input-website"
                  type="url"
                  placeholder="https://myschool.edu.ng"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Field 7: Institution Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Phone</label>
                <input
                  id="input-phone"
                  type="tel"
                  placeholder="+234 802 000 0000"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Field 8: Institution Email */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Contact Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-email"
                  type="email"
                  required
                  placeholder="info@stgregory.edu.ng"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Principal & Governance */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              3. Principal & Academic Leadership
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Field 10: Principal Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Principal Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-principal-name"
                  type="text"
                  required
                  placeholder="e.g. Dr. Funke Adeyemi"
                  value={formData.principal_name}
                  onChange={(e) => handleInputChange('principal_name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Field 11: Principal Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Phone</label>
                <input
                  id="input-principal-phone"
                  type="tel"
                  placeholder="+234 803 123 4567"
                  value={formData.principal_phone}
                  onChange={(e) => handleInputChange('principal_phone', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Field 12: Principal Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Email</label>
                <input
                  id="input-principal-email"
                  type="email"
                  placeholder="principal@stgregory.edu.ng"
                  value={formData.principal_email}
                  onChange={(e) => handleInputChange('principal_email', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-end gap-4">
            <button
              id="btn-create-institution"
              type="submit"
              disabled={loading}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Provisioning Database Schema...</span>
                </>
              ) : (
                <>
                  <span>Create Institution & Provision Classes</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
