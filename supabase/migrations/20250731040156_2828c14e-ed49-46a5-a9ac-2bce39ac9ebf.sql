-- Add admin policy for updating user billing records
CREATE POLICY "Admins can update all billing records" 
ON public.user_billing 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));