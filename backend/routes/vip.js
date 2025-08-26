import express from 'express';
import Joi from 'joi';
import { query, getRow, getRows } from '../database/connection.js';

const router = express.Router();

// Validation schemas
const upgradeVipSchema = Joi.object({
  target_level: Joi.string().required()
});

// Get all VIP levels
router.get('/levels', async (req, res) => {
  try {
    const vipLevels = await getRows(
      'SELECT * FROM vip_levels ORDER BY deposit_requirement ASC',
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
    // Get user's current VIP level
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

    // Get current VIP level details
    const currentVip = await getRow(
      'SELECT * FROM vip_levels WHERE level_name = $1',
      [user.vip_level]
    );

    // Get next VIP level
    const nextVip = await getRow(
      'SELECT * FROM vip_levels WHERE deposit_requirement > $1 ORDER BY deposit_requirement ASC LIMIT 1',
      [user.total_invested]
    );

    // Calculate progress to next level
    let progress = 0;
    if (nextVip && currentVip) {
      const currentRequirement = currentVip.deposit_requirement;
      const nextRequirement = nextVip.deposit_requirement;
      const userInvestment = user.total_invested;
      
      progress = Math.min(100, ((userInvestment - currentRequirement) / (nextRequirement - currentRequirement)) * 100);
    }

    res.json({
      success: true,
      data: {
        current_level: currentVip,
        next_level: nextVip,
        total_invested: user.total_invested,
        progress_to_next: Math.round(progress),
        remaining_for_next: nextVip ? nextVip.deposit_requirement - user.total_invested : 0
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

// Get VIP benefits
router.get('/benefits', async (req, res) => {
  try {
    // Get user's current VIP level
    const user = await getRow(
      'SELECT vip_level FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get current VIP level details
    const currentVip = await getRow(
      'SELECT * FROM vip_levels WHERE level_name = $1',
      [user.vip_level]
    );

    if (!currentVip) {
      return res.status(404).json({
        success: false,
        message: 'VIP level not found'
      });
    }

    // Get all VIP levels for comparison
    const allVipLevels = await getRows(
      'SELECT * FROM vip_levels ORDER BY deposit_requirement ASC',
      []
    );

    res.json({
      success: true,
      data: {
        current_level: currentVip,
        all_levels: allVipLevels,
        benefits: {
          daily_tasks_limit: currentVip.daily_tasks_limit,
          earning_range: currentVip.earning_range,
          commission_rate: currentVip.commission_rate,
          deposit_requirement: currentVip.deposit_requirement
        }
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
      'SELECT * FROM vip_levels WHERE level_name = $1',
      [target_level]
    );

    if (!targetVip) {
      return res.status(404).json({
        success: false,
        message: 'Target VIP level not found'
      });
    }

    // Check if user has sufficient investment for the target level
    if (user.total_invested < targetVip.deposit_requirement) {
      return res.status(400).json({
        success: false,
        message: `Insufficient investment. Required: ${targetVip.deposit_requirement} PKR, Current: ${user.total_invested} PKR`
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
      'SELECT * FROM vip_levels ORDER BY deposit_requirement ASC',
      []
    );

    // Get user's current level
    const user = await getRow(
      'SELECT vip_level, total_invested FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        vip_levels: vipLevels,
        user_current_level: user.vip_level,
        user_total_invested: user.total_invested
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
      'SELECT level_name, deposit_requirement, daily_tasks_limit, earning_range, commission_rate FROM vip_levels ORDER BY deposit_requirement ASC',
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



