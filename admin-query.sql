-- First, ensure the profiles table has a record for this user
INSERT INTO public.profiles (id, email, role)
VALUES (
  '952a101d-d64d-42a8-89ce-cb4061aaaf5e',
  'admin@gmail.com',
  'admin'
)
ON CONFLICT (id) 
DO UPDATE SET role = 'admin';

-- If you want to verify the change
SELECT id, email, role FROM public.profiles 
WHERE id = '952a101d-d64d-42a8-89ce-cb4061aaaf5e';