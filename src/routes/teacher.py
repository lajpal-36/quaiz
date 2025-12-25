from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.models import Quiz, Question
from src.database import db
from src.utils.decorators import role_required

teacher_bp = Blueprint('teacher', __name__)

@teacher_bp.route('/teacher/quiz', methods=['POST'])
@role_required('teacher')
def create_quiz():
    user = get_jwt_identity()
    quiz = Quiz(
        title=request.json['title'],
        teacher_id=user['id']
    )
    db.session.add(quiz)
    db.session.commit()
    return jsonify({"quiz_id": quiz.id})


@teacher_bp.route('/teacher/question', methods=['POST'])
@role_required('teacher')
def add_question():
    q = Question(**request.json)
    db.session.add(q)
    db.session.commit()
    return jsonify({"message": "Question added"})


@teacher_bp.route('/teacher/quiz/<int:quiz_id>/questions', methods=['GET'])
@role_required('teacher')
def teacher_quiz_questions(quiz_id):
    user = get_jwt_identity()
    quiz = Quiz.query.get_or_404(quiz_id)
    # Only allow teacher who owns the quiz
    if quiz.teacher_id != user['id']:
        return jsonify({"error": "Access denied"}), 403

    qs = Question.query.filter_by(quiz_id=quiz_id).all()
    return jsonify([{
        "id": q.id,
        "question": q.question,
        "option_a": q.option_a,
        "option_b": q.option_b,
        "option_c": q.option_c,
        "option_d": q.option_d,
        "correct_option": q.correct_option
    } for q in qs])
