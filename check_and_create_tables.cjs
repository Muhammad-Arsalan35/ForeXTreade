const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://npliuqbormakkyggcgtw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbGl1cWJvcm1ha2t5Z2djZ3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTgzNTIsImV4cCI6MjA3MDEzNDM1Mn0.-rw3ZEVg3QYrP7DboDpx6KNFlx2jcoamTMvjd22DU2s";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAndCreateTables() {
  try {
    console.log('Checking if commission_rates table exists...');
    
    // Try to query commission_rates table
    const { data: commissionRates, error: commissionError } = await supabase
      .from('commission_rates')
      .select('*')
      .limit(1);
    
    if (commissionError) {
      console.error('Error with commission_rates table:', commissionError.message);
      if (commissionError.code === 'PGRST205') {
        console.log('commission_rates table does not exist in schema cache.');
      }
    } else {
      console.log('commission_rates table exists with', commissionRates?.length || 0, 'records');
    }
    
    // Try to query referral_commissions table
    const { data: referralCommissions, error: referralError } = await supabase
      .from('referral_commissions')
      .select('*')
      .limit(1);
    
    if (referralError) {
      console.error('Error with referral_commissions table:', referralError.message);
      if (referralError.code === 'PGRST205') {
        console.log('referral_commissions table does not exist in schema cache.');
      }
    } else {
      console.log('referral_commissions table exists with', referralCommissions?.length || 0, 'records');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndCreateTables();