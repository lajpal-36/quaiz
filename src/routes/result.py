from flask import Blueprint, jsonify
from src.models import Result
from src.utils.decorators import role_required

result_bp = Blueprint('result', __name__)

@result_bp.route('/results/<int:student_id>', methods=['GET'])
@role_required('student')
def view_result(student_id):
    results = Result.query.filter_by(student_id=student_id).all()
    return jsonify([{
        "quiz_id": r.quiz_id,
        "marks": r.marks
    } for r in results])
