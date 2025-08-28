import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool, getRow, query } from '../database/connection.js';

dotenv.config();

const normalizePhone = (phone) => {
  const cleaned = (phone || '').replace(/\D/g, '');
  if (cleaned.startsWith('0')) return `+92${cleaned.substring(1)}`;
  if (cleaned.startsWith('92')) return `+${cleaned}`;
  if (phone.startsWith('+')) return phone;
  if (cleaned.length === 11) return `+92${cleaned.substring(1)}`;
  return `+${cleaned}`;
};

const args = process.argv.slice(2);
const params = Object.fromEntries(args.map(arg => {
  const [k, v] = arg.replace(/^--/, '').split('=');
  return [k, v];
}));

const run = async () => {
  try {
    const rawPhone = params.phone || params.p;
    const password = params.password || params.pass || rawPhone;
    if (!rawPhone) {
      console.error('Usage: node backend/tools/promoteAdmin.js --phone=0300... [--password=...]');
      process.exit(1);
    }
    const phone = normalizePhone(rawPhone);
    console.log(`➡️  Using phone: ${phone}`);

    let user = await getRow('SELECT * FROM users WHERE phone_number = $1', [phone]);
    if (!user) {
      console.log('👤 User not found. Creating...');
      const hashed = await bcrypt.hash(password, 12);
      const email = `${phone.replace(/\D/g, '')}@taskmaster.local`;
      const fullName = `User ${phone.slice(-4)}`;
      const created = await query(
        `INSERT INTO users (full_name, email, phone_number, password_hash, position_title, vip_level, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'admin','VIP1', NOW(), NOW()) RETURNING *`,
        [fullName, email, phone, hashed]
      );
      user = created.rows[0];
      await query(
        `INSERT INTO user_profiles (user_id, full_name, username, phone_number, membership_type, is_trial_active, trial_start_date, trial_end_date, total_earnings, videos_watched_today, last_video_reset_date, created_at)
         VALUES ($1,$2,$3,$4,'free', true, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 0, 0, CURRENT_DATE, NOW())`,
        [user.id, fullName, fullName.toLowerCase().replace(/\s+/g, ''), phone]
      );
      console.log('✅ User created and set as admin');
    } else {
      console.log('👤 User found. Promoting to admin...');
      await query('UPDATE users SET position_title = $1 WHERE id = $2', ['admin', user.id]);
      console.log('✅ User promoted to admin');
    }

    // Show final state
    const finalUser = await getRow('SELECT id, full_name, phone_number, position_title FROM users WHERE phone_number = $1', [phone]);
    console.log('ℹ️  Result:', finalUser);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();




