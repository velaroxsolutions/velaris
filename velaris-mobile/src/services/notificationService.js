import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // Check cooldown — don't spam the user
    const lastRaw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_NOTIFICATION);
    if (lastRaw) {
      const timeSinceLast = Date.now() - parseInt(lastRaw);
      if (timeSinceLast < NOTIFICATION_COOLDOWN_MS) {
        console.log('Notification cooldown active, skipping');
        return;
      }
    }

    const destLat = pattern.destLat.toFixed(3);
    const destLng = pattern.destLng.toFixed(3);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Velaris',
        body: `Heading to ${destLat}, ${destLng}? Your usual route is ready.`,
        data: { pattern },
        sound: true,
      },
      trigger: null, // fire immediately
    });

    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_NOTIFICATION,
      Date.now().toString()
    );

    console.log('Notification fired for pattern:', pattern.patternId);
  } catch (error) {
    console.error('Error firing notification:', error);
  }
}

// ─── Check patterns near location ────────────────────────────────────────────

export async function checkAndFireNotification(latitude, longitude, patterns) {
  if (!patterns || patterns.length === 0) return;

  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;

  for (const pattern of patterns) {
    // Check confidence threshold
    if (pattern.confidence < 0.8) continue;

    // Check distance from pattern origin
    const distance = haversine(
      latitude, longitude,
      pattern.originLat, pattern.originLng
    );
    if (distance > 150) continue;

    // Check time window — within 1 hour of usual departure
    const timeDiff = Math.abs(currentHour - pattern.avgDepartureHour);
    const timeWithinWindow = timeDiff <= 1.0 || timeDiff >= 23.0; // handle midnight wrap
    if (!timeWithinWindow) continue;

    // All checks passed — fire notification
    await firePatternNotification(pattern);
    break; // only fire one notification at a time
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