"""
Create the first admin user.
Usage: python scripts/seed_admin.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from db import SessionLocal  # noqa: E402
from services import user_service  # noqa: E402


def main():
    db = SessionLocal()

    username = "admin"
    password = "admin1234"  # CHANGE IMMEDIATELY
    email = "admin@localhost"
    full_name = "System Administrator"

    existing = user_service.get_by_username(db, username)
    if existing:
        print(f"User '{username}' already exists (ID={existing['id']})")
        print("To reset the password, delete the user first.")
        db.close()
        return

    user = user_service.create_user(
        db,
        username=username,
        email=email,
        password=password,
        full_name=full_name,
        role="admin",
    )

    print("=" * 60)
    print("  ✅ Admin user created")
    print("=" * 60)
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print(f"  Email:    {email}")
    print(f"  Role:     admin")
    print("=" * 60)
    print()
    print("⚠️  CHANGE THE PASSWORD IMMEDIATELY after first login.")
    print()

    db.close()


if __name__ == "__main__":
    main()