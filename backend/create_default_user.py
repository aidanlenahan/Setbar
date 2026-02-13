"""Create a default test user for development"""
from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def create_default_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "test@nessfitness.local").first()
        if existing_user:
            updated = False
            if existing_user.name != "testuser":
                existing_user.name = "testuser"
                updated = True
            if not existing_user.password_hash:
                existing_user.password_hash = pwd_context.hash("test1234")
                updated = True
            if updated:
                db.commit()
            print(f"Default user already exists with ID: {existing_user.id}")
            print("Email: test@nessfitness.local")
            print("Password: test1234")
            print("Username: testuser")
            return existing_user.id
        
        # Create default test user
        user = User(
            email="test@nessfitness.local",
            name="testuser",
            google_id=None,
            password_hash=pwd_context.hash("test1234"),
            is_email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created default user with ID: {user.id}")
        print("Email: test@nessfitness.local")
        print("Password: test1234")
        print("Username: testuser")
        return user.id
    finally:
        db.close()

if __name__ == "__main__":
    create_default_user()
