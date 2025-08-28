import express from 'express';
import Joi from 'joi';
import { query, getRow, getRows } from '../database/connection.js';

const router = express.Router();

// Validation schemas
const completeTaskSchema = Joi.object({
  task_id: Joi.string().uuid().required(),
  completion_time: Joi.number().optional()
});

// Get available tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await getRows(
      'SELECT * FROM tasks WHERE is_active = true ORDER BY created_at DESC',
      []
    );

    res.json({
      success: true,
      data: { tasks }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tasks'
    });
  }
});

// Complete a task
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = completeTaskSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { completion_time } = value;

    // Get task details
    const task = await getRow(
      'SELECT * FROM tasks WHERE id = $1 AND is_active = true',
      [id]
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Get user's VIP level and daily task count
    const user = await getRow(
      'SELECT vip_level, tasks_completed_today, last_task_reset FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if daily limit is reset
    const today = new Date().toDateString();
    const lastReset = user.last_task_reset ? new Date(user.last_task_reset).toDateString() : null;

    if (lastReset !== today) {
      // Reset daily task count
      await query(
        'UPDATE users SET tasks_completed_today = 0, last_task_reset = CURRENT_DATE WHERE id = $1',
        [req.user.id]
      );
    }

    // Get user's current daily task count
    const currentUser = await getRow(
      'SELECT tasks_completed_today, vip_level FROM users WHERE id = $1',
      [req.user.id]
    );

    // Get VIP level details
    const vipLevel = await getRow(
      'SELECT * FROM membership_plans WHERE name = $1',
      [currentUser.vip_level]
    );

    if (!vipLevel) {
      return res.status(400).json({
        success: false,
        message: 'Invalid VIP level'
      });
    }

    // Check daily task limit
    if (currentUser.tasks_completed_today >= vipLevel.daily_tasks_limit) {
      return res.status(400).json({
        success: false,
        message: `Daily task limit reached (${vipLevel.daily_tasks_limit} tasks)`
      });
    }

    // Check if user already completed this task today
    const existingCompletion = await getRow(
      'SELECT id FROM task_completions WHERE user_id = $1 AND task_id = $2 AND DATE(created_at) = CURRENT_DATE',
      [req.user.id, id]
    );

    if (existingCompletion) {
      return res.status(400).json({
        success: false,
        message: 'Task already completed today'
      });
    }

    // Calculate reward based on VIP level
    const reward = Number(vipLevel.unit_price);

    // Start transaction
    await query('BEGIN');

    try {
      // Record task completion
      await query(
        `INSERT INTO task_completions (
          user_id, task_id, reward_earned, completion_time, status, created_at
        ) VALUES ($1, $2, $3, $4, 'completed', NOW())`,
        [req.user.id, id, reward, completion_time || task.duration_seconds]
      );

      // Update user's daily task count
      await query(
        'UPDATE users SET tasks_completed_today = tasks_completed_today + 1 WHERE id = $1',
        [req.user.id]
      );

      // Add reward to income wallet
      await query(
        'UPDATE users SET income_wallet_balance = income_wallet_balance + $1, total_earnings = total_earnings + $1 WHERE id = $1',
        [reward, req.user.id]
      );

      // Record the transaction
      await query(
        `INSERT INTO financial_records (
          user_id, type, amount, description, reference_id, reference_type,
          balance_before, balance_after, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          req.user.id,
          'task_reward',
          reward,
          `Completed task: ${task.title}`,
          id,
          'task',
          0, // Will be calculated
          reward // Will be calculated
        ]
      );

      await query('COMMIT');

      // Get updated user data
      const updatedUser = await getRow(
        'SELECT income_wallet_balance, total_earnings, tasks_completed_today FROM users WHERE id = $1',
        [req.user.id]
      );

      res.json({
        success: true,
        message: 'Task completed successfully!',
        data: {
          task_title: task.title,
          reward_earned: reward,
          new_balance: updatedUser.income_wallet_balance,
          total_earnings: updatedUser.total_earnings,
          tasks_completed_today: updatedUser.tasks_completed_today,
          daily_limit: vipLevel.daily_tasks_limit
        }
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete task'
    });
  }
});

// Get task completion history
router.get('/completions', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const completions = await getRows(
      `SELECT 
        tc.*, t.title as task_title, t.description as task_description
      FROM task_completions tc
      JOIN tasks t ON tc.task_id = t.id
      WHERE tc.user_id = $1
      ORDER BY tc.created_at DESC
      LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const totalCount = await getRow(
      'SELECT COUNT(*) as count FROM task_completions WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        completions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get task completions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task completions'
    });
  }
});

// Get user's task statistics
router.get('/statistics', async (req, res) => {
  try {
    // Get user's VIP level and daily progress
    const user = await getRow(
      'SELECT vip_level, tasks_completed_today, last_task_reset FROM users WHERE id = $1',
      [req.user.id]
    );

    // Get VIP level details
    const vipLevel = await getRow(
      'SELECT * FROM vip_levels WHERE level_name = $1',
      [user.vip_level]
    );

    // Get today's earnings
    const todayEarnings = await getRow(
      `SELECT COALESCE(SUM(reward_earned), 0) as total
       FROM task_completions 
       WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [req.user.id]
    );

    // Get total task completions
    const totalCompletions = await getRow(
      'SELECT COUNT(*) as count FROM task_completions WHERE user_id = $1',
      [req.user.id]
    );

    // Get total earnings from tasks
    const totalTaskEarnings = await getRow(
      'SELECT COALESCE(SUM(reward_earned), 0) as total FROM task_completions WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        vip_level: user.vip_level,
        daily_tasks_completed: user.tasks_completed_today,
        daily_tasks_limit: vipLevel ? vipLevel.daily_tasks_limit : 0,
        today_earnings: parseFloat(todayEarnings.total),
        total_completions: parseInt(totalCompletions.count),
        total_task_earnings: parseFloat(totalTaskEarnings.total),
        earning_range: vipLevel ? vipLevel.earning_range : '0-0'
      }
    });

  } catch (error) {
    console.error('Get task statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get task statistics'
    });
  }
});

export default router;



