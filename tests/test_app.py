import unittest
import json
from app import create_app
from app.models import db, User, Room, MaintenanceTicket, OutPass, IssueReport, ElectricityLog
from app.ml_engine import forecaster
from app.chatbot import ai_assistant

class HostelPulseTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Seed test rooms
        self.room1 = Room(room_number="101", block="Block A", floor=1, capacity=2, room_type="Double Standard", status="available")
        self.room2 = Room(room_number="102", block="Block A", floor=1, capacity=2, room_type="Double Standard", status="available")
        db.session.add_all([self.room1, self.room2])
        db.session.commit()

        # Seed test student
        self.student = User(name="Test Student", email="student@test.edu", role="student", student_id_num="STU-001", room_id=self.room1.id)
        self.student.set_password("student123")

        # Seed test warden
        self.warden = User(name="Test Warden", email="warden@test.edu", role="warden")
        self.warden.set_password("admin123")

        db.session.add_all([self.student, self.warden])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def login_student(self):
        self.client.get('/auth/logout', follow_redirects=True)
        return self.client.post('/auth/login', data={
            'email': 'student@test.edu',
            'password': 'student123',
            'role': 'student'
        }, follow_redirects=True)

    def login_warden(self):
        self.client.get('/auth/logout', follow_redirects=True)
        return self.client.post('/auth/login', data={
            'email': 'warden@test.edu',
            'password': 'admin123',
            'role': 'warden'
        }, follow_redirects=True)

    def test_authentication(self):
        # 1. Student login success
        res = self.login_student()
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'Alex' not in res.data, [True]) # Ensure logged in page loaded
        self.assertIn(b'Student Hub', res.data)

        # 2. Logout
        res = self.client.get('/auth/logout', follow_redirects=True)
        self.assertIn(b'Welcome to HostelPulse AI', res.data)

        # 3. Warden login success
        res = self.login_warden()
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'Warden Command Center', res.data)

    def test_role_access_control(self):
        # Student trying to access warden dashboard should be redirected
        self.login_student()
        res = self.client.get('/warden/dashboard', follow_redirects=True)
        self.assertIn(b'Student Hub', res.data)

    def test_maintenance_ticket_lifecycle(self):
        self.login_student()
        # Create ticket
        res = self.client.post('/student/tickets', data={
            'title': 'Test Light Flickering',
            'category': 'electrical',
            'priority': 'high',
            'description': 'Main fluorescent fixture in room 101 flickers continuously.'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)
        
        ticket = MaintenanceTicket.query.filter_by(title='Test Light Flickering').first()
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket.status, 'pending')

        # Warden updates ticket
        self.login_warden()
        res = self.client.post(f'/warden/tickets/{ticket.id}/update', data={
            'status': 'resolved',
            'technician_name': 'John Electrician',
            'technician_notes': 'Replaced ballast and starter.'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        updated_ticket = MaintenanceTicket.query.get(ticket.id)
        self.assertEqual(updated_ticket.status, 'resolved')
        self.assertEqual(updated_ticket.technician_name, 'John Electrician')

    def test_outpass_lifecycle(self):
        self.login_student()
        res = self.client.post('/student/outpass', data={
            'pass_type': 'day',
            'departure_time': '2026-09-25T10:00',
            'expected_return_time': '2026-09-25T18:00',
            'destination': 'Central University Library',
            'reason': 'Studying for upcoming exams.',
            'emergency_phone': '+1 (555) 123-4567'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        outpass = OutPass.query.filter_by(destination='Central University Library').first()
        self.assertIsNotNone(outpass)
        self.assertEqual(outpass.status, 'pending')

        # Warden approves pass
        self.login_warden()
        res = self.client.post(f'/warden/outpasses/{outpass.id}/review', data={
            'action': 'approve',
            'remarks': 'Approved. Safe travels.'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        updated_pass = OutPass.query.get(outpass.id)
        self.assertEqual(updated_pass.status, 'approved')

    def test_issue_reporting(self):
        self.login_student()
        res = self.client.post('/student/issues', data={
            'category': 'electricity_outage',
            'title': 'Hallway power tripped',
            'description': 'Main breaker tripped after thunderstorm.',
            'location': 'Block A Corridor',
            'urgency': 'critical'
        }, follow_redirects=True)
        self.assertEqual(res.status_code, 200)

        issue = IssueReport.query.filter_by(title='Hallway power tripped').first()
        self.assertIsNotNone(issue)
        self.assertEqual(issue.urgency, 'critical')

    def test_ml_forecaster(self):
        # 1. 24h Prediction
        pred_24h = forecaster.predict_next_24h(block='Hostel Wide', base_occupancy=0.85, base_temp=28.0)
        self.assertIn('hourly', pred_24h)
        self.assertEqual(len(pred_24h['hourly']), 24)
        self.assertGreater(pred_24h['total_24h_kwh'], 0)

        # 2. 7-Day Prediction
        pred_7d = forecaster.predict_next_7_days(block='Hostel Wide')
        self.assertEqual(len(pred_7d), 7)

        # 3. Anomaly Detection
        normal_check = forecaster.detect_anomaly(
            hour=14, day_of_week=2, is_weekend=0, occupancy_rate=0.4, temp=26.0, block_id=0, actual_kwh=10.0
        )
        self.assertIn('is_anomaly', normal_check)

    def test_ai_chatbot(self):
        # Curfew test
        curfew_res = ai_assistant.process_message("What time is curfew?")
        self.assertIn("09:30 PM", curfew_res['reply'])

        # Energy saving test
        energy_res = ai_assistant.process_message("How can I save electricity?")
        self.assertIn("24°C", energy_res['reply'])

        # Outpass test
        outpass_res = ai_assistant.process_message("How to apply for an outpass?")
        self.assertIn("Out-Pass", outpass_res['reply'])

    def test_api_endpoints(self):
        self.login_student()

        # Chat API
        chat_res = self.client.post('/api/chat', 
            data=json.dumps({'message': 'Tell me peak electricity hours'}),
            content_type='application/json'
        )
        self.assertEqual(chat_res.status_code, 200)
        data = json.loads(chat_res.data)
        self.assertIn('reply', data)

        # Forecast API
        fc_res = self.client.get('/api/forecast?block=Block+A&occupancy=0.8&temp=25&is_exam=0')
        self.assertEqual(fc_res.status_code, 200)
        fc_data = json.loads(fc_res.data)
        self.assertIn('forecast_24h', fc_data)
        self.assertIn('forecast_7d', fc_data)

if __name__ == '__main__':
    unittest.main()
