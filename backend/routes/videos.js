import express from 'express';
import Joi from 'joi';
import { query, getRow, getRows } from '../database/connection.js';

const router = express.Router();

// Validation schemas
const watchVideoSchema = Joi.object({
  video_id: Joi.string().uuid().required(),
  reward_amount: Joi.number().positive().required()
});

const getVideosSchema = Joi.object({
  category: Joi.string().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(50).default(20)
});

// Get available videos
router.get('/', async (req, res) => {
  try {
    const { error, value } = getVideosSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { category, page, limit } = value;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE v.is_active = true';
    let params = [];
    let paramCount = 0;

    if (category) {
      whereClause += ` AND v.category = $${++paramCount}`;
      params.push(category);
    }

    // Get videos
    const videos = await getRows(
      `SELECT 
        v.id, v.title, v.description, v.video_url, v.thumbnail_url,
        v.duration, v.reward_per_watch, v.category, v.created_at
      FROM videos v
      ${whereClause}
      ORDER BY v.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    // Get total count
    const totalCount = await getRow(
      `SELECT COUNT(*) as count FROM videos v ${whereClause}`,
      params
    );

    // Get categories for filtering
    const categories = await getRows(
      'SELECT DISTINCT category FROM videos WHERE is_active = true ORDER BY category',
      []
    );

    res.json({
      success: true,
      data: {
        videos,
        categories: categories.map(c => c.category),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get videos'
    });
  }
});

// Watch video and earn rewards
router.post('/watch', async (req, res) => {
  try {
    const { error, value } = watchVideoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { video_id, reward_amount } = value;
    const userId = req.user.id;

    // Check if user has already watched this video today
    const alreadyWatched = await getRow(
      `SELECT id FROM video_earnings 
       WHERE user_id = $1 AND video_id = $2 AND video_date = CURRENT_DATE`,
      [userId, video_id]
    );

    if (alreadyWatched) {
      return res.status(400).json({
        success: false,
        message: 'You have already watched this video today'
      });
    }

    // Get user's current video limit and status
    const userProfile = await getRow(
      `SELECT 
        up.membership_type, up.is_trial_active, up.trial_end_date,
        up.videos_watched_today, up.last_video_reset_date
      FROM user_profiles up
      WHERE up.user_id = $1`,
      [userId]
    );

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Reset daily count if it's a new day
    if (userProfile.last_video_reset_date !== new Date().toISOString().split('T')[0]) {
      await query(
        'UPDATE user_profiles SET videos_watched_today = 0, last_video_reset_date = CURRENT_DATE WHERE user_id = $1',
        [userId]
      );
      userProfile.videos_watched_today = 0;
    }

    // Check if user is on trial
    const isOnTrial = userProfile.is_trial_active && 
                     new Date(userProfile.trial_end_date) >= new Date();

    // Determine daily video limit
    let dailyLimit = 0;
    if (isOnTrial) {
      dailyLimit = 5; // 5 videos per day during trial
    } else if (userProfile.membership_type === 'vip') {
      // Get active plan's daily limit
      const activePlan = await getRow(
        `SELECT mp.daily_video_limit 
         FROM user_plans up
         JOIN membership_plans mp ON up.plan_id = mp.id
         WHERE up.user_id = $1 AND up.is_active = true 
         AND CURRENT_DATE BETWEEN up.start_date AND up.end_date`,
        [userId]
      );
      dailyLimit = activePlan ? activePlan.daily_video_limit : 0;
    }

    // Check if user can watch more videos
    if (userProfile.videos_watched_today >= dailyLimit) {
      if (isOnTrial) {
        return res.status(400).json({
          success: false,
          message: 'Daily trial limit reached. Upgrade to VIP to continue watching videos.',
          data: { daily_limit: dailyLimit, watched_today: userProfile.videos_watched_today }
        });
      } else if (userProfile.membership_type !== 'vip') {
        return res.status(400).json({
          success: false,
          message: 'Trial expired. Upgrade to VIP to continue watching videos.',
          data: { daily_limit: dailyLimit, watched_today: userProfile.videos_watched_today }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Daily video limit reached. Come back tomorrow!',
          data: { daily_limit: dailyLimit, watched_today: userProfile.videos_watched_today }
        });
      }
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Record video earning
      const videoEarning = await query(
        `INSERT INTO video_earnings (user_id, video_id, reward_amount, video_date)
         VALUES ($1, $2, $3, CURRENT_DATE)
         RETURNING *`,
        [userId, video_id, reward_amount]
      );

      // Update videos watched today
      await query(
        `UPDATE user_profiles 
         SET videos_watched_today = videos_watched_today + 1,
             total_earnings = COALESCE(total_earnings, 0) + $1
         WHERE user_id = $2`,
        [reward_amount, userId]
      );

      // Pay referral commission (A-level gets 3%)
      const referrer = await getRow(
        `SELECT r.parent_user_id, u.membership_type 
         FROM referrals r
         JOIN users u ON r.parent_user_id = u.id
         WHERE r.child_user_id = $1 AND r.level = 'A'`,
        [userId]
      );

      if (referrer && referrer.membership_type === 'vip') {
        const commissionAmount = reward_amount * 0.03; // 3% commission

        // Record commission
        await query(
          `INSERT INTO referral_commissions (
            user_id, source_user_id, commission_type, commission_percent,
            base_amount, commission_amount, level, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            referrer.parent_user_id, userId, 'video', 3.0,
            reward_amount, commissionAmount, 'A', 'paid'
          ]
        );

        // Add to referrer's income wallet
        await query(
          `UPDATE users 
           SET income_wallet_balance = COALESCE(income_wallet_balance, 0) + $1
           WHERE id = $2`,
          [commissionAmount, referrer.parent_user_id]
        );
      }

      await query('COMMIT');

      // Get updated user stats
      const updatedProfile = await getRow(
        `SELECT 
          videos_watched_today, total_earnings, membership_type,
          is_trial_active, trial_end_date
         FROM user_profiles WHERE user_id = $1`,
        [userId]
      );

      res.json({
        success: true,
        message: 'Video watched successfully!',
        data: {
          reward_earned: reward_amount,
          video_earning: videoEarning.rows[0],
          user_stats: {
            videos_watched_today: updatedProfile.videos_watched_today,
            total_earnings: updatedProfile.total_earnings,
            membership_type: updatedProfile.membership_type,
            is_trial_active: updatedProfile.is_trial_active,
            trial_end_date: updatedProfile.trial_end_date
          },
          daily_limit: dailyLimit,
          remaining_videos: Math.max(0, dailyLimit - updatedProfile.videos_watched_today)
        }
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Watch video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process video watch'
    });
  }
});

