revoke execute on function public.get_teacher_activity(uuid) from authenticated;
comment on function public.get_teacher_activity(uuid)
  is 'Direct authenticated execution revoked: legacy SECURITY DEFINER returns hard-coded sample activity, not verified tenant-scoped data.';