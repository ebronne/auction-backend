// seed.js
const db = require('./models');

(async () => {
  try {
    // Optional: wipe auctions first if you pass SEED_CLEAR=1
    if (process.env.SEED_CLEAR) {
      console.log('🧹 Clearing auctions table…');
      await db.Auction.destroy({ where: {}, truncate: true });
    }

    console.log('🔌 Connecting…');
    await db.sequelize.authenticate();
    // Use plain sync (no alter) to avoid migrations during seed
    await db.sequelize.sync();

    const now = Date.now();
    const plusDays = (d) => new Date(now + d * 24 * 60 * 60 * 1000);

    const items = [
      {
        title: '2014 Honda Civic - Repairable',
        description: 'Front bumper & hood damage. Runs and drives.',
        startingPrice: 2200,
        imageUrl: '/images/placeholder.jpg',
        endTime: plusDays(3),
      },
      {
        title: '2017 Toyota Camry - Minor Damage',
        description: 'Left fender & headlight. Clean interior.',
        startingPrice: 3800,
        imageUrl: '/images/placeholder.jpg',
        endTime: plusDays(5),
      },
      {
        title: '2015 Ford Focus - Salvage',
        description: 'Rear quarter repair needed. Great project.',
        startingPrice: 1800,
        imageUrl: '/images/placeholder.jpg',
        endTime: plusDays(7),
      },
    ];

    // Seed idempotently: findOrCreate by title (simple heuristic)
    for (const data of items) {
      const [row, created] = await db.Auction.findOrCreate({
        where: { title: data.title },
        defaults: data,
      });
      console.log(created ? `✅ Created: ${row.title}` : `↩️  Skipped (exists): ${row.title}`);
    }

    console.log('🌱 Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
})();

