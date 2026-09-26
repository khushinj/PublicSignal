import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables from backend/.env
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI is missing from backend/.env")

# Connect to MongoDB Atlas
client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=10000
)

# Select database and collection
db = client["publicsignal_db"]
complaints_collection = db["complaints"]

# Verify the connection
def check_database_connection():
    client.admin.command("ping")
    return True