import re
from datetime import datetime

class HostelAIAssistant:
    """Intelligent AI Chatbot Assistant for the Hostel Management System."""

    def __init__(self):
        self.rules_knowledge = {
            'curfew': "Hostel main gates close promptly at 09:30 PM on weekdays and 10:00 PM on weekends. All students must scan their ID or approved Out-Pass with security before this time.",
            'outpass': "Out-Passes must be requested at least 4 hours in advance via the 'Out-Pass Management' tab. Once approved by the Warden, a digital pass with verification QR token is generated.",
            'maintenance': "For electrical, AC, appliance, furniture, or WiFi issues, submit a ticket in the 'Maintenance Tickets' section. Critical issues (e.g., spark, blackout) are prioritized for emergency repair within 2 hours.",
            'electricity': "Hostel peak electricity hours are 06:00 AM - 08:30 AM and 06:00 PM - 11:30 PM. Turning off ACs when leaving rooms and setting thermostats to 24°C saves up to 20% power.",
            'emergency': "Hostel Security Desk: +1 (555) 019-2834 | Chief Warden Office: +1 (555) 019-5500 | Campus Medical Clinic: +1 (555) 019-9111"
        }

    def process_message(self, message, user=None):
        msg = message.lower().strip()
        
        # 1. Outpass Intent
        if any(w in msg for w in ['outpass', 'out pass', 'gate pass', 'leave hostel', 'go home', 'curfew', 'night out']):
            if 'how' in msg or 'apply' in msg or 'request' in msg:
                return {
                    'reply': "To request an Out-Pass, navigate to **Out-Pass Management** from your sidebar, click **Request Out-Pass**, specify your departure and expected return times, reason, and emergency contact number. The warden will review and approve it.",
                    'suggestions': ['Check outpass status', 'What is curfew time?', 'Emergency pass info']
                }
            elif 'curfew' in msg or 'time' in msg:
                return {
                    'reply': f"🕒 **Hostel Gate Timings:** {self.rules_knowledge['curfew']}",
                    'suggestions': ['How to apply for outpass?', 'Request emergency leave']
                }
            elif user and user.is_student:
                from app.models import OutPass
                recent_pass = user.outpasses.order_by(OutPass.created_at.desc()).first()
                if recent_pass:
                    return {
                        'reply': f"Your latest Out-Pass (**{recent_pass.pass_number}**) to **{recent_pass.destination}** is currently **{recent_pass.status.upper()}**. Departure: {recent_pass.departure_time.strftime('%b %d, %H:%M')}.",
                        'suggestions': ['View all outpasses', 'Curfew rules', 'Contact warden']
                    }
                else:
                    return {
                        'reply': "You do not have any recent Out-Pass requests. You can create one anytime under the 'Out-Pass Management' tab.",
                        'suggestions': ['Apply for Out-Pass', 'Curfew guidelines']
                    }
            else:
                return {
                    'reply': f"Out-Pass System: Students can apply online for Day, Weekend, or Emergency passes. Wardens can review and approve them in real-time.",
                    'suggestions': ['How to apply?', 'Curfew timings']
                }

        # 2. Electricity & Energy Optimization Intent
        if any(w in msg for w in ['electricity', 'energy', 'power', 'kwh', 'bill', 'peak', 'saving', 'carbon', 'solar', 'optimize']):
            if 'peak' in msg:
                return {
                    'reply': "⚡ **Peak Energy Hours:** Peak loads occur between **06:00 - 08:30 AM** and **18:00 - 23:30 PM**. During these times, our ML optimizer advises students to avoid high-wattage personal equipment (heaters/irons) to prevent grid surcharges.",
                    'suggestions': ['How to save power?', 'View utility analytics', 'Predict tomorrow load']
                }
            elif 'save' in msg or 'tip' in msg or 'reduce' in msg:
                return {
                    'reply': "💡 **Smart Energy Saving Tips:**\n1. Keep AC set to 24°C instead of 18°C (saves ~18% electricity)\n2. Switch off idle laptop chargers and study lamps when leaving\n3. Use natural daylight during peak daytime hours\n4. Report faulty switchboards or flickering lights immediately to prevent phantom power drain.",
                    'suggestions': ['View electricity dashboard', 'Report electrical issue', 'Check peak hours']
                }
            elif 'predict' in msg or 'forecast' in msg or 'ml' in msg:
                return {
                    'reply': "📈 Our AI/ML predictive system uses a **RandomForest Regressor** and **Isolation Forest** to forecast electricity consumption 24 hours and 7 days ahead, while identifying abnormal power surges in real time! Check out the **Utility Management** tab.",
                    'suggestions': ['View ML predictions', 'Electricity tips', 'Hostel peak hours']
                }
            else:
                return {
                    'reply': "⚡ The hostel is equipped with smart energy telemetry tracking real-time load, projected cost, and carbon footprint. You can view comprehensive charts under **Electricity Management**.",
                    'suggestions': ['Peak electricity hours', 'Tips to save power', 'Predict electricity demand']
                }

        # 3. Maintenance Ticket Intent
        if any(w in msg for w in ['ticket', 'maintenance', 'repair', 'broken', 'fix', 'fan', 'light', 'ac', 'cooler', 'door', 'lock', 'wifi', 'internet']):
            if 'how' in msg or 'submit' in msg or 'report' in msg or 'new' in msg:
                return {
                    'reply': "🔧 To report a repair need, click on **Maintenance Tickets** -> **New Ticket**. Choose the appropriate category (Electrical, AC/Cooling, Appliances, Furniture, WiFi, Door/Lock) and submit a description. Urgent repairs are prioritized automatically!",
                    'suggestions': ['Check ticket status', 'Report AC issue', 'WiFi problem']
                }
            elif user and user.is_student:
                from app.models import MaintenanceTicket
                recent_ticket = user.tickets.order_by(MaintenanceTicket.created_at.desc()).first()
                if recent_ticket:
                    return {
                        'reply': f"Your latest ticket (**{recent_ticket.ticket_number}**: {recent_ticket.title}) is **{recent_ticket.status.upper()}** (Priority: {recent_ticket.priority.capitalize()}).",
                        'suggestions': ['Submit new ticket', 'Report urgent issue', 'Hostel emergency contact']
                    }
                else:
                    return {
                        'reply': "You currently have no open maintenance tickets. If anything in your room needs fixing, open a ticket under 'Maintenance Tickets'.",
                        'suggestions': ['Submit ticket', 'Emergency contacts']
                    }
            else:
                return {
                    'reply': "🔧 All maintenance requests (Electrical, Appliances, AC, Furniture, WiFi, Doors) are tracked in real-time. Students can log requests, and Wardens assign technicians and track resolution.",
                    'suggestions': ['Submit a ticket', 'Emergency contacts']
                }

        # 4. Room Allocation Intent
        if any(w in msg for w in ['room', 'booking', 'allocate', 'allocation', 'bed', 'floor', 'block', 'roommate']):
            if user and user.is_student:
                if user.room:
                    return {
                        'reply': f"🏠 You are currently assigned to **Room {user.room.room_number}** in **{user.room.block}** (Floor {user.room.floor}). Room Type: {user.room.room_type}. If you wish to request a room transfer, please consult the Warden.",
                        'suggestions': ['View room details', 'Roommate info', 'Contact warden']
                    }
                else:
                    return {
                        'reply': "🏠 You haven't been assigned to a room yet! Visit **Room Booking** in your sidebar to browse available rooms and submit an allocation request.",
                        'suggestions': ['Browse available rooms', 'Contact warden']
                    }
            else:
                return {
                    'reply': "🏠 Room Management: Wardens can manage room allocations, view block capacities, adjust status, and assign students under the **Room Allocation** dashboard.",
                    'suggestions': ['View room grid', 'Check available slots']
                }

        # 5. Urgent Issue / Safety
        if any(w in msg for w in ['issue', 'complaint', 'grievance', 'noise', 'disturbance', 'danger', 'safety', 'emergency']):
            return {
                'reply': f"⚠️ For urgent safety or facility concerns, use the **Issue Reporting** tab to alert hostel authorities directly. For immediate emergencies:\n📞 {self.rules_knowledge['emergency']}",
                'suggestions': ['Report an issue', 'Call security', 'Curfew rules']
            }

        # 6. General Greetings & Help
        if any(w in msg for w in ['hello', 'hi', 'hey', 'start', 'help', 'what can you do']):
            greeting = f"Hello {user.name if user else 'there'}! 👋 I am **EcoHostel AI**, your automated hostel assistant."
            return {
                'reply': f"{greeting}\n\nI can assist you with:\n- ⚡ **Electricity Optimization** & peak load forecast\n- 🚪 **Out-Pass requests** and curfew guidelines\n- 🔧 **Maintenance tickets** & repair updates\n- 🏠 **Room allocation** information\n- ⚠️ **Issue reporting** & emergency contacts\n\nHow can I help you today?",
                'suggestions': ['Out-pass rules', 'Electricity tips', 'Submit a maintenance ticket', 'Check curfew time']
            }

        # Fallback default response
        return {
            'reply': "I understand you have a question regarding hostel operations. Could you specify whether you need help with **Electricity Optimization**, **Out-Passes**, **Maintenance Tickets**, or **Room Allocation**?",
            'suggestions': ['Curfew and Out-pass rules', 'Electricity tips', 'Submit maintenance ticket', 'Room allocation status']
        }


# Global AI Assistant instance
ai_assistant = HostelAIAssistant()
