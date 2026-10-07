import os
import sys

# Ensure project root is in Python sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app import create_app
from app.models import db, User

# Create Flask production instance
app = create_app('production')

_initialized = False

def init_serverless_db():
    global _initialized
    if not _initialized:
        _initialized = True
        with app.app_context():
            try:
                db.create_all()
                if not User.query.first():
                    from seed_data import seed_database
                    seed_database(app_instance=app, drop_existing=False)
            except Exception as e:
                print("[VERCEL DB INIT NOTE]", e)

@app.before_request
def before_request_hook():
    init_serverless_db()

# Expose WSGI handler for Vercel
handler = app
