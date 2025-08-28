import express from 'express';
import Joi from 'joi';
import { query, getRow, getRows } from '../database/connection.js';

const router = express.Router();

// Validation schemas
const activatePlanSchema = Joi.object({
  plan_id: Joi.string().uuid().required()
});

const upgradeVipSchema = Joi.object({
  target_level: Joi.string().required()
});

// Get all VIP levels/plans
router.get('/levels', async (req, res) => {
  try {
    const vipLevels = await getRows(
      'SELECT * FROM membership_plans WHERE is_active = true ORDER BY price ASC',
      []
    );

    res.json({
      success: true,
      data: { vip_levels: vipLevels }
    });

  } catch (error) {
    console.error('Get VIP levels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VIP levels'
    });
  }
});

// Get user's current VIP level and benefits
router.get('/current', async (req, res) => {
  try {
    // Get user's current VIP status
    const userProfile = await getRow(
      'SELECT membership_type, membership_level, total_earnings FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Get current active plan if VIP
    let currentPlan = null;
    if (userProfile.membership_type === 'vip') {
      currentPlan = await getRow(
        `SELECT 
          mp.*, up.start_date, up.end_date, up.is_active
         FROM user_plans up
         JOIN membership_plans mp ON up.plan_id = mp.id
         WHERE up.user_id = $1 AND up.is_active = true 
         AND CURRENT_DATE BETWEEN up.start_date AND up.end_date`,
        [req.user.id]
      );
    }

    // Get next available plans
    const nextPlans = await getRows(
      'SELECT * FROM membership_plans WHERE is_active = true ORDER BY price ASC',
      []
    );

    res.json({
      success: true,
      data: {
        current_status: {
          membership_type: userProfile.membership_type,
          membership_level: userProfile.membership_level,
          total_earnings: userProfile.total_earnings
        },
        current_plan: currentPlan,
        available_plans: nextPlans
      }
    });

  } catch (error) {
    console.error('Get current VIP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current VIP level'
    });
  }
});

