from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Group, GroupMember, GroupExpense, ExpenseSplit, Settlement, User
from decimal import Decimal, ROUND_DOWN
from collections import defaultdict

groups_bp = Blueprint("groups", __name__)


def is_member(group_id, user_id):
    return GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first() is not None


def compute_balances(group_id):
    net = defaultdict(Decimal)
    expenses = GroupExpense.query.filter_by(group_id=group_id).all()
    for exp in expenses:
        splits = ExpenseSplit.query.filter_by(group_expense_id=exp.id).all()
        for split in splits:
            if split.user_id != exp.paid_by:
                net[exp.paid_by] += split.amount_owed
                net[split.user_id] -= split.amount_owed

    settlements = Settlement.query.filter_by(group_id=group_id).all()
    for s in settlements:
        net[s.paid_by] += s.amount
        net[s.paid_to] -= s.amount

    creditors = sorted([(uid, amt) for uid, amt in net.items() if amt > 0], key=lambda x: -x[1])
    debtors = sorted([(uid, -amt) for uid, amt in net.items() if amt < 0], key=lambda x: -x[1])

    result = []
    i, j = 0, 0
    creditors = list(creditors)
    debtors = list(debtors)

    while i < len(creditors) and j < len(debtors):
        cred_id, cred_amt = creditors[i]
        debt_id, debt_amt = debtors[j]
        pay = min(cred_amt, debt_amt).quantize(Decimal("0.01"))
        if pay > 0:
            result.append({"from_user": debt_id, "to_user": cred_id, "amount": float(pay)})
        if cred_amt > debt_amt:
            creditors[i] = (cred_id, cred_amt - debt_amt)
            j += 1
        elif debt_amt > cred_amt:
            debtors[j] = (debt_id, debt_amt - cred_amt)
            i += 1
        else:
            i += 1
            j += 1

    return result


@groups_bp.route("", methods=["POST"])
@jwt_required()
def create_group():
    uid = int(get_jwt_identity())
    data = request.json or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Group name is required"}), 400

    member_emails = data.get("member_emails", [])
    group = Group(name=name, created_by=uid)
    db.session.add(group)
    db.session.flush()

    db.session.add(GroupMember(group_id=group.id, user_id=uid))

    not_found = []
    for email in member_emails:
        user = User.query.filter_by(email=email.strip()).first()
        if not user:
            not_found.append(email)
            continue
        if user.id == uid:
            continue
        if not is_member(group.id, user.id):
            db.session.add(GroupMember(group_id=group.id, user_id=user.id))

    if not_found:
        db.session.rollback()
        return jsonify({"error": f"Users not found: {', '.join(not_found)}"}), 400

    db.session.commit()
    return jsonify({"message": "created", "id": group.id}), 201


@groups_bp.route("/<int:group_id>", methods=["GET"])
@jwt_required()
def get_group(group_id):
    uid = int(get_jwt_identity())
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    if not is_member(group_id, uid):
        return jsonify({"error": "Forbidden"}), 403

    members_rows = GroupMember.query.filter_by(group_id=group_id).all()
    members = []
    for m in members_rows:
        u = User.query.get(m.user_id)
        if u:
            members.append({"id": u.id, "name": u.name, "email": u.email})

    expenses_rows = GroupExpense.query.filter_by(group_id=group_id).order_by(GroupExpense.created_at.desc()).all()
    expenses = []
    for exp in expenses_rows:
        splits = ExpenseSplit.query.filter_by(group_expense_id=exp.id).all()
        payer = User.query.get(exp.paid_by)
        expenses.append({
            "id": exp.id,
            "title": exp.title,
            "total_amount": float(exp.total_amount),
            "split_type": exp.split_type,
            "paid_by": exp.paid_by,
            "paid_by_name": payer.name if payer else "Unknown",
            "created_at": exp.created_at.isoformat(),
            "splits": [{"user_id": s.user_id, "amount_owed": float(s.amount_owed)} for s in splits],
        })

    return jsonify({
        "id": group.id,
        "name": group.name,
        "created_by": group.created_by,
        "members": members,
        "expenses": expenses,
        "balances": compute_balances(group_id),
    })


