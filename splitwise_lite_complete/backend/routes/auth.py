
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from extensions import db
from models import User
import re

auth_bp = Blueprint("auth", __name__)

def valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    if not valid_email(data.get("email","")):
        return jsonify({"error":"Invalid email"}),400
    if len(data.get("password","")) < 8:
        return jsonify({"error":"Password must be at least 8 characters"}),400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error":"Email exists"}),400

    user = User(
        email=data["email"],
        name=data.get("name"),
        password_hash=generate_password_hash(data["password"])
    )

    db.session.add(user)
    db.session.commit()
    return jsonify({"message":"registered"})

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    user = User.query.filter_by(email=data.get("email", "")).first()

    if not user or not check_password_hash(user.password_hash, data.get("password", "")):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "name": user.name, "email": user.email, "id": user.id})


@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "logged out"})
