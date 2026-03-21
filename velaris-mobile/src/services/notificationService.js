import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAddressFromCoords } from './routingService';

const STORAGE_KEYS = {
  PUSH_TOKEN: 'velaris_push_token',
  LAST_NOTIFICATION: 'velaris_last_notification',
};

// How long to wait before firing another notification (30 mins)
const NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

// ─── Setup ────────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('velaris', {
      name: 'Velaris',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B5EA7',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
  return token;
}

// ─── Fire notification ────────────────────────────────────────────────────────

export async function firePatternNotification(pattern) {
  try {
    const lastRaw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_NOTIFICATION);
    if (lastRaw) {
      const timeSinceLast = Date.now() - parseInt(lastRaw);
      if (timeSinceLast < NOTIFICATION_COOLDOWN_MS) return;
    }

    // Resolve destination address for the notification message
    const destAddress = await getAddressFromCoords(pattern.destLat, pattern.destLng);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pattern.destLat},${pattern.destLng}&travelmode=driving`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Velaris',
        body: `Heading to ${destAddress}? Tap to open route.`,
        data: { pattern, mapsUrl },
        sound: true,
      },
      trigger: null,
    });

    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_NOTIFICATION,
      Date.now().toString()
    );
  } catch (error) {
    console.error('Error firing notification:', error);
  }
}
// ─── Check patterns near location ────────────────────────────────────────────

export async function checkAndFireNotification(latitude, longitude, patterns) {
  if (!patterns || patterns.length === 0) return;

  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;

  for (const pattern of patterns) {
    if (pattern.confidence < 0.8) continue;

    const distance = haversine(
      latitude, longitude,
      pattern.originLat, pattern.originLng
    );
    if (distance > 150) continue;

    const timeDiff = Math.abs(currentHour - pattern.avgDepartureHour);
    const timeWithinWindow = timeDiff <= 1.0 || timeDiff >= 23.0;
    if (!timeWithinWindow) continue;

    await firePatternNotification(pattern);
    break;
  }
}


function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}