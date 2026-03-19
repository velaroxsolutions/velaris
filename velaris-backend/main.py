from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv
import os

load_dotenv()

# Firebase init
cred = credentials.Certificate(os.getenv("FIREBASE_CREDENTIALS_PATH"))
firebase_admin.initialize_app(cred)
db = firestore.client()

app = FastAPI(title="Velaris API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ─── Auth helper ──────────────────────────────────────────────────────────────

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Velaris API running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/trips")
async def save_trip(trip: dict, user=Depends(get_current_user)):
    try:
        uid = user["uid"]

        trip_data = {
            "userId": uid,
            "startLat": trip["startLat"],
            "startLng": trip["startLng"],
            "endLat": trip["endLat"],
            "endLng": trip["endLng"],
            "startTime": trip["startTime"],
            "endTime": trip["endTime"],
            "duration": trip["duration"],
            "distanceMeters": trip["distanceMeters"],
            "pointCount": trip["pointCount"],
            "syncedAt": firestore.SERVER_TIMESTAMP,
        }

        ref = db.collection("velaris_trips").document(uid).collection("trips").add(trip_data)

        # Run pattern engine in background thread — don't block the response
        import threading
        from services.pattern_engine import run_pattern_engine
        thread = threading.Thread(target=run_pattern_engine, args=(uid, db))
        thread.daemon = True
        thread.start()

        return {"status": "saved", "tripId": ref[1].id}

    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing field: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/trips")
async def get_trips(user=Depends(get_current_user)):
    try:
        uid = user["uid"]
        trips_ref = db.collection("velaris_trips").document(uid).collection("trips")
        docs = trips_ref.order_by("startTime", direction=firestore.Query.DESCENDING).limit(50).get()
        trips = [{"id": doc.id, **doc.to_dict()} for doc in docs]
        return {"trips": trips}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patterns")
async def get_patterns(lat: float, lng: float, user=Depends(get_current_user)):
    try:
        uid = user["uid"]
        patterns_ref = db.collection("velaris_patterns").document(uid).collection("patterns")
        docs = patterns_ref.where("active", "==", True).get()
        
        patterns = []
        for doc in docs:
            p = doc.to_dict()
            # Check if user is within 150m of pattern origin
            distance = haversine(lat, lng, p["originLat"], p["originLng"])
            if distance <= 150:
                patterns.append({"id": doc.id, **p, "distanceFromOrigin": distance})

        return {"patterns": patterns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/patterns/analyze")
async def analyze_patterns(user=Depends(get_current_user)):
    try:
        uid = user["uid"]
        import threading
        from services.pattern_engine import run_pattern_engine
        thread = threading.Thread(target=run_pattern_engine, args=(uid, db))
        thread.daemon = True
        thread.start()
        return {"status": "Pattern engine started in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
        
def haversine(lat1, lon1, lat2, lon2):
    import math
    R = 6371e3
    φ1 = math.radians(lat1)
    φ2 = math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(Δλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))