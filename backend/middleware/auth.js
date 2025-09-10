import jwt from 'jsonwebtoken';
import { getRow } from '../database/connection.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await getRow(
      'SELECT id, email, full_name, phone_number, vip_level, position_title FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

export const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

export const verifyAdmin = async (req, res, next) => {
  try {
    if (req.user.position_title !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authorization error' 
    });
  }
};

export const verifyVipLevel = (requiredLevel) => {
  return async (req, res, next) => {
    try {
      if (!req.user.vip_level) {
        return res.status(403).json({ 
          success: false, 
          message: 'VIP membership required' 
        });
      }

      // Extract VIP level number (e.g., "VIP3" -> 3)
      const userVipNumber = parseInt(req.user.vip_level.replace('VIP', ''));
      
      if (isNaN(userVipNumber) || userVipNumber < requiredLevel) {
        return res.status(403).json({ 
          success: false, 
          message: `VIP level ${requiredLevel} or higher required. Current level: ${req.user.vip_level}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('VIP verification error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Authorization error' 
      });
    }
  };
};

export const verifyRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      if (req.user.position_title !== requiredRole) {
        return res.status(403).json({ 
          success: false, 
          message: `${requiredRole} access required` 
        });
      }
      next();
    } catch (error) {
      console.error('Role verification error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Authorization error' 
      });
    }
  };
};



