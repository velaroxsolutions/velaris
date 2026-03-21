import { useState, useEffect } from 'react';
import { getAddressFromCoords } from '../services/routingService';

const addressCache = {};
const pendingRequests = {};

export function useAddress(lat, lng, storedAddress) {
  const key = `${lat?.toFixed(4)},${lng?.toFixed(4)}`;
  
  // Use stored address immediately if available
  const [address, setAddress] = useState(storedAddress || addressCache[key] || null);

  useEffect(() => {
    // If we already have a stored address, use it — no API call needed
    if (storedAddress) {
      setAddress(storedAddress);
      return;
    }
    if (!lat || !lng) return;
    if (addressCache[key]) {
      setAddress(addressCache[key]);
      return;
    }
    if (pendingRequests[key]) return;

    pendingRequests[key] = true;

    const delay = Math.random() * 2000;
    const timer = setTimeout(async () => {
      const result = await getAddressFromCoords(lat, lng);
      addressCache[key] = result;
      setAddress(result);
      delete pendingRequests[key];
    }, delay);

    return () => clearTimeout(timer);
  }, [key, storedAddress]);

  return address || `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`;
}