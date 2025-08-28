import express from 'express';
import Joi from 'joi';
import { query, getRow, getRows } from '../database/connection.js';

const router = express.Router();

// Validation schemas
const createWithdrawalSchema = Joi.object({
  payment_method_id: Joi.number().required(),
  amount: Joi.number().positive().required(),
  account_number: Joi.string().required(),
  account_name: Joi.string().required()
});

const approveWithdrawalSchema = Joi.object({
  admin_notes: Joi.string().optional()
});

// Create withdrawal request
router.post('/', async (req, res) => {
  try {
    const { error, value } = createWithdrawalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { payment_method_id, amount, account_number, account_name } = value;
    const userId = req.user.id;

    // Check if user is on trial and block withdrawals
    const userProfile = await getRow(
      `SELECT up.membership_type, up.is_trial_active, up.trial_end_date
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

    // Block withdrawals for trial users
    if (userProfile.is_trial_active && new Date(userProfile.trial_end_date) >= new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Withdrawals are not allowed during the trial period. Upgrade to VIP to enable withdrawals.'
      });
    }

    // Block withdrawals for free users after trial
    if (userProfile.membership_type !== 'vip') {
      return res.status(403).json({
        success: false,
        message: 'Withdrawals are only available for VIP members. Upgrade to VIP to enable withdrawals.'
      });
    }

    // Get user's income wallet balance
    const user = await getRow(
      'SELECT income_wallet_balance FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has sufficient balance
    if (user.income_wallet_balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Required: ${amount} PKR, Available: ${user.income_wallet_balance} PKR`
      });
    }

    // Verify payment method exists
    const paymentMethod = await getRow(
      'SELECT * FROM payment_methods WHERE id = $1 AND is_active = true',
      [payment_method_id]
    );

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found'
      });
    }

    // Create withdrawal record
    const result = await query(
      `INSERT INTO withdrawals (
        user_id, payment_method_id, amount, account_number, account_name,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      RETURNING *`,
      [userId, payment_method_id, amount, account_number, account_name]
    );

    const withdrawal = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully. Waiting for admin approval.',
      data: { withdrawal }
    });

  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create withdrawal request'
    });
  }
});

// Get user withdrawals
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE w.user_id = $1';
    let params = [req.user.id];
    let paramCount = 1;

    if (status) {
      whereClause += ` AND w.status = $${++paramCount}`;
      params.push(status);
    }

    const withdrawals = await getRows(
      `SELECT 
        w.*, pm.name as payment_method_name
      FROM withdrawals w
      JOIN payment_methods pm ON w.payment_method_id = pm.id
      ${whereClause}
      ORDER BY w.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    const totalCount = await getRow(
      `SELECT COUNT(*) as count FROM withdrawals w ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get withdrawals'
    });
  }
});

// Get specific withdrawal
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await getRow(
      `SELECT 
        w.*, pm.name as payment_method_name
      FROM withdrawals w
      JOIN payment_methods pm ON w.payment_method_id = pm.id
      WHERE w.id = $1 AND w.user_id = $2`,
      [id, req.user.id]
    );

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found'
      });
    }

    res.json({
      success: true,
      data: { withdrawal }
    });

  } catch (error) {
    console.error('Get withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get withdrawal'
    });
  }
});

// Approve withdrawal (admin only)
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = approveWithdrawalSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { admin_notes } = value;

    // Get withdrawal details
    const withdrawal = await getRow(
      'SELECT * FROM withdrawals WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found or already processed'
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Update withdrawal status
      await query(
        'UPDATE withdrawals SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3 WHERE id = $4',
        ['approved', req.user.id, admin_notes, id]
      );

      // Deduct amount from user's income wallet
      await query(
        'UPDATE users SET income_wallet_balance = income_wallet_balance - $1 WHERE id = $2',
        [withdrawal.amount, withdrawal.user_id]
      );

      // Record the transaction
      await query(
        `INSERT INTO financial_records (
          user_id, type, amount, description, reference_id, reference_type,
          balance_before, balance_after, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          withdrawal.user_id,
          'withdrawal',
          withdrawal.amount,
          'Withdrawal approved',
          withdrawal.id,
          'withdrawal',
          0, // Will be calculated
          0 // Will be calculated
        ]
      );

      await query('COMMIT');

      // Get updated user data
      const user = await getRow(
        'SELECT income_wallet_balance FROM users WHERE id = $1',
        [withdrawal.user_id]
      );

      res.json({
        success: true,
        message: 'Withdrawal approved successfully',
        data: {
          withdrawal_id: id,
          amount: withdrawal.amount,
          new_balance: user.income_wallet_balance
        }
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Approve withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve withdrawal'
    });
  }
});

// Reject withdrawal (admin only)
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    // Get withdrawal details
    const withdrawal = await getRow(
      'SELECT * FROM withdrawals WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found or already processed'
      });
    }

    // Update withdrawal status
    await query(
      'UPDATE withdrawals SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3 WHERE id = $4',
      ['rejected', req.user.id, admin_notes, id]
    );

  res.json({
    success: true,
      message: 'Withdrawal rejected successfully',
      data: { withdrawal_id: id }
    });

  } catch (error) {
    console.error('Reject withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject withdrawal'
    });
  }
});

export default router;