// Activate VIP plan from personal wallet
router.post('/activate', async (req, res) => {
  try {
    const { error, value } = activatePlanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { plan_id } = value;
    const userId = req.user.id;

    // Get plan details
    const plan = await getRow(
      'SELECT * FROM membership_plans WHERE id = $1 AND is_active = true',
      [plan_id]
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }

    // Get user's personal wallet balance
    const user = await getRow(
      'SELECT personal_wallet_balance FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has sufficient balance
    if (user.personal_wallet_balance < plan.price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Required: ${plan.price} PKR, Available: ${user.personal_wallet_balance} PKR`
      });
    }

    // Check if user already has an active plan
    const existingPlan = await getRow(
      'SELECT * FROM user_plans WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (existingPlan) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active VIP plan'
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Deactivate any existing plans
      await query(
        'UPDATE user_plans SET is_active = false WHERE user_id = $1',
        [userId]
      );

      // Create new plan subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      const newPlan = await query(
        `INSERT INTO user_plans (user_id, plan_id, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [userId, plan_id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      // Update user profile to VIP
      await query(
        `UPDATE user_profiles 
         SET membership_type = 'vip', 
             membership_level = $1,
             is_trial_active = false
         WHERE user_id = $2`,
        [plan.name, userId]
      );

      // Deduct amount from personal wallet
      const newBalance = user.personal_wallet_balance - plan.price;
      await query(
        'UPDATE users SET personal_wallet_balance = $1 WHERE id = $2',
        [newBalance, userId]
      );

      // Create financial record
      await query(
        `INSERT INTO financial_records (
          user_id, type, amount, description, reference_id, reference_type,
          balance_before, balance_after, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          userId,
          'plan_activation',
          plan.price,
          `VIP Plan ${plan.name} activated`,
          newPlan.rows[0].id,
          'user_plan',
          user.personal_wallet_balance,
          newBalance
        ]
      );

      await query('COMMIT');

      res.json({
        success: true,
        message: `VIP Plan ${plan.name} activated successfully!`,
        data: {
          plan: {
            name: plan.name,
            daily_video_limit: plan.daily_video_limit,
            unit_price: plan.unit_price,
            duration_days: plan.duration_days,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          },
          wallet_deduction: plan.price,
          new_balance: newBalance
        }
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Activate VIP plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate VIP plan'
    });
  }
});

// Get VIP benefits
router.get('/benefits', async (req, res) => {
  try {
    // Get user's current VIP level
    const userProfile = await getRow(
      'SELECT membership_type, membership_level FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Get current VIP level details
    let currentVip = null;
    if (userProfile.membership_type === 'vip') {
      currentVip = await getRow(
        `SELECT 
          mp.*, up.start_date, up.end_date
         FROM user_plans up
         JOIN membership_plans mp ON up.plan_id = mp.id
         WHERE up.user_id = $1 AND up.is_active = true 
         AND CURRENT_DATE BETWEEN up.start_date AND up.end_date`,
        [req.user.id]
      );
    }

    // Get all VIP levels for comparison
    const allVipLevels = await getRows(
      'SELECT * FROM membership_plans WHERE is_active = true ORDER BY price ASC',
      []
    );

    res.json({
      success: true,
      data: {
        current_level: currentVip,
        all_levels: allVipLevels,
        benefits: currentVip ? {
          daily_tasks_limit: currentVip.daily_video_limit,
          unit_price: currentVip.unit_price,
          daily_earning_potential: currentVip.daily_video_limit * currentVip.unit_price,
          deposit_requirement: currentVip.price
        } : null
      }
    });

  } catch (error) {
    console.error('Get VIP benefits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VIP benefits'
    });
  }
});

// Upgrade VIP level (manual upgrade by admin or automatic based on investment)
router.post('/upgrade', async (req, res) => {
  try {
    const { error, value } = upgradeVipSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { target_level } = value;

    // Get user's current investment
    const user = await getRow(
      'SELECT vip_level, total_invested FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get target VIP level
    const targetVip = await getRow(
      'SELECT * FROM membership_plans WHERE name = $1 AND is_active = true',
      [target_level]
    );

    if (!targetVip) {
      return res.status(404).json({
        success: false,
        message: 'Target VIP level not found'
      });
    }

    // Check if user has sufficient investment for the target level
    if (user.total_invested < targetVip.price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient investment. Required: ${targetVip.price} PKR, Current: ${user.total_invested} PKR`
      });
    }

    // Update user's VIP level
    await query(
      'UPDATE users SET vip_level = $1 WHERE id = $2',
      [target_level, req.user.id]
    );

    res.json({
      success: true,
      message: `VIP level upgraded to ${target_level}`,
      data: {
        new_level: targetVip,
        total_invested: user.total_invested
      }
    });

  } catch (error) {
    console.error('Upgrade VIP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade VIP level'
    });
  }
});

// Get VIP level comparison
router.get('/comparison', async (req, res) => {
  try {
    const vipLevels = await getRows(
      'SELECT * FROM membership_plans WHERE is_active = true ORDER BY price ASC',
      []
    );

    // Get user's current level
    const userProfile = await getRow(
      'SELECT membership_type, membership_level FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        vip_levels: vipLevels,
        user_current_level: userProfile?.membership_level || 'none',
        user_membership_type: userProfile?.membership_type || 'free'
      }
    });

  } catch (error) {
    console.error('Get VIP comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VIP comparison'
    });
  }
});

// Get VIP level requirements
router.get('/requirements', async (req, res) => {
  try {
    const requirements = await getRows(
      'SELECT name, price, daily_video_limit, unit_price, duration_days FROM membership_plans WHERE is_active = true ORDER BY price ASC',
      []
    );

    res.json({
      success: true,
      data: { requirements }
    });

  } catch (error) {
    console.error('Get VIP requirements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VIP requirements'
    });
  }
});

export default router;



