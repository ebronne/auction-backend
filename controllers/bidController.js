// controllers/bidController.js
const db = require('../models');
const Bid = db.Bid;
const Auction = db.Auction;

const MIN_INCREMENT = 1;                 // minimum step over current/highest
const SNIPE_WINDOW_MS = 2 * 60 * 1000;   // anti-sniping: extend by 2 minutes

exports.placeBid = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Missing or invalid token' });

    // /api/bids/:id where :id === auctionId
    const auctionId = Number(req.params.id);
    const amount = Number(req.body.amount);
    const userId = req.user.id;

    if (!Number.isFinite(auctionId)) return res.status(400).json({ error: 'Invalid auction id' });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid bid amount' });

    const auction = await Auction.findByPk(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found.' });

    if (auction.isClosed) return res.status(400).json({ error: 'Auction is closed.' });
    if (auction.endTime && new Date(auction.endTime) <= new Date()) {
      return res.status(400).json({ error: 'Auction has ended.' });
    }

    const [highestAmount, lastBid] = await Promise.all([
      Bid.max('amount', { where: { auctionId } }),
      Bid.findOne({ where: { auctionId }, order: [['createdAt', 'DESC']] })
    ]);

    if (lastBid && lastBid.userId === userId) {
      return res.status(400).json({ error: 'You cannot place two consecutive bids on the same auction.' });
    }

    const base = Math.max(Number(auction.startingPrice) || 0, Number(highestAmount) || 0);
    const minRequired = base + MIN_INCREMENT;               // require >= base+step
    if (amount < minRequired) {
      return res.status(400).json({ error: `Bid must be at least ${minRequired}.` });
    }

    // capture current leader (for outbid notification)
    const prevLeader = await Bid.findOne({
      where: { auctionId },
      order: [['amount', 'DESC']]
    });

    // create bid
    const bid = await Bid.create({ amount, userId, auctionId });

    // anti-sniping: extend if near end
    let extended = false;
    if (auction.endTime) {
      const end = new Date(auction.endTime).getTime();
      const now = Date.now();
      if (end - now <= SNIPE_WINDOW_MS) {
        auction.endTime = new Date(now + SNIPE_WINDOW_MS);
        await auction.save();
        extended = true;
      }
    }

    // realtime emits
    const io = req.app.get('io');
    if (io) {
      const [newHighest, bidCount] = await Promise.all([
        Bid.max('amount', { where: { auctionId } }),
        Bid.count({ where: { auctionId } })
      ]);

      io.to(`auction:${auctionId}`).emit('bid:new', {
        auctionId,
        bid,
        highestBid: Number(newHighest) || 0,
        bidCount
      });

      if (extended) {
        io.to(`auction:${auctionId}`).emit('auction:extended', {
          auctionId,
          endTime: auction.endTime
        });
      }

      if (prevLeader && prevLeader.userId !== userId) {
        io.to(`auction:${auctionId}`).emit('bid:outbid', {
          auctionId,
          outbidUserId: prevLeader.userId,
          newAmount: amount
        });
      }
    }

    return res.status(201).json(bid);
  } catch (error) {
    console.error('placeBid error:', error);
    return res.status(500).json({ error: 'Failed to place bid.' });
  }
};

// newest first
exports.getBidsForAuction = async (req, res) => {
  const { auctionId } = req.params;
  try {

    
    const bids = await Bid.findAll({
      where: { auctionId },
      order: [['createdAt', 'DESC']]


    });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// only self or admin
exports.getBidsByUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Missing or invalid token' });

    const requestedUserId = Number(req.params.userId);
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.id === requestedUserId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden: You can only view your own bids.' });
    }

    const bids = await Bid.findAll({
  where: { userId: requestedUserId },
  include: [{ model: db.Auction }],
  order: [['createdAt','DESC']]
});
    // const bids = await Bid.findAll({
    //   where: { userId: requestedUserId },
    //   order: [['createdAt', 'DESC']]
    // });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// convenience: /api/bids/me


// exports.getMyBids = async (req, res) => {
//   try {
//     if (!req.user) return res.status(401).json({ error: 'Missing or invalid token' });

//     // pull user's bids + minimal auction info
//     const bids = await db.Bid.findAll({
//       where: { userId: req.user.id },
//       include: [{ model: db.Auction, attributes: ['id','title','imageUrl','isClosed','endTime'] }],
//       order: [['createdAt','DESC']]
//     });

//     // for each auction, find the current top bid (user + amount)
//     const auctionIds = [...new Set(bids.map(b => b.auctionId))];
//     const topByAuction = {};
//     await Promise.all(auctionIds.map(async (aid) => {
//       const top = await db.Bid.findOne({
//         where: { auctionId: aid },
//         order: [['amount','DESC']],
//         attributes: ['userId','amount']
//       });
//       topByAuction[aid] = top ? { userId: top.userId, amount: Number(top.amount) } : { userId: null, amount: 0 };
//     }));

//     // enrich each row with status fields
//     const enriched = bids.map(b => {
//       const a = b.Auction || {};
//       const top = topByAuction[b.auctionId] || { userId: null, amount: 0 };
//       const ended = !!a.isClosed;
//       const isLeader = top.userId === req.user.id && !ended;
//       const isWinner = ended && top.userId === req.user.id;
//       const status = ended ? (isWinner ? 'Won' : 'Ended') : (isLeader ? 'Leading' : 'Outbid');
//       return {
//         id: b.id,
//         amount: Number(b.amount),
//         createdAt: b.createdAt,
//         auctionId: b.auctionId,
//         Auction: a,
//         status,
//         isLeader,
//         isWinner,
//         highestAmount: top.amount
//       };
//     });

//     res.json(enriched);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getMyBids = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Missing or invalid token' });

    const bids = await db.Bid.findAll({
      where: { userId: req.user.id },
      include: [{ model: db.Auction, attributes: ['id','title','isClosed','endTime','images'] }], // ← no imageUrl
      order: [['createdAt','DESC']]
    });

    const auctionIds = [...new Set(bids.map(b => b.auctionId))];
    const topByAuction = {};
    await Promise.all(auctionIds.map(async (aid) => {
      const top = await db.Bid.findOne({
        where: { auctionId: aid },
        order: [['amount','DESC']],
        attributes: ['userId','amount']
      });
      topByAuction[aid] = top ? { userId: top.userId, amount: Number(top.amount) } : { userId: null, amount: 0 };
    }));

    const enriched = bids.map(b => {
      const a = b.Auction ? b.Auction.get({ plain: true }) : {};
      const img = (Array.isArray(a.images) && a.images[0]) || '/images/placeholder.jpg'; // computed image
      const top = topByAuction[b.auctionId] || { userId: null, amount: 0 };
      const ended = !!a.isClosed;
      const isLeader = top.userId === req.user.id && !ended;
      const isWinner = ended && top.userId === req.user.id;
      const status = ended ? (isWinner ? 'Won' : 'Ended') : (isLeader ? 'Leading' : 'Outbid');

      return {
        id: b.id,
        amount: Number(b.amount),
        createdAt: b.createdAt,
        auctionId: b.auctionId,
        Auction: { ...a, imageUrl: img }, // ← attach computed imageUrl for the UI
        status,
        isLeader,
        isWinner,
        highestAmount: top.amount
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
