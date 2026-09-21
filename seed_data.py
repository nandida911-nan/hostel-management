import os
from datetime import datetime, timedelta
import random
from app import create_app
from app.models import db, User, Room, MaintenanceTicket, OutPass, IssueReport, ElectricityLog, OptimizationAlert
from app.ml_engine import forecaster

def seed_database():
    app = create_app()
    with app.app_context():
        print("[SETUP] Dropping and recreating database schema...")
        db.drop_all()
        db.create_all()

        print("[ROOMS] Seeding hostel rooms...")
        rooms = [
            # Block A
            Room(room_number="101", block="Block A", floor=1, capacity=2, room_type="Double Standard", status="full", daily_avg_kwh=4.8),
            Room(room_number="102", block="Block A", floor=1, capacity=2, room_type="Double Standard", status="available", daily_avg_kwh=4.1),
            Room(room_number="103", block="Block A", floor=1, capacity=1, room_type="Single AC", status="available", daily_avg_kwh=5.5),
            Room(room_number="201", block="Block A", floor=2, capacity=2, room_type="Double Standard", status="available", daily_avg_kwh=4.2),
            Room(room_number="202", block="Block A", floor=2, capacity=3, room_type="Triple Studio", status="available", daily_avg_kwh=6.2),
            Room(room_number="301", block="Block A", floor=3, capacity=2, room_type="Double Standard", status="maintenance", daily_avg_kwh=1.0),
            
            # Block B
            Room(room_number="101", block="Block B", floor=1, capacity=2, room_type="Double Standard", status="available", daily_avg_kwh=4.4),
            Room(room_number="102", block="Block B", floor=1, capacity=2, room_type="Double Standard", status="available", daily_avg_kwh=4.0),
            Room(room_number="201", block="Block B", floor=2, capacity=1, room_type="Single AC", status="available", daily_avg_kwh=5.1),
            Room(room_number="202", block="Block B", floor=2, capacity=2, room_type="Double Standard", status="available", daily_avg_kwh=4.3),
            
            # Block C
            Room(room_number="101", block="Block C", floor=1, capacity=2, room_type="Double Standard", status="available", daily_avg_kwh=3.9),
            Room(room_number="201", block="Block C", floor=2, capacity=3, room_type="Triple Studio", status="available", daily_avg_kwh=6.0)
        ]
        db.session.add_all(rooms)
        db.session.commit()

        print("[USERS] Seeding default users (Warden & Students)...")
        # 1. Chief Warden
        warden = User(
            name="Dr. Arthur Vance",
            email="warden@hostel.edu",
            role="warden",
            phone="+1 (555) 019-5500"
        )
        warden.set_password("admin123")

        # 2. Main Demo Student
        student1 = User(
            name="Nandida K",
            email="student@hostel.edu",
            role="student",
            phone="+1 (555) 019-1122",
            student_id_num="STU-2024-001",
            room_id=rooms[0].id # Room 101 Block A
        )
        student1.set_password("student123")

        # 3. Roommate in 101
        student2 = User(
            name="Rohan Sharma",
            email="rohan@hostel.edu",
            role="student",
            phone="+1 (555) 019-3344",
            student_id_num="STU-2024-002",
            room_id=rooms[0].id
        )
        student2.set_password("pass123")

        # 4. Student in Block B
        student3 = User(
            name="Priya Patel",
            email="priya@hostel.edu",
            role="student",
            phone="+1 (555) 019-7788",
            student_id_num="STU-2024-008",
            room_id=rooms[8].id # Room 201 Block B
        )
        student3.set_password("pass123")

        # 5. Unallocated student looking for a room
        student4 = User(
            name="Marcus Chen",
            email="marcus@hostel.edu",
            role="student",
            phone="+1 (555) 019-9900",
            student_id_num="STU-2024-015",
            room_id=None
        )
        student4.set_password("pass123")

        db.session.add_all([warden, student1, student2, student3, student4])
        db.session.commit()

        print("[TICKETS] Seeding maintenance tickets...")
        tickets = [
            MaintenanceTicket(
                ticket_number="TCK-94812",
                student_id=student1.id,
                room_id=rooms[0].id,
                category="electrical",
                title="Study desk dual socket sparking intermittently",
                description="When plugging in laptop charger into the left wall socket, small sparks and crackling sounds occur.",
                priority="high",
                status="in_progress",
                technician_name="Mike Henderson (Electrician)",
                technician_notes="Inspected switchboard; replacing 16A socket and ground wiring today.",
                created_at=datetime.utcnow() - timedelta(hours=14)
            ),
            MaintenanceTicket(
                ticket_number="TCK-81204",
                student_id=student1.id,
                room_id=rooms[0].id,
                category="ac_cooling",
                title="AC unit fan rattling noise on high speed",
                description="The air conditioning unit makes a loud vibrating noise when set above medium blower speed.",
                priority="medium",
                status="resolved",
                technician_name="Dave Miller (HVAC)",
                technician_notes="Cleaned blower filter and tightened loose fan housing. Operational and running quietly.",
                created_at=datetime.utcnow() - timedelta(days=2),
                resolved_at=datetime.utcnow() - timedelta(hours=6)
            ),
            MaintenanceTicket(
                ticket_number="TCK-72911",
                student_id=student3.id,
                room_id=rooms[8].id,
                category="wifi_network",
                title="Weak WiFi signal in East Wing Room 201",
                description="Frequent packet drops during online lectures and downloads.",
                priority="medium",
                status="pending",
                created_at=datetime.utcnow() - timedelta(hours=5)
            ),
            MaintenanceTicket(
                ticket_number="TCK-60319",
                student_id=student2.id,
                room_id=rooms[0].id,
                category="furniture",
                title="Wardrobe bottom drawer track misaligned",
                description="The drawer gets stuck when pulling out and needs track realigning.",
                priority="low",
                status="pending",
                created_at=datetime.utcnow() - timedelta(days=1)
            )
        ]
        db.session.add_all(tickets)
        db.session.commit()

        print("[OUTPASS] Seeding out-passes...")
        now = datetime.utcnow()
        outpasses = [
            OutPass(
                pass_number="PASS-48291",
                student_id=student1.id,
                pass_type="weekend",
                departure_time=now + timedelta(days=1, hours=2),
                expected_return_time=now + timedelta(days=3, hours=4),
                destination="Hometown - Family Visit",
                reason="Attending sister's graduation ceremony and visiting family for the weekend.",
                emergency_phone="+1 (555) 987-6543",
                status="approved",
                warden_remarks="Approved. Ensure return before Sunday 09:30 PM curfew.",
                reviewed_by_id=warden.id,
                reviewed_at=now - timedelta(hours=3),
                created_at=now - timedelta(hours=8)
            ),
            OutPass(
                pass_number="PASS-31902",
                student_id=student3.id,
                pass_type="emergency",
                departure_time=now - timedelta(hours=12),
                expected_return_time=now + timedelta(hours=6),
                destination="City Health Diagnostic Center",
                reason="Scheduled medical consultation and blood testing.",
                emergency_phone="+1 (555) 432-1098",
                status="approved",
                warden_remarks="Emergency medical leave granted.",
                reviewed_by_id=warden.id,
                reviewed_at=now - timedelta(hours=11),
                created_at=now - timedelta(hours=14)
            ),
            OutPass(
                pass_number="PASS-90412",
                student_id=student2.id,
                pass_type="day",
                departure_time=now + timedelta(hours=4),
                expected_return_time=now + timedelta(hours=9),
                destination="Central Public Library & Tech Expo",
                reason="Research reference books for final year project.",
                emergency_phone="+1 (555) 345-6789",
                status="pending",
                created_at=now - timedelta(minutes=45)
            )
        ]
        db.session.add_all(outpasses)
        db.session.commit()

        print("[ISSUES] Seeding grievance & issue reports...")
        issues = [
            IssueReport(
                student_id=student1.id,
                category="electricity_outage",
                title="Corridor illumination flickering on 2nd Floor Block A",
                description="Three fluorescent tubes in the northern corridor are flickering continuously and creating a buzzing sound.",
                location="Block A, 2nd Floor North Corridor",
                urgency="urgent",
                status="under_review",
                warden_response="Electrical team informed. Replacement LED fixtures queued for morning maintenance cycle.",
                created_at=now - timedelta(hours=18)
            ),
            IssueReport(
                student_id=student3.id,
                category="noise_complaint",
                title="Loud music from common recreation lounge after 11 PM",
                description="Group gathering playing loud games past designated quiet hours.",
                location="Block B Ground Floor Lounge",
                urgency="normal",
                status="open",
                created_at=now - timedelta(hours=4)
            )
        ]
        db.session.add_all(issues)
        db.session.commit()

        print("[UTILITY] Seeding electricity telemetry & anomalies...")
        blocks = ['Block A', 'Block B', 'Block C']
        for i in range(24):
            t = now - timedelta(hours=24 - i)
            hour = t.hour
            is_peak = (18 <= hour <= 23) or (6 <= hour <= 8)
            
            for b in blocks:
                base = 18.0 if is_peak else 8.5
                kwh = round(base + random.uniform(-1.5, 2.5), 2)
                peak_kw = round(kwh * 1.8, 1)
                
                # Introduce one real anomaly in Block B
                is_anom = (b == 'Block B' and i == 20)
                if is_anom:
                    kwh = 38.4
                    peak_kw = 58.2
                    reason = "Critical Surge: Unregistered 2200W electric heating element detected in Block B."
                else:
                    reason = None

                log = ElectricityLog(
                    timestamp=t,
                    block=b,
                    energy_kwh=kwh,
                    peak_load_kw=peak_kw,
                    voltage_v=round(random.uniform(228, 232), 1),
                    power_factor=round(random.uniform(0.93, 0.98), 2),
                    cost_estimate=round(kwh * 0.15, 2),
                    carbon_kg=round(kwh * 0.42, 2),
                    is_anomaly=is_anom,
                    anomaly_score=0.82 if is_anom else 0.05,
                    anomaly_reason=reason
                )
                db.session.add(log)

        db.session.commit()

        print("[ML] Ensuring ML model is trained and ready...")
        forecaster._ensure_models_trained()
        print("[SUCCESS] Database successfully seeded and ML models ready!")

if __name__ == '__main__':
    seed_database()
