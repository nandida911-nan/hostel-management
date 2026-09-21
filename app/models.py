from datetime import datetime
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student') # 'student' or 'warden'
    phone = db.Column(db.String(20), nullable=True)
    student_id_num = db.Column(db.String(50), nullable=True, unique=True)
    
    # Room association for students
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)
    room = db.relationship('Room', back_populates='occupants')

    # Relationships
    tickets = db.relationship('MaintenanceTicket', backref='student', lazy='dynamic', foreign_keys='MaintenanceTicket.student_id')
    outpasses = db.relationship('OutPass', backref='student', lazy='dynamic', foreign_keys='OutPass.student_id')
    issues = db.relationship('IssueReport', backref='student', lazy='dynamic')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def is_warden(self):
        return self.role == 'warden'

    @property
    def is_student(self):
        return self.role == 'student'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'phone': self.phone,
            'student_id_num': self.student_id_num,
            'room_id': self.room_id,
            'room_number': self.room.room_number if self.room else None
        }


class Room(db.Model):
    __tablename__ = 'rooms'

    id = db.Column(db.Integer, primary_key=True)
    room_number = db.Column(db.String(20), nullable=False)
    block = db.Column(db.String(50), nullable=False)  # e.g., 'Block A', 'Block B', 'Block C'
    floor = db.Column(db.Integer, nullable=False, default=1)
    capacity = db.Column(db.Integer, nullable=False, default=2)
    room_type = db.Column(db.String(50), nullable=False, default='Double Standard')  # 'Single AC', 'Double Standard', 'Triple Studio'
    status = db.Column(db.String(20), nullable=False, default='available')  # 'available', 'full', 'maintenance'
    daily_avg_kwh = db.Column(db.Float, default=4.5)
    
    # Relationships
    occupants = db.relationship('User', back_populates='room')
    tickets = db.relationship('MaintenanceTicket', backref='room', lazy='dynamic')
    electricity_logs = db.relationship('ElectricityLog', backref='room', lazy='dynamic')

    @property
    def current_occupancy(self):
        return len(self.occupants)

    @property
    def is_available(self):
        return self.status == 'available' and len(self.occupants) < self.capacity

    def to_dict(self):
        return {
            'id': self.id,
            'room_number': self.room_number,
            'block': self.block,
            'floor': self.floor,
            'capacity': self.capacity,
            'room_type': self.room_type,
            'status': self.status,
            'occupancy': len(self.occupants),
            'available_slots': max(0, self.capacity - len(self.occupants)),
            'occupants': [{'id': u.id, 'name': u.name, 'email': u.email} for u in self.occupants],
            'daily_avg_kwh': self.daily_avg_kwh
        }


class MaintenanceTicket(db.Model):
    __tablename__ = 'maintenance_tickets'

    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(50), unique=True, nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)
    
    # Excluded water/food per instructions
    category = db.Column(db.String(50), nullable=False) # 'electrical', 'ac_cooling', 'appliances', 'furniture', 'wifi_network', 'door_lock'
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), nullable=False, default='medium') # 'low', 'medium', 'high', 'critical'
    status = db.Column(db.String(20), nullable=False, default='pending') # 'pending', 'in_progress', 'resolved', 'closed'
    
    technician_name = db.Column(db.String(100), nullable=True)
    technician_notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_number': self.ticket_number,
            'student_name': self.student.name if self.student else 'Unknown',
            'room_number': self.room.room_number if self.room else 'N/A',
            'block': self.room.block if self.room else 'N/A',
            'category': self.category,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'technician_name': self.technician_name,
            'technician_notes': self.technician_notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None,
            'resolved_at': self.resolved_at.strftime('%Y-%m-%d %H:%M') if self.resolved_at else None
        }


