-- SQL script to create missing tables for ForeXTreade application

-- 1. Create user_plans table
CREATE TABLE IF NOT EXISTS public.user_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER NOT NULL DEFAULT 0, -- duration in seconds
    reward_per_watch DECIMAL(10,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create video_earning_rates table
CREATE TABLE IF NOT EXISTS public.video_earning_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vip_level TEXT NOT NULL, -- VIP1, VIP2, etc.
    rate_per_video DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(vip_level)
);

-- 4. Create app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_plan_id ON public.user_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_is_active ON public.user_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_videos_is_active ON public.videos(is_active);
CREATE INDEX IF NOT EXISTS idx_videos_category ON public.videos(category);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON public.app_config(config_key);

-- Insert some default data for video_earning_rates
INSERT INTO public.video_earning_rates (vip_level, rate_per_video) VALUES
    ('VIP1', 0.50),
    ('VIP2', 0.75),
    ('VIP3', 1.00),
    ('VIP4', 1.25),
    ('VIP5', 1.50),
    ('VIP6', 1.75),
    ('VIP7', 2.00),
    ('VIP8', 2.25),
    ('VIP9', 2.50),
    ('VIP10', 3.00)
ON CONFLICT (vip_level) DO NOTHING;

-- Insert some default app configuration
INSERT INTO public.app_config (config_key, config_value, description) VALUES
    ('support_phone', '+923001234567', '24/7 Support WhatsApp Number'),
    ('hiring_manager_phone', '+923001234568', 'Hiring Manager WhatsApp Number'),
    ('app_version', '1.0.0', 'Current Application Version'),
    ('maintenance_mode', 'false', 'Application Maintenance Mode'),
    ('min_withdrawal_amount', '100', 'Minimum Withdrawal Amount'),
    ('max_withdrawal_amount', '10000', 'Maximum Withdrawal Amount')
ON CONFLICT (config_key) DO NOTHING;

-- Enable Row Level Security (RLS) for the new tables
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_earning_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_plans (users can only see their own plans)
CREATE POLICY "Users can view their own plans" ON public.user_plans
    FOR SELECT USING (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can insert their own plans" ON public.user_plans
    FOR INSERT WITH CHECK (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id));

CREATE POLICY "Users can update their own plans" ON public.user_plans
    FOR UPDATE USING (auth.uid()::text = (SELECT auth_user_id FROM public.users WHERE id = user_id));

-- Create RLS policies for videos (public read access)
CREATE POLICY "Anyone can view active videos" ON public.videos
    FOR SELECT USING (is_active = true);

-- Create RLS policies for video_earning_rates (public read access)
CREATE POLICY "Anyone can view video earning rates" ON public.video_earning_rates
    FOR SELECT USING (true);

-- Create RLS policies for app_config (public read access for active configs)
CREATE POLICY "Anyone can view active app config" ON public.app_config
    FOR SELECT USING (is_active = true);

-- Create updated_at triggers for the new tables
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_user_plans_updated_at
    BEFORE UPDATE ON public.user_plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_video_earning_rates_updated_at
    BEFORE UPDATE ON public.video_earning_rates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();