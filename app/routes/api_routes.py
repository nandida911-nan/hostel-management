from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.models import Room, ElectricityLog
from app.chatbot import ai_assistant
from app.ml_engine import forecaster

api_bp = Blueprint('api', __name__)

@api_bp.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.get_json() or {}
    message = data.get('message', '').strip()
    
    if not message:
        return jsonify({'error': 'Message content cannot be empty'}), 400
        
    response = ai_assistant.process_message(message, user=current_user)
    return jsonify(response)

@api_bp.route('/forecast', methods=['GET'])
@login_required
def get_forecast():
    block = request.args.get('block', 'Hostel Wide')
    occupancy = float(request.args.get('occupancy', 0.85))
    temp = float(request.args.get('temp', 28.0))
    is_exam = int(request.args.get('is_exam', 0))
    
    forecast_24h = forecaster.predict_next_24h(
        block=block,
        base_occupancy=occupancy,
        base_temp=temp,
        is_exam=is_exam
    )
    
    forecast_7d = forecaster.predict_next_7_days(block=block)
    
    return jsonify({
        'forecast_24h': forecast_24h,
        'forecast_7d': forecast_7d
    })

@api_bp.route('/telemetry/live', methods=['GET'])
@login_required
def live_telemetry():
    # Simulate latest telemetry reading
    import random
    current_load_kw = round(random.uniform(38.0, 48.5), 1)
    voltage = round(random.uniform(228.0, 232.0), 1)
    power_factor = round(random.uniform(0.93, 0.98), 2)
    
    return jsonify({
        'current_load_kw': current_load_kw,
        'voltage_v': voltage,
        'power_factor': power_factor,
        'status': 'Optimal'
    })
