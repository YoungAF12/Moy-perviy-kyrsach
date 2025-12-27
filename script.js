class BookLibrary {
    constructor() {
        this.dbName = 'it-library-db';
        this.currentBooks = [];
        this.selectedFiles = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadBooks();
        this.updateStats();
    }

    // Инициализация базы данных
    initDatabase() {
        if (!localStorage.getItem(this.dbName)) {
            const initialData = {
                books: [],
                settings: {
                    sortBy: 'date-desc',
                    view: 'grid',
                    theme: 'light'
                },
                lastUpdate: new Date().toISOString()
            };
            localStorage.setItem(this.dbName, JSON.stringify(initialData));
        }
        return JSON.parse(localStorage.getItem(this.dbName));
    }

    // Сохранение данных
    saveDatabase(data) {
        data.lastUpdate = new Date().toISOString();
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    // Получение формата файла
    getFileFormat(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const formats = {
            'pdf': 'PDF',
            'epub': 'EPUB',
            'txt': 'TXT',
            'docx': 'DOCX',
            'doc': 'DOC',
            'mobi': 'MOBI'
        };
        return formats[ext] || ext.toUpperCase();
    }

    // Создание обложки
    createBookCover(title, format) {
        const colors = [
            'linear-gradient(135deg, #ff6b35, #f97316)',
            'linear-gradient(135deg, #2d3748, #4a5568)',
            'linear-gradient(135deg, #1a202c, #2d3748)',
            'linear-gradient(135deg, #ff8b5c, #ff6b35)'
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return `<div class="book-cover" style="background: ${color};">
            <div style="font-size: 48px; color: white; opacity: 0.9; font-weight: bold;">
                ${title.charAt(0).toUpperCase()}
            </div>
            <div class="format-badge">${format}</div>
        </div>`;
    }

    // Отображение книги
    renderBook(book) {
        const readStatus = book.read ? 'Прочитано' : 'Не прочитано';
        const readClass = book.read ? 'finished' : 'unread';
        const favoriteClass = book.favorite ? 'active' : '';
        
        return `
            <div class="book-card" data-id="${book.id}" data-format="${book.format.toLowerCase()}" data-status="${readClass}">
                ${book.coverUrl ? 
                    `<img src="${book.coverUrl}" alt="${book.title}" class="book-cover">` : 
                    this.createBookCover(book.title, book.format)
                }
                <div class="book-info">
                    <h3 class="book-title" title="${book.title}">${book.title}</h3>
                    <div class="book-meta">
                        <div class="meta-item">
                            <i class="fas fa-file"></i>
                            <span>${book.format} • ${(book.size / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${new Date(book.addedDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-circle ${book.read ? 'finished' : 'unread'}"></i>
                            <span>${readStatus}</span>
                        </div>
                    </div>
                    <div class="book-actions">
                        <button class="action-btn read" onclick="library.readBook('${book.id}')">
                            <i class="fas fa-eye"></i> Читать
                        </button>
                        <button class="action-btn favorite ${favoriteClass}" 
                                onclick="library.toggleFavorite('${book.id}')">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="action-btn delete" onclick="library.deleteBook('${book.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Загрузка и отображение книг
    loadBooks() {
        const db = this.initDatabase();
        this.currentBooks = db.books;
        
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const activeFilter = document.querySelector('.filter-tag.active')?.dataset.filter || 'all';
        const activeFormat = document.querySelector('.format-btn.active')?.dataset.format || 'all';
        const sortBy = db.settings?.sortBy || 'date-desc';
        
        let filteredBooks = [...this.currentBooks];
        
        // Поиск
        if (searchTerm) {
            filteredBooks = filteredBooks.filter(book => 
                book.title.toLowerCase().includes(searchTerm) ||
                book.format.toLowerCase().includes(searchTerm) ||
                (book.tags && book.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        
        // Фильтрация по статусу
        if (activeFilter === 'unread') {
            filteredBooks = filteredBooks.filter(book => !book.read);
        } else if (activeFilter === 'reading') {
            filteredBooks = filteredBooks.filter(book => book.reading);
        } else if (activeFilter === 'finished') {
            filteredBooks = filteredBooks.filter(book => book.read);
        } else if (activeFilter === 'favorite') {
            filteredBooks = filteredBooks.filter(book => book.favorite);
        }
        
        // Фильтрация по формату
        if (activeFormat !== 'all') {
            filteredBooks = filteredBooks.filter(book => 
                book.format.toLowerCase() === activeFormat
            );
        }
        
        // Сортировка
        filteredBooks.sort((a, b) => {
            switch(sortBy) {
                case 'date-desc':
                    return new Date(b.addedDate) - new Date(a.addedDate);
                case 'date-asc':
                    return new Date(a.addedDate) - new Date(b.addedDate);
                case 'name-asc':
                    return a.title.localeCompare(b.title, 'ru');
                case 'name-desc':
                    return b.title.localeCompare(a.title, 'ru');
                case 'size':
                    return b.size - a.size;
                default:
                    return new Date(b.addedDate) - new Date(a.addedDate);
            }
        });
        
        // Отображение
        const container = document.getElementById('booksContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (filteredBooks.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            container.innerHTML = filteredBooks.map(book => this.renderBook(book)).join('');
        }
        
        this.updateStats();
    }

    // Обновление статистики
    updateStats() {
        const totalBooks = this.currentBooks.length;
        const favBooks = this.currentBooks.filter(book => book.favorite).length;
        const totalSize = this.currentBooks.reduce((sum, book) => sum + book.size, 0) / (1024 * 1024);
        
        document.getElementById('totalBooks').textContent = totalBooks;
        document.getElementById('favBooks').textContent = favBooks;
        document.getElementById('totalSize').textContent = totalSize.toFixed(1);
        
        const db = this.initDatabase();
        const lastUpdate = new Date(db.lastUpdate);
        const today = new Date();
        const diffTime = Math.abs(today - lastUpdate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let lastUpdateText;
        if (diffDays === 1) {
            lastUpdateText = 'сегодня';
        } else if (diffDays === 2) {
            lastUpdateText = 'вчера';
        } else if (diffDays < 7) {
            lastUpdateText = `${diffDays} дня назад`;
        } else {
            lastUpdateText = lastUpdate.toLocaleDateString('ru-RU');
        }
        
        document.getElementById('lastUpdate').textContent = lastUpdateText;
    }

    // Добавление книги
    async addBook(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const db = this.initDatabase();
                const autoCovers = document.getElementById('autoCovers')?.checked ?? true;
                const addToFav = document.getElementById('addToFav')?.checked ?? false;
                
                const book = {
                    id: 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/-/g, ' '),
                    filename: file.name,
                    format: this.getFileFormat(file.name),
                    size: file.size,
                    addedDate: new Date().toISOString(),
                    read: false,
                    reading: false,
                    favorite: addToFav,
                    lastOpened: null,
                    tags: this.extractTags(file.name),
                    content: e.target.result.split(',')[1]
                };
                
                // В реальном приложении здесь можно добавить генерацию обложки
                if (autoCovers && file.type === 'application/pdf') {
                    // Для PDF можно было бы использовать pdf.js для создания превью
                    book.coverUrl = null;
                }
                
                db.books.push(book);
                this.saveDatabase(db);
                this.loadBooks();
                resolve(book);
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Извлечение тегов из названия файла
    extractTags(filename) {
        const tags = [];
        const name = filename.toLowerCase();
        
        const techTerms = [
            'javascript', 'python', 'java', 'react', 'vue', 'angular',
            'node', 'docker', 'kubernetes', 'aws', 'azure', 'git',
            'sql', 'nosql', 'mongodb', 'postgresql', 'redis',
            'html', 'css', 'sass', 'webpack', 'typescript'
        ];
        
        techTerms.forEach(term => {
            if (name.includes(term)) {
                tags.push(term);
            }
        });
        
        return tags;
    }

    // Чтение книги
    readBook(bookId) {
        const db = this.initDatabase();
        const book = db.books.find(b => b.id === bookId);
        
        if (!book) return;
        
        // Обновляем статус
        book.reading = true;
        book.lastOpened = new Date().toISOString();
        this.saveDatabase(db);
        
        // Открываем книгу
        const blob = this.b64toBlob(book.content, this.getMimeType(book.format));
        const url = URL.createObjectURL(blob);
        
        if (book.format === 'PDF' || book.format === 'EPUB') {
            // Для PDF и EPUB открываем в новой вкладке
            window.open(url, '_blank');
        } else {
            // Для текстовых файлов можно открыть встроенный просмотрщик
            this.showBookViewer(book, url);
        }
        
        // Обновляем интерфейс
        this.loadBooks();
    }

    // Показать просмотрщик книги
    showBookViewer(book, contentUrl) {
        const modal = document.getElementById('bookModal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-book-open"></i> ${book.title}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="book-viewer">
                        ${book.format === 'TXT' ? 
                            `<textarea class="text-viewer" readonly>Загрузка...</textarea>` :
                            `<iframe src="${contentUrl}" class="pdf-viewer"></iframe>`
                        }
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-modal">Закрыть</button>
                    <button class="btn btn-primary" onclick="library.markAsRead('${book.id}')">
                        <i class="fas fa-check"></i> Отметить как прочитанное
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Загрузка текста для TXT файлов
        if (book.format === 'TXT') {
            fetch(contentUrl)
                .then(response => response.text())
                .then(text => {
                    modal.querySelector('.text-viewer').value = text;
                });
        }
        
        // Закрытие модального окна
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
                URL.revokeObjectURL(contentUrl);
            });
        });
    }

    // Отметить как прочитанное
    markAsRead(bookId) {
        const db = this.initDatabase();
        const book = db.books.find(b => b.id === bookId);
        
        if (book) {
            book.read = true;
            book.reading = false;
            this.saveDatabase(db);
            this.loadBooks();
            
            const modal = document.getElementById('bookModal');
            modal.classList.remove('active');
        }
    }

    // Переключение избранного
    toggleFavorite(bookId) {
        const db = this.initDatabase();
        const book = db.books.find(b => b.id === bookId);
        
        if (book) {
            book.favorite = !book.favorite;
            this.saveDatabase(db);
            this.loadBooks();
        }
    }

    // Удаление книги
    deleteBook(bookId) {
        if (confirm('Вы уверены, что хотите удалить эту книгу?')) {
            const db = this.initDatabase();
            db.books = db.books.filter(book => book.id !== bookId);
            this.saveDatabase(db);
            this.loadBooks();
        }
    }

    // Вспомогательные функции
    b64toBlob(b64Data, contentType = '', sliceSize = 512) {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        
        return new Blob(byteArrays, { type: contentType });
    }

    getMimeType(format) {
        const mimes = {
            'PDF': 'application/pdf',
            'EPUB': 'application/epub+zip',
            'TXT': 'text/plain',
            'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'DOC': 'application/msword',
            'MOBI': 'application/x-mobipocket-ebook'
        };
        return mimes[format] || 'application/octet-stream';
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Кнопка добавления книг
        document.getElementById('addBookBtn').addEventListener('click', () => {
            this.showUploadModal();
        });
        
        document.getElementById('addFirstBook').addEventListener('click', () => {
            this.showUploadModal();
        });

        // Выбор файлов
        document.getElementById('selectFiles').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // Drag and drop
        this.setupDragAndDrop();

        // Поиск
        document.getElementById('searchInput').addEventListener('input', () => {
            this.loadBooks();
        });

        // Фильтры
        document.querySelectorAll('.filter-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadBooks();
            });
        });

        // Фильтры по формату
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadBooks();
            });
        });

        // Сортировка
        document.querySelectorAll('[data-sort]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const sortBy = e.target.dataset.sort;
                
                const db = this.initDatabase();
                db.settings.sortBy = sortBy;
                this.saveDatabase(db);
                
                this.loadBooks();
                
                // Обновляем текст кнопки сортировки
                const sortText = e.target.textContent;
                document.querySelector('.dropdown .btn-secondary span').textContent = sortText.split(' ')[1];
            });
        });

        // Переключение вида
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view || e.target.closest('.view-btn').dataset.view;
                
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.view-btn').classList.add('active');
                
                const container = document.getElementById('booksContainer');
                container.className = view === 'list' ? 'books-container list-view' : 'books-container grid-view';
                
                const db = this.initDatabase();
                db.settings.view = view;
                this.saveDatabase(db);
            });
        });

        // Закрытие модальных окон
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('close-modal')) {
                this.hideUploadModal();
            }
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideUploadModal();
            }
        });
    }

    // Drag and Drop
    setupDragAndDrop() {
        const dropArea = document.getElementById('dropArea');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('drag-over');
            }, false);
        });
        
        dropArea.addEventListener('drop', (e) => {
            this.handleFileSelect(e.dataTransfer.files);
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Обработка выбранных файлов
    handleFileSelect(files) {
        const selectedFilesContainer = document.getElementById('selectedFiles');
        selectedFilesContainer.innerHTML = '';
        
        this.selectedFiles = Array.from(files);
        
        // Отображаем выбранные файлы
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button class="remove-file" onclick="library.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            selectedFilesContainer.appendChild(fileItem);
        });
        
        // Активируем кнопку загрузки
        const uploadBtn = document.getElementById('startUpload');
        uploadBtn.disabled = this.selectedFiles.length === 0;
        document.getElementById('fileCount').textContent = this.selectedFiles.length;
    }

    // Удаление файла из списка
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.handleFileSelect(this.selectedFiles);
    }

    // Показать модальное окно загрузки
    showUploadModal() {
        const modal = document.getElementById('uploadModal');
        modal.classList.add('active');
        this.selectedFiles = [];
        document.getElementById('selectedFiles').innerHTML = '';
        document.getElementById('startUpload').disabled = true;
        document.getElementById('fileCount').textContent = '0';
    }

    // Скрыть модальное окно загрузки
    hideUploadModal() {
        const modal = document.getElementById('uploadModal');
        modal.classList.remove('active');
        const bookModal = document.getElementById('bookModal');
        bookModal.classList.remove('active');
    }

    // Загрузка книг
    async uploadBooks() {
        if (this.selectedFiles.length === 0) return;
        
        const uploadBtn = document.getElementById('startUpload');
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        uploadBtn.disabled = true;
        
        try {
            for (const file of this.selectedFiles) {
                await this.addBook(file);
            }
            
            this.hideUploadModal();
            this.showNotification('Книги успешно добавлены!', 'success');
            
        } catch (error) {
            this.showNotification('Ошибка при загрузке книг', 'error');
            console.error('Upload error:', error);
        } finally {
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Загрузить';
            uploadBtn.disabled = false;
        }
    }

    // Показать уведомление
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

// Добавляем стили для уведомлений
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        transform: translateX(120%);
        transition: transform 0.3s ease-out;
        z-index: 10001;
        border-left: 4px solid #ff6b35;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success {
        border-left-color: #10b981;
    }
    
    .notification.error {
        border-left-color: #ef4444;
    }
    
    .notification i {
        font-size: 20px;
    }
    
    .notification.success i {
        color: #10b981;
    }
    
    .notification.error i {
        color: #ef4444;
    }
`;
document.head.appendChild(notificationStyles);

// Инициализация приложения
let library;

document.addEventListener('DOMContentLoaded', () => {
    library = new BookLibrary();
    
    // Инициализация кнопки загрузки
    document.getElementById('startUpload').addEventListener('click', () => {
        library.uploadBooks();
    });
});
