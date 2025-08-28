import { pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Seed membership plans
    await pool.query(`
      INSERT INTO membership_plans (name, price, daily_video_limit, unit_price, duration_days)
      VALUES 
        ('VIP1', 2000, 5, 20, 30),
        ('VIP2', 5000, 10, 25, 30),
        ('VIP3', 10000, 15, 30, 30)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✅ Seeded membership_plans');

    // Seed payment methods
    await pool.query(`
      INSERT INTO payment_methods (name, account_number)
      VALUES 
        ('Easypaisa', '03000000000'),
        ('JazzCash', '03000000001')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Seeded payment_methods');

    // Seed videos
    await pool.query(`
      INSERT INTO videos (title, description, video_url, thumbnail_url, duration, reward_per_watch, category)
      VALUES 
        ('Welcome Video', 'Getting started', 'https://example.com/v/welcome.mp4', 'https://example.com/t/welcome.jpg', 60, 10, 'general'),
        ('How it works', 'Earning guide', 'https://example.com/v/guide.mp4', 'https://example.com/t/guide.jpg', 90, 12, 'education')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Seeded videos');

    // Seed tasks
    await pool.query(`
      INSERT INTO tasks (title, description, duration_seconds)
      VALUES 
        ('Watch & Learn', 'Watch an intro clip', 45),
        ('Discover Feature', 'Explore new feature', 60)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Seeded tasks');

    console.log('🎉 Seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export default seed;




