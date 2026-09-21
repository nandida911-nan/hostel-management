from datetime import datetime, timedelta
import random
from flask import Blueprint, render_template, redirect, url_for, flash, request, abort
from flask_login import login_required, current_user
from app.models import db, Room, MaintenanceTicket, OutPass, IssueReport, ElectricityLog

student_bp = Blueprint('student', __name__)

@student_bp.before_request
@login_required
def check_student_role():
    if not current_user.is_student:
        flash('Access restricted to students.', 'warning')
        return redirect(url_for('warden.dashboard'))

@student_bp.route('/dashboard')
def dashboard():
    # Student overview
    room = current_user.room
    roommates = [u for u in room.occupants if u.id != current_user.id] if room else []
    
    # Active tickets
    tickets = current_user.tickets.order_by(MaintenanceTicket.created_at.desc()).limit(5).all()
    open_tickets_count = current_user.tickets.filter(MaintenanceTicket.status.in_(['pending', 'in_progress'])).count()
    
    # Recent Outpass
    recent_outpass = current_user.outpasses.order_by(OutPass.created_at.desc()).first()
    recent_outpasses = current_user.outpasses.order_by(OutPass.created_at.desc()).limit(3).all()
    active_outpasses_count = current_user.outpasses.filter(OutPass.status == 'approved').count()
    
    # Issues
    issues = current_user.issues.order_by(IssueReport.created_at.desc()).limit(5).all()

    # Room utility metrics
    daily_usage = room.daily_avg_kwh if room else 3.8
    monthly_estimate = round(daily_usage * 30, 1)
    cost_estimate = round(monthly_estimate * 0.15, 2)
    carbon_estimate = round(daily_usage * 0.42, 2)
    
    # Energy rating (A to D based on usage vs benchmark 6.0 kWh)
    if daily_usage < 4.0:
        energy_rating = 'A+'
        rating_color = 'emerald'
    elif daily_usage < 5.5:
        energy_rating = 'B'
        rating_color = 'blue'
    elif daily_usage < 7.0:
        energy_rating = 'C'
        rating_color = 'amber'
    else:
        energy_rating = 'D'
        rating_color = 'rose'

    return render_template(
        'student/dashboard.html',
        room=room,
        roommates=roommates,
        tickets=tickets,
        open_tickets_count=open_tickets_count,
        recent_outpass=recent_outpass,
        recent_outpasses=recent_outpasses,
        active_outpasses_count=active_outpasses_count,
        issues=issues,
        daily_usage=daily_usage,
        monthly_estimate=monthly_estimate,
        cost_estimate=cost_estimate,
        carbon_estimate=carbon_estimate,
        energy_rating=energy_rating,
        rating_color=rating_color
    )

@student_bp.route('/room')
def room_view():
    room = current_user.room
    roommates = [u for u in room.occupants if u.id != current_user.id] if room else []
    
    # If no room, list available rooms for booking request
    available_rooms = []
    if not room:
        available_rooms = Room.query.filter_by(status='available').all()
        available_rooms = [r for r in available_rooms if len(r.occupants) < r.capacity]
        
    return render_template('student/room.html', room=room, roommates=roommates, available_rooms=available_rooms)

@student_bp.route('/room/book', methods=['POST'])
def book_room():
    if current_user.room:
        flash('You are already allocated to a room. Please contact the warden to request a room change.', 'info')
        return redirect(url_for('student.room_view'))
        
    room_id = request.form.get('room_id')
    room = Room.query.get_or_404(room_id)
    
    if len(room.occupants) >= room.capacity:
        flash('Sorry, this room has just reached maximum capacity.', 'danger')
        return redirect(url_for('student.room_view'))
        
    current_user.room_id = room.id
    if len(room.occupants) + 1 >= room.capacity:
        room.status = 'full'
    db.session.commit()
    
    flash(f'Successfully booked Room {room.room_number} in {room.block}!', 'success')
    return redirect(url_for('student.room_view'))

