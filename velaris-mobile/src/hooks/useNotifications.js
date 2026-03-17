import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export function useNotifications(onNotificationResponse) {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Skip push token registration in Expo Go — requires dev build
    const isExpoGo = Constants.appOwnership === 'expo';
    if (!isExpoGo) {
      registerForPushNotifications();
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const pattern = response.notification.request.content.data?.pattern;
        if (pattern && onNotificationResponse) {
          onNotificationResponse(pattern);
        }
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);
}

async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}