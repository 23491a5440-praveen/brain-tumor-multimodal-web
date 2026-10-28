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

# The 5 authorized accounts stored securely with PBKDF2-HMAC-SHA256 (100k rounds)
# Plaintext passwords are NEVER stored in code or database.
AUTHORIZED_ACCOUNTS = {
    "23491a5440": {
        "user_id": "23491a5440",
        "full_name": "Praveen",
        "role": "Admin / Lead Researcher",
        "password_hash": "08a5b0211e92395833b37fbfdc4912ec1ef1771a939aeed74fb4879338a9b133",
        "salt": "757823e31747ad9f53a18f99cadfb570"
    },
    "23491a5439": {
        "user_id": "23491a5439",
        "full_name": "Babu",
        "role": "Clinical Specialist",
        "password_hash": "d7c5d9f4430c3c38bec551c1fd1493212cb6434a16df079cae11cd4adad5b3ba",
        "salt": "0036efcaf3235629d10c14cda9ad8478"
    },
    "23491a5418": {
        "user_id": "23491a5418",
        "full_name": "Nandhini",
        "role": "Radiologist",
        "password_hash": "aac92751ec7020928e9226e9268c09b7e3e7bc95ec89baf7a6bfb163ddd50455",
        "salt": "a603c59e06b109341a061b7bb274a393"
    },
    "23491a5417": {
        "user_id": "23491a5417",
        "full_name": "Rupa",
        "role": "Research Associate",
        "password_hash": "3f55e00fdf2bb76a33f258a5f5505499bacad16da23fed6f1ecafd8654f7c9b7",
        "salt": "5921e690d9ea9bb3687ca3ec385874bc"
    },
    "23491a5411": {
        "user_id": "23491a5411",
        "full_name": "Kundanika",
        "role": "Medical Scholar",
        "password_hash": "bd149f2e8ca2e39ea97d781e44608434c26ddb81a0ee2522a6db9f7e4463642e",
        "salt": "567ea8363602b60698cd308ab765eb36"
    }
}

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
    """Initializes the database schema and seeds the 5 authorized accounts."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if legacy users table exists with incompatible schema
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if cursor.fetchone():
            cursor.execute("PRAGMA table_info(users)")
            cols = {row[1] for row in cursor.fetchall()}
            if "organization" in cols or "recovery_pin_hash" in cols:
                logger.info("Migrating legacy users table to restricted schema")
                cursor.execute("DROP TABLE users")

        # Check if legacy sessions table exists with incompatible schema
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'")
        if cursor.fetchone():
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'")
            sql = (cursor.fetchone()[0] or "").lower()
            if "users_backup" in sql or "integer" in sql:
                logger.info("Migrating legacy sessions table to restricted schema")
                cursor.execute("DROP TABLE sessions")

        cursor.execute("DROP TABLE IF EXISTS users_backup_v1")
        cursor.execute("DROP TABLE IF EXISTS password_resets")

        # 1. Users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL COLLATE NOCASE,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # Seed or refresh the 5 authorized accounts
        for acc in AUTHORIZED_ACCOUNTS.values():
            cursor.execute("""
            INSERT INTO users (user_id, full_name, role, password_hash, salt)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                full_name=excluded.full_name,
                role=excluded.role,
                password_hash=excluded.password_hash,
                salt=excluded.salt;
            """, (acc["user_id"], acc["full_name"], acc["role"], acc["password_hash"], acc["salt"]))

        # Remove any unauthorized user accounts
        placeholders = ",".join("?" for _ in AUTHORIZED_ACCOUNTS)
        cursor.execute(
            f"DELETE FROM users WHERE user_id NOT IN ({placeholders})",
            list(AUTHORIZED_ACCOUNTS.keys())
        )

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

        logger.info("Restricted database schema verified with 5 authorized accounts at %s", DB_PATH)

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
