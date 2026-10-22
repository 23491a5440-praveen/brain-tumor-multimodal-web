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
    """Initializes the database schema if tables do not exist, and migrates existing tables if needed."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users table (always create if not exists)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            role TEXT NOT NULL CHECK(role IN ('student', 'hospital', 'clinic', 'researcher')),
            full_name TEXT NOT NULL,
            organization TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Check if existing users table needs migration for 4 roles
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users';")
        existing_users_table = cursor.fetchone()
        if existing_users_table and existing_users_table["sql"] and "'clinic'" not in existing_users_table["sql"]:
            logger.info("Migrating users table to support 4 registration roles...")
            cursor.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute("ALTER TABLE users RENAME TO users_old;")
            cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                role TEXT NOT NULL CHECK(role IN ('student', 'hospital', 'clinic', 'researcher')),
                full_name TEXT NOT NULL,
                organization TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
                INSERT INTO users (id, email, role, full_name, organization, password_hash, salt, created_at, updated_at)
                SELECT id, email, role, full_name, organization, password_hash, salt, created_at, updated_at FROM users_old;
            """)
            cursor.execute("DROP TABLE users_old;")
            cursor.execute("PRAGMA foreign_keys = ON;")
            logger.info("Users table successfully migrated to 4 roles.")

        # 2. Sessions table (always create if not exists)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)

        # Check if sessions table needs foreign key repair from users_old
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions';")
        sessions_table = cursor.fetchone()
        if sessions_table and sessions_table["sql"] and "users_old" in sessions_table["sql"]:
            logger.info("Repairing sessions table foreign key to users...")
            cursor.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute("ALTER TABLE sessions RENAME TO sessions_old;")
            cursor.execute("""
            CREATE TABLE sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """)
            cursor.execute("""
                INSERT INTO sessions (token, user_id, created_at, expires_at, user_agent)
                SELECT token, user_id, created_at, expires_at, user_agent FROM sessions_old;
            """)
            cursor.execute("DROP TABLE sessions_old;")
            cursor.execute("PRAGMA foreign_keys = ON;")
            logger.info("Sessions table foreign key repaired.")

        # 3. Password reset OTPs table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL COLLATE NOCASE,
            otp_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            reset_token TEXT,
            attempts_left INTEGER NOT NULL DEFAULT 5,
            used INTEGER NOT NULL DEFAULT 0,
            expires_at TIMESTAMP NOT NULL,
            reset_token_expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Indexes for fast lookup
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(reset_token);")

        logger.info("Database schema verified at %s", DB_PATH)

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
