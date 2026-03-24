import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingScreen } from './src/screens/auth/OnboardingScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { HomeScreen } from './src/screens/main/HomeScreen';
import { TripsScreen } from './src/screens/main/TripsScreen';
import { PatternsScreen } from './src/screens/main/PatternsScreen';
import { RouteCardScreen } from './src/screens/main/RouteCardScreen';
import { useNotifications } from './src/hooks/useNotifications';
import { theme } from './src/utils/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ onNotificationResponse }) {
  useNotifications(onNotificationResponse);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundSecondary,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          height: 64 + insets.bottom,
        },
        tabBarActiveTintColor: theme.colors.accentPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Trips: focused ? 'map' : 'map-outline',
            Patterns: focused ? 'analytics' : 'analytics-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Patterns" component={PatternsScreen} />
    </Tab.Navigator>
  );
}

function Navigation() {
  const { user, loading } = useAuth();
  const navigationRef = useRef(null);

  const handleNotificationResponse = (pattern) => {
    navigationRef.current?.navigate('RouteCard', { pattern });
  };

  if (loading) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main">
              {() => <MainTabs onNotificationResponse={handleNotificationResponse} />}
            </Stack.Screen>
            <Stack.Screen
              name="RouteCard"
              component={RouteCardScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>

      <AuthProvider>
        <StatusBar style="light" />
        <Navigation />
      </AuthProvider>

    </SafeAreaProvider>
  );
}