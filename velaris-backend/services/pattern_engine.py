def run_pattern_engine(uid: str, db):
    """
    Runs after every new trip is saved.
    Fetches all trips for this user and runs DBSCAN clustering.
    Full implementation in Part 5.
    """
    try:
        trips_ref = db.collection("velaris_trips").document(uid).collection("trips")
        docs = trips_ref.get()
        trip_count = len(docs)
        print(f"[Pattern Engine] User {uid} has {trip_count} trips. DBSCAN coming in Part 5.")
    except Exception as e:
        print(f"[Pattern Engine] Error: {e}")
