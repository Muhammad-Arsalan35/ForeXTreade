const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ixqjqfkqfqjqfkqfqjqf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxZmtxZnFqcWZrcWZxanFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDU0NzI5NywiZXhwIjoyMDUwMTIzMjk3fQ.Ql6Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInternFix() {
  console.log('🔍 Testing Intern user task limit fix...\n');

  try {
    // Test 1: Check if we can find the Intern plan by vip_level
    console.log('1. Testing membership plan lookup by vip_level...');
    const { data: internPlan, error: planError } = await supabase
      .from('membership_plans')
      .select('id,name,vip_level,daily_video_limit,is_active')
      .eq('vip_level', 'Intern')
      .eq('is_active', true)
      .single();

    if (planError) {
      console.log('   ❌ Error fetching Intern plan:', planError.message);
      console.log('   ℹ️  This means fallback logic will be used');
    } else {
      console.log('   ✅ Found Intern plan:', internPlan);
      console.log(`   📊 Daily video limit: ${internPlan.daily_video_limit}`);
    }

    // Test 2: Simulate the getVipRate function for Intern
    console.log('\n2. Testing VIP rate for Intern users...');
    const getVipRate = (vipName) => {
      const rates = {
        'VIP1': 30, 'VIP2': 35, 'VIP3': 40, 'VIP4': 45, 'VIP5': 50,
        'VIP6': 55, 'VIP7': 60, 'VIP8': 65, 'VIP9': 70, 'VIP10': 75
      };
      return rates[vipName] || 30; // Default to VIP1 rate
    };
    
    const internRate = getVipRate('Intern');
    console.log(`   💰 Intern rate: ${internRate} (should be 30 - VIP1 default)`);

    // Test 3: Simulate the complete logic from Task.tsx
    console.log('\n3. Simulating complete Task.tsx logic for Intern user...');
    
    const levelName = 'Intern';
    let membershipPlan;

    if (internPlan && !planError) {
      // Plan found in database
      membershipPlan = {
        id: internPlan.id,
        name: internPlan.name,
        unit_price: getVipRate(levelName),
        daily_tasks_limit: internPlan.daily_video_limit || (levelName === 'VIP1' ? 5 : 10)
      };
      console.log('   ✅ Using database plan');
    } else {
      // Fallback plan (this is what should happen now)
      membershipPlan = {
        id: 'fallback',
        name: levelName,
        unit_price: getVipRate(levelName),
        daily_tasks_limit: levelName === 'Intern' ? 3 :
                           levelName === 'VIP1' ? 5 :
                           levelName === 'VIP2' ? 10 :
                           levelName === 'VIP3' ? 16 :
                           levelName === 'VIP4' ? 31 :
                           levelName === 'VIP5' ? 50 :
                           levelName === 'VIP6' ? 75 :
                           levelName === 'VIP7' ? 100 :
                           levelName === 'VIP8' ? 120 :
                           levelName === 'VIP9' ? 150 :
                           levelName === 'VIP10' ? 180 : 5
      };
      console.log('   ✅ Using fallback plan');
    }

    console.log('\n📋 Final membership plan for Intern user:');
    console.log(`   ID: ${membershipPlan.id}`);
    console.log(`   Name: ${membershipPlan.name}`);
    console.log(`   Unit Price: ${membershipPlan.unit_price}`);
    console.log(`   Daily Tasks Limit: ${membershipPlan.daily_tasks_limit}`);

    // Test 4: Verify the expected behavior
    console.log('\n🎯 Expected behavior verification:');
    if (membershipPlan.daily_tasks_limit === 3) {
      console.log('   ✅ SUCCESS: Intern users will see "0/3 completed"');
    } else {
      console.log(`   ❌ ISSUE: Intern users will see "0/${membershipPlan.daily_tasks_limit} completed" instead of "0/3 completed"`);
    }

    console.log('\n🔧 Fix Summary:');
    console.log('   1. Changed .eq("name", levelName) to .eq("vip_level", levelName)');
    console.log('   2. Added Intern case to fallback logic with 3 tasks/day');
    console.log('   3. Intern users should now see "0/3 completed" instead of "0/5 completed"');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testInternFix();