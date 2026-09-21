# ⚡ HostelPulse AI
### Automated Hostel Utility Optimization & Predictive Resource Management Dashboard

**HostelPulse AI** is a full-stack automated hostel management and predictive resource management platform built with **Python (Flask)**, **SQLAlchemy**, and **Scikit-Learn**. It empowers both Students and Wardens with role-based portals, automated maintenance ticketing, out-pass approval workflows with digital QR passes, and machine learning-powered electricity load forecasting and power surge anomaly detection.

*(Note: In accordance with institutional scope, food/mess and water resource management are strictly excluded).*

---

## 🌟 Key Features

### 👨🎓 Student Portal
- **Dashboard & Profile**: Real-time room occupancy, assigned roommate details, and personal electricity eco-rating.
- **Room Booking & Allocations**: Browse available hostel rooms with vacancies and reserve beds.
- **Maintenance Tickets**: File facility repairs (Electrical, AC/Cooling, Appliances, Furniture, WiFi, Door Lock) with priority ratings and live technician notes.
- **Out-Pass Workflow**: Apply for Day, Weekend, or Emergency gate passes with emergency contacts and destination tracking.
- **Digital Pass with QR Verification**: Verified digital gate pass with an encrypted QR token for security gate scanning.
- **Issue & Grievance Desk**: Report electrical outages, noise disturbances, and building hazards directly to authorities.
- **Room Electricity Telemetry**: Monitor daily kWh intake, eco scores, carbon footprint, and green hostel achievement badges.

### 👨💼 Warden Portal
- **Master Command Center**: Executive KPI analytics tracking overall hostel occupancy, bed capacities, open tickets, and real-time power demand (kW).
- **Room Allocation Grid**: Manage all hostel blocks (Block A, Block B, Block C) and assign/reassign students.
- **Maintenance Triage**: Review pending issues, assign technicians, add resolution notes, and update statuses.
- **Out-Pass Approval Desk**: Review gate requests with 1-click Approve/Reject and live monitoring of students currently outside hostel premises.
- **Grievance Resolution**: Respond to student issue reports with official resolutions.

### ⚡ Smart Electricity & Utility Optimization
- **Real-Time Telemetry**: Live power demand (kW), daily consumption (kWh), estimated utility costs ($), and carbon footprint (kg CO2).
- **ML Load Forecasting (Scikit-Learn)**:
  - `RandomForestRegressor` trained on multi-factor features: hour, day of week, exam periods, ambient temperature, and occupancy.
  - Predicts 24-hour hourly load curves and 7-day forward demand.
  - `IsolationForest` anomaly detector flagging unauthorized heavy appliances (e.g. heating coils) and power surges.
- **Interactive ML Simulation**: Live sliders for occupancy, temperature, and academic exam phase that dynamically re-render prediction curves without page reload.
- **Automated Conservation Directives**: Actionable optimization rules (24°C AC thermostat rule, off-peak dimming, vampire standby isolation).

### 🤖 24/7 AI Chatbot Assistant
- Floating `EcoHostel AI` assistant available across all pages.
- Answers queries regarding gate curfew hours, out-pass procedures, ticket logging, and energy conservation tips with quick-suggestion prompt chips.

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+ installed
- Git

### 2. Clone and Setup
```bash
git clone <your-repository-url>
cd "Hostel management"

# Install dependencies
pip install -r requirements.txt

# Initialize database & train initial ML models
python seed_data.py
```

### 3. Run the Application
```bash
# Production WSGI Server (Waitress)
python run_prod.py

# Or Development Mode
python wsgi.py
```
Open **[http://localhost:5000](http://localhost:5000)** in your web browser.

---

## 🔑 Default Demo Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Student** | `student@hostel.edu` | `student123` | Nandida K (Room 101, Block A) |
| **Warden / Admin** | `warden@hostel.edu` | `admin123` | Dr. Arthur Vance (Chief Warden) |

---

## 🧪 Running Tests
```bash
python -m unittest tests/test_app.py
```

---

## 🌐 Cloud Deployment

The repository includes production deployment configurations:
- **Render**: `render.yaml`
- **Railway / Heroku**: `Procfile`
- **Docker**: `Dockerfile` & `docker-compose.yml`

For complete instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 📄 License
MIT License.
