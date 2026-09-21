from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from app.models import db, User, Room, MaintenanceTicket, OutPass, IssueReport, ElectricityLog, OptimizationAlert

warden_bp = Blueprint('warden', __name__)

@warden_bp.before_request
@login_required
def check_warden_role():
    if not current_user.is_warden:
        flash('Access restricted to wardens and administrators.', 'danger')
        return redirect(url_for('student.dashboard'))

@warden_bp.route('/dashboard')
def dashboard():
    total_students = User.query.filter_by(role='student').count()
    total_rooms = Room.query.count()
    total_capacity = db.session.query(db.func.sum(Room.capacity)).scalar() or 1
    
    occupied_beds = User.query.filter(User.role == 'student', User.room_id.isnot(None)).count()
    occupancy_pct = round((occupied_beds / max(total_capacity, 1)) * 100, 1)

    pending_tickets_count = MaintenanceTicket.query.filter_by(status='pending').count()
    critical_tickets_count = MaintenanceTicket.query.filter_by(priority='critical', status='pending').count()
    
    pending_outpasses_count = OutPass.query.filter_by(status='pending').count()
    students_out_count = OutPass.query.filter_by(status='approved').count()
    
    open_issues_count = IssueReport.query.filter_by(status='open').count()

    # Recent lists for quick action
    urgent_tickets = MaintenanceTicket.query.filter(MaintenanceTicket.status.in_(['pending', 'in_progress'])).order_by(MaintenanceTicket.created_at.desc()).limit(5).all()
    pending_outpasses = OutPass.query.filter_by(status='pending').order_by(OutPass.created_at.desc()).limit(5).all()
    recent_issues = IssueReport.query.filter_by(status='open').order_by(IssueReport.created_at.desc()).limit(5).all()

    # Electricity metrics estimate
    current_load_kw = 42.8
    monthly_power_kwh = 14250.0
    projected_bill = round(monthly_power_kwh * 0.15, 2)
    carbon_tonnes = round((monthly_power_kwh * 0.42) / 1000, 2)

    return render_template(
        'warden/dashboard.html',
        total_students=total_students,
        total_rooms=total_rooms,
        total_capacity=total_capacity,
        occupied_beds=occupied_beds,
        occupancy_pct=occupancy_pct,
        pending_tickets_count=pending_tickets_count,
        critical_tickets_count=critical_tickets_count,
        pending_outpasses_count=pending_outpasses_count,
        students_out_count=students_out_count,
        open_issues_count=open_issues_count,
        urgent_tickets=urgent_tickets,
        pending_outpasses=pending_outpasses,
        recent_issues=recent_issues,
        current_load_kw=current_load_kw,
        monthly_power_kwh=monthly_power_kwh,
        projected_bill=projected_bill,
        carbon_tonnes=carbon_tonnes
    )

@warden_bp.route('/rooms')
def rooms():
    block_filter = request.args.get('block', 'all')
    floor_filter = request.args.get('floor', 'all')
    status_filter = request.args.get('status', 'all')

    query = Room.query
    if block_filter != 'all':
        query = query.filter_by(block=block_filter)
    if floor_filter != 'all':
        query = query.filter_by(floor=int(floor_filter))
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)

    all_rooms = query.order_by(Room.block, Room.room_number).all()
    unallocated_students = User.query.filter_by(role='student', room_id=None).all()
    blocks = ['Block A', 'Block B', 'Block C']

    return render_template(
        'warden/rooms.html',
        rooms=all_rooms,
        unallocated_students=unallocated_students,
        blocks=blocks,
        block_filter=block_filter,
        floor_filter=floor_filter,
        status_filter=status_filter
    )

@warden_bp.route('/rooms/allocate', methods=['POST'])
def allocate_student():
    student_id = request.form.get('student_id')
    room_id = request.form.get('room_id')

    student = User.query.get_or_404(student_id)
    room = Room.query.get_or_404(room_id)

    if len(room.occupants) >= room.capacity:
        flash(f'Room {room.room_number} is already at full capacity ({room.capacity}).', 'danger')
        return redirect(url_for('warden.rooms'))

    student.room_id = room.id
    if len(room.occupants) + 1 >= room.capacity:
        room.status = 'full'
    db.session.commit()

    flash(f'Student {student.name} assigned to Room {room.room_number} ({room.block}).', 'success')
    return redirect(url_for('warden.rooms'))

@warden_bp.route('/rooms/deallocate/<int:student_id>', methods=['POST'])
def deallocate_student(student_id):
    student = User.query.get_or_404(student_id)
    room = student.room
    
    student.room_id = None
    if room and room.status == 'full':
        room.status = 'available'
    db.session.commit()

    flash(f'Removed {student.name} from Room {room.room_number if room else ""}.', 'info')
    return redirect(url_for('warden.rooms'))

