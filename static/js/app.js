// Global variables
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let quizQuestions = [];
let userAnswers = {};

// Mock data (fallback if backend endpoints not available)
let users = [
    { id: 1, name: "Teacher One", email: "teacher@test.com", password: "123", role: "teacher" },
    { id: 2, name: "Student One", email: "student@test.com", password: "123", role: "student" }
];

let quizzes = [
    { id: 1, title: "JavaScript Basics", teacher_id: 1 },
    { id: 2, title: "Python Fundamentals", teacher_id: 1 }
];

let questions = [
    { id: 1, quiz_id: 1, question: "What is JavaScript?", option_a: "Programming Language", option_b: "Database", option_c: "Operating System", option_d: "Hardware", correct_option: "A" },
    { id: 2, quiz_id: 1, question: "Which keyword is used to declare variables?", option_a: "var", option_b: "let", option_c: "const", option_d: "All of the above", correct_option: "D" },
    { id: 3, quiz_id: 2, question: "Python is which type of language?", option_a: "Compiled", option_b: "Interpreted", option_c: "Assembly", option_d: "Machine", correct_option: "B" }
];

// Base URL for API (empty means same origin)
const API_BASE = '';

function apiFetch(path, opts = {}) {
    const url = API_BASE + path;
    opts.headers = opts.headers || {};
    opts.headers['Content-Type'] = 'application/json';

    const token = localStorage.getItem('token');
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;

    return fetch(url, opts).then(async res => {
        const text = await res.text();
        try { return JSON.parse(text); } catch (e) { return text; }
    });
}

// Show dashboard based on role
function showDashboard(role) {
    document.getElementById('login').classList.remove('active');
    document.getElementById(role).classList.add('active');

    if (role === 'teacher') {
        loadTeacherQuizzes();
    } else if (role === 'student') {
        loadAvailableQuizzes();
    }
}

// Login functionality
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;

    // Try backend login first
    try {
        const resp = await fetch(API_BASE + '/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (resp.ok) {
            const data = await resp.json();
            localStorage.setItem('token', data.token);
            // best-effort user object locally
            currentUser = { email, role, name: email.split('@')[0] };
            document.getElementById('navDashboard').style.display = 'inline-block';
            document.getElementById('navLogout').style.display = 'inline-block';
            showDashboard(role);
            return;
        }
    } catch (err) {
        // network error, fallback to mock below
        console.warn('Login API not available, falling back to mock.', err);
    }

    // Fallback to mock validation
    const user = users.find(u => u.email === email && u.password === password && u.role === role);
    if (user) {
        currentUser = user;
        document.getElementById('navDashboard').style.display = 'inline-block';
        document.getElementById('navLogout').style.display = 'inline-block';
        showDashboard(user.role);
    } else {
        alert('Invalid credentials!');
    }
});

// Logout functionality
function logout() {
    currentUser = null;
    localStorage.removeItem('token');
    document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('active'));
    document.getElementById('login').classList.add('active');
    document.getElementById('loginForm').reset();
    document.getElementById('navDashboard').style.display = 'none';
    document.getElementById('navLogout').style.display = 'none';
}

// Create quiz functionality
document.getElementById('createQuizForm').addEventListener('submit', function (e) {
    e.preventDefault();

    if (!currentUser || currentUser.role !== 'teacher') return;

    const title = document.getElementById('quizTitle').value;
    // Try backend creation first
    (async () => {
        try {
            const resp = await apiFetch('/teacher/quiz', {
                method: 'POST',
                body: JSON.stringify({ title })
            });
            // resp may contain quiz_id
            if (resp && resp.quiz_id) {
                document.getElementById('quizTitle').value = '';
                loadTeacherQuizzes();
                return;
            }
        } catch (err) {
            console.warn('Create quiz API failed, falling back to mock', err);
        }

        const newQuiz = {
            id: quizzes.length + 1,
            title: title,
            teacher_id: currentUser.id || 1
        };
        quizzes.push(newQuiz);
        document.getElementById('quizTitle').value = '';
        loadTeacherQuizzes();
    })();
});

