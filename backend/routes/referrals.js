import express from 'express';
import Joi from 'joi';
import { query, getRow, getRows } from '../database/connection.js';

const router = express.Router();

// Validation schemas
const createReferralSchema = Joi.object({
  referral_code: Joi.string().required().min(6).max(20)
});

const getTeamSchema = Joi.object({
  level: Joi.string().valid('A', 'B', 'C', 'D').optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20)
});

// Create referral relationship (called during signup)
router.post('/', async (req, res) => {
  try {
    const { error, value } = createReferralSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { referral_code } = value;
    const newUserId = req.user.id;

    // Find referrer by referral code
    const referrer = await getRow(
      'SELECT id, referral_code FROM users WHERE referral_code = $1',
      [referral_code]
    );

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    if (referrer.id === newUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot refer yourself'
      });
    }

    // Check if user already has a referrer
    const existingReferral = await getRow(
      'SELECT id FROM referrals WHERE child_user_id = $1',
      [newUserId]
    );

    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message: 'User already has a referrer'
      });
    }

    // Create A-level referral
    await query(
      'INSERT INTO referrals (parent_user_id, child_user_id, level) VALUES ($1, $2, $3)',
      [referrer.id, newUserId, 'A']
    );

    // Update user's referred_by field
    await query(
      'UPDATE users SET referred_by = $1 WHERE id = $2',
      [referrer.id, newUserId]
    );

    // Create B, C, D level referrals by walking up the tree
    const createMultiLevelReferrals = async (parentId, childId, currentLevel) => {
      if (currentLevel === 'D') return; // Stop at D level

      const grandParent = await getRow(
        'SELECT parent_user_id FROM referrals WHERE child_user_id = $1',
        [parentId]
      );

      if (grandParent) {
        const nextLevel = currentLevel === 'A' ? 'B' : currentLevel === 'B' ? 'C' : 'D';
        await query(
          'INSERT INTO referrals (parent_user_id, child_user_id, level) VALUES ($1, $2, $3)',
          [grandParent.parent_user_id, childId, nextLevel]
        );
        
        // Recursively create next level
        await createMultiLevelReferrals(grandParent.parent_user_id, childId, nextLevel);
      }
    };

    await createMultiLevelReferrals(referrer.id, newUserId, 'A');

    res.status(201).json({
      success: true,
      message: 'Referral relationship created successfully',
      data: {
        referrer_id: referrer.id,
        referral_code: referral_code,
        levels_created: ['A', 'B', 'C', 'D']
      }
    });

  } catch (error) {
    console.error('Create referral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create referral relationship'
    });
  }
});

// Get user's team members
router.get('/team', async (req, res) => {
  try {
    const { error, value } = getTeamSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { level, page, limit } = value;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.parent_user_id = $1';
    let params = [req.user.id];
    let paramCount = 1;

    if (level) {
      whereClause += ` AND r.level = $${++paramCount}`;
      params.push(level);
    }

    // Get team members
    const teamMembers = await getRows(
      `SELECT 
        r.id, r.level, r.created_at,
        u.id as user_id, u.full_name, u.username, u.phone_number,
        up.membership_type, up.membership_level, up.total_earnings,
        up.is_trial_active, up.trial_end_date
      FROM referrals r
      JOIN users u ON r.child_user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    // Get total count
    const totalCount = await getRow(
      `SELECT COUNT(*) as count FROM referrals r ${whereClause}`,
      params
    );

    // Get team statistics
    const teamStats = await getRow(
      `SELECT 
        COUNT(CASE WHEN r.level = 'A' THEN 1 END) as a_level_count,
        COUNT(CASE WHEN r.level = 'B' THEN 1 END) as b_level_count,
        COUNT(CASE WHEN r.level = 'C' THEN 1 END) as c_level_count,
        COUNT(CASE WHEN r.level = 'D' THEN 1 END) as d_level_count,
        COUNT(CASE WHEN up.membership_type = 'vip' THEN 1 END) as vip_count,
        COUNT(CASE WHEN up.is_trial_active = true AND CURRENT_DATE <= up.trial_end_date THEN 1 END) as trial_count
      FROM referrals r
      JOIN users u ON r.child_user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE r.parent_user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        team_members: teamMembers,
        team_stats: teamStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team members'
    });
  }
});

// Get referral earnings and commissions
router.get('/earnings', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE rc.user_id = $1';
    let params = [req.user.id];
    let paramCount = 1;

    if (status) {
      whereClause += ` AND rc.status = $${++paramCount}`;
      params.push(status);
    }

    // Get commission history
    const commissions = await getRows(
      `SELECT 
        rc.*,
        u.full_name as source_user_name,
        u.username as source_username
      FROM referral_commissions rc
      JOIN users u ON rc.source_user_id = u.id
      ${whereClause}
      ORDER BY rc.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    // Get total count
    const totalCount = await getRow(
      `SELECT COUNT(*) as count FROM referral_commissions rc ${whereClause}`,
      params
    );

    // Get earnings summary
    const earningsSummary = await getRow(
      `SELECT 
        SUM(CASE WHEN rc.status = 'paid' THEN rc.commission_amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN rc.status = 'pending' THEN rc.commission_amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN rc.commission_type = 'video' THEN rc.commission_amount ELSE 0 END) as video_commissions,
        SUM(CASE WHEN rc.commission_type = 'deposit' THEN rc.commission_amount ELSE 0 END) as deposit_commissions,
        COUNT(CASE WHEN rc.level = 'A' THEN 1 END) as a_level_earnings,
        COUNT(CASE WHEN rc.level = 'B' THEN 1 END) as b_level_earnings,
        COUNT(CASE WHEN rc.level = 'C' THEN 1 END) as c_level_earnings,
        COUNT(CASE WHEN rc.level = 'D' THEN 1 END) as d_level_earnings
      FROM referral_commissions rc
      WHERE rc.user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        commissions,
        earnings_summary: earningsSummary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get referral earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral earnings'
    });
  }
});

// Get user's referral code and stats
router.get('/my-referral', async (req, res) => {
  try {
    // Get user's referral code
    const user = await getRow(
      'SELECT referral_code FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get referral statistics
    const referralStats = await getRow(
      `SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN r.level = 'A' THEN 1 END) as a_level_referrals,
        COUNT(CASE WHEN r.level = 'B' THEN 1 END) as b_level_referrals,
        COUNT(CASE WHEN r.level = 'C' THEN 1 END) as c_level_referrals,
        COUNT(CASE WHEN r.level = 'D' THEN 1 END) as d_level_referrals,
        COUNT(CASE WHEN up.membership_type = 'vip' THEN 1 END) as vip_referrals,
        COUNT(CASE WHEN up.is_trial_active = true AND CURRENT_DATE <= up.trial_end_date THEN 1 END) as trial_referrals
      FROM referrals r
      JOIN users u ON r.child_user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE r.parent_user_id = $1`,
      [req.user.id]
    );

    // Get total earnings from referrals
    const totalEarnings = await getRow(
      `SELECT 
        COALESCE(SUM(commission_amount), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_earnings,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_earnings
      FROM referral_commissions 
      WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        referral_code: user.referral_code,
        referral_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?ref=${user.referral_code}`,
        stats: referralStats,
        earnings: totalEarnings
      }
    });

  } catch (error) {
    console.error('Get my referral error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral information'
    });
  }
});

export default router;



