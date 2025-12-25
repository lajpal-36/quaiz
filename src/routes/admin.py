from flask import Blueprint, jsonify
from src.models import User
from src.database import db
from src.utils.decorators import role_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/users', methods=['GET'])
@role_required('admin')
def all_users():
    users = User.query.all()
    return jsonify([{ "id": u.id, "name": u.name, "role": u.role } for u in users])


@admin_bp.route('/admin/user/<int:id>', methods=['DELETE'])
@role_required('admin')
def delete_user(id):
    user = User.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"})
