import os
from waitress import serve
from app import create_app
from seed_data import seed_database

# Check if database exists, seed if new
instance_db = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'hostel.db')
if not os.path.exists(instance_db):
    print("Database not detected. Initializing schema and realistic seed data...")
    seed_database()

app = create_app('production')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    threads = int(os.environ.get('WEB_CONCURRENCY', 4))
    
    print(f"[START] Starting HostelPulse AI Production WSGI Server (Waitress)...")
    print(f"[NET] Serving on http://{host}:{port} with {threads} worker threads")
    print(f"[DEMO] Student Account: student@hostel.edu / student123")
    print(f"[DEMO] Warden Account:  warden@hostel.edu  / admin123")
    
    serve(app, host=host, port=port, threads=threads)
