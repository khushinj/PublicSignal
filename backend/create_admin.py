import getpass
import sys

from pymongo.errors import DuplicateKeyError
from pwdlib import PasswordHash

from app.database import admins_collection
from app.models.admin import (
    build_admin_document,
    normalize_email,
)

password_hasher = PasswordHash.recommended()


def create_admin():
    print("\n=== PublicSignal: Private Admin Setup ===\n")

    email = input("Admin email: ").strip()
    if not email or "@" not in email:
        print("Please enter a valid email address.")
        sys.exit(1)

    email = normalize_email(email)

    password = getpass.getpass("Create password (minimum 12 characters): ")
    confirm_password = getpass.getpass("Confirm password: ")

    if len(password) < 12:
        print("Password must be at least 12 characters.")
        sys.exit(1)

    if len(password) > 128:
        print("Password must not exceed 128 characters.")
        sys.exit(1)

    if password != confirm_password:
        print("Passwords do not match.")
        sys.exit(1)

    existing_admin = admins_collection.find_one({"email": email})

    if existing_admin:
        print("An admin account with this email already exists.")
        sys.exit(1)

    password_hash = password_hasher.hash(password)

    admin_document = build_admin_document(
        email=email,
        password_hash=password_hash,
    )

    try:
        admins_collection.insert_one(admin_document)
        print(f"\nAdmin account created successfully for {email}")

    except DuplicateKeyError:
        print("An admin account with this email already exists.")
        sys.exit(1)

    except Exception as error:
        print(f"Could not create admin account: {error}")
        sys.exit(1)


if __name__ == "__main__":
    create_admin()