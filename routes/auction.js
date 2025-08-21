// routes/auction.js
const express = require('express');
const router = express.Router();
const auctionController = require('../controllers/auctionController'); // <- you missed this

// health
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'auctions', ts: new Date().toISOString() });
});

// real handlers
router.get('/', auctionController.getAllAuctions);
router.get('/:id', auctionController.getAuctionById);
router.post('/', auctionController.createAuction); // keep public for now

module.exports = router;
