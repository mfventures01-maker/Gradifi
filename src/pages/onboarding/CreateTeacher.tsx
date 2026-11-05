import React from 'react';
import { CreateStaffAccount } from './CreateStaffAccount';

interface Props { schoolId?: string; institutionId?: string; onSuccess?: () => void; }

export const CreateTeacher: React.FC<Props> = ({schoolId='',institutionId=''}) => (
  <CreateStaffAccount role="teacher" schoolId={schoolId} institutionId={institutionId}/>
);
