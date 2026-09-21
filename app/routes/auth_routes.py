from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from app.models import db, User, Room

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        if current_user.is_warden:
            return redirect(url_for('warden.dashboard'))
        return redirect(url_for('student.dashboard'))

    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        role = request.form.get('role', 'student')

        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            if user.role != role:
                flash(f'Account exists, but your selected role ({role.capitalize()}) does not match your account profile ({user.role.capitalize()}).', 'warning')
                return render_template('auth/login.html', email=email, role=role)

            login_user(user, remember=True)
            flash(f'Welcome back, {user.name}!', 'success')
            
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)

            if user.is_warden:
                return redirect(url_for('warden.dashboard'))
            return redirect(url_for('student.dashboard'))
        else:
            flash('Invalid email address or password. Please check your credentials.', 'danger')

    return render_template('auth/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        confirm_password = request.form.get('confirm_password', '').strip()
        role = request.form.get('role', 'student')
        phone = request.form.get('phone', '').strip()
        student_id_num = request.form.get('student_id_num', '').strip() if role == 'student' else None

        if not name or not email or not password:
            flash('Please fill in all mandatory fields.', 'danger')
            return render_template('auth/register.html')

        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('auth/register.html', name=name, email=email, phone=phone, role=role)

        if len(password) < 6:
            flash('Password must be at least 6 characters long.', 'danger')
            return render_template('auth/register.html', name=name, email=email, phone=phone, role=role)

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash('An account with this email address already exists. Please log in.', 'warning')
            return redirect(url_for('auth.login'))

        user = User(
            name=name,
            email=email,
            role=role,
            phone=phone,
            student_id_num=student_id_num
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        flash(f'Registration successful! You may now log in as {role.capitalize()}.', 'success')
        return redirect(url_for('auth.login'))

    return render_template('auth/register.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been securely logged out.', 'info')
    return redirect(url_for('auth.login'))

@auth_bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        current_user.name = request.form.get('name', current_user.name).strip()
        current_user.phone = request.form.get('phone', current_user.phone).strip()
        if current_user.is_student:
            current_user.student_id_num = request.form.get('student_id_num', current_user.student_id_num).strip()
            
        new_password = request.form.get('new_password', '').strip()
        if new_password:
            if len(new_password) >= 6:
                current_user.set_password(new_password)
                flash('Password updated successfully.', 'success')
            else:
                flash('Password must be at least 6 characters.', 'danger')
                return render_template('auth/profile.html')
                
        db.session.commit()
        flash('Profile updated successfully.', 'success')
        return redirect(url_for('auth.profile'))
        
    return render_template('auth/profile.html')