// Get user's video watching stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user profile and current status
    const userProfile = await getRow(
      `SELECT 
        up.membership_type, up.is_trial_active, up.trial_end_date,
        up.videos_watched_today, up.total_earnings, up.last_video_reset_date
       FROM user_profiles up
       WHERE up.user_id = $1`,
      [userId]
    );

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Get current video limit
    let dailyLimit = 0;
    let planDetails = null;

    if (userProfile.is_trial_active && new Date(userProfile.trial_end_date) >= new Date()) {
      dailyLimit = 5; // Trial period
    } else if (userProfile.membership_type === 'vip') {
      // Get active plan details
      const activePlan = await getRow(
        `SELECT 
          mp.name, mp.daily_video_limit, mp.unit_price,
          up.start_date, up.end_date
         FROM user_plans up
         JOIN membership_plans mp ON up.plan_id = mp.id
         WHERE up.user_id = $1 AND up.is_active = true 
         AND CURRENT_DATE BETWEEN up.start_date AND up.end_date`,
        [userId]
      );
      
      if (activePlan) {
        dailyLimit = activePlan.daily_video_limit;
        planDetails = {
          name: activePlan.name,
          daily_limit: activePlan.daily_video_limit,
          unit_price: activePlan.unit_price,
          start_date: activePlan.start_date,
          end_date: activePlan.end_date
        };
      }
    }

    // Get today's earnings
    const todayEarnings = await getRow(
      `SELECT COALESCE(SUM(reward_amount), 0) as total
       FROM video_earnings 
       WHERE user_id = $1 AND video_date = CURRENT_DATE`,
      [userId]
    );

    // Get weekly earnings
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEarnings = await getRow(
      `SELECT COALESCE(SUM(reward_amount), 0) as total
       FROM video_earnings 
       WHERE user_id = $1 AND video_date >= $2`,
      [userId, weekStart.toISOString().split('T')[0]]
    );

    // Get monthly earnings
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthEarnings = await getRow(
      `SELECT COALESCE(SUM(reward_amount), 0) as total
       FROM video_earnings 
       WHERE user_id = $1 AND video_date >= $2`,
      [userId, monthStart.toISOString().split('T')[0]]
    );

    res.json({
      success: true,
      data: {
        current_status: {
          membership_type: userProfile.membership_type,
          is_trial_active: userProfile.is_trial_active,
          trial_end_date: userProfile.trial_end_date,
          videos_watched_today: userProfile.videos_watched_today,
          daily_limit: dailyLimit,
          remaining_videos: Math.max(0, dailyLimit - userProfile.videos_watched_today)
        },
        plan_details: planDetails,
        earnings: {
          total: userProfile.total_earnings,
          today: todayEarnings.total,
          this_week: weekEarnings.total,
          this_month: monthEarnings.total
        },
        progress: {
          daily_progress: dailyLimit > 0 ? (userProfile.videos_watched_today / dailyLimit) * 100 : 0,
          daily_watched: userProfile.videos_watched_today,
          daily_limit: dailyLimit
        }
      }
    });

  } catch (error) {
    console.error('Get video stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video stats'
    });
  }
});

// Get user's video earning history
router.get('/earnings', async (req, res) => {
  try {
    const { page = 1, limit = 20, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    let whereClause = 'WHERE ve.user_id = $1';
    let params = [userId];
    let paramCount = 1;

    if (date_from) {
      whereClause += ` AND ve.video_date >= $${++paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ` AND ve.video_date <= $${++paramCount}`;
      params.push(date_to);
    }

    // Get earnings history
    const earnings = await getRows(
      `SELECT 
        ve.id, ve.reward_amount, ve.video_date, ve.created_at,
        v.title as video_title, v.category as video_category
       FROM video_earnings ve
       LEFT JOIN videos v ON ve.video_id = v.id
       ${whereClause}
       ORDER BY ve.video_date DESC, ve.created_at DESC
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    // Get total count
    const totalCount = await getRow(
      `SELECT COUNT(*) as count FROM video_earnings ve ${whereClause}`,
      params
    );

    // Get earnings summary
    const earningsSummary = await getRow(
      `SELECT 
        COUNT(*) as total_videos,
        COALESCE(SUM(reward_amount), 0) as total_earnings,
        COALESCE(AVG(reward_amount), 0) as avg_per_video,
        MIN(video_date) as first_video_date,
        MAX(video_date) as last_video_date
       FROM video_earnings ve
       ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        earnings,
        summary: earningsSummary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get earnings history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get earnings history'
    });
  }
});

export default router;



