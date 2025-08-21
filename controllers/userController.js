const db = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = db.User;

exports.register = async (req, res) => {
  const { email, password, role, phone } = req.body;

  const { InviteToken } = db;
if (process.env.ENABLE_INVITES === 'true') {
  const { inviteToken } = req.body;
  if (!inviteToken) return res.status(400).json({ error: 'Invite token required' });
  const tok = await InviteToken.findOne({ where: { token: inviteToken, used: false } });
  if (!tok) return res.status(400).json({ error: 'Invalid invite' });
  if (tok.expiresAt && new Date(tok.expiresAt) < new Date()) return res.status(400).json({ error: 'Invite expired' });
  if (tok.email && tok.email !== req.body.email) return res.status(400).json({ error: 'Invite not valid for this email' });
  // create user…
  const user = await User.create({ email, password: hashed, role: role || 'user', phone });
  tok.used = true; await tok.save();
  return res.status(201).json({ message: 'User created', user: { id:user.id, email:user.email, role:user.role } });
}


  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json({ message: 'User created', user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listUsers = async (req,res)=>{try{if(!req.user||req.user.role!=='admin')return res.status(403).json({error:'Forbidden'});const users=await User.findAll({attributes:['id','email','role','createdAt']});res.json(users);}catch(err){res.status(500).json({error:err.message});}};;