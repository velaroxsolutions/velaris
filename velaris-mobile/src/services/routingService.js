// Free APIs — no billing required
// Geocoding: OpenStreetMap Nominatim
// Routing: OSRM (Open Source Routing Machine)

export async function getAddressFromCoords(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'User-Agent': 'Velaris/1.0 (velaroxsolutions@gmail.com)',
          'Accept': 'application/json',
        }
      }
    );

    const text = await response.text();
    if (text.startsWith('<')) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const data = JSON.parse(text);

    if (data.address) {
      const a = data.address;
      const name = a.amenity || a.building || a.shop || a.office || '';
      const road = a.road || a.pedestrian || '';
      const suburb = a.suburb || a.neighbourhood || '';

      if (name) return `${name}, ${road}`;
      if (road && suburb) return `${road}, ${suburb}`;
      if (road) return road;
      return data.display_name?.split(',').slice(0, 2).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
export async function getRoutingData(originLat, originLng, destLat, destLng) {
  const results = {};

  // OSRM for driving and walking
  const osrmProfiles = [
    { mode: 'driving', profile: 'car' },
    { mode: 'walking', profile: 'foot' },
  ];

  await Promise.all(
    osrmProfiles.map(async ({ mode, profile }) => {
      try {
        const response = await fetch(
          `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`
        ); const data = await response.json();

        if (data.code === 'Ok' && data.routes?.length > 0) {
          const route = data.routes[0];
          const durationSeconds = Math.round(route.duration);
          const distanceMeters = Math.round(route.distance);
          console.log(`${mode} - ${durationSeconds}s, ${distanceMeters}m`);


          results[mode] = {
            duration: formatDuration(durationSeconds),
            durationSeconds,
            distance: formatDistance(distanceMeters),
          };
        }
      } catch (err) {
        console.error(`OSRM error for ${mode}:`, err);
      }
    })
  );

  // Transit — OSRM doesn't do transit, show estimate based on driving * 1.8
  if (results.driving) {
    const transitSeconds = Math.round(results.driving.durationSeconds * 1.8);
    results.transit = {
      duration: formatDuration(transitSeconds),
      durationSeconds: transitSeconds,
      distance: results.driving.distance,
      transitLine: 'ETS',
      vehicleType: 'BUS',
    };
  }

  // Determine best mode
  const modes = ['driving', 'transit', 'walking'];
  const ranked = modes
    .filter(m => results[m])
    .sort((a, b) => results[a].durationSeconds - results[b].durationSeconds);

  results.recommended = ranked[0] || 'driving';

  return results;
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
}

function formatDistance(meters) {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function getModeIcon(mode) {
  const icons = {
    driving: 'car-outline',
    transit: 'bus-outline',
    walking: 'walk-outline',
  };
  return icons[mode] || 'navigate-outline';
}

export function getModeLabel(mode) {
  const labels = {
    driving: 'Drive',
    transit: 'Transit',
    walking: 'Walk',
  };
  return labels[mode] || mode;
}

export function getGoogleMapsUrl(destLat, destLng, mode) {
  const modeMap = {
    driving: 'driving',
    transit: 'transit',
    walking: 'walking',
  };
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=${modeMap[mode] || 'driving'}`;
}