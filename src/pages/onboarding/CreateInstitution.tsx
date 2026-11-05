import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy entry point retained for older imports.
 * All institution creation now uses the authenticated deterministic wizard.
 */
export const CreateInstitution: React.FC = () => <Navigate to="/onboarding" replace />;
