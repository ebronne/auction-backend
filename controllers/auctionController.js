const db = require('../models');
// const { Auction, Bid } = db; // <-- ensure Bid is here
// // normalize images from TEXT/JSON -> array
// const toArr = (v) => {
//   try {
//     if (!v) return [];
//     if (Array.isArray(v)) return v;
//     const p = JSON.parse(v);
//     return Array.isArray(p) ? p : [];
//   } catch { return []; }
// };

// controllers/auctionController.js

const { Auction, Bid } = require('../models');   // keep whatever you already had

const toArr = (x) => {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === 'string') {
    try { const a = JSON.parse(x); return Array.isArray(a) ? a : []; }
    catch { return []; }
  }
  return [];
};


//getAllAuctions
// 

// exports.getAllAuctions = async (req, res) => {
//   try {
//     const rows = await Auction.findAll({ raw: true });
//     const list = await Promise.all(rows.map(async (a) => {
//       const images = toArr(a.images);
//       const [highest, count] = await Promise.all([
//         Bid.max('amount', { where: { auctionId: a.id } }),
//         Bid.count({ where: { auctionId: a.id } })
//       ]);
//       return {
//         ...a,
//         images,
//         imageUrl: images[0] || a.imageUrl || '/images/placeholder.jpg',
//         highestBid: Number(highest) || Number(a.startingPrice) || 0,
//         bidCount: count || 0,
//       };
//     }));
//     return res.json(list);
//   } catch (e) {
//     console.error('getAllAuctions error:', e);
//     return res.status(500).json({ error: 'Failed to fetch auctions' });
//   }
// };

exports.getAllAuctions = async (req, res) => {
  try {
    const rows = await Auction.findAll({ raw: true });
    const list = await Promise.all(rows.map(async (a) => {
      const images = toArr(a.images);
      const [highest, count] = await Promise.all([
        Bid.max('amount', { where: { auctionId: a.id } }),
        Bid.count({ where: { auctionId: a.id } })
      ]);
      return {
        ...a,
        images,
        imageUrl: images[0] || a.imageUrl || '/images/placeholder.jpg',
        highestBid: Number(highest) || Number(a.startingPrice) || 0,
        bidCount: count || 0,
      };
    }));
    return res.json(list);
  } catch (e) {
    console.error('getAllAuctions error:', e);
    return res.status(500).json({ error: 'Failed to fetch auctions' });
  }
};

// replace your getAuctionById with this

// 

// exports.getAuctionById = async (req, res) => {
//   try {
//     const a = await Auction.findByPk(req.params.id, { raw: true });
//     if (!a) return res.status(404).json({ error: 'Not found' });

//     const images = toArr(a.images);
//     const [highestBid, bidCount] = await Promise.all([
//       Bid.max('amount', { where: { auctionId: a.id } }),
//       Bid.count({ where: { auctionId: a.id } })
//     ]);

//     return res.json({
//       ...a,
//       images,
//       imageUrl: images[0] || a.imageUrl || '/images/placeholder.jpg',
//       highestBid: Number(highestBid) || Number(a.startingPrice) || 0,
//       bidCount: bidCount || 0,
//     });
//   } catch (e) {
//     console.error('getAuctionById error:', e);
//     return res.status(500).json({ error: 'Failed to fetch auction' });
//   }
// };

exports.getAuctionById = async (req, res) => {
  try {
    const a = await Auction.findByPk(req.params.id, { raw: true });
    if (!a) return res.status(404).json({ error: 'Not found' });

    const images = toArr(a.images);
    const [highestBid, bidCount] = await Promise.all([
      Bid.max('amount', { where: { auctionId: a.id } }),
      Bid.count({ where: { auctionId: a.id } })
    ]);

    return res.json({
      ...a,
      images,
      imageUrl: images[0] || a.imageUrl || '/images/placeholder.jpg',
      highestBid: Number(highestBid) || Number(a.startingPrice) || 0,
      bidCount: bidCount || 0,
    });
  } catch (e) {
    console.error('getAuctionById error:', e);
    return res.status(500).json({ error: 'Failed to fetch auction' });
  }
};


exports.createAuction = async (req, res) => {
  try {
    const { title, description, startingPrice, imageUrl, endTime } = req.body;
    const created = await Auction.create({
      title,
      description,
      startingPrice,
      imageUrl: imageUrl || '/images/scooter.jpg',
      endTime: endTime || new Date(Date.now() + 7*24*60*60*1000)
    });
    return res.status(201).json(created);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message });
  }
};

exports.updateAuction = async (req, res) => {
  try {
    const a = await db.Auction.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    await a.update(req.body);
    res.json(a);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.deleteAuction = async (req, res) => {
  try {
    const a = await db.Auction.findByPk(req.params.id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    await a.destroy();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// exports.adminAddAuctionImages = async (req, res) => {
//   try {
//     console.log('upload debug -> files:', (req.files || []).map(f => ({
//   field: f.fieldname, name: f.originalname, type: f.mimetype, size: f.size
// })));

//     const id = Number(req.params.id);
//     const auction = await db.Auction.findByPk(id);
//     if (!auction) return res.status(404).json({ error: 'Auction not found' });

//     const existing = Array.isArray(auction.images) ? auction.images : [];
//     // Public URL path (server serves /public at web root)
//     const newOnes = (req.files || []).map(f => `/uploads/${f.filename}`);

//     // Append and enforce a max of 10 (keep the most recent 10)
//     let combined = existing.concat(newOnes).filter(Boolean);
//     combined = combined.slice(-10);

//     auction.images = combined;
//     await auction.save();

//     return res.json({ id: auction.id, images: auction.images });
//   } catch (e) {
//     console.error('adminAddAuctionImages error:', e);
//     return res.status(400).json({ error: e.message });
//   }
// };

exports.adminAddAuctionImages = async (req, res) => {
  try {
    console.log('upload debug -> files:', (req.files || []).map(f => ({
      field: f.fieldname, name: f.originalname, type: f.mimetype, size: f.size
    })));

    const id = Number(req.params.id);
    const auction = await db.Auction.findByPk(id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    // normalize existing -> array (uses your toArr helper)
    const existing = toArr(auction.images);

    // new files -> public URLs (served from /public/uploads)
    const newOnes = (req.files || []).map(f => `/uploads/${f.filename}`);

    // append, filter, keep last 10
    const combined = [...existing, ...newOnes].filter(Boolean).slice(-10);

    // persist (handle TEXT vs JSON column)
    if (typeof auction.images === 'string') {
      auction.images = JSON.stringify(combined);
    } else {
      auction.images = combined;
    }
    await auction.save();

    // return normalized array
    return res.json({ id: auction.id, images: combined });
  } catch (e) {
    console.error('adminAddAuctionImages error:', e);
    return res.status(400).json({ error: e.message });
  }
};
