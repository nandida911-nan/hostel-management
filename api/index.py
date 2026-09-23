import os
import sys

# Ensure project root is in Python sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.models import db, User
from seed_data import seed_database

app = create_app('production')

# Serverless cold-start initialization
with app.app_context():
    try:
        db.create_all()
        # Seed if database is fresh
        if not User.query.first():
            seed_database()
    except Exception as e:
        print("[INIT] Startup note:", e)

# Vercel entrypoint WSGI application
handler = app
