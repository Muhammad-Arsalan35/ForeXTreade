require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_KEY;

if (!url || !anon || !service) {
  console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const admin = createClient(url, service);
const client = createClient(url, anon);

async function run() {
  const ts = Date.now();
  const email = `manual_fix_${ts}@example.com`;
  const password = 'TestPassword123!';
  const fullName = 'Manual Fix User';
  const baseUsername = `user_${ts}`;

  console.log('1) Creating auth user via admin...');
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username: baseUsername }
  });
  if (createErr) {
    console.error('Create user error:', createErr.message);
    process.exit(1);
  }
  const authId = created.user?.id;
  console.log('Auth user id:', authId);

  // Generate referral code
  const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  console.log('\n2) Inserting into public.users...');
  const { data: usersIns, error: usersErr } = await admin.from('users').insert({
    auth_user_id: authId,
    full_name: fullName,
    username: baseUsername,
    phone_number: null,
    vip_level: 'Intern',
    user_status: 'active',
    referral_code: referralCode,
    personal_wallet_balance: 0,
    income_wallet_balance: 0,
    total_earnings: 0,
    total_invested: 0,
    position_title: 'Member'
  }).select('*').single();
  if (usersErr) {
    console.error('Insert users error:', usersErr.message);
    process.exit(1);
  }
  const appUserId = usersIns.id;
  console.log('App user id:', appUserId);

  console.log('\n3) Inserting into public.user_profiles...');
  const today = new Date().toISOString().substring(0, 10);
  const { data: profileIns, error: profileErr } = await admin.from('user_profiles').insert({
    user_id: appUserId,
    full_name: fullName,
    username: baseUsername,
    phone_number: null,
    membership_type: 'intern',
    membership_level: 'Intern',
    is_trial_active: true,
    trial_start_date: today,
    trial_end_date: today,
    videos_watched_today: 0,
    last_video_reset_date: today,
    total_earnings: 0,
    income_wallet_balance: 0,
    personal_wallet_balance: 0
  }).select('*').single();
  if (profileErr) {
    console.error('Insert user_profiles error:', profileErr.message);
    process.exit(1);
  }
  console.log('Profile created for:', profileIns.username);

  console.log('\n4) Login with anon client...');
  const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
    email,
    password
  });
  if (loginErr) {
    console.error('Login error:', loginErr.message);
    process.exit(1);
  }
  console.log('Login OK. User:', loginData.user?.id);

  console.log('\n5) Fetch profile via anon client (RLS) ...');
  const { data: profile, error: profErr } = await client
    .from('users')
    .select('*')
    .eq('auth_user_id', loginData.user.id)
    .single();
  if (profErr) {
    console.error('RLS profile fetch error:', profErr.message);
  } else {
    console.log('RLS profile fetch OK. Username:', profile.username, 'VIP:', profile.vip_level);
  }

  console.log('\n6) Fetch tasks/videos (if available)...');
  const { data: plans, error: plansErr } = await client
    .from('membership_plans')
    .select('*')
    .eq('is_active', true);
  if (plansErr) {
    console.log('Plans fetch error:', plansErr.message);
  } else {
    console.log(`Active plans: ${plans?.length || 0}`);
  }

  const { data: videos, error: videosErr } = await client
    .from('videos')
    .select('*')
    .eq('is_active', true)
    .limit(5);
  if (videosErr) {
    console.log('Videos fetch error:', videosErr.message);
  } else {
    console.log(`Active videos: ${videos?.length || 0}`);
  }

  console.log('\n✅ Manual Supabase signup fix script completed.');
}

run().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});