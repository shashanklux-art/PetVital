const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const config = require('../config');
const { store } = require('../lib/mockStore');

function isLocalMode() {
  return process.env.LOCAL_MODE === 'true';
}

// Upload image (base64 JSON body)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { image, filename } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    let url;

    if (isLocalMode()) {
      // In local mode, store as data URI
      if (!store.uploads) store.uploads = new Map();
      const id = require('crypto').randomUUID();
      store.uploads.set(id, image);
      url = image; // Use the data URI directly
    } else {
      // In production, use Vercel Blob
      try {
        const { put } = require('@vercel/blob');
        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const blob = await put(filename || `upload-${Date.now()}.jpg`, buffer, {
          access: 'public',
          token: config.blobToken
        });
        url = blob.url;
      } catch (blobError) {
        console.error('Blob upload error:', blobError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    res.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

module.exports = router;
