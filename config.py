import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'default-fallback-secret-key-3849182'
    
    # Handle database url for render/railway (which might start with postgres://)
    db_url = os.environ.get('DATABASE_URL')
    if db_url and db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = db_url or f"sqlite:///{os.path.join(basedir, 'instance', 'hostel.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # ML model storage
    ML_MODEL_PATH = os.path.join(basedir, 'app', 'ml_engine', 'models')
    
    # Hostel Specific Constants
    TARIFF_PER_KWH = 0.15  # standard average tariff ($ / ₹ per kWh)
    CO2_KG_PER_KWH = 0.42  # standard grid carbon factor
    DAILY_ROOM_ALLOWANCE_KWH = 6.0  # target daily consumption quota per room

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
