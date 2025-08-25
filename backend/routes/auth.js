import express from 'express';
import bcrypt from 'bcryptjs';
import Joi from 'joi';
import { query, getRow } from '../database/connection.js';
import { generateToken } from '../middleware/auth.js';


const router = express.Router();

// Validation schemas
const signupSchema = Joi.object({
  full_name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  phone_number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  password: Joi.string().min(6).required(),
  referral_code: Joi.string().optional(),
  position_title: Joi.string().default('General Employee'),
  vip_level: Joi.string().default('VIP1')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required()
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { full_name, email, phone_number, password, referral_code, position_title, vip_level } = value;

    // Check if user already exists
    const existingUser = await getRow(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
      [email, phone_number]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or phone number already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate referral code
    const userReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create user
    const result = await query(
      `INSERT INTO users (
        full_name, email, phone_number, password_hash, referral_code, 
        position_title, vip_level, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
      RETURNING id, full_name, email, phone_number, referral_code, position_title, vip_level`,
      [full_name, email, phone_number, hashedPassword, userReferralCode, position_title, vip_level]
    );

    const user = result.rows[0];

    // Handle referral if provided
    if (referral_code) {
      const referrer = await getRow(
        'SELECT id, referral_code FROM users WHERE referral_code = $1',
        [referral_code]
      );

      if (referrer) {
        await query(
          'INSERT INTO referrals (referrer_id, referred_id, created_at) VALUES ($1, $2, NOW())',
          [referrer.id, user.id]
        );
      }
    }

    // Generate token
    const token = generateToken(user.id);



    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          referral_code: user.referral_code,
          position_title: user.position_title,
          vip_level: user.vip_level
        },
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password } = value;

    // Get user
    const user = await getRow(
      'SELECT id, full_name, email, phone_number, password_hash, referral_code, position_title, vip_level, is_active FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          referral_code: user.referral_code,
          position_title: user.position_title,
          vip_level: user.vip_level
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email } = value;

    const user = await getRow(
      'SELECT id, full_name, email FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
      [resetToken, resetTokenExpiry, user.id]
    );



          res.json({
        success: true,
        message: 'Password reset token generated successfully'
      });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed'
    });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { token, password } = value;

    const user = await getRow(
      'SELECT id, email, full_name FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );



    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
});

// Verify Token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token required'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await getRow(
      'SELECT id, full_name, email, phone_number, referral_code, position_title, vip_level FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

export default router;
