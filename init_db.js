const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/library.db');

db.serialize(() => {
    // Таблица книг
    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        description TEXT,
        file_path TEXT,
        tags TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Таблица пользовательского прогресса
    db.run(`CREATE TABLE IF NOT EXISTS reading_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        last_page INTEGER DEFAULT 1,
        total_pages INTEGER,
        last_read DATETIME,
        notes TEXT,
        FOREIGN KEY (book_id) REFERENCES books(id)
    )`);
    
    console.log('Database initialized');
});

db.close();
