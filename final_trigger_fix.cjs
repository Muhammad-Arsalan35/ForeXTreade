const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyFinalTriggerFix() {
  console.log('🔧 APPLYING FINAL TRIGGER FIX 🔧\n');
  
  try {
    // First, let's check current trigger status
    console.log('1. Checking current trigger status...');
    
    const { data: triggers, error: triggerError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            trigger_name, 
            event_manipulation, 
            action_statement,
            action_timing
          FROM information_schema.triggers 
          WHERE trigger_name LIKE '%user%' OR trigger_name LIKE '%auth%'
          ORDER BY trigger_name;
        `
      });
    
    if (triggerError) {
      console.log('❌ Error checking triggers (using direct SQL instead)');
    } else {
      console.log('✅ Current triggers:', triggers);
    }

    // Apply the comprehensive fix
    console.log('\n2. Applying comprehensive trigger fix...');
    
    const fixSQL = `
      -- Drop any existing triggers and functions
      DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();
      DROP FUNCTION IF EXISTS public.handle_new_user();

      -- Ensure tables have correct structure
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

      ALTER TABLE public.user_profiles 
      ADD COLUMN IF NOT EXISTS membership_type VARCHAR(20) DEFAULT 'intern';

      -- Create the working trigger function
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql
      AS $$
      DECLARE
          new_username TEXT;
          user_record_id UUID;
          username_counter INTEGER := 0;
          base_username TEXT;
      BEGIN
          -- Generate base username from email or use default
          IF NEW.email IS NOT NULL THEN
              base_username := split_part(NEW.email, '@', 1);
              -- Clean username (remove special characters)
              base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
              -- Ensure it's not empty
              IF length(base_username) < 3 THEN
                  base_username := 'user';
              END IF;
          ELSE
              base_username := 'user';
          END IF;
          
          -- Make username unique
          new_username := base_username;
          WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username) LOOP
              username_counter := username_counter + 1;
              new_username := base_username || '_' || username_counter;
          END LOOP;

          -- Insert into users table first
          INSERT INTO public.users (
              auth_user_id, 
              full_name, 
              username, 
              phone_number,
              vip_level,
              position_title, 
              user_status,
              total_earnings, 
              income_wallet_balance,
              personal_wallet_balance,
              referral_code, 
              created_at, 
              updated_at
          ) VALUES (
              NEW.id, 
              COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
              new_username, 
              COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
              'Intern',
              'Member', 
              'active',
              0.00,
              0.00,
              0.00,
              upper(substring(md5(random()::text) from 1 for 8)),
              NOW(), 
              NOW()
          ) RETURNING id INTO user_record_id;

          -- Insert into user_profiles table
          INSERT INTO public.user_profiles (
              user_id, 
              full_name, 
              username, 
              phone_number,
              membership_type, 
              membership_level,
              is_trial_active,
              trial_start_date,
              trial_end_date,
              total_earnings, 
              income_wallet_balance, 
              personal_wallet_balance,
              videos_watched_today,
              created_at, 
              updated_at
          ) VALUES (
              user_record_id,
              COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
              new_username, 
              COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
              'intern', 
              'Intern',
              true,
              CURRENT_DATE,
              CURRENT_DATE + INTERVAL '3 days',
              0.00, 
              0.00, 
              0.00, 
              0,
              NOW(), 
              NOW()
          );

          RETURN NEW;
      EXCEPTION
          WHEN OTHERS THEN
              -- Log the error but don't fail the user creation
              RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
              RETURN NEW;
      END;
      $$;

      -- Create the trigger
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user();

      -- Grant necessary permissions
      GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
      GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
    `;

    // Execute the fix using raw SQL
    const { error: fixError } = await supabase.rpc('sql', { query: fixSQL });
    
    if (fixError) {
      console.log('❌ Error applying trigger fix:', fixError.message);
      
      // Try alternative approach - execute parts separately
      console.log('\n3. Trying alternative approach...');
      
      // Drop existing triggers first
      await supabase.rpc('sql', { 
        query: 'DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;' 
      });
      await supabase.rpc('sql', { 
        query: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;' 
      });
      await supabase.rpc('sql', { 
        query: 'DROP FUNCTION IF EXISTS public.create_user_profile_from_auth();' 
      });
      await supabase.rpc('sql', { 
        query: 'DROP FUNCTION IF EXISTS public.handle_new_user();' 
      });
      
      console.log('✅ Cleaned up existing triggers and functions');
      return false;
    }
    
    console.log('✅ Trigger fix applied successfully!');

    // Test the fix
    console.log('\n3. Testing the trigger fix...');
    
    const testEmail = `triggertest_${Date.now()}@forextrade.com`;
    const testPassword = 'TestPass123!';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Trigger Test User'
        }
      }
    });

    if (signupError) {
      console.log('❌ Test signup failed:', signupError.message);
      return false;
    }
    
    console.log('✅ Test signup successful!');
    
    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if user record was created
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', signupData.user?.id)
      .single();
    
    if (userError) {
      console.log('❌ User record not created by trigger:', userError.message);
      return false;
    }
    
    console.log('✅ User record created by trigger!');
    console.log(`   Username: ${newUser.username}`);
    
    // Check user profile
    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', newUser.id)
      .single();
    
    if (profileError) {
      console.log('❌ User profile not created by trigger:', profileError.message);
      return false;
    }
    
    console.log('✅ User profile created by trigger!');
    console.log(`   Membership: ${newProfile.membership_type}`);
    
    // Cleanup test user
    await supabase.auth.admin.deleteUser(signupData.user.id);
    console.log('✅ Test user cleaned up');
    
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

applyFinalTriggerFix().then(success => {
  if (success) {
    console.log('\n🎉 TRIGGER FIX COMPLETED SUCCESSFULLY! 🎉');
    console.log('✅ Database triggers are now working');
    console.log('✅ New users can sign up without errors');
    console.log('✅ User profiles are created automatically');
  } else {
    console.log('\n💥 TRIGGER FIX FAILED! 💥');
    console.log('❌ Manual intervention may be required');
  }
}).catch(console.error);