// Load teacher's quizzes
function loadTeacherQuizzes() {
    if (!currentUser || currentUser.role !== 'teacher') return;
    const quizList = document.getElementById('quizList');
    quizList.innerHTML = '';

    (async () => {
        try {
            // Try to fetch teacher quizzes via general /quizzes and filter
            const all = await apiFetch('/quizzes');
            const teacherQuizzes = (Array.isArray(all) ? all : []).filter(q => q.teacher === currentUser.name || q.teacher === currentUser.email || q.teacher_id === currentUser.id);

            if (teacherQuizzes.length) {
                teacherQuizzes.forEach(quiz => {
                    const quizCard = document.createElement('div');
                    quizCard.className = 'quiz-card';
                    quizCard.innerHTML = `
                        <h3>${quiz.title}</h3>
                        <p>Questions: ${quiz.questions}</p>
                        <p>Teacher: ${quiz.teacher || currentUser.name}</p>
                        <div class="quiz-actions">
                            <button class="btn-primary" onclick="showAddQuestion(${quiz.id})">Add Question</button>
                            <button class="btn-secondary" onclick="viewQuestions(${quiz.id})">View Questions</button>
                        </div>
                    `;
                    quizList.appendChild(quizCard);
                });
                return;
            }
        } catch (err) {
            console.warn('Load teacher quizzes API failed, falling back to mock', err);
        }

        // Fallback to local mock
        const teacherQuizzes = quizzes.filter(q => q.teacher_id === currentUser.id);
        teacherQuizzes.forEach(quiz => {
            const quizQuestions = questions.filter(q => q.quiz_id === quiz.id);
            const quizCard = document.createElement('div');
            quizCard.className = 'quiz-card';
            quizCard.innerHTML = `
                <h3>${quiz.title}</h3>
                <p>Questions: ${quizQuestions.length}</p>
                <p>Teacher: ${currentUser.name}</p>
                <div class="quiz-actions">
                    <button class="btn-primary" onclick="showAddQuestion(${quiz.id})">Add Question</button>
                    <button class="btn-secondary" onclick="viewQuestions(${quiz.id})">View Questions</button>
                </div>
            `;
            quizList.appendChild(quizCard);
        });
    })();
}

// Show add question form
function showAddQuestion(quizId) {
    document.getElementById('questionQuizId').value = quizId;
    document.getElementById('addQuestionCard').style.display = 'block';
}

// Hide add question form
function hideAddQuestion() {
    document.getElementById('addQuestionCard').style.display = 'none';
    document.getElementById('addQuestionForm').reset();
}

// Add question functionality
document.getElementById('addQuestionForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const quizId = parseInt(document.getElementById('questionQuizId').value);
    const questionText = document.getElementById('questionText').value;
    const optionA = document.getElementById('optionA').value;
    const optionB = document.getElementById('optionB').value;
    const optionC = document.getElementById('optionC').value;
    const optionD = document.getElementById('optionD').value;
    const correctOption = document.getElementById('correctOption').value;
    const payload = {
        quiz_id: quizId,
        question: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_option: correctOption
    };

    (async () => {
        try {
            const resp = await apiFetch('/teacher/question', { method: 'POST', body: JSON.stringify(payload) });
            hideAddQuestion();
            loadTeacherQuizzes();
            return;
        } catch (err) {
            console.warn('Add question API failed, falling back to mock', err);
        }

        const newQuestion = {
            id: questions.length + 1,
            ...payload
        };
        questions.push(newQuestion);
        hideAddQuestion();
        loadTeacherQuizzes();
    })();
});

// Load available quizzes for students
function loadAvailableQuizzes() {
    const availableQuizzes = document.getElementById('availableQuizzes');
    availableQuizzes.innerHTML = '';

    (async () => {
        try {
            const resp = await apiFetch('/quizzes');
            if (Array.isArray(resp)) {
                resp.forEach(quiz => {
                    if (quiz.questions > 0) {
                        const quizCard = document.createElement('div');
                        quizCard.className = 'quiz-card';
                        quizCard.innerHTML = `
                            <h3>${quiz.title}</h3>
                            <p>Teacher: ${quiz.teacher || 'Unknown'}</p>
                            <p>Questions: ${quiz.questions}</p>
                            <div class="quiz-actions">
                                <button class="btn-primary" onclick="startQuiz(${quiz.id})">Attempt Quiz</button>
                            </div>
                        `;
                        availableQuizzes.appendChild(quizCard);
                    }
                });
                return;
            }
        } catch (err) {
            console.warn('Load quizzes API failed, falling back to mock', err);
        }

        // Fallback to mock
        quizzes.forEach(quiz => {
            const quizQuestions = questions.filter(q => q.quiz_id === quiz.id);
            const teacher = users.find(u => u.id === quiz.teacher_id);

            if (quizQuestions.length > 0) {
                const quizCard = document.createElement('div');
                quizCard.className = 'quiz-card';
                quizCard.innerHTML = `
                    <h3>${quiz.title}</h3>
                    <p>Teacher: ${teacher ? teacher.name : 'Unknown'}</p>
                    <p>Questions: ${quizQuestions.length}</p>
                    <div class="quiz-actions">
                        <button class="btn-primary" onclick="startQuiz(${quiz.id})">Attempt Quiz</button>
                    </div>
                `;

                availableQuizzes.appendChild(quizCard);
            }
        });
    })();
}

