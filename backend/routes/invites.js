import express from 'express';
import Joi from 'joi';
import { getRow, getRows, query } from '../database/connection.js';

const router = express.Router();

const createSchema = Joi.object({
  invitee_email: Joi.string().email().required()
});

// Create an invite
router.post('/', async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { invitee_email } = value;

    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Insert invite
    const result = await query(
      `INSERT INTO invites (inviter_user_id, invitee_email, invite_code)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, invitee_email, inviteCode]
    );

    res.status(201).json({ success: true, message: 'Invite created', data: { invite: result.rows[0] } });
  } catch (err) {
    console.error('Create invite error:', err);
    res.status(500).json({ success: false, message: 'Failed to create invite' });
  }
});

// List invites
router.get('/', async (req, res) => {
  try {
    const invites = await getRows(
      `SELECT * FROM invites WHERE inviter_user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: { invites } });
  } catch (err) {
    console.error('Get invites error:', err);
    res.status(500).json({ success: false, message: 'Failed to get invites' });
  }
});

// Accept an invite (by code)
router.post('/accept', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Invite code required' });
    }

    const invite = await getRow(
      `SELECT * FROM invites WHERE invite_code = $1 AND status = 'pending'`,
      [code]
    );

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invalid or used invite code' });
    }

    await query(
      `UPDATE invites SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invite.id]
    );

    res.json({ success: true, message: 'Invite accepted' });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ success: false, message: 'Failed to accept invite' });
  }
});

export default router;



