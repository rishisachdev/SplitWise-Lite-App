from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Expense, GroupMember, GroupExpense, ExpenseSplit, Settlement, Group, User
from decimal import Decimal
from datetime import datetime
from collections import defaultdict

dashboard_bp = Blueprint("dashboard", __name__)


def get_group_balances_for_user(uid):
    """Returns (total_owed_by_me, total_owed_to_me) across all groups."""
    memberships = GroupMember.query.filter_by(user_id=uid).all()
    total_owe = Decimal("0")
    total_owed = Decimal("0")

    for membership in memberships:
        group_id = membership.group_id
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

        user_net = net.get(uid, Decimal("0"))
        if user_net > 0:
            total_owed += user_net
        elif user_net < 0:
            total_owe += abs(user_net)

    return float(total_owe), float(total_owed)


@dashboard_bp.route("", methods=["GET"])
@jwt_required()
def dashboard():
    uid = int(get_jwt_identity())
    now = datetime.utcnow()
    month_start = f"{now.year}-{now.month:02d}-01"
    month_end = f"{now.year}-{now.month:02d}-31"

    personal_expenses = Expense.query.filter(
        Expense.user_id == uid,
        Expense.date >= month_start,
        Expense.date <= month_end,
    ).all()
    personal_total = round(sum(float(e.amount) for e in personal_expenses), 2)

    total_owe, total_owed = get_group_balances_for_user(uid)

    activity = []

    recent_personal = Expense.query.filter_by(user_id=uid).order_by(Expense.created_at.desc()).limit(5).all()
    for e in recent_personal:
        activity.append({
            "type": "personal_expense",
            "description": f"You added '{e.title}' — ₹{float(e.amount):.2f}",
            "amount": float(e.amount),
            "timestamp": e.created_at.isoformat(),
        })

    memberships = GroupMember.query.filter_by(user_id=uid).all()
    group_ids = [m.group_id for m in memberships]
    if group_ids:
        recent_group = GroupExpense.query.filter(
            GroupExpense.group_id.in_(group_ids)
        ).order_by(GroupExpense.created_at.desc()).limit(5).all()
        for exp in recent_group:
            group = Group.query.get(exp.group_id)
            payer = User.query.get(exp.paid_by)
            activity.append({
                "type": "group_expense",
                "description": f"'{exp.title}' added to {group.name if group else 'group'} by {payer.name if payer else 'someone'}",
                "amount": float(exp.total_amount),
                "timestamp": exp.created_at.isoformat(),
            })

        recent_settlements = Settlement.query.filter(
            Settlement.group_id.in_(group_ids)
        ).order_by(Settlement.created_at.desc()).limit(5).all()
        for s in recent_settlements:
            payer = User.query.get(s.paid_by)
            payee = User.query.get(s.paid_to)
            activity.append({
                "type": "settlement",
                "description": f"{payer.name if payer else 'Someone'} paid {payee.name if payee else 'someone'} ₹{float(s.amount):.2f}",
                "amount": float(s.amount),
                "timestamp": s.created_at.isoformat(),
            })

    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    activity = activity[:10]

    return jsonify({
        "personal_spend_this_month": personal_total,
        "you_owe": round(total_owe, 2),
        "owed_to_you": round(total_owed, 2),
        "recent_activity": activity,
    })
