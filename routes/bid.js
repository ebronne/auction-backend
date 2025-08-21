// routes/bid.js
const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bidController');
const authenticateToken = require('../middleware/authMiddleware');

// Create bid — :id is the auctionId (matches controller's req.params.id)
router.post('/:id', authenticateToken, bidController.placeBid);

// Reads
router.get('/auction/:auctionId', bidController.getBidsForAuction);
router.get('/user/:userId', authenticateToken, bidController.getBidsByUser);
router.get('/me', authenticateToken, bidController.getMyBids); // add this function in controller

module.exports = router;