class OutPass(db.Model):
    __tablename__ = 'out_passes'

    id = db.Column(db.Integer, primary_key=True)
    pass_number = db.Column(db.String(50), unique=True, nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    pass_type = db.Column(db.String(30), nullable=False, default='day') # 'day', 'weekend', 'emergency'
    departure_time = db.Column(db.DateTime, nullable=False)
    expected_return_time = db.Column(db.DateTime, nullable=False)
    actual_return_time = db.Column(db.DateTime, nullable=True)
    
    destination = db.Column(db.String(200), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    emergency_phone = db.Column(db.String(20), nullable=False)
    
    status = db.Column(db.String(20), nullable=False, default='pending') # 'pending', 'approved', 'rejected', 'completed'
    warden_remarks = db.Column(db.Text, nullable=True)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    qr_token = db.Column(db.String(64), unique=True, default=lambda: secrets.token_hex(16))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviewer = db.relationship('User', foreign_keys=[reviewed_by_id])

    def to_dict(self):
        return {
            'id': self.id,
            'pass_number': self.pass_number,
            'student_name': self.student.name if self.student else 'Unknown',
            'student_phone': self.student.phone if self.student else 'N/A',
            'room_number': self.student.room.room_number if self.student and self.student.room else 'N/A',
            'pass_type': self.pass_type,
            'departure_time': self.departure_time.strftime('%Y-%m-%d %H:%M') if self.departure_time else None,
            'expected_return_time': self.expected_return_time.strftime('%Y-%m-%d %H:%M') if self.expected_return_time else None,
            'actual_return_time': self.actual_return_time.strftime('%Y-%m-%d %H:%M') if self.actual_return_time else None,
            'destination': self.destination,
            'reason': self.reason,
            'emergency_phone': self.emergency_phone,
            'status': self.status,
            'warden_remarks': self.warden_remarks,
            'qr_token': self.qr_token,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None
        }


class IssueReport(db.Model):
    __tablename__ = 'issue_reports'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    category = db.Column(db.String(50), nullable=False) # 'electricity_outage', 'internet_disruption', 'noise_complaint', 'cleanliness', 'facility_damage', 'general'
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(150), nullable=False)
    urgency = db.Column(db.String(20), nullable=False, default='normal') # 'normal', 'urgent', 'critical'
    status = db.Column(db.String(20), nullable=False, default='open') # 'open', 'under_review', 'resolved'
    
    warden_response = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'student_name': self.student.name if self.student else 'Anonymous',
            'category': self.category,
            'title': self.title,
            'description': self.description,
            'location': self.location,
            'urgency': self.urgency,
            'status': self.status,
            'warden_response': self.warden_response,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None,
            'resolved_at': self.resolved_at.strftime('%Y-%m-%d %H:%M') if self.resolved_at else None
        }


class ElectricityLog(db.Model):
    __tablename__ = 'electricity_logs'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    block = db.Column(db.String(50), nullable=False, index=True)
    floor = db.Column(db.Integer, nullable=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=True)
    
    energy_kwh = db.Column(db.Float, nullable=False, default=0.0)
    peak_load_kw = db.Column(db.Float, nullable=False, default=0.0)
    voltage_v = db.Column(db.Float, default=230.0)
    power_factor = db.Column(db.Float, default=0.95)
    cost_estimate = db.Column(db.Float, default=0.0)
    carbon_kg = db.Column(db.Float, default=0.0)
    
    # Anomaly tracking
    is_anomaly = db.Column(db.Boolean, default=False)
    anomaly_score = db.Column(db.Float, default=0.0)
    anomaly_reason = db.Column(db.String(200), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M'),
            'block': self.block,
            'floor': self.floor,
            'room_number': self.room.room_number if self.room else 'All Block',
            'energy_kwh': round(self.energy_kwh, 2),
            'peak_load_kw': round(self.peak_load_kw, 2),
            'voltage_v': round(self.voltage_v, 1),
            'power_factor': round(self.power_factor, 2),
            'cost_estimate': round(self.cost_estimate, 2),
            'carbon_kg': round(self.carbon_kg, 2),
            'is_anomaly': self.is_anomaly,
            'anomaly_reason': self.anomaly_reason
        }


class OptimizationAlert(db.Model):
    __tablename__ = 'optimization_alerts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    block = db.Column(db.String(50), nullable=True)
    savings_potential_kwh = db.Column(db.Float, default=0.0)
    estimated_cost_saving = db.Column(db.Float, default=0.0)
    level = db.Column(db.String(20), default='info') # 'info', 'warning', 'critical'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'block': self.block or 'All Blocks',
            'savings_potential_kwh': self.savings_potential_kwh,
            'estimated_cost_saving': self.estimated_cost_saving,
            'level': self.level,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M')
        }
