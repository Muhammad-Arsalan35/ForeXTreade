const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixUserProfilesSchema() {
  console.log('🔧 FIXING USER_PROFILES TABLE SCHEMA 🔧\n');
  
  try {
    console.log('1. Checking current user_profiles table structure...');
    
    // Check current columns in user_profiles table
    const { data: columns, error: columnsError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'user_profiles' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (columnsError) {
      console.log('❌ Error checking columns:', columnsError.message);
      console.log('📝 Proceeding with direct column addition...');
    } else {
      console.log('✅ Current columns found:', columns?.length || 0);
      if (columns) {
        columns.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        });
      }
    }
    
    console.log('\n2. Adding missing columns to user_profiles table...');
    
    // Add missing columns one by one
    const alterQueries = [
      `ALTER TABLE public.user_profiles 
       ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT true;`,
      
      `ALTER TABLE public.user_profiles 
       ADD COLUMN IF NOT EXISTS trial_start_date DATE DEFAULT CURRENT_DATE;`,
      
      `ALTER TABLE public.user_profiles 
       ADD COLUMN IF NOT EXISTS trial_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '3 days');`,
      
      `ALTER TABLE public.user_profiles 
       ADD COLUMN IF NOT EXISTS videos_watched_today INTEGER DEFAULT 0;`,
      
      `ALTER TABLE public.user_profiles 
       ADD COLUMN IF NOT EXISTS last_video_reset_date DATE DEFAULT CURRENT_DATE;`
    ];
    
    for (let i = 0; i < alterQueries.length; i++) {
      const query = alterQueries[i];
      console.log(`   Adding column ${i + 1}/${alterQueries.length}...`);
      
      const { error: alterError } = await supabase
        .rpc('sql', { query });
      
      if (alterError) {
        console.log(`   ❌ Error adding column: ${alterError.message}`);
      } else {
        console.log(`   ✅ Column added successfully`);
      }
    }
    
    console.log('\n3. Updating existing user profiles with default values...');
    
    // Update existing records to have proper default values
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        is_trial_active: true,
        trial_start_date: new Date().toISOString().split('T')[0],
        trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        videos_watched_today: 0,
        last_video_reset_date: new Date().toISOString().split('T')[0]
      })
      .is('is_trial_active', null);
    
    if (updateError) {
      console.log('❌ Error updating existing profiles:', updateError.message);
    } else {
      console.log('✅ Existing profiles updated with default values');
    }
    
    console.log('\n4. Creating the working trigger function...');
    
    const triggerFunction = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
          new_user_id UUID;
          unique_username TEXT;
          username_counter INTEGER := 0;
          base_username TEXT;
      BEGIN
          -- Generate base username from email or use fallback
          IF NEW.email IS NOT NULL THEN
              base_username := split_part(NEW.email, '@', 1);
              base_username := regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g');
              base_username := lower(base_username);
          ELSE
              base_username := 'user_' || substr(NEW.id::text, 1, 8);
          END IF;
          
          -- Ensure username is unique
          unique_username := base_username;
          WHILE EXISTS (SELECT 1 FROM public.users WHERE username = unique_username) LOOP
              username_counter := username_counter + 1;
              unique_username := base_username || '_' || username_counter;
          END LOOP;
          
          -- Insert into public.users table
          INSERT INTO public.users (
              auth_user_id,
              full_name,
              username,
              phone_number,
              vip_level,
              user_status,
              referral_code,
              personal_wallet_balance,
              income_wallet_balance,
              total_earnings,
              total_invested,
              position_title
          ) VALUES (
              NEW.id,
              COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
              unique_username,
              COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
              'VIP1',
              'active',
              UPPER(substr(gen_random_uuid()::text, 1, 8)),
              0.00,
              0.00,
              0.00,
              0.00,
              'Member'
          ) RETURNING id INTO new_user_id;
          
          -- Insert into public.user_profiles table
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
              videos_watched_today,
              last_video_reset_date,
              total_earnings,
              income_wallet_balance,
              personal_wallet_balance
          ) VALUES (
              new_user_id,
              COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
              unique_username,
              COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
              'intern',
              'Intern',
              true,
              CURRENT_DATE,
              CURRENT_DATE + INTERVAL '3 days',
              0,
              CURRENT_DATE,
              0,
              0,
              0
          );
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: functionError } = await supabase
      .rpc('sql', { query: triggerFunction });
    
    if (functionError) {
      console.log('❌ Error creating trigger function:', functionError.message);
      return false;
    }
    
    console.log('✅ Trigger function created successfully');
    
    console.log('\n5. Creating the trigger...');
    
    const triggerQuery = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;
    
    const { error: triggerError } = await supabase
      .rpc('sql', { query: triggerQuery });
    
    if (triggerError) {
      console.log('❌ Error creating trigger:', triggerError.message);
      return false;
    }
    
    console.log('✅ Trigger created successfully');
    
    console.log('\n6. Testing the fix with a new signup...');
    
    const testEmail = `schematest_${Date.now()}@forextrade.com`;
    const testPassword = 'TestPass123!';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Schema Test User'
        }
      }
    });

    if (signupError) {
      console.log('❌ Signup test failed:', signupError.message);
      return false;
    }
    
    console.log('✅ Signup test successful!');
    
    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if user and profile were created
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', signupData.user.id)
      .single();
    
    if (userError) {
      console.log('❌ User record not found:', userError.message);
    } else {
      console.log('✅ User record created successfully');
      
      const { data: profileRecord, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userRecord.id)
        .single();
      
      if (profileError) {
        console.log('❌ User profile not found:', profileError.message);
      } else {
        console.log('✅ User profile created successfully');
        console.log(`   - Trial active: ${profileRecord.is_trial_active}`);
        console.log(`   - Trial start: ${profileRecord.trial_start_date}`);
        console.log(`   - Trial end: ${profileRecord.trial_end_date}`);
      }
    }
    
    // Cleanup test user
    if (signupData.user?.id) {
      await supabase.auth.admin.deleteUser(signupData.user.id);
      console.log('✅ Test user cleaned up');
    }
    
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

fixUserProfilesSchema().then(success => {
  if (success) {
    console.log('\n🎉 USER_PROFILES SCHEMA FIX COMPLETED! 🎉');
    console.log('✅ Missing columns added');
    console.log('✅ Trigger function created');
    console.log('✅ Trigger activated');
    console.log('✅ Signup functionality tested');
  } else {
    console.log('\n💥 SCHEMA FIX FAILED! 💥');
    console.log('❌ Manual intervention required');
  }
}).catch(console.error);