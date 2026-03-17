import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '../services/notificationService';

export function useNotifications(onNotificationResponse) {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Listen for incoming notifications while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listen for user tapping a notification
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