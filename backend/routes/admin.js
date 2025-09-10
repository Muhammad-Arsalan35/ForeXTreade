import express from 'express';
import Joi from 'joi';
import { query, getRow, getRows } from '../database/connection.js';

const router = express.Router();

// Schemas
const paginationSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  status: Joi.string().optional()
});

// List deposits (admin)
router.get('/deposits', async (req, res) => {
  try {
    const { error, value } = paginationSchema.validate(req.query);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { page, limit, status } = value;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];
    let i = 0;
    if (status) { where += ` AND d.status = $${++i}`; params.push(status); }

    const rows = await getRows(
      `SELECT d.*, u.full_name AS user_name, pm.name AS payment_method_name
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       JOIN payment_methods pm ON d.payment_method_id = pm.id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $${++i} OFFSET $${++i}`,
      [...params, limit, offset]
    );

    const total = await getRow(
      `SELECT COUNT(*) AS count FROM deposits d ${where}`,
      params
    );

    res.json({ success: true, data: { deposits: rows, pagination: { page, limit, total: parseInt(total.count), pages: Math.ceil(total.count / limit) } } });
  } catch (err) {
    console.error('Admin list deposits error:', err);
    res.status(500).json({ success: false, message: 'Failed to list deposits' });
  }
});

// Approve deposit
router.put('/deposits/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body || {};

    const deposit = await getRow('SELECT * FROM deposits WHERE id = $1 AND status = $2', [id, 'pending']);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found or already processed' });

    await query('BEGIN');
    try {
      await query('UPDATE deposits SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3 WHERE id = $4', ['approved', req.user.id, admin_notes, id]);
      await query('UPDATE users SET personal_wallet_balance = personal_wallet_balance + $1 WHERE id = $2', [deposit.amount, deposit.user_id]);
      await query(
        `INSERT INTO financial_records (user_id, type, amount, description, reference_id, reference_type, balance_before, balance_after, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [deposit.user_id, 'deposit', deposit.amount, 'Deposit approved', deposit.id, 'deposit', 0, deposit.amount]
      );
      await query('COMMIT');
    } catch (txErr) { await query('ROLLBACK'); throw txErr; }

    const user = await getRow('SELECT personal_wallet_balance FROM users WHERE id = $1', [deposit.user_id]);
    res.json({ success: true, message: 'Deposit approved', data: { deposit_id: id, new_balance: user.personal_wallet_balance } });
  } catch (err) {
    console.error('Admin approve deposit error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve deposit' });
  }
});

// Reject deposit
router.put('/deposits/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body || {};
    const deposit = await getRow('SELECT * FROM deposits WHERE id = $1 AND status = $2', [id, 'pending']);
    if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found or already processed' });
    await query('UPDATE deposits SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3 WHERE id = $4', ['rejected', req.user.id, admin_notes, id]);
    res.json({ success: true, message: 'Deposit rejected', data: { deposit_id: id } });
  } catch (err) {
    console.error('Admin reject deposit error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject deposit' });
  }
});

// List withdrawals (admin)
router.get('/withdrawals', async (req, res) => {
  try {
    const { error, value } = paginationSchema.validate(req.query);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    const { page, limit, status } = value; const offset = (page - 1) * limit;
    let where = 'WHERE 1=1'; const params = []; let i = 0;
    if (status) { where += ` AND w.status = $${++i}`; params.push(status); }
    const rows = await getRows(
      `SELECT w.*, u.full_name AS user_name, pm.name AS payment_method_name
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       JOIN payment_methods pm ON w.payment_method_id = pm.id
       ${where}
       ORDER BY w.created_at DESC
       LIMIT $${++i} OFFSET $${++i}`,
      [...params, limit, offset]
    );
    const total = await getRow(`SELECT COUNT(*) AS count FROM withdrawals w ${where}`, params);
    res.json({ success: true, data: { withdrawals: rows, pagination: { page, limit, total: parseInt(total.count), pages: Math.ceil(total.count / limit) } } });
  } catch (err) {
    console.error('Admin list withdrawals error:', err);
    res.status(500).json({ success: false, message: 'Failed to list withdrawals' });
  }
});

// Approve withdrawal
router.put('/withdrawals/:id/approve', async (req, res) => {
  try {
    const { id } = req.params; const { admin_notes } = req.body || {};
    const w = await getRow('SELECT * FROM withdrawals WHERE id = $1 AND status = $2', [id, 'pending']);
    if (!w) return res.status(404).json({ success: false, message: 'Withdrawal not found or already processed' });
    await query('BEGIN');
    try {
      await query('UPDATE withdrawals SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3 WHERE id = $4', ['approved', req.user.id, admin_notes, id]);
      await query('UPDATE users SET income_wallet_balance = income_wallet_balance - $1 WHERE id = $2', [w.amount, w.user_id]);
      await query(
        `INSERT INTO financial_records (user_id, type, amount, description, reference_id, reference_type, balance_before, balance_after, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [w.user_id, 'withdrawal', w.amount, 'Withdrawal approved', w.id, 'withdrawal', 0, 0]
      );
      await query('COMMIT');
    } catch (txErr) { await query('ROLLBACK'); throw txErr; }
    const user = await getRow('SELECT income_wallet_balance FROM users WHERE id = $1', [w.user_id]);
    res.json({ success: true, message: 'Withdrawal approved', data: { withdrawal_id: id, new_balance: user.income_wallet_balance } });
  } catch (err) {
    console.error('Admin approve withdrawal error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve withdrawal' });
  }
});