// Start quiz
function startQuiz(quizId) {
    if (!currentUser || currentUser.role !== 'student') return;

    currentQuiz = { id: quizId };
    currentQuestionIndex = 0;
    userAnswers = {};

    (async () => {
        try {
            const qs = await apiFetch(`/quiz/${quizId}/questions`);
            if (Array.isArray(qs) && qs.length) {
                quizQuestions = qs.map(q => ({
                    id: q.id,
                    quiz_id: quizId,
                    question: q.question,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d
                }));

                // Try to get quiz title
                try {
                    const all = await apiFetch('/quizzes');
                    if (Array.isArray(all)) {
                        const meta = all.find(x => x.id === quizId);
                        if (meta) document.getElementById('quizTitle').textContent = meta.title;
                        else document.getElementById('quizTitle').textContent = 'Quiz ' + quizId;
                    } else {
                        document.getElementById('quizTitle').textContent = 'Quiz ' + quizId;
                    }
                } catch (e) {
                    document.getElementById('quizTitle').textContent = 'Quiz ' + quizId;
                }

                document.querySelector('.dashboard-section').style.display = 'none';
                document.getElementById('quizTaking').style.display = 'block';
                loadQuestion();
                return;
            }
        } catch (err) {
            console.warn('Fetch quiz questions failed, falling back to local', err);
        }

        // Fallback to local data
        currentQuiz = quizzes.find(q => q.id === quizId) || { id: quizId, title: 'Quiz' };
        quizQuestions = questions.filter(q => q.quiz_id === quizId);
        document.querySelector('.dashboard-section').style.display = 'none';
        document.getElementById('quizTaking').style.display = 'block';
        document.getElementById('quizTitle').textContent = currentQuiz.title || 'Quiz';
        loadQuestion();
    })();
}

// Load current question
function loadQuestion() {
    if (currentQuestionIndex >= quizQuestions.length) return;

    const question = quizQuestions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

    document.getElementById('progressFill').style.width = progress + '%';

    const questionContainer = document.getElementById('questionContainer');
    questionContainer.innerHTML = `
        <div class="question-text">
            Question ${currentQuestionIndex + 1} of ${quizQuestions.length}: ${question.question}
        </div>
        <div class="options">
            <label class="option" onclick="selectOption('A')">
                <input type="radio" name="answer" value="A">
                <span>A) ${question.option_a}</span>
            </label>
            <label class="option" onclick="selectOption('B')">
                <input type="radio" name="answer" value="B">
                <span>B) ${question.option_b}</span>
            </label>
            <label class="option" onclick="selectOption('C')">
                <input type="radio" name="answer" value="C">
                <span>C) ${question.option_c}</span>
            </label>
            <label class="option" onclick="selectOption('D')">
                <input type="radio" name="answer" value="D">
                <span>D) ${question.option_d}</span>
            </label>
        </div>
    `;

    // Show/hide navigation buttons
    document.getElementById('prevBtn').style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
    document.getElementById('nextBtn').style.display = currentQuestionIndex < quizQuestions.length - 1 ? 'inline-block' : 'none';
    document.getElementById('submitBtn').style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'inline-block' : 'none';

    // Restore selected answer
    const savedAnswer = userAnswers[question.id];
    if (savedAnswer) {
        const radio = document.querySelector(`input[value="${savedAnswer}"]`);
        if (radio) {
            radio.checked = true;
            radio.closest('.option').classList.add('selected');
        }
    }
}

// Select option
function selectOption(option) {
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));

    const selectedOption = document.querySelector(`input[value="${option}"]`);
    selectedOption.checked = true;
    selectedOption.closest('.option').classList.add('selected');

    const currentQuestion = quizQuestions[currentQuestionIndex];
    userAnswers[currentQuestion.id] = option;
}

