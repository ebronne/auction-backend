// models/inviteToken.js
module.exports = (sequelize, DataTypes) => sequelize.define('InviteToken', {
  token:      { type: DataTypes.STRING, unique: true, allowNull: false },
  email:      { type: DataTypes.STRING, allowNull: true },   // lock to one email (optional)
  used:       { type: DataTypes.BOOLEAN, defaultValue: false },
  expiresAt:  { type: DataTypes.DATE, allowNull: true },
});