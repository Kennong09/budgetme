-- First, ensure the profiles table has a record for this user
INSERT INTO public.profiles (id, email, role)
VALUES (
  'UUID',
  'example@gmail.com',
  'admin'
)
ON CONFLICT (id) 
DO UPDATE SET role = 'admin';

-- If you want to verify the change
SELECT id, email, role FROM public.profiles 
WHERE id = '';