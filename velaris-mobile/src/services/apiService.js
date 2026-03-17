import axios from 'axios';
import { auth } from '../config/firebase';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function getAuthHeader() {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function syncTripToBackend(tripData) {
  try {
    const headers = await getAuthHeader();
    const response = await axios.post(`${BASE_URL}/trips`, tripData, { headers });
    return response.data;
  } catch (error) {
    console.error('Trip sync failed:', error.message);
  }
}

export async function fetchPatternsNearLocation(lat, lng) {
  try {
    const headers = await getAuthHeader();
    const response = await axios.get(`${BASE_URL}/patterns`, {
      params: { lat, lng },
      headers,
    });
    return response.data.patterns;
  } catch (error) {
    console.error('Pattern fetch failed:', error.message);
    return [];
  }
}