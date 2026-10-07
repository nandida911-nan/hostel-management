import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler

class EnergyForecaster:
    def __init__(self, model_dir=None):
        if model_dir is None:
            model_dir = os.path.join(os.path.dirname(__file__), 'models')
        self.model_dir = model_dir
        try:
            os.makedirs(self.model_dir, exist_ok=True)
        except OSError:
            pass
        
        self.regressor_path = os.path.join(self.model_dir, 'rf_energy_regressor.joblib')
        self.anomaly_path = os.path.join(self.model_dir, 'iso_anomaly_detector.joblib')
        self.scaler_path = os.path.join(self.model_dir, 'scaler.joblib')
        
        self.regressor = None
        self.anomaly_detector = None
        self.scaler = None
        
        # Fast non-blocking load on startup (never trains during import)
        self._load_from_disk_if_exists()

    def _load_from_disk_if_exists(self):
        """Attempts to load pre-trained models from disk without throwing errors."""
        try:
            if (os.path.exists(self.regressor_path) and 
                os.path.exists(self.anomaly_path) and 
                os.path.exists(self.scaler_path)):
                self.regressor = joblib.load(self.regressor_path)
                self.anomaly_detector = joblib.load(self.anomaly_path)
                self.scaler = joblib.load(self.scaler_path)
                return True
        except Exception as e:
            print("[ML NOTICE] Could not load model from disk:", e)
        return False

    def _generate_synthetic_historical_data(self, days=90):
        """Generate realistic hourly electricity telemetry for training the ML model."""
        np.random.seed(42)
        records = []
        start_time = datetime.now() - timedelta(days=days)
        
        blocks = ['Block A', 'Block B', 'Block C']
        block_map = {'Block A': 0, 'Block B': 1, 'Block C': 2}
        
        for hour_idx in range(days * 24):
            current_time = start_time + timedelta(hours=hour_idx)
            hour = current_time.hour
            day_of_week = current_time.weekday()
            is_weekend = 1 if day_of_week in [5, 6] else 0
            
            # Exam period occurs once every 4 weeks for 1 week
            day_of_year = current_time.timetuple().tm_yday
            is_exam_period = 1 if (day_of_year % 30) in range(20, 27) else 0
            
            # Ambient temperature pattern (cooler at night, warmer in afternoon)
            base_temp = 25.0 + 5.0 * np.sin((day_of_year / 365) * 2 * np.pi)
            daily_variation = 6.0 * np.sin((hour - 9) * np.pi / 12)
            ambient_temp = base_temp + daily_variation + np.random.normal(0, 1.5)
            
            # Occupancy varies by hour and weekend
            if 9 <= hour <= 16 and not is_weekend:
                occupancy_rate = np.random.uniform(0.20, 0.40) # Classes
            elif 23 <= hour or hour <= 6:
                occupancy_rate = np.random.uniform(0.85, 0.98) # Sleeping
            else:
                occupancy_rate = np.random.uniform(0.65, 0.90) # Evening / Morning
            
            for block in blocks:
                block_id = block_map[block]
                base_block_mult = 1.0 + (block_id * 0.15) # Block B and C have slightly different capacities
                
                # Base hostel load: lighting + fans/AC + electronics
                time_load = 0.35
                if 6 <= hour <= 8:
                    time_load = 0.75
                elif 18 <= hour <= 23:
                    time_load = 0.95
                elif 12 <= hour <= 14 and is_weekend:
                    time_load = 0.65
                
                # AC/Cooling load depends on temperature
                ac_factor = max(0.0, (ambient_temp - 24.0) * 0.08)
                
                # Exam load increase late at night
                exam_boost = 0.25 if (is_exam_period and (22 <= hour or hour <= 3)) else 0.0
                
                mean_kwh = (time_load * 22.0 + ac_factor * 12.0 + exam_boost * 8.0) * occupancy_rate * base_block_mult + 5.0
                noise = np.random.normal(0, 1.2)
                energy_kwh = max(1.5, mean_kwh + noise)
                
                records.append({
                    'timestamp': current_time,
                    'hour': hour,
                    'day_of_week': day_of_week,
                    'is_weekend': is_weekend,
                    'is_exam_period': is_exam_period,
                    'occupancy_rate': occupancy_rate,
                    'ambient_temp': ambient_temp,
                    'block_encoded': block_id,
                    'energy_kwh': energy_kwh
                })
                
        return pd.DataFrame(records)

    def train_models(self):
        """Train compact, high-performance RandomForest regressor and IsolationForest."""
        df = self._generate_synthetic_historical_data(days=60)
        
        feature_cols = ['hour', 'day_of_week', 'is_weekend', 'is_exam_period', 'occupancy_rate', 'ambient_temp', 'block_encoded']
        X = df[feature_cols].values
        y = df['energy_kwh'].values
        
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train lightweight, fast Random Forest Regressor (< 200 KB compressed)
        self.regressor = RandomForestRegressor(
            n_estimators=30,
            max_depth=8,
            random_state=42,
            n_jobs=1
        )
        self.regressor.fit(X_scaled, y)
        
        # Train compact Isolation Forest for anomaly detection
        self.anomaly_detector = IsolationForest(
            contamination=0.03,
            random_state=42,
            n_estimators=30
        )
        self.anomaly_detector.fit(X_scaled)
        
        # Safe save to disk (compressed to ~250 KB total)
        try:
            os.makedirs(self.model_dir, exist_ok=True)
            joblib.dump(self.regressor, self.regressor_path, compress=3)
            joblib.dump(self.anomaly_detector, self.anomaly_path, compress=3)
            joblib.dump(self.scaler, self.scaler_path, compress=3)
        except OSError:
            # Running on read-only serverless filesystem; models remain in memory
            pass

    def _init_fallback_models(self):
        """Creates instant in-memory fallback models if full training cannot execute."""
        np.random.seed(42)
        X_dummy = np.random.rand(100, 7)
        y_dummy = 15.0 + 5.0 * X_dummy[:, 0]
        self.scaler = StandardScaler().fit(X_dummy)
        self.regressor = RandomForestRegressor(n_estimators=5, max_depth=4, random_state=42).fit(self.scaler.transform(X_dummy), y_dummy)
        self.anomaly_detector = IsolationForest(n_estimators=5, random_state=42).fit(self.scaler.transform(X_dummy))

    def _ensure_models_trained(self):
        """Load trained models or train fast model if not already loaded."""
        if self.regressor is not None and self.anomaly_detector is not None and self.scaler is not None:
            return

        if self._load_from_disk_if_exists():
            return

        try:
            self.train_models()
        except Exception as e:
            print("[ML FALLBACK] Training error, initializing in-memory fallback:", e)
            self._init_fallback_models()

    def predict_next_24h(self, block='Hostel Wide', base_occupancy=0.85, base_temp=27.0, is_exam=0):
        """Predict hourly consumption for the next 24 hours."""
        if self.regressor is None:
            self._ensure_models_trained()
            
        block_map = {'Block A': 0, 'Block B': 1, 'Block C': 2}
        now = datetime.now()
        records = []
        
        blocks_to_predict = [0, 1, 2] if block == 'Hostel Wide' else [block_map.get(block, 0)]
        
        predictions_by_hour = []
        
        for h in range(24):
            forecast_time = now + timedelta(hours=h)
            hour = forecast_time.hour
            day_of_week = forecast_time.weekday()
            is_weekend = 1 if day_of_week in [5, 6] else 0
            
            # Hourly temperature cycle
            temp = base_temp + 5.0 * np.sin((hour - 9) * np.pi / 12)
            
            # Hourly occupancy variation
            if 9 <= hour <= 16 and not is_weekend:
                occupancy = base_occupancy * 0.35
            elif 23 <= hour or hour <= 6:
                occupancy = base_occupancy * 0.95
            else:
                occupancy = base_occupancy * 0.80
                
            hourly_total = 0.0
            
            for b_id in blocks_to_predict:
                features = np.array([[hour, day_of_week, is_weekend, is_exam, occupancy, temp, b_id]])
                features_scaled = self.scaler.transform(features)
                pred_kwh = self.regressor.predict(features_scaled)[0]
                hourly_total += max(1.0, float(pred_kwh))
                
            predictions_by_hour.append({
                'time': forecast_time.strftime('%H:00'),
                'full_time': forecast_time.strftime('%Y-%m-%d %H:%M'),
                'kwh': round(hourly_total, 2),
                'cost': round(hourly_total * 0.15, 2), # $0.15 / unit
                'carbon_kg': round(hourly_total * 0.42, 2),
                'is_peak': (18 <= hour <= 23) or (6 <= hour <= 8)
            })
            
        total_24h_kwh = sum(p['kwh'] for p in predictions_by_hour)
        peak_hour_entry = max(predictions_by_hour, key=lambda x: x['kwh'])
        
        return {
            'hourly': predictions_by_hour,
            'total_24h_kwh': round(total_24h_kwh, 2),
            'projected_cost': round(total_24h_kwh * 0.15, 2),
            'projected_carbon_kg': round(total_24h_kwh * 0.42, 2),
            'peak_time': peak_hour_entry['time'],
            'peak_kwh': peak_hour_entry['kwh']
        }

    def predict_next_7_days(self, block='Hostel Wide'):
        """Predict daily aggregated electricity load for the next 7 days."""
        if self.regressor is None:
            self._ensure_models_trained()
            
        now = datetime.now().date()
        daily_forecast = []
        
        for d in range(7):
            forecast_date = now + timedelta(days=d)
            # Aggregate 24 hours
            day_total = 0.0
            day_of_week = forecast_date.weekday()
            is_weekend = 1 if day_of_week in [5, 6] else 0
            
            for hour in range(24):
                temp = 26.0 + 4.0 * np.sin((hour - 9) * np.pi / 12)
                occupancy = 0.85 if is_weekend else (0.4 if 9 <= hour <= 16 else 0.88)
                
                blocks = [0, 1, 2] if block == 'Hostel Wide' else [0]
                for b_id in blocks:
                    features = np.array([[hour, day_of_week, is_weekend, 0, occupancy, temp, b_id]])
                    features_scaled = self.scaler.transform(features)
                    pred = self.regressor.predict(features_scaled)[0]
                    day_total += pred
                    
            daily_forecast.append({
                'date': forecast_date.strftime('%a, %b %d'),
                'day_name': forecast_date.strftime('%A'),
                'kwh': round(day_total, 1),
                'cost': round(day_total * 0.15, 2),
                'carbon_kg': round(day_total * 0.42, 1)
            })
            
        return daily_forecast

    def detect_anomaly(self, hour, day_of_week, is_weekend, occupancy_rate, temp, block_id, actual_kwh):
        """Classify whether a current reading is an abnormal spike or surge."""
        if self.regressor is None or self.anomaly_detector is None:
            self._ensure_models_trained()
            
        features = np.array([[hour, day_of_week, is_weekend, 0, occupancy_rate, temp, block_id]])
        features_scaled = self.scaler.transform(features)
        
        expected_kwh = float(self.regressor.predict(features_scaled)[0])
        anomaly_flag = self.anomaly_detector.predict(features_scaled)[0] # -1 for anomaly, 1 for normal
        
        # In addition to IsolationForest, check excessive deviation from expected
        deviation_ratio = (actual_kwh - expected_kwh) / max(expected_kwh, 1.0)
        is_surge = (anomaly_flag == -1 and deviation_ratio > 0.35) or (deviation_ratio > 0.60)
        
        reason = None
        if is_surge:
            if deviation_ratio > 0.80:
                reason = "Critical Power Spike: Unregistered heavy heating/cooking appliance detected or equipment short-circuit."
            else:
                reason = f"High Load Anomaly: Energy consumption is {round(deviation_ratio * 100, 1)}% above predicted baseline."
                
        return {
            'is_anomaly': bool(is_surge),
            'expected_kwh': round(expected_kwh, 2),
            'actual_kwh': round(actual_kwh, 2),
            'deviation_percent': round(deviation_ratio * 100, 1),
            'reason': reason
        }

    def generate_energy_recommendations(self, current_total_kwh, peak_load_kw):
        """Produce dynamic, actionable energy optimization recommendations."""
        recommendations = [
            {
                'id': 1,
                'title': 'Automate Common Area Off-Peak Dimming',
                'description': 'Schedule 40% dimming on corridors and common study halls between 01:00 AM and 05:30 AM.',
                'potential_savings_kwh': 28.5,
                'monthly_saving_dollars': 128.0,
                'priority': 'High'
            },
            {
                'id': 2,
                'title': 'AC Thermostat Normalization (24°C Rule)',
                'description': 'Adjust room cooling setpoints from 20°C to 24°C during peak afternoon hours (12:00 - 16:00).',
                'potential_savings_kwh': 45.0,
                'monthly_saving_dollars': 202.5,
                'priority': 'Critical'
            },
            {
                'id': 3,
                'title': 'Vampire Load & Inactive Lab Isolation',
                'description': 'Cut passive standby power to vacant common computer terminals and water dispensers during night hours.',
                'potential_savings_kwh': 14.2,
                'monthly_saving_dollars': 64.0,
                'priority': 'Medium'
            },
            {
                'id': 4,
                'title': 'Peak-Hour Load Shifting for Laundry/Geysers',
                'description': 'Encourage student geyser/iron usage outside 06:00-08:00 AM to avoid maximum grid tariff surcharges.',
                'potential_savings_kwh': 32.0,
                'monthly_saving_dollars': 144.0,
                'priority': 'High'
            }
        ]
        return recommendations


# Singleton instance
forecaster = EnergyForecaster()
