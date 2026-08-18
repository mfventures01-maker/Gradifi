/**
 * GRADIFI 14-STEP FORMAL STEP CONTRACTS
 */

export interface StepDefinition {
  step_number: number;
  step_name: string;
  step_title: string;
  purpose: string;
  has_db_write: boolean;
  required_role: 'admin' | 'guest';
}

export const ONBOARDING_STEPS: StepDefinition[] = [
  {
    step_number: 1,
    step_name: 'welcome',
    step_title: 'Welcome to Gradifi',
    purpose: 'Platform introduction and overview of assessment capabilities',
    has_db_write: false,
    required_role: 'guest',
  },
  {
    step_number: 2,
    step_name: 'institution',
    step_title: 'Institution Information',
    purpose: 'Provision official institution account entity in certified database',
    has_db_write: true,
    required_role: 'guest',
  },
  {
    step_number: 3,
    step_name: 'administrator',
    step_title: 'Create Administrator Profile',
    purpose: 'Assign authoritative institution administrator identity and profile',
    has_db_write: true,
    required_role: 'guest',
  },
  {
    step_number: 4,
    step_name: 'authentication',
    step_title: 'Secure Your Account',
    purpose: 'Authenticate administrator identity with secure credentials',
    has_db_write: true,
    required_role: 'guest',
  },
  {
    step_number: 5,
    step_name: 'school',
    step_title: 'Create Your School',
    purpose: 'Provision school entity linked to authoritative institution',
    has_db_write: true,
    required_role: 'admin',
  },
  {
    step_number: 6,
    step_name: 'school_identity',
    step_title: 'School Identity & Branding',
    purpose: 'Configure school logo URL and web address slug',
    has_db_write: true,
    required_role: 'admin',
  },
  {
    step_number: 7,
    step_name: 'academic_structure',
    step_title: 'Academic Structure',
    purpose: 'Initialize certified secondary or primary grade levels (JSS 1 - SS 3)',
    has_db_write: true,
    required_role: 'admin',
  },
  {
    step_number: 8,
    step_name: 'confirm_classes',
    step_title: 'Confirm Classes',
    purpose: 'Query and verify authoritative class records from backend',
    has_db_write: false,
    required_role: 'admin',
  },
  {
    step_number: 9,
    step_name: 'subjects',
    step_title: 'Configure Subjects',
    purpose: 'Map WAEC/NECO/JAMB subject catalog items to school classes',
    has_db_write: true,
    required_role: 'admin',
  },
  {
    step_number: 10,
    step_name: 'teachers',
    step_title: 'Add Teachers',
    purpose: 'Register teaching staff with class and subject assignments',
    has_db_write: true,
    required_role: 'admin',
  },
  {
    step_number: 11,
    step_name: 'students',
    step_title: 'Enrol First Students',
    purpose: 'Enrol initial students with backend-authoritative student numbers',
    has_db_write: true,
    required_role: 'admin',
  },
  {
    step_number: 12,
    step_name: 'parent_access',
    step_title: 'Parent Portal Access',
    purpose: 'Configure parent progress tracking and report card visibility',
    has_db_write: true,
    required_role: 'admin',
  },
  {
    step_number: 13,
    step_name: 'assessment',
    step_title: 'Activate Assessment Engines',
    purpose: 'Verify and activate AI-Assisted Grading and Online CBT engines',
    has_db_write: true,
    required_role: 'admin',
  },
  {
    step_number: 14,
    step_name: 'review_launch',
    step_title: 'Review & Launch Campus',
    purpose: 'Authoritative reconciliation of all entities and live launch',
    has_db_write: true,
    required_role: 'admin',
  },
];
