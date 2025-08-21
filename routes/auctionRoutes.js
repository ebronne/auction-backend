const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auctionController');

// Create auction
router.post('/create', auctionController.createAuction);

// Get all auctions
router.get('/', auctionController.getAllAuctions);

// Get auction by ID
router.get('/:id', auctionController.getAuctionById);

module.exports = router;
