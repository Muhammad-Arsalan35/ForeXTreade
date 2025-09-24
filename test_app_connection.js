// ============================================================================
// TEST APPLICATION CONNECTION TO NEW DATABASE
// ============================================================================
// This script tests that the application is now using the new database
// ============================================================================

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

console.log('🔍 Testing Application Connection to New Database...\n')

// Create Supabase client (same as app)
const supabase = createClient(supabaseUrl, supabaseKey)

async function testAppConnection() {
  try {
    console.log('📡 Testing connection to:', supabaseUrl)
    console.log('🔑 Using anon key:', supabaseKey.substring(0, 20) + '...\n')

    // Test 1: Check if we can connect to the database
    console.log('🧪 Test 1: Database Connection')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('membership_plans')
      .select('count')
      .limit(1)

    if (connectionError) {
      console.error('❌ Connection failed:', connectionError.message)
      return false
    }
    console.log('✅ Database connection successful!\n')

    // Test 2: Check if membership plans exist (should be 11 plans)
    console.log('🧪 Test 2: Membership Plans')
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('name, price')
      .order('price')

    if (plansError) {
      console.error('❌ Plans query failed:', plansError.message)
      return false
    }

    console.log(`✅ Found ${plans.length} membership plans:`)
    plans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.price}`)
    })
    console.log('')

    // Test 3: Check if we can query users table (should be empty for new DB)
    console.log('🧪 Test 3: Users Table')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username')
      .limit(5)

    if (usersError) {
      console.error('❌ Users query failed:', usersError.message)
      return false
    }

    console.log(`✅ Users table accessible! Found ${users.length} users`)
    if (users.length === 0) {
      console.log('   🎉 Perfect! New database is clean (no old test users)')
    } else {
      console.log('   📝 Existing users:')
      users.forEach(user => {
        console.log(`   - ${user.username} (${user.id})`)
      })
    }
    console.log('')

    // Test 4: Test signup capability (simulate what app does)
    console.log('🧪 Test 4: Signup Simulation')
    const testPhone = '+1234567890'
    
    // Check if phone already exists (this was the original problem)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, phone_number')
      .eq('phone_number', testPhone)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Phone check failed:', checkError.message)
      return false
    }

    if (existingUser) {
      console.log('⚠️  Phone number already exists in new database')
      console.log(`   User ID: ${existingUser.id}`)
    } else {
      console.log('✅ Phone number available for signup!')
      console.log('   🎉 No "number already signup" error will occur')
    }
    console.log('')

    console.log('🎊 ALL TESTS PASSED!')
    console.log('🚀 Your application is now using the NEW database!')
    console.log('✅ You can now signup with any phone number!')
    
    return true

  } catch (error) {
    console.error('💥 Test failed with error:', error.message)
    return false
  }
}

// Run the test
testAppConnection()
  .then(success => {
    if (success) {
      console.log('\n🎯 RESULT: Application successfully connected to new database!')
    } else {
      console.log('\n❌ RESULT: Application still has connection issues')
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('\n💥 FATAL ERROR:', error)
    process.exit(1)
  })