@warden_bp.route('/rooms/create', methods=['POST'])
def create_room():
    room_number = request.form.get('room_number', '').strip()
    block = request.form.get('block', 'Block A')
    floor = int(request.form.get('floor', 1))
    capacity = int(request.form.get('capacity', 2))
    room_type = request.form.get('room_type', 'Double Standard')

    if not room_number:
        flash('Room number is required.', 'danger')
        return redirect(url_for('warden.rooms'))

    existing = Room.query.filter_by(room_number=room_number, block=block).first()
    if existing:
        flash(f'Room {room_number} in {block} already exists.', 'warning')
        return redirect(url_for('warden.rooms'))

    new_room = Room(
        room_number=room_number,
        block=block,
        floor=floor,
        capacity=capacity,
        room_type=room_type,
        status='available',
        daily_avg_kwh=round(2.5 * capacity, 1)
    )
    db.session.add(new_room)
    db.session.commit()

    flash(f'Room {room_number} in {block} added successfully.', 'success')
    return redirect(url_for('warden.rooms'))

@warden_bp.route('/tickets')
def tickets():
    status_filter = request.args.get('status', 'all')
    priority_filter = request.args.get('priority', 'all')
    category_filter = request.args.get('category', 'all')

    query = MaintenanceTicket.query
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    if priority_filter != 'all':
        query = query.filter_by(priority=priority_filter)
    if category_filter != 'all':
        query = query.filter_by(category=category_filter)

    all_tickets = query.order_by(MaintenanceTicket.created_at.desc()).all()
    return render_template(
        'warden/tickets.html',
        tickets=all_tickets,
        status_filter=status_filter,
        priority_filter=priority_filter,
        category_filter=category_filter
    )

@warden_bp.route('/tickets/<int:ticket_id>/update', methods=['POST'])
def update_ticket(ticket_id):
    ticket = MaintenanceTicket.query.get_or_404(ticket_id)
    
    new_status = request.form.get('status', ticket.status)
    technician_name = request.form.get('technician_name', ticket.technician_name)
    technician_notes = request.form.get('technician_notes', ticket.technician_notes)
    
    ticket.status = new_status
    ticket.technician_name = technician_name
    ticket.technician_notes = technician_notes

    if new_status == 'resolved' and not ticket.resolved_at:
        ticket.resolved_at = datetime.utcnow()

    db.session.commit()
    flash(f'Ticket {ticket.ticket_number} updated to {new_status.upper()}.', 'success')
    return redirect(url_for('warden.tickets'))

@warden_bp.route('/outpasses')
def outpasses():
    status_filter = request.args.get('status', 'pending')
    query = OutPass.query
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)

    passes = query.order_by(OutPass.created_at.desc()).all()
    currently_outside = OutPass.query.filter_by(status='approved').all()

    return render_template(
        'warden/outpasses.html',
        passes=passes,
        currently_outside=currently_outside,
        status_filter=status_filter
    )

@warden_bp.route('/outpasses/<int:pass_id>/review', methods=['POST'])
def review_outpass(pass_id):
    outpass = OutPass.query.get_or_404(pass_id)
    action = request.form.get('action') # 'approve' or 'reject' or 'checkin'
    remarks = request.form.get('remarks', '').strip()

    if action == 'approve':
        outpass.status = 'approved'
        outpass.reviewed_by_id = current_user.id
        outpass.reviewed_at = datetime.utcnow()
        outpass.warden_remarks = remarks or 'Approved by Warden office.'
        flash(f'Out-Pass {outpass.pass_number} approved for {outpass.student.name}.', 'success')
    elif action == 'reject':
        outpass.status = 'rejected'
        outpass.reviewed_by_id = current_user.id
        outpass.reviewed_at = datetime.utcnow()
        outpass.warden_remarks = remarks or 'Declined by Warden.'
        flash(f'Out-Pass {outpass.pass_number} rejected.', 'warning')
    elif action == 'checkin':
        outpass.status = 'completed'
        outpass.actual_return_time = datetime.utcnow()
        flash(f'Student {outpass.student.name} marked checked back into the hostel.', 'info')

    db.session.commit()
    return redirect(url_for('warden.outpasses'))

@warden_bp.route('/issues')
def issues():
    status_filter = request.args.get('status', 'all')
    query = IssueReport.query
    if status_filter != 'all':
        query = query.filter_by(status=status_filter)

    all_issues = query.order_by(IssueReport.created_at.desc()).all()
    return render_template('warden/issues.html', issues=all_issues, status_filter=status_filter)

@warden_bp.route('/issues/<int:issue_id>/resolve', methods=['POST'])
def resolve_issue(issue_id):
    issue = IssueReport.query.get_or_404(issue_id)
    status = request.form.get('status', 'resolved')
    response = request.form.get('response', '').strip()

    issue.status = status
    issue.warden_response = response
    if status == 'resolved':
        issue.resolved_at = datetime.utcnow()

    db.session.commit()
    flash(f'Issue "{issue.title}" updated.', 'success')
    return redirect(url_for('warden.issues'))
