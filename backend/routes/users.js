import express from 'express';
import Joi from 'joi';
import { query, getRow, getRows } from '../database/connection.js';

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(50).optional(),
  phone_number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  profile_avatar: Joi.string().optional()
});

const joinPlanSchema = Joi.object({
  plan_id: Joi.string().uuid().required(),
  amount: Joi.number().positive().required()
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await getRow(
      `SELECT 
        id, full_name, email, phone_number, referral_code, 
        position_title, vip_level, total_earnings, total_invested,
        income_wallet_balance, personal_wallet_balance, profile_avatar,
        created_at, last_login
      FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { full_name, phone_number, profile_avatar } = value;

    // Check if phone number is already taken by another user
    if (phone_number) {
      const existingUser = await getRow(
        'SELECT id FROM users WHERE phone_number = $1 AND id != $2',
        [phone_number, req.user.id]
      );

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Phone number already taken'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (full_name) {
      updateFields.push(`full_name = $${paramCount++}`);
      updateValues.push(full_name);
    }

    if (phone_number) {
      updateFields.push(`phone_number = $${paramCount++}`);
      updateValues.push(phone_number);
    }

    if (profile_avatar) {
      updateFields.push(`profile_avatar = $${paramCount++}`);
      updateValues.push(profile_avatar);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: result.rows[0] }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get wallet balances
router.get('/wallet', async (req, res) => {
  try {
    const user = await getRow(
      `SELECT 
        personal_wallet_balance, income_wallet_balance, 
        total_earnings, total_invested, vip_level
      FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        personal_wallet: user.personal_wallet_balance,
        income_wallet: user.income_wallet_balance,
        total_earnings: user.total_earnings,
        total_invested: user.total_invested,
        vip_level: user.vip_level
      }
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet information'
    });
  }
});

// Join investment plan
router.post('/join-plan', async (req, res) => {
  try {
    const { error, value } = joinPlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { plan_id, amount } = value;

    // Get user's current wallet balance
    const user = await getRow(
      'SELECT personal_wallet_balance, total_invested FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has sufficient balance
    if (user.personal_wallet_balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance in personal wallet'
      });
    }

    // Get plan details
    const plan = await getRow(
      'SELECT * FROM membership_plans WHERE id = $1',
      [plan_id]
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Investment plan not found'
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Deduct from personal wallet
      await query(
        'UPDATE users SET personal_wallet_balance = personal_wallet_balance - $1, total_invested = total_invested + $1 WHERE id = $2',
        [amount, req.user.id]
      );

      // Record the investment
      await query(
        `INSERT INTO financial_records (
          user_id, type, amount, description, reference_id, reference_type,
          balance_before, balance_after, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          req.user.id,
          'investment',
          amount,
          `Joined ${plan.level_name} plan`,
          plan_id,
          'vip_level',
          user.personal_wallet_balance,
          user.personal_wallet_balance - amount
        ]
      );

      // Update user's VIP level if investment meets requirement
      if (amount >= plan.price) {
        await query(
          'UPDATE users SET vip_level = $1 WHERE id = $2',
          [plan.name, req.user.id]
        );
      }

      await query('COMMIT');

      // Get updated user data
      const updatedUser = await getRow(
        'SELECT personal_wallet_balance, total_invested, vip_level FROM users WHERE id = $1',
        [req.user.id]
      );

      res.json({
        success: true,
        message: `Successfully joined ${plan.name} plan`,
        data: {
          new_balance: updatedUser.personal_wallet_balance,
          total_invested: updatedUser.total_invested,
          vip_level: updatedUser.vip_level,
          plan_details: plan
        }
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Join plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join investment plan'
    });
  }
});

// Get referral history
router.get('/referrals', async (req, res) => {
  try {
    const referrals = await getRows(
      `SELECT 
        r.id, r.commission_earned, r.status, r.created_at,
        u.full_name, u.email, u.phone_number, u.vip_level
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: { referrals }
    });

  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral history'
    });
  }
});

// Get financial records
router.get('/financial-records', async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    let params = [req.user.id];
    let paramCount = 1;

    if (type) {
      whereClause += ` AND type = $${++paramCount}`;
      params.push(type);
    }

    const records = await getRows(
      `SELECT * FROM financial_records 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    const totalCount = await getRow(
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
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get financial records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial records'
    });
  }
});

export default router;



