import express from 'express';
import Joi from 'joi';
import { getRow, getRows } from '../database/connection.js';

const router = express.Router();

const listSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  type: Joi.string().optional(),
});

// Get paginated financial records
router.get('/records', async (req, res) => {
  try {
    const { error, value } = listSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { page, limit, type } = value;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const params = [req.user.id];
    let paramCount = 1;

    if (type) {
      whereClause += ` AND type = $${++paramCount}`;
      params.push(type);
    }

    const records = await getRows(
      `SELECT * FROM financial_records ${whereClause} ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    const total = await getRow(
      `SELECT COUNT(*) as count FROM financial_records ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit)
        }
      }
    });
  } catch (err) {
    console.error('Get financial records error:', err);
    res.status(500).json({ success: false, message: 'Failed to get financial records' });
  }
});

// Get financial statistics
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user.id;

    const totals = await getRow(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN type IN ('task_reward','video_reward','plan_activation','investment') THEN amount END), 0) as total_earnings
       FROM financial_records WHERE user_id = $1`,
      [userId]
    );

    const last30 = await getRows(
      `SELECT DATE(created_at) as date, COALESCE(SUM(amount),0) as total, type
       FROM financial_records WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at), type
       ORDER BY DATE(created_at) DESC`,
      [userId]
    );

    res.json({ success: true, data: { totals, last30 } });
  } catch (err) {
    console.error('Get financial stats error:', err);
    res.status(500).json({ success: false, message: 'Failed to get financial statistics' });
  }
});

export default router;



