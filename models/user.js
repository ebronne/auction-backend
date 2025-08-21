module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user'
    },
    phone: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },

  });

  User.associate = (models) => {
    User.hasMany(models.Bid, { foreignKey: 'userId' });
  };

  return User;
};
