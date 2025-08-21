// routes/admin.js
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

const db = require('../models');
const auctionController = require('../controllers/auctionController');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');
const { uploadImages } = require('../middleware/upload');

router.post('/sms/test', async (req, res) => {
  const { to, text } = req.body;
  try { const r = await sendSms(to, text || 'SMS test'); res.json({ ok: true, r }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// all admin endpoints require admin
router.use(authenticateToken, checkRole('admin'));

/* ---- Auctions CRUD ---- */
router.post('/auctions', auctionController.createAuction);
router.put('/auctions/:id', auctionController.updateAuction);
router.delete('/auctions/:id', auctionController.deleteAuction);

// create invite
router.post('/invites', async (req, res) => {
  const { email, days = 7 } = req.body;
  const token = crypto.randomBytes(20).toString('hex');
  const expiresAt = new Date(Date.now() + days*24*3600*1000);
  const row = await db.InviteToken.create({ token, email, expiresAt });
  if (email) {
    await sendMail({
      to: email,
      subject: 'Your Imperial Auctions invite',
      text: `Use this token to register: ${token}`,
      html: `<p>Use this token to register:</p><pre>${token}</pre>`
    });
  }
  res.status(201).json({ token, email, expiresAt });
});

// list invites
router.get('/invites', async (_req, res) => {
  const rows = await db.InviteToken.findAll({ order: [['createdAt','DESC']] });
  res.json(rows);
});

// one-time DB patch: add phone column (SQLite)
router.post('/maint/add-phone-column', authenticateToken, checkRole('admin'), async (req,res)=>{
  const db = req.app.get('models');
  try {
    await db.sequelize.query('ALTER TABLE Users ADD COLUMN phone TEXT;');
    res.json({ ok: true, added: true });
  } catch (e) {
    if (/duplicate|exists|duplicate column/i.test(e.message)) return res.json({ ok: true, already: true });
    res.status(500).json({ error: e.message });
  }
});

// // image upload for auctions  
// router.post(
//   '/auctions/:id/images',
//   authenticateToken,
//   checkRole('admin'),
//   uploadImages,
//   auctionController.adminAddAuctionImages
// );

router.post(
  '/auctions/:id/images',
  authenticateToken,
  checkRole('admin'),
  (req, res, next) => uploadImages(req, res, err => err ? res.status(400).json({ error: err.message }) : next()),
  auctionController.adminAddAuctionImages
);


// set a user’s phone (admin)
router.put('/users/:id/phone', authenticateToken, checkRole('admin'), async (req,res)=>{
  const db = req.app.get('models');
  const { phone } = req.body;
  await db.User.update({ phone }, { where: { id: req.params.id } });
  res.json({ ok: true });
});

// revoke invite
router.delete('/invites/:token', async (req, res) => {
  await db.InviteToken.destroy({ where: { token: req.params.token, used: false } });
  res.json({ ok: true });
});

/* ---- Auctions list: running | closed | all ---- */
router.get('/auctions', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const { status } = req.query;
    const where = {};
    if (status === 'running') where[Op.and] = [{ isClosed: false }, { [Op.or]: [{ endTime: null }, { endTime: { [Op.gt]: new Date() } }] }];
    if (status === 'closed')  where[Op.or]  = [{ isClosed: true }, { endTime: { [Op.lte]: new Date() } }];

    const rows = await db.Auction.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- Bids list (optionally by status of their auction) ---- */
router.get('/bids', async (req, res) => {
  try {
    const { status } = req.query; // running | closed
    const where = {};
    if (status) {
      where['$Auction.isClosed$'] = status === 'closed';
    }
    const bids = await db.Bid.findAll({
      include: [
        { model: db.Auction, attributes: ['id','title','isClosed'] },
        { model: db.User, attributes: ['id','email','role'] }
      ],
      where,
      order: [['createdAt','DESC']]
    });
    res.json(bids);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- Users list ---- */
router.get('/users', async (_req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: ['id','email','role','createdAt']
      // add 'lastLogin' here later if you add that column
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- Winners (who won which auction) ---- */
router.get('/winners', async (_req, res) => {
  try {
    const rows = await db.Auction.findAll({
      where: { isClosed: true },
      include: [
        { model: db.User, as: 'winner', attributes: ['id','email'] }
      ],
      order: [['updatedAt','DESC']]
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});



/* ---- Email: to a specific userId ---- */
router.post('/email/user', async (req, res) => {
  try {
    const { userId, subject, text, html } = req.body;
    if (!userId || !subject) return res.status(400).json({ error: 'userId and subject are required' });
    const user = await db.User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await sendMail({ to: user.email, subject, text, html });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---- Email: to any custom address ---- */
router.post('/email/custom', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject) return res.status(400).json({ error: 'to and subject are required' });
    await sendMail({ to, subject, text, html });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Close an auction now and send winner/admin emails + SMS
// router.post('/auctions/:id/close', async (req, res) => {
//   try {
//     const { id } = req.params;
//     const a = await db.Auction.findByPk(id);
//     if (!a) return res.status(404).json({ error: 'Not found' });

//     // find top bid (if any)
//     const top = await db.Bid.findOne({ where: { auctionId: id }, order: [['amount','DESC']] });
//     a.isClosed = true;
//     a.winnerUserId = top ? top.userId : null;
//     await a.save();

//     // notify sockets
//     req.app.get('io')?.to(`auction:${id}`).emit('auction:closed', {
//       auctionId: a.id, winnerUserId: a.winnerUserId
//     });

//     // emails
//     const { sendMail } = require('../utils/mailer');
//     const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';
//     if (a.winnerUserId) {
//       const w = await db.User.findByPk(a.winnerUserId);
//       if (w?.email) {
//         await sendMail({
//           to: w.email,
//           subject: `You won: ${a.title}`,
//           text: `Congrats! View: ${APP_BASE_URL}/auction/${a.id}`,
//           html: `<p>Congrats! You won <b>${a.title}</b>.</p><p><a href="${APP_BASE_URL}/auction/${a.id}">View</a></p>`
//         });
//       }
//     }
//     if (process.env.SMTP_ADMIN_TO) {
//       await sendMail({
//         to: process.env.SMTP_ADMIN_TO,
//         subject: `Auction closed: ${a.title}`,
//         text: `Winner: ${a.winnerUserId ?? 'none'}`,
//         html: `<p>Winner: ${a.winnerUserId ?? 'none'}</p>`
//       });
//     }

//     res.json({ ok: true, winnerUserId: a.winnerUserId });
//   } catch (e) {
//     console.error('manual close error:', e);
//     res.status(500).json({ error: e.message });
//   }
// });


// POST /api/admin/auctions/:id/close
router.post('/auctions/:id/close', authenticateToken, checkRole('admin'), async (req, res) => {
  try {
    const db   = req.app.get('models');
    const io   = req.app.get('io');
    const id   = Number(req.params.id);
    const a    = await db.Auction.findByPk(id);
    if (!a) return res.status(404).json({ error: 'Auction not found' });
    if (a.isClosed) return res.json({ ok: true, alreadyClosed: true });

    // pick highest bid
    const top = await db.Bid.findOne({ where: { auctionId: id }, order: [['amount','DESC']] });
    const winnerId = top ? top.userId : null;

    // persist changes
    await db.Auction.update({ isClosed: true, winnerUserId: winnerId }, { where: { id } });
    const refreshed = await db.Auction.findByPk(id);

    // notify clients
    io?.to(`auction:${id}`).emit('auction:closed', { auctionId: id, winnerUserId: winnerId });

    // emails + sms
    const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';
    try {
      // winner email + sms (if known)
      if (winnerId) {
        const w = await db.User.findByPk(winnerId);
        if (w?.email) {
          await sendMail({
            to: w.email,
            subject: `You won: ${a.title}`,
            text: `Congrats! View: ${APP_BASE_URL}/auction/${id}`,
            html: `<p>Congrats! You won <b>${a.title}</b>.</p><p><a href="${APP_BASE_URL}/auction/${id}">View</a></p>`
          });
        }
        if (w?.phone) {
          await sendSms(w.phone, `You won: ${a.title}. View: ${APP_BASE_URL}/auction/${id}`);
        }
      }
      // admin email + sms
      if (process.env.SMTP_ADMIN_TO) {
        await sendMail({
          to: process.env.SMTP_ADMIN_TO,
          subject: `Auction closed: ${a.title}`,
          text: `Winner: ${winnerId ?? 'none'}`,
          html: `<p>Winner: ${winnerId ?? 'none'}</p>`
        });
      }
      if (process.env.SMS_ADMIN_TO) {
        await sendSms(process.env.SMS_ADMIN_TO, `Closed "${a.title}" | winner: ${winnerId ?? 'none'}`);
      }
    } catch (notifyErr) {
      console.error('admin close notify error:', notifyErr.message);
    }

    res.json({ ok: true, auction: { id: refreshed.id, isClosed: refreshed.isClosed, winnerUserId: refreshed.winnerUserId } });
  } catch (e) {
    console.error('admin close error:', e);
    res.status(500).json({ error: e.message });
  }
});


// Sweep-close all auctions with endTime in the past
router.post('/auctions/sweep-close', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const now = new Date();
    const rows = await db.Auction.findAll({
      where: { isClosed: { [Op.eq]: false }, endTime: { [Op.ne]: null } }
    });

    let closed = 0;
    for (const a of rows) {
      const end = new Date(String(a.endTime).replace(' ', 'T').replace(' +00:00','Z'));
      if (!Number.isNaN(end) && end <= now) {
        const top = await db.Bid.findOne({ where: { auctionId: a.id }, order: [['amount','DESC']] });
        a.isClosed = true;
        a.winnerUserId = top ? top.userId : null;
        await a.save();
        closed++;
      }
    }
    res.json({ ok: true, closed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
