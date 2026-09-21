# Deployment Guide - HostelPulse AI Real Web Application

This document provides step-by-step instructions to deploy **HostelPulse AI** as a live, production-grade web application on the public internet, beyond localhost.

---

## Architecture Overview
- **Framework**: Flask (Python)
- **WSGI Production Server**: Waitress (Multi-threaded) / Gunicorn
- **Database**: SQLite (built-in default) or PostgreSQL / MySQL (for enterprise scale)
- **Machine Learning Engine**: Scikit-Learn (RandomForest + IsolationForest)

---

## Option 1: One-Click Deploy on Render (Recommended Free & Fast)

Render supports Python web services with automated Git deployments and free SSL certificates.

1. **Push your code to GitHub / GitLab**:
   ```bash
   git add .
   git commit -m "Deploy HostelPulse AI"
   git push origin main
   ```
2. **Open [Render Dashboard](https://dashboard.render.com/)** and click **New +** -> **Web Service**.
3. **Connect your Repository**.
4. Configure the settings:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python seed_data.py`
   - **Start Command**: `python run_prod.py`
5. **Environment Variables**:
   - `FLASK_ENV`: `production`
   - `SECRET_KEY`: `<Generate a random secure 32+ character string>`
   - `PORT`: `10000` (Render binds automatically)
6. Click **Create Web Service**. Render will automatically build the environment, train the ML model, seed initial data, and provide an HTTPS URL like `https://hostelpulse-ai.onrender.com`.

---

## Option 2: Deploy on Railway (Zero-Config PaaS)

1. Sign in to [Railway.app](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your Hostel Management repository.
4. Railway automatically reads the included `Procfile` (`web: python run_prod.py`) and builds the app.
5. In **Variables**, add:
   - `SECRET_KEY`: `<your-random-key>`
   - `PORT`: `5000`
6. Click **Generate Domain** under Settings to obtain a public live `.up.railway.app` URL.

---

## Option 3: Deploy with Docker & Docker Compose (Any Cloud VPS / AWS / DigitalOcean)

The codebase includes a pre-configured multi-stage `Dockerfile` and `docker-compose.yml`.

1. **Clone the repository on your remote Linux server**:
   ```bash
   git clone <your-repo-url> /var/www/hostel-management
   cd /var/www/hostel-management
   ```
2. **Build and start the container**:
   ```bash
   docker-compose up -d --build
   ```
3. **Reverse Proxy with Nginx & Let's Encrypt SSL**:
   ```nginx
   server {
       server_name hostel.yourdomain.edu;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
4. Obtain free SSL via Certbot:
   ```bash
   sudo certbot --nginx -d hostel.yourdomain.edu
   ```

---

## Production Security Checklist
- [x] Set a unique random `SECRET_KEY` in environment variables.
- [x] Passwords are encrypted using Werkzeug SHA-256 salted hashes.
- [x] All state-modifying actions protected by session authentication.
- [x] Multi-threaded WSGI runtime (`waitress` / `gunicorn`) prevents request blocking.
- [x] Machine learning models serialized to local disk with automatic fallback training.
- [x] Food and Water resource management strictly excluded per institutional requirements.
