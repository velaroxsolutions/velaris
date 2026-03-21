import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { calculateDistance } from '../utils/tripHelpers';
import { syncTripToBackend } from './apiService';
import { getAddressFromCoords } from './routingService';
import { checkAndFireNotification } from './notificationService';

export const LOCATION_TASK = 'velaris-location-task';

const STORAGE_KEYS = {
    ACTIVE_TRIP: 'velaris_active_trip',
    GPS_BUFFER: 'velaris_gps_buffer',
    LAST_MOVEMENT: 'velaris_last_movement',
    USER_ID: 'velaris_user_id',
};

const CONFIG = {
    MOVEMENT_THRESHOLD_METERS: 30,
    STOP_TIMEOUT_MS: 5 * 60 * 1000,
    MIN_TRIP_DISTANCE_METERS: 300,
    MIN_TRIP_POINTS: 4,
};

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

export async function stopLocationTrackingPermanently() {
    await AsyncStorage.setItem('velaris_tracking_disabled', 'true');
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
}

async function checkPatternsNearLocation(latitude, longitude) {
    try {
        const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        if (!userId) return;

        // Read patterns directly from Firestore
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const patternsQuery = query(
            collection(db, 'velaris', userId, 'patterns'),
            where('active', '==', true)
        );
        const snapshot = await getDocs(patternsQuery);
        const patterns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (patterns.length === 0) return;

        await checkAndFireNotification(latitude, longitude, patterns);
    } catch (err) {
        console.error('Pattern check error:', err);
    }
}

export async function resumeLocationTracking(userId) {
    await AsyncStorage.removeItem('velaris_tracking_disabled');
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (!isTracking) {
        await startLocationTracking(userId);
    }
}

export async function isTrackingDisabledByUser() {
    const val = await AsyncStorage.getItem('velaris_tracking_disabled');
    return val === 'true';
}

async function processLocationUpdate(latitude, longitude, timestamp) {

    console.log(`GPS point received: ${latitude}, ${longitude} at ${new Date(timestamp).toLocaleTimeString()}`);
    try {
        const bufferRaw = await AsyncStorage.getItem(STORAGE_KEYS.GPS_BUFFER);
        const buffer = bufferRaw ? JSON.parse(bufferRaw) : [];
        const activeTripRaw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
        const activeTrip = activeTripRaw ? JSON.parse(activeTripRaw) : null;
        const lastMovementRaw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_MOVEMENT);
        const lastMovement = lastMovementRaw ? parseInt(lastMovementRaw) : null;

        let isMoving = false;
        if (buffer.length > 0) {
            const lastPoint = buffer[buffer.length - 1];
            const distance = calculateDistance(
                lastPoint.latitude, lastPoint.longitude,
                latitude, longitude
            );
            isMoving = distance > CONFIG.MOVEMENT_THRESHOLD_METERS;
        } else {
            isMoving = true;
        }

        if (isMoving) {
            await AsyncStorage.setItem(STORAGE_KEYS.LAST_MOVEMENT, timestamp.toString());
            if (!activeTrip) {
                const newTrip = {
                    startLat: latitude,
                    startLng: longitude,
                    startTime: timestamp,
                };
                await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, JSON.stringify(newTrip));
                await checkPatternsNearLocation(latitude, longitude);

            }
            buffer.push({ latitude, longitude, timestamp });
            await AsyncStorage.setItem(STORAGE_KEYS.GPS_BUFFER, JSON.stringify(buffer));
        } else if (activeTrip && lastMovement) {
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
    const saving = await AsyncStorage.getItem('velaris_saving_trip');
    if (saving === 'true') return;
    await AsyncStorage.setItem('velaris_saving_trip', 'true');

    try {
        if (buffer.length < CONFIG.MIN_TRIP_POINTS) {
            await clearTripState();
            return;
        }

        const totalDistance = calculateTotalDistance(buffer);
        if (totalDistance < CONFIG.MIN_TRIP_DISTANCE_METERS) {
            await clearTripState();
            return;
        }

        const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
        if (!userId) {
            await clearTripState();
            return;
        }

        const [startAddress, endAddress] = await Promise.all([
            getAddressFromCoords(activeTrip.startLat, activeTrip.startLng),
            getAddressFromCoords(endLat, endLng),
        ]);

        const tripData = {
            startLat: activeTrip.startLat,
            startLng: activeTrip.startLng,
            endLat,
            endLng,
            startAddress,
            endAddress,
            startTime: activeTrip.startTime,
            endTime,
            duration: endTime - activeTrip.startTime,
            distanceMeters: Math.round(totalDistance),
            pointCount: buffer.length,
            createdAt: serverTimestamp(),
        };

        await addDoc(collection(db, 'velaris', userId, 'trips'), tripData);
        console.log('Trip saved:', Math.round(totalDistance) + 'm');
        await syncTripToBackend(tripData);
        await clearTripState();
    } catch (err) {
        console.error('Error closing trip:', err);
    } finally {
        await AsyncStorage.removeItem('velaris_saving_trip');
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

export async function requestLocationPermissions() {
    console.log('Requesting foreground permission...');
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    console.log('Foreground status:', foreground);
    if (foreground !== 'granted') return false;

    console.log('Requesting background permission...');
    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    console.log('Background status:', background);
    if (background !== 'granted') return false;

    return true;
}

export async function startLocationTracking(userId) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
    if (isTracking) return;

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 30000,
        distanceInterval: 30,
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