// Navigation functions
function nextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

// Submit quiz
function submitQuiz() {
    let score = 0;
    let totalQuestions = quizQuestions.length;

    // Prepare answers
    const answersPayload = quizQuestions.map(q => ({ question_id: q.id, selected_option: userAnswers[q.id] || null }));

    (async () => {
        try {
            const resp = await apiFetch(`/student/attempt/${currentQuiz.id}`, {
                method: 'POST',
                body: JSON.stringify({ answers: answersPayload })
            });

            if (resp && typeof resp.marks !== 'undefined') {
                const scoreRemote = resp.marks;
                const percentage = Math.round((scoreRemote / totalQuestions) * 100);
                showResult(scoreRemote, totalQuestions, percentage);
                return;
            }
        } catch (err) {
            console.warn('Attempt API failed, falling back to client scoring', err);
        }

        // Fallback scoring locally
        quizQuestions.forEach(question => {
            const userAnswer = userAnswers[question.id];
            if (userAnswer === question.correct_option) score++;
        });
        const percentage = Math.round((score / totalQuestions) * 100);
        showResult(score, totalQuestions, percentage);
    })();
}

function showResult(score, totalQuestions, percentage) {
    document.getElementById('quizTaking').style.display = 'none';
    const resultDisplay = document.getElementById('resultDisplay');
    const resultContent = document.getElementById('resultContent');

    let scoreClass = 'low';
    if (percentage >= 80) scoreClass = 'high';
    else if (percentage >= 60) scoreClass = 'medium';

    resultContent.innerHTML = `
        <div class="score ${scoreClass}">${percentage}%</div>
        <p>You scored ${score} out of ${totalQuestions} questions correctly.</p>
    `;
    resultDisplay.style.display = 'block';
}

// Back to quizzes
function backToQuizzes() {
    document.getElementById('resultDisplay').style.display = 'none';
    document.querySelector('.dashboard-section').style.display = 'block';
    loadAvailableQuizzes();
}

// Modal helper functions
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// View questions
function viewQuestions(quizId) {
    (async () => {
        try {
            const resp = await apiFetch(`/teacher/quiz/${quizId}/questions`);
            if (Array.isArray(resp) && resp.length) {
                let content = '<div class="questions-list">';
                resp.forEach((q, index) => {
                    content += `
                        <div class="question-item">
                            <h4>Question ${index + 1}: ${q.question}</h4>
                            <p><strong>A)</strong> ${q.option_a}</p>
                            <p><strong>B)</strong> ${q.option_b}</p>
                            <p><strong>C)</strong> ${q.option_c}</p>
                            <p><strong>D)</strong> ${q.option_d}</p>
                            <p><strong>Correct Answer:</strong> ${q.correct_option}</p>
                        </div>
                        <hr>
                    `;
                });
                content += '</div>';
                showModal('Quiz Questions', content);
                return;
            }
        } catch (err) {
            console.warn('Fetch teacher questions failed, falling back to local', err);
        }

        // Fallback to local data
        const quizQuestions = questions.filter(q => q.quiz_id === quizId);
        const quiz = quizzes.find(q => q.id === quizId);

        if (quizQuestions.length) {
            let content = `<div class="questions-list"><h3>Questions for "${quiz.title}":</h3>`;
            quizQuestions.forEach((q, index) => {
                content += `
                    <div class="question-item">
                        <h4>Question ${index + 1}: ${q.question}</h4>
                        <p><strong>A)</strong> ${q.option_a}</p>
                        <p><strong>B)</strong> ${q.option_b}</p>
                        <p><strong>C)</strong> ${q.option_c}</p>
                        <p><strong>D)</strong> ${q.option_d}</p>
                        <p><strong>Correct Answer:</strong> ${q.correct_option}</p>
                    </div>
                    <hr>
                `;
            });
            content += '</div>';
            showModal('Quiz Questions', content);
        } else {
            showModal('Quiz Questions', '<p>No questions found for this quiz.</p>');
        }
    })();
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('login').classList.add('active');

    // Add event listeners for navigation
    document.getElementById('navDashboard').addEventListener('click', function () {
        if (currentUser) {
            showDashboard(currentUser.role);
        }
    });

    document.getElementById('navLogout').addEventListener('click', logout);

    // Close modal when clicking outside
    document.getElementById('modal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeModal();
        }
    });
});