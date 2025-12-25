from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from src.models import Question, Answer, Result, Quiz, User
from src.database import db
from src.utils.decorators import role_required

student_bp = Blueprint('student', __name__)


@student_bp.route('/student/attempt/<int:quiz_id>', methods=['POST'])
@role_required('student')
def attempt_quiz(quiz_id):
    student = get_jwt_identity()

    # 🔒 One attempt lock
    if Result.query.filter_by(student_id=student['id'], quiz_id=quiz_id).first():
        return jsonify({"error": "Quiz already attempted"}), 403

    score = 0
    answers = request.json.get('answers', [])

    for a in answers:
        question = Question.query.get(a['question_id'])
        if question and question.correct_option == a['selected_option']:
            score += 1

        db.session.add(Answer(
            student_id=student['id'],
            quiz_id=quiz_id,
            question_id=a['question_id'],
            selected_option=a['selected_option']
        ))

    db.session.add(Result(
        student_id=student['id'],
        quiz_id=quiz_id,
        marks=score
    ))

    db.session.commit()
    return jsonify({"marks": score})


@student_bp.route('/quizzes', methods=['GET'])
def list_quizzes():
    quizzes = Quiz.query.all()
    result = []
    for q in quizzes:
        question_count = Question.query.filter_by(quiz_id=q.id).count()
        teacher = User.query.filter_by(id=q.teacher_id).first()
        result.append({
            "id": q.id,
            "title": q.title,
            "teacher": teacher.name if teacher else None,
            "questions": question_count
        })
    return jsonify(result)


@student_bp.route('/quiz/<int:quiz_id>/questions', methods=['GET'])
def quiz_questions_public(quiz_id):
    qs = Question.query.filter_by(quiz_id=quiz_id).all()
    # Return questions without correct_option for students/public
    return jsonify([{
        "id": q.id,
        "question": q.question,
        "option_a": q.option_a,
        "option_b": q.option_b,
        "option_c": q.option_c,
        "option_d": q.option_d
    } for q in qs])
