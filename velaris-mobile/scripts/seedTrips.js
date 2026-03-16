const admin = require('firebase-admin');
const serviceAccount = require('../../../velaris-backend/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const USER_ID = '2zeOskTYgKNqkMLF0xmEnlAo78b2';

const testTrips = [
  {
    userId: USER_ID,
    startLat: 53.5461, startLng: -113.4938,
    endLat: 53.5232,   endLng: -113.5263,
    startTime: Date.now() - 3600000,
    endTime:   Date.now() - 2000000,
    duration:  1600000,
    distanceMeters: 2400,
    pointCount: 8,
  },
  {
    userId: USER_ID,
    startLat: 53.5461, startLng: -113.4938,
    endLat: 53.5232,   endLng: -113.5263,
    startTime: Date.now() - 90000000,
    endTime:   Date.now() - 88400000,
    duration:  1600000,
    distanceMeters: 2450,
    pointCount: 9,
  },
  {
    userId: USER_ID,
    startLat: 53.5232, startLng: -113.5263,
    endLat: 53.5461,   endLng: -113.4938,
    startTime: Date.now() - 172800000,
    endTime:   Date.now() - 171200000,
    duration:  1600000,
    distanceMeters: 2380,
    pointCount: 7,
  },
];

async function seed() {
  for (const trip of testTrips) {
    const ref = await db.collection('velaris_trips').add(trip);
    console.log('Inserted trip:', ref.id);
  }
  console.log('Done');
  process.exit(0);
}

seed().catch(console.error);