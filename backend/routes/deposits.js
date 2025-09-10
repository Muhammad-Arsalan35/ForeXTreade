import express from 'express';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import { query, getRow, getRows } from '../database/connection.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'backend/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Validation schemas
const createDepositSchema = Joi.object({
  payment_method_id: Joi.number().required(),
  amount: Joi.number().positive().required(),
  till_id: Joi.string().required(),
  sender_account_number: Joi.string().required()
});

const approveDepositSchema = Joi.object({
  admin_notes: Joi.string().optional()
});

// Create deposit request
router.post('/', upload.single('payment_proof'), async (req, res) => {
  try {
    const { error, value } = createDepositSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { payment_method_id, amount, till_id, sender_account_number } = value;
    const payment_proof = req.file ? req.file.filename : null;

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

    // Create deposit record
    const result = await query(
      `INSERT INTO deposits (
        user_id, payment_method_id, amount, till_id, payment_proof,
        sender_account_number, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
      RETURNING *`,
      [req.user.id, payment_method_id, amount, till_id, payment_proof, sender_account_number]
    );

    const deposit = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Deposit request submitted successfully. Waiting for admin approval.',
      data: { deposit }
    });

  } catch (error) {
    console.error('Create deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create deposit request'
    });
  }
});

// Get user deposits
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE d.user_id = $1';
    let params = [req.user.id];
    let paramCount = 1;

    if (status) {
      whereClause += ` AND d.status = $${++paramCount}`;
      params.push(status);
    }

    const deposits = await getRows(
      `SELECT 
        d.*, pm.name as payment_method_name, pm.account_number as admin_account
      FROM deposits d
      JOIN payment_methods pm ON d.payment_method_id = pm.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...params, limit, offset]
    );

    const totalCount = await getRow(
      `SELECT COUNT(*) as count FROM deposits d ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        deposits,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deposits'
    });
  }
});

// Get specific deposit
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deposit = await getRow(
      `SELECT 
        d.*, pm.name as payment_method_name, pm.account_number as admin_account
      FROM deposits d
      JOIN payment_methods pm ON d.payment_method_id = pm.id
      WHERE d.id = $1 AND d.user_id = $2`,
      [id, req.user.id]
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Deposit not found'
      });
    }

    res.json({
      success: true,
      data: { deposit }
    });

  } catch (error) {
    console.error('Get deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deposit'
    });
  }
});

// Approve deposit (admin only)
router.put('/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = approveDepositSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { admin_notes } = value;

    // Get deposit details
    const deposit = await getRow(
      'SELECT * FROM deposits WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Deposit not found or already processed'
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Update deposit status
      await query(
        'UPDATE deposits SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3 WHERE id = $4',
        ['approved', req.user.id, admin_notes, id]
      );

      // Add amount to user's personal wallet and update total_invested
      await query(
        'UPDATE users SET personal_wallet_balance = personal_wallet_balance + $1, total_invested = total_invested + $1 WHERE id = $2 RETURNING total_invested, vip_level',
        [deposit.amount, deposit.user_id]
      );

      // Record the transaction
      await query(
        `INSERT INTO financial_records (
          user_id, type, amount, description, reference_id, reference_type,
          balance_before, balance_after, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          deposit.user_id,
          'deposit',
          deposit.amount,
          'Deposit approved',
          deposit.id,
          'deposit',
          0, // Will be calculated
          deposit.amount // Will be calculated
        ]
      );

      // Get updated user data and check for VIP eligibility
      const user = await getRow(
        'SELECT personal_wallet_balance, total_invested, vip_level FROM users WHERE id = $1',
        [deposit.user_id]
      );
      
      // Check if user is eligible for VIP upgrade based on total_invested
      const eligibleVipLevel = await getRow(
        `SELECT name FROM membership_plans 
         WHERE price <= $1 AND is_active = true 
         ORDER BY price DESC LIMIT 1`,
        [user.total_invested]
      );
      
      // If eligible for a higher VIP level than current, upgrade automatically
      if (eligibleVipLevel && (!user.vip_level || eligibleVipLevel.name > user.vip_level)) {
        await query(
          'UPDATE users SET vip_level = $1 WHERE id = $2',
          [eligibleVipLevel.name, deposit.user_id]
        );
        
        // Log the VIP upgrade
        await query(
          `INSERT INTO financial_records (
            user_id, type, amount, description, reference_id, reference_type,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            deposit.user_id,
            'vip_upgrade',
            0,
            `Automatic VIP upgrade to ${eligibleVipLevel.name} based on total investment`,
            deposit.id,
            'deposit'
          ]
        );
      }
      
      await query('COMMIT');

      // Prepare response data
      const responseData = {
        deposit_id: id,
        amount: deposit.amount,
        new_balance: user.personal_wallet_balance,
        total_invested: user.total_invested
      };
      
      // Add VIP upgrade info if applicable
      if (eligibleVipLevel && (!user.vip_level || eligibleVipLevel.name > user.vip_level)) {
        responseData.vip_upgrade = {
          new_level: eligibleVipLevel.name,
          message: `Congratulations! You've been upgraded to VIP level ${eligibleVipLevel.name}`
        };
      }
      
      res.json({
        success: true,
        message: responseData.vip_upgrade ? 
          'Deposit approved successfully and VIP level upgraded' : 
          'Deposit approved successfully',
        data: responseData
      });

    } catch (transactionError) {
      await query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Approve deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve deposit'
    });
  }
});

// Reject deposit (admin only)
router.put('/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    // Get deposit details
    const deposit = await getRow(
      'SELECT * FROM deposits WHERE id = $1 AND status = $2',
      [id, 'pending']
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Deposit not found or already processed'
      });
    }

    // Update deposit status
    await query(
      'UPDATE deposits SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3 WHERE id = $4',
      ['rejected', req.user.id, admin_notes, id]
    );

    res.json({
      success: true,
      message: 'Deposit rejected successfully',
      data: { deposit_id: id }
    });

  } catch (error) {
    console.error('Reject deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject deposit'
    });
  }
});

// Get payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    const paymentMethods = await getRows(
      'SELECT * FROM payment_methods WHERE is_active = true ORDER BY name',
      []
    );

    res.json({
      success: true,
      data: { payment_methods: paymentMethods }
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods'
    });
  }
});

export default router;



