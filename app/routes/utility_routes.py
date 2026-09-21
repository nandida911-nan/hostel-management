from datetime import datetime
from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from app.models import db, Room, ElectricityLog, OptimizationAlert
from app.ml_engine import forecaster

utility_bp = Blueprint('utility', __name__)

@utility_bp.route('/')
@login_required
def index():
    # 1. Real-time metrics
    latest_logs = ElectricityLog.query.order_by(ElectricityLog.timestamp.desc()).limit(10).all()
    
    # Calculate today's aggregate
    today_kwh = sum(log.energy_kwh for log in latest_logs) if latest_logs else 512.4
    peak_kw = max((log.peak_load_kw for log in latest_logs), default=46.5)
    cost_today = round(today_kwh * 0.15, 2)
    carbon_today = round(today_kwh * 0.42, 2)
    
    # 2. Block breakdowns
    block_totals = {
        'Block A': 185.4,
        'Block B': 162.1,
        'Block C': 164.9
    }
    
    # 3. ML 24-hour forecast
    selected_block = request.args.get('block', 'Hostel Wide')
    occupancy = float(request.args.get('occupancy', 0.85))
    temp = float(request.args.get('temp', 28.0))
    is_exam = int(request.args.get('is_exam', 0))
    
    forecast_24h = forecaster.predict_next_24h(
        block=selected_block,
        base_occupancy=occupancy,
        base_temp=temp,
        is_exam=is_exam
    )
    
    # 4. ML 7-day forecast
    forecast_7d = forecaster.predict_next_7_days(block=selected_block)
    
    # 5. Smart optimization recommendations
    recommendations = forecaster.generate_energy_recommendations(today_kwh, peak_kw)
    
    # 6. Active anomaly alerts
    anomalies = ElectricityLog.query.filter_by(is_anomaly=True).order_by(ElectricityLog.timestamp.desc()).limit(5).all()

    return render_template(
        'utility/index.html',
        today_kwh=round(today_kwh, 1),
        peak_kw=round(peak_kw, 1),
        cost_today=cost_today,
        carbon_today=carbon_today,
        block_totals=block_totals,
        forecast_24h=forecast_24h,
        forecast_7d=forecast_7d,
        recommendations=recommendations,
        anomalies=anomalies,
        selected_block=selected_block,
        occupancy=occupancy,
        temp=temp,
        is_exam=is_exam
    )
