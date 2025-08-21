module.exports = (sequelize, DataTypes) => {
  const Bid = sequelize.define('Bid', {
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    auctionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  return Bid;
};
