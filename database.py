import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / 'books.db'

def get_db_connection():
    """Создаем подключение к базе данных"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Чтобы результаты были как словари
    return conn

def init_database():
    """Инициализация таблиц в базе данных"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Таблица книг
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT,
            description TEXT,
            file_path TEXT NOT NULL UNIQUE,
            file_type TEXT,
            file_size INTEGER,
            cover_path TEXT,
            tags TEXT DEFAULT '[]',  # Храним как JSON массив
            progress INTEGER DEFAULT 0,
            rating INTEGER DEFAULT 0,
            added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_read TIMESTAMP
        )
    ''')
    
    # Таблица заметок
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER,
            page_number INTEGER,
            text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        )
    ''')
    
    # Таблица закладок
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER,
            page_number INTEGER,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        )
    ''')
    
    # Индексы для быстрого поиска
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_books_tags ON books(tags)')
    
    conn.commit()
    conn.close()
    print(f"База данных инициализирована: {DB_PATH}")

def add_book(title, author, file_path, file_type, file_size, tags=None):
    """Добавление книги в базу данных"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Преобразуем теги в JSON строку
    tags_json = json.dumps(tags) if tags else '[]'
    
    cursor.execute('''
        INSERT INTO books (title, author, file_path, file_type, file_size, tags)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (title, author, file_path, file_type, file_size, tags_json))
    
    book_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return book_id

def get_all_books(sort_by='added_date', order='DESC'):
    """Получение всех книг с сортировкой"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    valid_sort_columns = ['title', 'author', 'added_date', 'last_read', 'rating']
    sort_by = sort_by if sort_by in valid_sort_columns else 'added_date'
    order = 'DESC' if order.upper() == 'DESC' else 'ASC'
    
    cursor.execute(f'''
        SELECT *, 
               json_extract(tags, '$') as tags_array
        FROM books 
        ORDER BY {sort_by} {order}
    ''')
    
    books = cursor.fetchall()
    conn.close()
    
    # Преобразуем Row объекты в словари
    return [dict(book) for book in books]

def search_books(query, search_in='title'):
    """Поиск книг по запросу"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if search_in == 'title':
        cursor.execute('''
            SELECT * FROM books 
            WHERE title LIKE ? 
            ORDER BY title
        ''', (f'%{query}%',))
    elif search_in == 'author':
        cursor.execute('''
            SELECT * FROM books 
            WHERE author LIKE ? 
            ORDER BY author
        ''', (f'%{query}%',))
    elif search_in == 'tags':
        cursor.execute('''
            SELECT * FROM books 
            WHERE tags LIKE ? 
            ORDER BY title
        ''', (f'%{query}%',))
    else:  # поиск везде
        cursor.execute('''
            SELECT * FROM books 
            WHERE title LIKE ? 
               OR author LIKE ? 
               OR tags LIKE ?
            ORDER BY title
        ''', (f'%{query}%', f'%{query}%', f'%{query}%'))
    
    books = cursor.fetchall()
    conn.close()
    return [dict(book) for book in books]

def delete_book(book_id):
    """Удаление книги из базы данных"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Сначала получаем путь к файлу, чтобы удалить его
    cursor.execute('SELECT file_path FROM books WHERE id = ?', (book_id,))
    result = cursor.fetchone()
    
    if result:
        import os
        file_path = result['file_path']
        
        # Удаляем файл книги
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Удаляем запись из БД (каскадом удалятся заметки и закладки)
        cursor.execute('DELETE FROM books WHERE id = ?', (book_id,))
    
    conn.commit()
    conn.close()

def update_book_progress(book_id, progress):
    """Обновление прогресса чтения книги"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE books 
        SET progress = ?, last_read = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (progress, book_id))
    
    conn.commit()
    conn.close()

# Инициализируем БД при импорте
init_database()
