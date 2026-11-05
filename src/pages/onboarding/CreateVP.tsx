import React from 'react';
import { CreateStaffAccount } from './CreateStaffAccount';

interface Props { schoolId?: string; institutionId?: string; onSuccess?: () => void; }

export const CreateVP: React.FC<Props> = ({schoolId='',institutionId=''}) => (
  <CreateStaffAccount role="vice_principal" schoolId={schoolId} institutionId={institutionId}/>
);
