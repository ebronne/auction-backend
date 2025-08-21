const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite' // or your custom path
});


const Auction = require('./Auction');

module.exports = {
  Auction
};


const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models here
// db.User = require('./user')(sequelize, Sequelize);
db.Auction = require('./Auction')(sequelize)

// db.Bid = require('./bid')(sequelize, Sequelize); // if you have one
db.Bid = require('./bid')(sequelize, Sequelize);

db.User = require('./user')(sequelize, Sequelize);

db.InviteToken = require('./inviteToken')(sequelize, Sequelize.DataTypes);

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// ASSOCIATIONS
db.Auction.hasMany(db.Bid, { foreignKey: 'auctionId' });
db.Bid.belongsTo(db.Auction, { foreignKey: 'auctionId' });

db.User.hasMany(db.Bid, { foreignKey: 'userId' });
db.Bid.belongsTo(db.User, { foreignKey: 'userId' });
db.Auction.belongsTo(db.User, { as: 'winner', foreignKey: 'winnerUserId' });

// This is the key part:
db.sequelize.sync()
  .then(() => {
    console.log("✅ Database synced");
  })
  .catch((err) => {
    console.error("❌ Failed to sync DB:", err);
  });

module.exports = db;
