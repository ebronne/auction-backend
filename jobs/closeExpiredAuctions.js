// jobs/closeExpiredAuctions.js
const { sendMail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');

module.exports = (app) => {
  // avoid duplicate intervals on hot reload
  if (app.get('closerStarted')) return;
  app.set('closerStarted', true);

  const db = app.get('models');
  const io = app.get('io');
    console.log(`[closer] started (dialect=${db.sequelize.getDialect()})`);
  const { Op } = db.Sequelize;
  const SQL = db.Sequelize;
  const DIALECT = db.sequelize.getDialect(); // 'sqlite' | 'mysql' | 'postgres' | ...
  const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';
  const INTERVAL_MS = 5000;

  // console.log(`[closer] started (dialect=${DIALECT})`);

  // find all open auctions that are due (dialect-aware)
async function findDue() {
  if (DIALECT === 'sqlite') {
    // SQLite can't compare "YYYY-MM-DD HH:mm:ss.SSS +00:00" reliably.
    // Strip the trailing " +00:00" and compare seconds since epoch.
    return db.Auction.findAll({
      where: {
        [Op.and]: [
          { isClosed: { [Op.eq]: false } },
          { endTime:  { [Op.ne]: null } },
          db.Sequelize.literal("strftime('%s', replace(endTime,' +00:00','')) <= strftime('%s','now')")
        ]
      },
      attributes: ['id','title','endTime']
    });
  }
  // Other dialects compare DATETIME natively
  return db.Auction.findAll({
    where: { isClosed: { [Op.eq]: false }, endTime: { [Op.lte]: new Date() } },
    attributes: ['id','title','endTime']
  });
}


  let running = false;
  const tick = async () => {
    console.log('[closer] tick', new Date().toISOString());
    if (running) return;
    running = true;
    try {
      const due = await findDue();
      if (due.length) {
        console.log('[closer] due:', due.map(a => ({ id: a.id, endTime: a.get('endTime') })));
      } else {
        // uncomment if you want a heartbeat:
        // console.log('[closer] none due');
      }

      for (const a of due) {
        // pick highest bid (if any)
        const top = await db.Bid.findOne({
          where: { auctionId: a.id },
          order: [['amount','DESC']]
        });
        const winnerId = top ? top.userId : null;

        // force-persist using UPDATE (more reliable than instance.save with some sqlite setups)
        await db.Auction.update(
          { isClosed: true, winnerUserId: winnerId },
          { where: { id: a.id } }
        );

        // verify
        const refreshed = await db.Auction.findByPk(a.id, { attributes: ['id','isClosed','winnerUserId'] });
        console.log(`[closer] updated row ${a.id}: isClosed=${refreshed.isClosed} winner=${refreshed.winnerUserId ?? 'none'}`);

        // notify clients
        io?.to(`auction:${a.id}`).emit('auction:closed', { auctionId: a.id, winnerUserId: winnerId });

        // emails
        // try {
        //   if (winnerId) {
        //     const w = await db.User.findByPk(winnerId);
        //     if (w?.email) {
        //       await sendMail({
        //         to: w.email,
        //         subject: `You won: ${a.title}`,
        //         text: `Congrats! View: ${APP_BASE_URL}/auction/${a.id}`,
        //         html: `<p>Congrats! You won <b>${a.title}</b>.</p><p><a href="${APP_BASE_URL}/auction/${a.id}">View</a></p>`
        //       });
        //     }
        //   }
        //   if (process.env.SMTP_ADMIN_TO) {
        //     await sendMail({
        //       to: process.env.SMTP_ADMIN_TO,
        //       subject: `Auction closed: ${a.title}`,
        //       text: `Winner: ${winnerId ?? 'none'}`,
        //       html: `<p>Winner: ${winnerId ?? 'none'}</p>`
        //     });
        //   }
        // } catch (mailErr) {
        //   console.error('close email error:', mailErr.message);
        // }

        // emails + sms
try {
  // Winner email
  if (winnerId) {
    const w = await db.User.findByPk(winnerId);
    if (w?.email) {
      await sendMail({
        to: w.email,
        subject: `You won: ${a.title}`,
        text: `Congrats! View: ${APP_BASE_URL}/auction/${a.id}`,
        html: `<p>Congrats! You won <b>${a.title}</b>.</p><p><a href="${APP_BASE_URL}/auction/${a.id}">View</a></p>`
      });
    }
    // Winner SMS (if phone exists)
    if (w?.phone) {
      await sendSms(w.phone, `You won: ${a.title}. View: ${APP_BASE_URL}/auction/${a.id}`);
    }
  }

  // Admin email
  if (process.env.SMTP_ADMIN_TO) {
    await sendMail({
      to: process.env.SMTP_ADMIN_TO,
      subject: `Auction closed: ${a.title}`,
      text: `Winner: ${winnerId ?? 'none'}`,
      html: `<p>Winner: ${winnerId ?? 'none'}</p>`
    });
  }

  // Admin SMS
  if (process.env.SMS_ADMIN_TO) {
    await sendSms(process.env.SMS_ADMIN_TO, `Closed "${a.title}" | winner: ${winnerId ?? 'none'}`);
  }
} catch (mailErr) {
  console.error('close email/SMS error:', mailErr.message);
}

        
      }
    } catch (err) {
      console.error('[closer] error:', err);
    } finally {
      running = false;
    }
  };

  setInterval(() => { tick().catch(console.error); }, INTERVAL_MS);
  tick().catch(console.error); // kick once on boot
};
