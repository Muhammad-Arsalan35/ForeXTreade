-- Enable phone auth and fix user creation process

-- First, let's check if the handle_new_user function exists and update it for phone auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    full_name,
    username,
    phone_number,
    referral_code,
    referred_by,
    auth_user_id
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username', 
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    UPPER(SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 8)),
    (SELECT id FROM public.users WHERE referral_code = NEW.raw_user_meta_data->>'referral_code' LIMIT 1),
    NEW.id
  );
  RETURN NEW;
END;
$function$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policies for tables that need them
CREATE POLICY "Allow public read access to tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow public read access to vip_levels" ON public.vip_levels FOR SELECT USING (true);
CREATE POLICY "Allow public read access to payment_methods" ON public.payment_methods FOR SELECT USING (true);

-- Add basic policies for user_tasks
CREATE POLICY "Users can view their own tasks" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tasks" ON public.user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.user_tasks FOR UPDATE USING (auth.uid() = user_id);

-- Add basic policies for referrals
CREATE POLICY "Users can view their referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "System can insert referrals" ON public.referrals FOR INSERT WITH CHECK (true);

-- Add basic policies for team_structure
CREATE POLICY "Users can view their team structure" ON public.team_structure FOR SELECT USING (auth.uid() = user_id OR auth.uid() = parent_id);
CREATE POLICY "System can manage team structure" ON public.team_structure FOR ALL USING (true);

-- Add basic policies for vip_upgrades
CREATE POLICY "Users can view their own upgrades" ON public.vip_upgrades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own upgrades" ON public.vip_upgrades FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add basic policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage sessions" ON public.user_sessions FOR ALL USING (true);