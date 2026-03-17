const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Replace this with your actual uid from Firebase Auth console
const USER_ID = '2zeOskTYgKNqkMLF0xmEnlAo78b2';

const testTrips = [
  {
    startLat: 53.5461, startLng: -113.4938,
    endLat: 53.5232,   endLng: -113.5263,
    startTime: 1741082400000,
    endTime:   1741084800000,
    duration:  2400000,
    distanceMeters: 3200,
    pointCount: 12,
  },
  {
    startLat: 53.5458, startLng: -113.4941,
    endLat: 53.5229,   endLng: -113.5260,
    startTime: 1741168800000,
    endTime:   1741171200000,
    duration:  2400000,
    distanceMeters: 3150,
    pointCount: 11,
  },
  {
    startLat: 53.5463, startLng: -113.4935,
    endLat: 53.5234,   endLng: -113.5265,
    startTime: 1741255200000,
    endTime:   1741257600000,
    duration:  2400000,
    distanceMeters: 3220,
    pointCount: 13,
  },
  {
    startLat: 53.5460, startLng: -113.4940,
    endLat: 53.5231,   endLng: -113.5261,
    startTime: 1741341600000,
    endTime:   1741344000000,
    duration:  2400000,
    distanceMeters: 3180,
    pointCount: 12,
  },
  {
    startLat: 53.5462, startLng: -113.4937,
    endLat: 53.5233,   endLng: -113.5264,
    startTime: 1741428000000,
    endTime:   1741430400000,
    duration:  2400000,
    distanceMeters: 3200,
    pointCount: 11,
  },
];

async function seed() {
  console.log(`Seeding trips for user: ${USER_ID}`);
  
  const tripsRef = db
    .collection('velaris_trips')
    .doc(USER_ID)
    .collection('trips');

  for (const trip of testTrips) {
    const ref = await tripsRef.add(trip);
    console.log(`Inserted trip: ${ref.id}`);
  }

  console.log('Done — check Firestore and run pattern engine');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});