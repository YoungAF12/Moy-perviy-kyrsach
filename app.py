from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, send_from_directory
import os
import shutil
from pathlib import Path
from werkzeug.utils import secure_filename
import json

from database import (
    add_book, get_all_books, search_books, 
    delete_book, update_book_progress,
    get_db_connection
)
from book_parser import extract_book_info, is_valid_image

# Конфигурация
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = Path(__file__).parent / 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB

# Разрешенные расширения
ALLOWED_EXTENSIONS = {
    'pdf', 'epub', 'mobi', 'djvu',
    'jpg', 'jpeg', 'png', 'gif',
    'txt', 'md', 'doc', 'docx'
}

def allowed_file(filename):
    """Проверка расширения файла"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_folder():
    """Создание папки для загрузок, если её нет"""
    upload_folder = app.config['UPLOAD_FOLDER']
    upload_folder.mkdir(exist_ok=True)
    return upload_folder

@app.route('/')
def index():
    """Главная страница - список книг"""
    sort_by = request.args.get('sort_by', 'added_date')
    order = request.args.get('order', 'DESC')
    books = get_all_books(sort_by, order)
    return render_template('index.html', books=books, sort_by=sort_by, order=order)

@app.route('/upload', methods=['GET', 'POST'])
def upload_book():
    """Загрузка новой книги"""
    if request.method == 'POST':
        # Проверяем, есть ли файл в запросе
        if 'file' not in request.files:
            return redirect(request.url)
        
        file = request.files['file']
        
        # Если пользователь не выбрал файл
        if file.filename == '':
            return redirect(request.url)
        
        if file and allowed_file(file.filename):
            # Безопасное имя файла
            filename = secure_filename(file.filename)
            upload_folder = ensure_upload_folder()
            file_path = upload_folder / filename
            
            # Сохраняем файл
            file.save(file_path)
            
            # Извлекаем метаданные
            book_info = extract_book_info(str(file_path))
            
            # Получаем теги из формы
            tags_str = request.form.get('tags', '')
            tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
            
            # Добавляем книгу в базу данных
            book_id = add_book(
                title=request.form.get('title') or book_info['title'],
                author=request.form.get('author') or book_info['author'],
                file_path=str(file_path),
                file_type=book_info['file_type'],
                file_size=book_info['file_size'],
                tags=tags
            )
            
            return redirect(url_for('index'))
    
    return render_template('upload.html')

@app.route('/search')
def search():
    """Поиск книг"""
    query = request.args.get('q', '')
    search_in = request.args.get('in', 'all')
    
    if query:
        books = search_books(query, search_in)
    else:
        books = get_all_books()
    
    return render_template('index.html', books=books, search_query=query)

@app.route('/book/<int:book_id>')
def view_book(book_id):
    """Просмотр информации о книге"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM books WHERE id = ?', (book_id,))
    book = cursor.fetchone()
    
    if not book:
        conn.close()
        return "Книга не найдена", 404
    
    # Получаем заметки для этой книги
    cursor.execute('SELECT * FROM notes WHERE book_id = ? ORDER BY created_at DESC', (book_id,))
    notes = cursor.fetchall()
    
    # Получаем закладки
    cursor.execute('SELECT * FROM bookmarks WHERE book_id = ? ORDER BY page_number', (book_id,))
    bookmarks = cursor.fetchall()
    
    conn.close()
    
    # Преобразуем теги из JSON
    import json
    tags = json.loads(book['tags']) if book['tags'] else []
    
    return render_template('book_detail.html', 
                         book=dict(book), 
                         notes=notes, 
                         bookmarks=bookmarks,
                         tags=tags)

@app.route('/read/<int:book_id>')
def read_book(book_id):
    """Чтение книги"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM books WHERE id = ?', (book_id,))
    book = cursor.fetchone()
    conn.close()
    
    if not book:
        return "Книга не найдена", 404
    
    # Для PDF используем PDF.js
    if book['file_type'] == '.pdf':
        return render_template('reader.html', book=dict(book))
    
    # Для изображений - простой просмотрщик
    elif book['file_type'] in ['.jpg', '.jpeg', '.png', '.gif']:
        return render_template('image_viewer.html', book=dict(book))
    
    else:
        return "Формат не поддерживается для чтения онлайн", 400

@app.route('/delete/<int:book_id>', methods=['POST'])
def delete_book_route(book_id):
    """Удаление книги"""
    delete_book(book_id)
    return redirect(url_for('index'))

@app.route('/update_progress/<int:book_id>', methods=['POST'])
def update_progress(book_id):
    """Обновление прогресса чтения"""
    progress = request.form.get('progress', 0)
    update_book_progress(book_id, int(progress))
    return jsonify({'success': True})

@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    """Сервис для отдачи загруженных файлов"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/export_library')
def export_library():
    """Экспорт библиотеки в ZIP архив"""
    import tempfile
    import zipfile
    
    # Создаем временный файл для архива
    temp_dir = tempfile.mkdtemp()
    zip_path = Path(temp_dir) / 'library_backup.zip'
    
    # Создаем ZIP архив
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Добавляем базу данных
        db_path = Path(__file__).parent / 'books.db'
        if db_path.exists():
            zipf.write(db_path, 'books.db')
        
        # Добавляем все файлы из uploads
        upload_folder = app.config['UPLOAD_FOLDER']
        if upload_folder.exists():
            for file_path in upload_folder.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(upload_folder.parent)
                    zipf.write(file_path, arcname)
    
    # Отправляем архив пользователю
    return send_file(
        zip_path,
        as_attachment=True,
        download_name='it_bookshelf_backup.zip',
        mimetype='application/zip'
    )

@app.route('/stats')
def stats():
    """Статистика библиотеки"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Общая статистика
    cursor.execute('SELECT COUNT(*) as total_books FROM books')
    total_books = cursor.fetchone()['total_books']
    
    cursor.execute('SELECT SUM(file_size) as total_size FROM books')
    total_size = cursor.fetchone()['total_size'] or 0
    
    cursor.execute('''
        SELECT file_type, COUNT(*) as count 
        FROM books 
        GROUP BY file_type 
        ORDER BY count DESC
    ''')
    formats = cursor.fetchall()
    
    # Книги по тегам
    cursor.execute('''
        SELECT tag, COUNT(*) as count FROM (
            SELECT json_each.value as tag
            FROM books, json_each(books.tags)
        ) GROUP BY tag ORDER BY count DESC LIMIT 10
    ''')
    top_tags = cursor.fetchall()
    
    conn.close()
    
    return render_template('stats.html',
                         total_books=total_books,
                         total_size=total_size,
                         formats=formats,
                         top_tags=top_tags)

if __name__ == '__main__':
    # Создаем необходимые папки
    ensure_upload_folder()
    
    # Запускаем Flask
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True  # В продакшене установите debug=False
    )