// Reject withdrawal
router.put('/withdrawals/:id/reject', async (req, res) => {
  try {
    const { id } = req.params; const { admin_notes } = req.body || {};
    const w = await getRow('SELECT * FROM withdrawals WHERE id = $1 AND status = $2', [id, 'pending']);
    if (!w) return res.status(404).json({ success: false, message: 'Withdrawal not found or already processed' });
    await query('UPDATE withdrawals SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3 WHERE id = $4', ['rejected', req.user.id, admin_notes, id]);
    res.json({ success: true, message: 'Withdrawal rejected', data: { withdrawal_id: id } });
  } catch (err) {
    console.error('Admin reject withdrawal error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject withdrawal' });
  }
});

// Search user by phone and return team metrics
router.get('/users/search', async (req, res) => {
  try {
    const phone = req.query.phone;
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });
    const user = await getRow('SELECT id, full_name, email, phone_number, referral_code, vip_level, created_at FROM users WHERE phone_number = $1', [phone]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const teamStats = await getRow(
      `SELECT 
        COUNT(*) as total_team,
        COUNT(CASE WHEN level = 'A' THEN 1 END) as level_a,
        COUNT(CASE WHEN level = 'B' THEN 1 END) as level_b,
        COUNT(CASE WHEN level = 'C' THEN 1 END) as level_c,
        COUNT(CASE WHEN level = 'D' THEN 1 END) as level_d
       FROM referrals WHERE parent_user_id = $1`,
      [user.id]
    );
    res.json({ success: true, data: { user, team: teamStats } });
  } catch (err) {
    console.error('Admin user search error:', err);
    res.status(500).json({ success: false, message: 'Failed to search user' });
  }
});

// Get overall user activity
router.get('/users/:id/activity', async (req, res) => {
  try {
    const { id } = req.params; const { limit = 10 } = req.query;
    const user = await getRow('SELECT id FROM users WHERE id = $1', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const [deposits, withdrawals, financial, tasks, videos, balances] = await Promise.all([
      getRows('SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [id, limit]),
      getRows('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [id, limit]),
      getRows('SELECT * FROM financial_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [id, limit]),
      getRows(`SELECT tc.*, t.title as task_title FROM task_completions tc JOIN tasks t ON tc.task_id = t.id WHERE tc.user_id = $1 ORDER BY tc.created_at DESC LIMIT $2`, [id, limit]),
      getRows(`SELECT ve.*, v.title as video_title FROM video_earnings ve LEFT JOIN videos v ON ve.video_id = v.id WHERE ve.user_id = $1 ORDER BY ve.created_at DESC LIMIT $2`, [id, limit]),
      getRow('SELECT personal_wallet_balance, income_wallet_balance, total_earnings, total_invested FROM users WHERE id = $1', [id])
    ]);

    res.json({ success: true, data: { deposits, withdrawals, financial, tasks, videos, balances } });
  } catch (err) {
    console.error('Admin user activity error:', err);
    res.status(500).json({ success: false, message: 'Failed to get user activity' });
  }
});

export default router;




