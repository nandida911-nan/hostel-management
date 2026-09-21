import os
from flask import Flask, redirect, url_for
from flask_login import LoginManager, current_user
from config import config
from .models import db, User

login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
        
    app = Flask(__name__)
    app.config.from_object(config.get(config_name, config['default']))
    
    # Ensure instance folder exists
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        pass
        
    db.init_app(app)
    login_manager.init_app(app)

    # Register blueprints
    from .routes.auth_routes import auth_bp
    from .routes.student_routes import student_bp
    from .routes.warden_routes import warden_bp
    from .routes.utility_routes import utility_bp
    from .routes.api_routes import api_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(student_bp, url_prefix='/student')
    app.register_blueprint(warden_bp, url_prefix='/warden')
    app.register_blueprint(utility_bp, url_prefix='/utility')
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.route('/')
    def index():
        if current_user.is_authenticated:
            if current_user.is_warden:
                return redirect(url_for('warden.dashboard'))
            return redirect(url_for('student.dashboard'))
        return redirect(url_for('auth.login'))

    # Global template context
    @app.context_processor
    def inject_globals():
        return {
            'app_name': 'HostelPulse AI',
            'app_tagline': 'Automated Utility Optimization & Resource Management'
        }

    return app
