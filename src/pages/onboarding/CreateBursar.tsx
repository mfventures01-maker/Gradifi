import React from 'react';
import { CreateStaffAccount } from './CreateStaffAccount';

interface Props { schoolId?: string; institutionId?: string; onSuccess?: () => void; }

export const CreateBursar: React.FC<Props> = ({schoolId='',institutionId=''}) => (
  <CreateStaffAccount role="bursar" schoolId={schoolId} institutionId={institutionId}/>
);
