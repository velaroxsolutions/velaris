import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import haversine_distances
from math import radians
from datetime import datetime

# ─── Config ───────────────────────────────────────────────────────────────────

DBSCAN_EPSILON_METERS = 150      # points within 150m = same cluster
DBSCAN_MIN_SAMPLES = 2           # minimum 2 points to form a cluster
MIN_TRIPS_FOR_PATTERN = 3        # need 3+ trips on same route to confirm
CONFIDENCE_INCREMENT = 0.15      # each new matching trip adds confidence
MAX_CONFIDENCE = 1.0
MIN_CONFIDENCE_THRESHOLD = 0.5   # patterns below this get pruned

def run_pattern_engine(uid: str, db):
    """
    Main entry point. Called after every new trip is saved.
    Fetches all trips, runs DBSCAN, updates patterns in Firestore.
    """
    try:
        print(f"[Pattern Engine] Running for user {uid}")

        # ── Fetch all trips ────────────────────────────────────────────────
        trips_ref = (
            db.collection("velaris_trips")
            .document(uid)
            .collection("trips")
        )
        docs = trips_ref.get()

        if len(docs) < MIN_TRIPS_FOR_PATTERN:
            print(f"[Pattern Engine] Only {len(docs)} trips — need {MIN_TRIPS_FOR_PATTERN} to detect patterns")
            return

        trips = []
        for doc in docs:
            t = doc.to_dict()
            if all(k in t for k in ["startLat", "startLng", "endLat", "endLng", "startTime"]):
                trips.append(t)

        if len(trips) < MIN_TRIPS_FOR_PATTERN:
            return

        print(f"[Pattern Engine] Analysing {len(trips)} trips")

        # ── Cluster origins ────────────────────────────────────────────────
        origin_coords = np.array([
            [radians(t["startLat"]), radians(t["startLng"])] for t in trips
        ])
        origin_labels = run_dbscan(origin_coords)

        # ── Cluster destinations ───────────────────────────────────────────
        dest_coords = np.array([
            [radians(t["endLat"]), radians(t["endLng"])] for t in trips
        ])
        dest_labels = run_dbscan(dest_coords)

        # ── Find route pairs ───────────────────────────────────────────────
        route_counts = {}
        route_examples = {}

        for i, trip in enumerate(trips):
            o_label = origin_labels[i]
            d_label = dest_labels[i]

            # Skip noise points (label = -1)
            if o_label == -1 or d_label == -1:
                continue

            key = (o_label, d_label)
            route_counts[key] = route_counts.get(key, 0) + 1

            if key not in route_examples:
                route_examples[key] = []
            route_examples[key].append(trip)

        # ── Save confirmed patterns ────────────────────────────────────────
        confirmed = 0
        for (o_label, d_label), count in route_counts.items():
            if count >= MIN_TRIPS_FOR_PATTERN:
                examples = route_examples[(o_label, d_label)]
                save_pattern(uid, db, o_label, d_label, examples, count, origin_coords, dest_coords, origin_labels, dest_labels)
                confirmed += 1

        print(f"[Pattern Engine] Found {confirmed} confirmed patterns")

    except Exception as e:
        print(f"[Pattern Engine] Error: {e}")
        import traceback
        traceback.print_exc()


def run_dbscan(coords_radians):
    """
    Runs DBSCAN on an array of [lat_rad, lng_rad] coordinates.
    Returns cluster labels array.
    """
    # Earth radius = 6371000m, epsilon in radians
    epsilon = DBSCAN_EPSILON_METERS / 6371000.0

    db = DBSCAN(
        eps=epsilon,
        min_samples=DBSCAN_MIN_SAMPLES,
        algorithm='ball_tree',
        metric='haversine'
    )
    db.fit(coords_radians)
    return db.labels_


def save_pattern(uid, db, o_label, d_label, examples, trip_count, origin_coords, dest_coords, origin_labels, dest_labels):
    """
    Saves or updates a pattern in Firestore.
    """
    # Calculate centroid of origin cluster
    origin_mask = origin_labels == o_label
    origin_centroid = origin_coords[origin_mask].mean(axis=0)
    origin_lat = float(np.degrees(origin_centroid[0]))
    origin_lng = float(np.degrees(origin_centroid[1]))

    # Calculate centroid of destination cluster
    dest_mask = dest_labels == d_label
    dest_centroid = dest_coords[dest_mask].mean(axis=0)
    dest_lat = float(np.degrees(dest_centroid[0]))
    dest_lng = float(np.degrees(dest_centroid[1]))

    # Calculate typical departure times
    departure_hours = []
    for trip in examples:
        ts = trip["startTime"]
        # Handle both milliseconds and seconds
        if ts > 1e10:
            ts = ts / 1000
        dt = datetime.fromtimestamp(ts)
        departure_hours.append(dt.hour + dt.minute / 60.0)

    avg_hour = float(np.mean(departure_hours))
    std_hour = float(np.std(departure_hours))

    # Calculate confidence score
    confidence = min(
        MAX_CONFIDENCE,
        CONFIDENCE_INCREMENT * trip_count
    )

    pattern_id = f"o{o_label}_d{d_label}"

    pattern_data = {
        "userId": uid,
        "patternId": pattern_id,
        "originLat": origin_lat,
        "originLng": origin_lng,
        "destLat": dest_lat,
        "destLng": dest_lng,
        "tripCount": trip_count,
        "confidence": confidence,
        "avgDepartureHour": avg_hour,
        "stdDepartureHour": std_hour,
        "active": confidence >= MIN_CONFIDENCE_THRESHOLD,
        "updatedAt": datetime.utcnow().isoformat(),
    }

    # Save to velaris_patterns/{uid}/patterns/{patternId}
    db.collection("velaris_patterns") \
      .document(uid) \
      .collection("patterns") \
      .document(pattern_id) \
      .set(pattern_data, merge=True)

    print(f"[Pattern Engine] Saved pattern {pattern_id} — {trip_count} trips, confidence {confidence:.2f}")