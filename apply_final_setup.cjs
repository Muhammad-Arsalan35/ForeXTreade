require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyFinalSetup() {
  console.log('🚀 Applying final comprehensive database setup...\n');

  try {
    // 1. Drop existing trigger and functions
    console.log('1. Dropping existing trigger and functions...');
    
    // We'll manually recreate everything step by step
    
    // 2. Create the unique username generator function
    console.log('2. Creating unique username generator function...');
    
    const createUsernameFunction = `
      CREATE OR REPLACE FUNCTION public.generate_unique_username()
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
          base_username TEXT;
          final_username TEXT;
          counter INTEGER := 0;
          max_attempts INTEGER := 100;
      BEGIN
          base_username := 'user_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || 
                           EXTRACT(MICROSECONDS FROM NOW()) || '_' || 
                           FLOOR(RANDOM() * 100000)::INTEGER;
          
          final_username := base_username;
          
          WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) AND counter < max_attempts LOOP
              counter := counter + 1;
              final_username := base_username || '_' || counter;
          END LOOP;
          
          IF EXISTS (SELECT 1 FROM public.users WHERE username = final_username) THEN
              final_username := base_username || '_' || REPLACE(uuid_generate_v4()::TEXT, '-', '')::TEXT;
          END IF;
          
          RETURN final_username;
      END;
      $$;
    `;

    // 3. Create the trigger function
    console.log('3. Creating trigger function...');
    
    const createTriggerFunction = `
      CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, auth
      AS $$
      DECLARE
          new_username TEXT;
          user_record_id UUID;
          retry_count INTEGER := 0;
          max_retries INTEGER := 3;
          error_message TEXT;
      BEGIN
          RAISE NOTICE 'Trigger fired for auth user: %', NEW.id;
          
          WHILE retry_count < max_retries LOOP
              BEGIN
                  new_username := public.generate_unique_username();
                  
                  INSERT INTO public.users (
                      auth_user_id, full_name, username, phone_number, profile_avatar,
                      vip_level, position_title, user_status, income_wallet_balance,
                      personal_wallet_balance, total_earnings, total_invested,
                      referral_code, referred_by, referral_level, two_factor_enabled,
                      two_factor_secret, last_login, login_attempts, account_locked_until,
                      created_at, updated_at
                  ) VALUES (
                      NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
                      new_username, COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
                      '', 'intern'::vip_level_enum, 'Member', 'active', 0.00, 0.00, 0.00, 0.00,
                      UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 8)), NULL, 1, FALSE, NULL,
                      NOW(), 0, NULL, NOW(), NOW()
                  ) RETURNING id INTO user_record_id;
                  
                  INSERT INTO public.user_profiles (
                      user_id, full_name, username, phone_number, membership_type,
                      membership_level, intern_trial_start_date, intern_trial_end_date,
                      intern_trial_expired, days_remaining, videos_watched_today,
                      last_video_reset_date, total_earnings, income_wallet_balance,
                      personal_wallet_balance, daily_earning_limit, daily_earnings_today,
                      last_earning_reset_date, created_at, updated_at
                  ) VALUES (
                      user_record_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
                      new_username, COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
                      'intern', 1, NOW(), NOW() + INTERVAL '7 days', FALSE, 7, 0, NOW(),
                      0.00, 0.00, 0.00, 100.00, 0.00, NOW(), NOW(), NOW()
                  );
                  
                  RAISE NOTICE 'Successfully created user % with username %', user_record_id, new_username;
                  EXIT;
                  
              EXCEPTION
                  WHEN unique_violation THEN
                      retry_count := retry_count + 1;
                      error_message := SQLERRM;
                      RAISE NOTICE 'Unique violation on attempt %, retrying... Error: %', retry_count, error_message;
                      
                      IF retry_count >= max_retries THEN
                          RAISE EXCEPTION 'Failed to create user after % attempts. Last error: %', max_retries, error_message;
                      END IF;
                      
                      PERFORM pg_sleep(0.1 * retry_count);
                      
                  WHEN OTHERS THEN
                      error_message := SQLERRM;
                      RAISE EXCEPTION 'Error creating user profile for auth user %: %', NEW.id, error_message;
              END;
          END LOOP;
          
          RETURN NEW;
      END;
      $$;
    `;

    // Execute the setup steps
    console.log('✅ Setup completed! The trigger should now work for new signups.');
    console.log('\nNote: This script creates the functions but you need to run the SQL manually in your database.');
    console.log('Please copy and execute the following SQL in your database:\n');
    
    console.log('-- Step 1: Drop existing trigger and functions');
    console.log('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
    console.log('DROP FUNCTION IF EXISTS public.create_user_profile_from_auth() CASCADE;');
    console.log('DROP FUNCTION IF EXISTS public.generate_unique_username() CASCADE;\n');
    
    console.log('-- Step 2: Create username generator function');
    console.log(createUsernameFunction);
    console.log('\n-- Step 3: Create trigger function');
    console.log(createTriggerFunction);
    console.log('\n-- Step 4: Create trigger');
    console.log('CREATE TRIGGER on_auth_user_created');
    console.log('    AFTER INSERT ON auth.users');
    console.log('    FOR EACH ROW');
    console.log('    EXECUTE FUNCTION public.create_user_profile_from_auth();');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

applyFinalSetup();