@groups_bp.route("/<int:group_id>/expenses", methods=["POST"])
@jwt_required()
def add_group_expense(group_id):
    uid = int(get_jwt_identity())
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    if not is_member(group_id, uid):
        return jsonify({"error": "Forbidden"}), 403

    data = request.json or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    try:
        total_amount = Decimal(str(data.get("total_amount", "")))
    except Exception:
        return jsonify({"error": "Invalid total_amount"}), 400
    if total_amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    split_type = data.get("split_type", "")
    if split_type not in ("equal", "exact"):
        return jsonify({"error": "split_type must be 'equal' or 'exact'"}), 400

    paid_by = data.get("paid_by", uid)
    try:
        paid_by = int(paid_by)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid paid_by"}), 400
    if not is_member(group_id, paid_by):
        return jsonify({"error": "Payer must be a group member"}), 400

    member_rows = GroupMember.query.filter_by(group_id=group_id).all()
    member_ids = [m.user_id for m in member_rows]
    n = len(member_ids)

    if split_type == "equal":
        base = (total_amount / n).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
        remainder = total_amount - base * n
        split_map = {mid: base for mid in member_ids}
        split_map[paid_by] = split_map[paid_by] + remainder

    elif split_type == "exact":
        splits_data = data.get("splits", [])
        if not splits_data:
            return jsonify({"error": "Exact split requires 'splits' list"}), 400
        split_map = {}
        for s in splits_data:
            try:
                sid = int(s["user_id"])
                amt = Decimal(str(s["amount"]))
            except (KeyError, TypeError, Exception):
                return jsonify({"error": "Each split needs user_id and amount"}), 400
            if amt < 0:
                return jsonify({"error": "Split amount cannot be negative"}), 400
            if sid not in member_ids:
                return jsonify({"error": f"User {sid} is not a group member"}), 400
            split_map[sid] = split_map.get(sid, Decimal("0")) + amt

        split_total = sum(split_map.values())
        if abs(split_total - total_amount) > Decimal("0.02"):
            return jsonify({"error": f"Split amounts ({float(split_total):.2f}) must sum to total ({float(total_amount):.2f})"}), 400

    exp = GroupExpense(
        group_id=group_id,
        paid_by=paid_by,
        title=title,
        total_amount=total_amount,
        split_type=split_type,
    )
    db.session.add(exp)
    db.session.flush()

    for user_id, amount_owed in split_map.items():
        db.session.add(ExpenseSplit(group_expense_id=exp.id, user_id=user_id, amount_owed=amount_owed))

    db.session.commit()
    return jsonify({"message": "created", "id": exp.id}), 201


@groups_bp.route("/<int:group_id>/settle", methods=["POST"])
@jwt_required()
def settle_up(group_id):
    uid = int(get_jwt_identity())
    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Group not found"}), 404
    if not is_member(group_id, uid):
        return jsonify({"error": "Forbidden"}), 403

    data = request.json or {}
    paid_to = data.get("paid_to")
    if paid_to is None:
        return jsonify({"error": "paid_to is required"}), 400

    try:
        amount = Decimal(str(data.get("amount", "")))
    except Exception:
        return jsonify({"error": "Invalid amount"}), 400
    if amount <= 0:
        return jsonify({"error": "Settlement amount must be greater than zero"}), 400

    paid_to = int(paid_to)
    if not is_member(group_id, paid_to):
        return jsonify({"error": "Recipient must be a group member"}), 400
    if paid_to == uid:
        return jsonify({"error": "Cannot settle with yourself"}), 400

    settlement = Settlement(group_id=group_id, paid_by=uid, paid_to=paid_to, amount=amount)
    db.session.add(settlement)
    db.session.commit()
    return jsonify({"message": "settled", "id": settlement.id}), 201


@groups_bp.route("", methods=["GET"])
@jwt_required()
def list_groups():
    uid = int(get_jwt_identity())
    memberships = GroupMember.query.filter_by(user_id=uid).all()
    result = []
    for m in memberships:
        group = Group.query.get(m.group_id)
        if group:
            result.append({
                "id": group.id,
                "name": group.name,
                "created_by": group.created_by,
                "member_count": GroupMember.query.filter_by(group_id=group.id).count(),
                "expense_count": GroupExpense.query.filter_by(group_id=group.id).count(),
                "balance_count": len(compute_balances(group.id)),
            })
    return jsonify(result)
