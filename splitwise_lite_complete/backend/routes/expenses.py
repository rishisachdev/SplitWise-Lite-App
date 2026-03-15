from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Expense, VALID_CATEGORIES
from decimal import Decimal, InvalidOperation
from datetime import datetime

expenses_bp = Blueprint("expenses", __name__)


def validate_expense_data(data, partial=False):
    errors = []
    if not partial or "title" in data:
        title = data.get("title", "")
        if not title or not str(title).strip():
            errors.append("Title is required")
    if not partial or "amount" in data:
        try:
            amount = Decimal(str(data.get("amount", "")))
            if amount <= 0:
                errors.append("Amount must be greater than zero")
        except (InvalidOperation, TypeError):
            errors.append("Amount must be a valid number")
    if not partial or "category" in data:
        if data.get("category") not in VALID_CATEGORIES:
            errors.append(f"Category must be one of: {', '.join(VALID_CATEGORIES)}")
    if not partial or "date" in data:
        try:
            datetime.strptime(data.get("date", ""), "%Y-%m-%d")
        except (ValueError, TypeError):
            errors.append("Date must be in YYYY-MM-DD format")
    return errors


@expenses_bp.route("", methods=["GET"])
@jwt_required()
def list_expenses():
    uid = int(get_jwt_identity())
    q = Expense.query.filter_by(user_id=uid)

    start = request.args.get("start")
    end = request.args.get("end")
    category = request.args.get("category")

    if start:
        q = q.filter(Expense.date >= start)
    if end:
        q = q.filter(Expense.date <= end)
    if category:
        if category not in VALID_CATEGORIES:
            return jsonify({"error": f"Invalid category"}), 400
        q = q.filter_by(category=category)

    items = q.order_by(Expense.date.desc()).all()
    return jsonify([{
        "id": e.id,
        "title": e.title,
        "amount": float(e.amount),
        "category": e.category,
        "date": e.date,
        "notes": e.notes,
        "created_at": e.created_at.isoformat()
    } for e in items])


@expenses_bp.route("", methods=["POST"])
@jwt_required()
def create_expense():
    uid = int(get_jwt_identity())
    data = request.json or {}

    errors = validate_expense_data(data)
    if errors:
        return jsonify({"error": errors[0]}), 400

    exp = Expense(
        user_id=uid,
        title=data["title"].strip(),
        amount=Decimal(str(data["amount"])),
        category=data["category"],
        date=data["date"],
        notes=data.get("notes", "").strip() if data.get("notes") else None
    )
    db.session.add(exp)
    db.session.commit()
    return jsonify({"message": "created", "id": exp.id}), 201


@expenses_bp.route("/<int:expense_id>", methods=["PUT"])
@jwt_required()
def update_expense(expense_id):
    uid = int(get_jwt_identity())
    exp = Expense.query.get(expense_id)
    if not exp:
        return jsonify({"error": "Expense not found"}), 404
    if exp.user_id != uid:
        return jsonify({"error": "Forbidden"}), 403

    data = request.json or {}
    errors = validate_expense_data(data, partial=True)
    if errors:
        return jsonify({"error": errors[0]}), 400

    if "title" in data:
        exp.title = data["title"].strip()
    if "amount" in data:
        exp.amount = Decimal(str(data["amount"]))
    if "category" in data:
        exp.category = data["category"]
    if "date" in data:
        exp.date = data["date"]
    if "notes" in data:
        exp.notes = data["notes"].strip() if data["notes"] else None

    db.session.commit()
    return jsonify({"message": "updated"})


@expenses_bp.route("/<int:expense_id>", methods=["DELETE"])
@jwt_required()
def delete_expense(expense_id):
    uid = int(get_jwt_identity())
    exp = Expense.query.get(expense_id)
    if not exp:
        return jsonify({"error": "Expense not found"}), 404
    if exp.user_id != uid:
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(exp)
    db.session.commit()
    return jsonify({"message": "deleted"})


@expenses_bp.route("/summary", methods=["GET"])
@jwt_required()
def expense_summary():
    uid = int(get_jwt_identity())
    now = datetime.utcnow()
    month_start = f"{now.year}-{now.month:02d}-01"
    month_end = f"{now.year}-{now.month:02d}-31"

    items = Expense.query.filter(
        Expense.user_id == uid,
        Expense.date >= month_start,
        Expense.date <= month_end
    ).all()

    total = sum(float(e.amount) for e in items)
    by_category = {}
    for e in items:
        by_category[e.category] = round(by_category.get(e.category, 0) + float(e.amount), 2)

    return jsonify({
        "total_this_month": round(total, 2),
        "by_category": by_category,
        "month": f"{now.year}-{now.month:02d}"
    })
