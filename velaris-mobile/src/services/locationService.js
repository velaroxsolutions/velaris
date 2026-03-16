import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateDistance } from '../utils/tripHelpers';
import { syncTripToBackend } from './apiService';

export const LOCATION_TASK = 'velaris-location-task';

const STORAGE_KEYS = {
    ACTIVE_TRIP: 'velaris_active_trip',
    GPS_BUFFER: 'velaris_gps_buffer',
    LAST_MOVEMENT: 'velaris_last_movement',
    USER_ID: 'velaris_user_id',
};

const CONFIG = {
    MOVEMENT_THRESHOLD_METERS: 30,
    STOP_TIMEOUT_MS: 1 * 60 * 1000,   // 5 minutes stopped = trip ends
    MIN_TRIP_DISTANCE_METERS: 200,      // ignore tiny movements
    MIN_TRIP_POINTS: 3,                 // need at least 3 GPS points
};

// ─── Background Task Definition ───────────────────────────────────────────────
// This runs even when the app is closed
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error('Location task error:', error);
        return;
    }

    if (!data?.locations?.length) return;

    const location = data.locations[0];
    const { latitude, longitude } = location.coords;
    const timestamp = location.timestamp;

    await processLocationUpdate(latitude, longitude, timestamp);
});

// ─── Core Logic ───────────────────────────────────────────────────────────────

async function processLocationUpdate(latitude, longitude, timestamp) {
    try {
        const bufferRaw = await AsyncStorage.getItem(STORAGE_KEYS.GPS_BUFFER);
        const buffer = bufferRaw ? JSON.parse(bufferRaw) : [];
        const activeTripRaw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
        const activeTrip = activeTripRaw ? JSON.parse(activeTripRaw) : null;
        const lastMovementRaw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_MOVEMENT);
        const lastMovement = lastMovementRaw ? parseInt(lastMovementRaw) : null;

        const newPoint = { latitude, longitude, timestamp };

        // Check if we're actually moving
        let isMoving = false;
        if (buffer.length > 0) {
            const lastPoint = buffer[buffer.length - 1];
            const distance = calculateDistance(
                lastPoint.latitude, lastPoint.longitude,
                latitude, longitude
            );
            isMoving = distance > CONFIG.MOVEMENT_THRESHOLD_METERS;
        } else {
            isMoving = true; // first point, assume moving
        }

        if (isMoving) {
            // Update last movement time
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_MOVEMENT, timestamp.toString());

            // Start a new trip if one isn't active
            if (!activeTrip) {
                const newTrip = {
                    startLat: latitude,
                    startLng: longitude,
                    startTime: timestamp,
                };
                await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, JSON.stringify(newTrip));
            }

            // Add point to buffer
            buffer.push(newPoint);
            await AsyncStorage.setItem(STORAGE_KEYS.GPS_BUFFER, JSON.stringify(buffer));

        } else if (activeTrip && lastMovement) {
            // Not moving — check if we've been stopped long enough to close the trip
            const timeStopped = timestamp - lastMovement;

            if (timeStopped >= CONFIG.STOP_TIMEOUT_MS) {
                await closeTrip(activeTrip, buffer, latitude, longitude, timestamp);
            }
        }
    } catch (err) {
        console.error('Error processing location:', err);
    }
}

async function closeTrip(activeTrip, buffer, endLat, endLng, endTime) {
    try {
        // Validate trip is worth saving
        if (buffer.length < CONFIG.MIN_TRIP_POINTS) {
            await clearTripState();
            return;
        }

        const totalDistance = calculateTotalDistance(buffer);
        if (totalDistance < CONFIG.MIN_TRIP_DISTANCE_METERS) {
            await clearTripState();
            return;
        }

        // Get saved userId
        const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        if (!userId) {
            await clearTripState();
            return;
        }

        // Save trip to Firestore
        const tripData = {
            startLat: activeTrip.startLat,
            startLng: activeTrip.startLng,
            endLat,
            endLng,
            startTime: activeTrip.startTime,
            endTime,
            duration: endTime - activeTrip.startTime,
            distanceMeters: Math.round(totalDistance),
            pointCount: buffer.length,
            createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'velaris_trips', userId, 'trips'), tripData);
        console.log('Trip saved:', Math.round(totalDistance) + 'm');
        await syncTripToBackend(tripData);
        await clearTripState();
    } catch (err) {
        console.error('Error closing trip:', err);
    }
}

function calculateTotalDistance(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
        total += calculateDistance(
            points[i - 1].latitude, points[i - 1].longitude,
            points[i].latitude, points[i].longitude
        );
    }
    return total;
}

async function clearTripState() {
    await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACTIVE_TRIP,
        STORAGE_KEYS.GPS_BUFFER,
        STORAGE_KEYS.LAST_MOVEMENT,
    ]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function requestLocationPermissions() {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') return false;

    return true;
}

export async function startLocationTracking(userId) {
    // Save userId so background task can access it
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);

    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (isTracking) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,       // every 30 seconds
        distanceInterval: 30,      // or every 30 metres
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: 'Velaris',
            notificationBody: 'Learning your patterns in the background',
            notificationColor: '#7B5EA7',
        },
        pausesUpdatesAutomatically: false,
    });
}

export async function stopLocationTracking() {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_ID);
}

export async function isTrackingActive() {
    return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
}