@student_bp.route('/tickets', methods=['GET', 'POST'])
def tickets():
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        category = request.form.get('category', 'electrical')
        priority = request.form.get('priority', 'medium')
        description = request.form.get('description', '').strip()
        
        # Guard against food/water categories
        if any(w in category.lower() for w in ['water', 'food', 'mess', 'plumbing']):
            category = 'appliances'

        if not title or not description:
            flash('Please provide both a title and description for the ticket.', 'danger')
            return redirect(url_for('student.tickets'))

        ticket_number = f"TCK-{random.randint(10000, 99999)}"
        ticket = MaintenanceTicket(
            ticket_number=ticket_number,
            student_id=current_user.id,
            room_id=current_user.room_id,
            category=category,
            title=title,
            description=description,
            priority=priority,
            status='pending'
        )
        db.session.add(ticket)
        db.session.commit()
        
        flash(f'Maintenance Ticket {ticket_number} created successfully!', 'success')
        return redirect(url_for('student.tickets'))

    status_filter = request.args.get('status', 'all')
    query = current_user.tickets.order_by(MaintenanceTicket.created_at.desc())
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
        
    all_tickets = query.all()
    return render_template('student/tickets.html', tickets=all_tickets, status_filter=status_filter)

@student_bp.route('/outpass', methods=['GET', 'POST'])
def outpass():
    if request.method == 'POST':
        pass_type = request.form.get('pass_type', 'day')
        departure_str = request.form.get('departure_time')
        return_str = request.form.get('expected_return_time')
        destination = request.form.get('destination', '').strip()
        reason = request.form.get('reason', '').strip()
        emergency_phone = request.form.get('emergency_phone', '').strip()

        if not (departure_str and return_str and destination and reason and emergency_phone):
            flash('Please fill in all the required out-pass fields.', 'danger')
            return redirect(url_for('student.outpass'))

        try:
            departure_time = datetime.strptime(departure_str, '%Y-%m-%dT%H:%M')
            expected_return_time = datetime.strptime(return_str, '%Y-%m-%dT%H:%M')
        except ValueError:
            flash('Invalid date or time format submitted.', 'danger')
            return redirect(url_for('student.outpass'))

        if expected_return_time <= departure_time:
            flash('Return time must be after the departure time.', 'danger')
            return redirect(url_for('student.outpass'))

        pass_number = f"PASS-{random.randint(10000, 99999)}"
        new_pass = OutPass(
            pass_number=pass_number,
            student_id=current_user.id,
            pass_type=pass_type,
            departure_time=departure_time,
            expected_return_time=expected_return_time,
            destination=destination,
            reason=reason,
            emergency_phone=emergency_phone,
            status='pending'
        )
        db.session.add(new_pass)
        db.session.commit()

        flash(f'Out-Pass application {pass_number} submitted! Pending warden approval.', 'success')
        return redirect(url_for('student.outpass'))

    passes = current_user.outpasses.order_by(OutPass.created_at.desc()).all()
    return render_template('student/outpass.html', passes=passes)

@student_bp.route('/outpass/<int:pass_id>')
def view_pass_card(pass_id):
    outpass = OutPass.query.filter_by(id=pass_id, student_id=current_user.id).first_or_404()
    return render_template('student/pass_card.html', outpass=outpass)

@student_bp.route('/issues', methods=['GET', 'POST'])
def issues():
    if request.method == 'POST':
        category = request.form.get('category', 'electricity_outage')
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        location = request.form.get('location', '').strip()
        urgency = request.form.get('urgency', 'normal')

        # Guard against water/food
        if any(w in category.lower() for w in ['water', 'food', 'mess']):
            category = 'facility_damage'

        if not (title and description and location):
            flash('Please complete all fields for the issue report.', 'danger')
            return redirect(url_for('student.issues'))

        issue = IssueReport(
            student_id=current_user.id,
            category=category,
            title=title,
            description=description,
            location=location,
            urgency=urgency,
            status='open'
        )
        db.session.add(issue)
        db.session.commit()

        flash('Issue reported successfully. The administration has been notified.', 'success')
        return redirect(url_for('student.issues'))

    my_issues = current_user.issues.order_by(IssueReport.created_at.desc()).all()
    return render_template('student/issues.html', issues=my_issues)

@student_bp.route('/utility')
def utility():
    room = current_user.room
    daily_usage = room.daily_avg_kwh if room else 4.2
    
    # 7-day room simulation
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    random.seed(42 + (room.id if room else 1))
    weekly_usage = [round(daily_usage * random.uniform(0.85, 1.25), 1) for _ in range(7)]
    
    return render_template('student/utility.html', room=room, days=days, weekly_usage=weekly_usage, daily_usage=daily_usage)
