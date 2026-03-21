import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot, limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export function useTrips(limitCount = 50) {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'velaris', user.uid, 'trips'),
      orderBy('startTime', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTrips(data);
      setLoading(false);
    }, (error) => {
      console.error('Trips listener error:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { trips, loading };
}