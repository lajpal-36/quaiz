from flask import Flask
from flask_jwt_extended import JWTManager

from src.config import Config
from src.database import db

from src.routes.auth import auth_bp
from src.routes.admin import admin_bp
from src.routes.teacher import teacher_bp
from src.routes.student import student_bp
from src.routes.result import result_bp

jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(result_bp)

    return app
