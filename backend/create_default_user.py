"""Create a default test user for development"""
from database import SessionLocal
from models import User

def create_default_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "test@nessfitness.local").first()
        if existing_user:
            print(f"Default user already exists with ID: {existing_user.id}")
            return existing_user.id
        
        # Create default test user
        user = User(
            email="test@nessfitness.local",
            name="Test User",
            google_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created default user with ID: {user.id}")
        return user.id
    finally:
        db.close()

if __name__ == "__main__":
    create_default_user()
