const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: './books/uploads/',
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Подключение к базе данных
const db = new sqlite3.Database('./database/library.db');

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Маршруты API

// Получить все книги
app.get('/api/books', (req, res) => {
    db.all('SELECT * FROM books', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Загрузить новую книгу
app.post('/api/books/upload', upload.single('bookFile'), (req, res) => {
    const { title, author, description, tags } = req.body;
    
    db.run(
        'INSERT INTO books (title, author, description, file_path, tags) VALUES (?, ?, ?, ?, ?)',
        [title, author, description, req.file.filename, tags],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, message: 'Book uploaded successfully' });
        }
    );
});

// Обновить прогресс чтения
app.post('/api/progress', (req, res) => {
    const { bookId, lastPage, notes } = req.body;
    
    db.run(
        `INSERT OR REPLACE INTO reading_progress (book_id, last_page, notes, last_read) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [bookId, lastPage, notes],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Progress updated' });
        }
    );
});

// Получить книги по тегу
app.get('/api/books/tag/:tag', (req, res) => {
    const tag = req.params.tag;
    db.all(
        'SELECT * FROM books WHERE tags LIKE ?',
        [`%${tag}%`],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Upload directory: ${path.join(__dirname, 'books/uploads')}`);
});
