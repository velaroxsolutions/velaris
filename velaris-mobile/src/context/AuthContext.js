import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { startLocationTracking, requestLocationPermissions, isTrackingActive } from '../services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);


useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            setUser(firebaseUser);
            await loadUserProfile(firebaseUser.uid);
            
            // Auto-start tracking unless user explicitly turned it off
            const trackingDisabled = await AsyncStorage.getItem('velaris_tracking_disabled');
            if (trackingDisabled !== 'true') {
                const granted = await requestLocationPermissions().catch(() => false);
                if (granted) {
                    const alreadyTracking = await isTrackingActive();
                    if (!alreadyTracking) {
                        await startLocationTracking(firebaseUser.uid).catch(console.error);
                    }
                }
            }
        } else {
            setUser(null);
            setUserProfile(null);
        }
        setLoading(false);
    });
    return unsubscribe;
}, []);
  const loadUserProfile = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid, 'details', 'profile');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const signUp = async (email, password, name, username) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Create user doc matching your existing Velarox structure
    await setDoc(doc(db, 'users', uid, 'details', uid), {
      name,
      email,
      username,
      role: 'user',
      apps: ['velaris'],
      createdAt: serverTimestamp(),
    });

    // Create profile subdoc
    await setDoc(doc(db, 'users', uid, 'details', 'profile'), {
      name,
      updatedAt: serverTimestamp(),
    });

    return userCredential;
  };

  const signIn = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signUp, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);