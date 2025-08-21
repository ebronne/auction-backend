require('dotenv').config();
const db = require('./models');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctionRoutes'); // <- corrected import
const bidRoutes = require('./routes/bid');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);


// sockets (join/leave auction rooms)
io.on('connection', (socket) => {
  socket.on('joinAuction', (auctionId) => socket.join(`auction:${auctionId}`));
  socket.on('leaveAuction', (auctionId) => socket.leave(`auction:${auctionId}`));
});



// middleware
app.use(express.json());
app.use(cors());
// app.use(helmet());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow images from 5173
    crossOriginEmbedderPolicy: false,                       // avoid COEP issues in dev
  })
);


// static: serve public folder (so /images/placeholder.jpg works)
app.use(express.static(path.join(__dirname, 'public')));
//app.use('/uploads', express.static(require('path').join(__dirname, 'uploads'))); 
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));


app.set('models', db);

// routes
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);          // ✅ only once
app.use('/api/bids', bidRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => res.send('Auction Backend is running'));

// sync
db.sequelize.sync(/*{ alter: true }*/).then(() => {
  console.log('✅ Database synced');
  require('./jobs/closeExpiredAuctions')(app);  // <— START THE JOB
}).catch(err => console.error('❌ Sync error:', err));

const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
