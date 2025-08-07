-- Enable RLS on payment_methods table
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policy for payment_methods - read access for everyone
CREATE POLICY "Payment methods are viewable by everyone" 
ON public.payment_methods 
FOR SELECT 
USING (true);