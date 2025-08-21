const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Auction extends Model {}

  Auction.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      startingPrice: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      endTime: {
         type: DataTypes.DATE, 
         allowNull: true
     },

      isClosed: {
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
      },
      winnerUserId: { 
        type: DataTypes.INTEGER, 
        allowNull: true 
      },
      images: { 
        type: DataTypes.JSON, 
        allowNull: true, 
        defaultValue: [] 
      }

    },
    {
      sequelize,
      modelName: 'Auction'
    }
  );

  return Auction;
};
