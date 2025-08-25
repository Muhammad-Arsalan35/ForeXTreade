import express from 'express';

const router = express.Router();

// Placeholder for withdrawals functionality
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Withdrawals route - to be implemented',
    data: { withdrawals: [] }
  });
});

export default router;


