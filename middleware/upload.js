const multer = require('multer');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`);
  }
});

const fileFilter = (_, file, cb) => {
  const ok = /image\/(jpeg|png|webp)/.test(file.mimetype);
  cb(ok ? null : new Error('Only JPEG/PNG/WEBP allowed'), ok);
};

const uploadImages = multer({
  storage,
  fileFilter,
  limits: { files: 10, fileSize: 5 * 1024 * 1024 } // 10 files, 5MB each
}).array('images', 10);

module.exports = { uploadImages };
