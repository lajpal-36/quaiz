from src.app import create_app
from src.database import db
#app = create_app('development')
app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)

