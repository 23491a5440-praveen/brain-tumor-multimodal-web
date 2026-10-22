import os
import sqlite3
import logging
from pathlib import Path
from contextlib import contextmanager

logger = logging.getLogger("neuroscan.auth.db")

PROJECT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_DIR / "backend" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB_PATH = DATA_DIR / "neuroscan_auth.db"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(DEFAULT_DB_PATH)))

def get_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with foreign keys and Row factory enabled."""
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@contextmanager
def get_db():
    """Context manager for SQLite database transactions."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initializes the database schema for User ID + Recovery PIN authentication."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Check existing users table
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users';")
        existing_users_table = cursor.fetchone()

        if not existing_users_table:
            cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT UNIQUE NOT NULL COLLATE NOCASE,
                role TEXT NOT NULL CHECK(role IN ('student', 'hospital', 'clinic', 'researcher')),
                full_name TEXT NOT NULL,
                organization TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                recovery_pin_hash TEXT NOT NULL,
                recovery_pin_salt TEXT NOT NULL,
                failed_reset_attempts INTEGER DEFAULT 0,
                last_failed_attempt TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            logger.info("Created new users table with User ID and Recovery PIN support.")
        else:
            # Check if existing table needs user_id and recovery_pin columns
            cursor.execute("PRAGMA table_info(users);")
            columns = [col["name"] for col in cursor.fetchall()]
            
            if "user_id" not in columns or "recovery_pin_hash" not in columns:
                logger.info("Migrating users table to add user_id and recovery_pin...")
                cursor.execute("PRAGMA foreign_keys = OFF;")
                cursor.execute("ALTER TABLE users RENAME TO users_backup_v1;")
                cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL COLLATE NOCASE,
                    role TEXT NOT NULL CHECK(role IN ('student', 'hospital', 'clinic', 'researcher')),
                    full_name TEXT NOT NULL,
                    organization TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    recovery_pin_hash TEXT NOT NULL,
                    recovery_pin_salt TEXT NOT NULL,
                    failed_reset_attempts INTEGER DEFAULT 0,
                    last_failed_attempt TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)
                cursor.execute("PRAGMA foreign_keys = ON;")
                logger.info("Users table schema migrated successfully.")

        # 2. Sessions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            user_agent TEXT
        );
        """)

        # Indexes for fast lookup
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);")

        logger.info("Database schema verified at %s", DB_PATH)

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
