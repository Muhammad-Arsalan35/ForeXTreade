-- Insert VIP membership plans with video limits and earning rates
INSERT INTO membership_plans (id, name, daily_video_limit, price, duration_days, is_active) VALUES 
 (gen_random_uuid(),'VIP1',5,5000,120,true),   -- video rate 30 -> 30*5 = 150 daily earning
 (gen_random_uuid(),'VIP2',10,16000,120,true), -- video rate 50 -> 50*10 = 500 daily earning
 (gen_random_uuid(),'VIP3',16,36000,120,true), -- video rate 70 -> 70*16 = 1120 daily earning
 (gen_random_uuid(),'VIP4',31,78000,120,true), -- video rate 80 -> 80*31 = 2480 daily earning
 (gen_random_uuid(),'VIP5',50,160000,120,true), -- video rate 100 -> 100*50 = 5000 daily earning
 (gen_random_uuid(),'VIP6',75,260000,120,true), -- video rate 115 -> 115*75 = 8625 daily earning
 (gen_random_uuid(),'VIP7',100,500000,120,true), -- video rate 160 -> 160*100 = 16000 daily earning
 (gen_random_uuid(),'VIP8',120,800000,120,true), -- video rate 220 -> 220*120 = 26400 daily earning
 (gen_random_uuid(),'VIP9',150,1200000,120,true), -- video rate 260 -> 260*150 = 39000 daily earning
 (gen_random_uuid(),'VIP10',180,2400000,120,true); -- video rate 440 -> 440*180 = 79200 daily earning

-- Add video earning rates table
CREATE TABLE IF NOT EXISTS video_earning_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vip_level VARCHAR(10) NOT NULL,
    rate_per_video NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert video earning rates for each VIP level
INSERT INTO video_earning_rates (vip_level, rate_per_video) VALUES
('VIP1', 30),
('VIP2', 50),
('VIP3', 70),
('VIP4', 80),
('VIP5', 100),
('VIP6', 115),
('VIP7', 160),
('VIP8', 220),
('VIP9', 260),
('VIP10', 440);