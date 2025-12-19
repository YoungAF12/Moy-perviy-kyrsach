// ====================
// КОНФИГУРАЦИЯ FIREBASE
// ====================
// ВАЖНО: Замените эти данные своими из Firebase Console!
const firebaseConfig = {
    apiKey: "ВАШ_API_KEY",
    authDomain: "ВАШ_ПРОЕКТ.firebaseapp.com",
    projectId: "ВАШ_PROJECT_ID",
    storageBucket: "ВАШ_ПРОЕКТ.appspot.com",
    messagingSenderId: "ВАШ_SENDER_ID",
    appId: "ВАШ_APP_ID"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ====================
// ПЕРЕМЕННЫЕ
// ====================
let allBooks = [];
let totalDownloads = 0;

// ====================
// DOM ЭЛЕМЕНТЫ
// ====================
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const resetFilters = document.getElementById('resetFilters');
const totalBooksElement = document.getElementById('totalBooks');
const totalDownloadsElement = document.getElementById('totalDownloads');

// ====================
// ЗАГРУЗКА КНИГ
// ====================
async function loadBooks() {
    try {
        // Показываем индикатор загрузки
        booksContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Загружаем книги из библиотеки...</p>
            </div>
        `;
        
        // Получаем все книги из коллекции "books"
        const snapshot = await db.collection('books').get();
        
        allBooks = [];
        totalDownloads = 0;
        
        snapshot.forEach(doc => {
            const book = {
                id: doc.id,
                ...doc.data()
            };
            allBooks.push(book);
            
            // Суммируем количество скачиваний
            if (book.downloads) {
                totalDownloads += Number(book.downloads) || 0;
            }
        });
        
        // Обновляем статистику
        updateStats();
        
        // Отображаем книги
        displayBooks(allBooks);
        
        console.log(`Загружено ${allBooks.length} книг`);
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        booksContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Ошибка загрузки книг</h3>
                <p>Проверьте подключение к интернету и настройки Firebase</p>
            </div>
        `;
    }
}

// ====================
// ОТОБРАЖЕНИЕ КНИГ
// ====================
function displayBooks(books) {
    if (books.length === 0) {
        booksContainer.innerHTML = `
            <div class="no-books">
                <i class="fas fa-book"></i>
                <h3>Книги не найдены</h3>
                <p>Попробуйте изменить параметры поиска</p>
            </div>
        `;
        return;
    }
    
    booksContainer.innerHTML = '';
    
    books.forEach(book => {
        const bookCard = createBookCard(book);
        booksContainer.appendChild(bookCard);
    });
}

// ====================
// СОЗДАНИЕ КАРТОЧКИ КНИГИ
// ====================
function createBookCard(book) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    
    // Проверяем и исправляем ссылку на Google Drive если нужно
    let downloadUrl = book.fileUrl || book.downloadUrl || '';
    
    // Убедимся, что это прямая ссылка для скачивания
    if (downloadUrl.includes('drive.google.com/file/d/')) {
        // Преобразуем ссылку просмотра в ссылку скачивания
        const fileId = downloadUrl.match(/\/d\/(.*?)\//)?.[1];
        if (fileId) {
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
    }
    
    // Используем обложку из книги или стандартную
    const coverUrl = book.cover || book.coverUrl || 
        `https://images.unsplash.com/photo-1544947958-fa97a98d237f?auto=format&fit=crop&w=400&q=80`;
    
    // Форматируем описание
    const description = book.description ? 
        (book.description.length > 120 ? book.description.substring(0, 120) + '...' : book.description) : 
        'Описание отсутствует';
    
    // Создаем HTML карточки
    bookCard.innerHTML = `
        <div class="book-cover">
            <img src="${coverUrl}" alt="${book.title}" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'">
            <div class="book-category">${book.category || 'Без категории'}</div>
        </div>
        
        <div class="book-info">
            <h3 class="book-title">${book.title || 'Без названия'}</h3>
            
            <div class="book-author">
                <i class="fas fa-user-edit"></i>
                ${book.author || 'Автор неизвестен'}
            </div>
            
            <p class="book-description">${description}</p>
            
            <div class="book-meta">
                <div class="book-meta-item">
                    <i class="fas fa-calendar"></i>
                    ${book.year || 'Год неизвестен'}
                </div>
                <div class="book-meta-item">
                    <i class="fas fa-file-pdf"></i>
                    PDF
                </div>
                ${book.pages ? `
                <div class="book-meta-item">
                    <i class="fas fa-file-alt"></i>
                    ${book.pages} стр.
                </div>
                ` : ''}
            </div>
            
            <button class="download-btn" data-id="${book.id}" data-url="${downloadUrl}">
                <i class="fas fa-download"></i> Скачать книгу
            </button>
            
            <div class="download-count">
                <i class="fas fa-download"></i> 
                Скачали: ${book.downloads || 0} раз
            </div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки скачивания
    const downloadBtn = bookCard.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => downloadBook(book.id, downloadUrl, book.title));
    
    return bookCard;
}

// ====================
// СКАЧИВАНИЕ КНИГИ
// ====================
async function downloadBook(bookId, fileUrl, bookTitle) {
    if (!fileUrl) {
        alert('Ссылка для скачивания не найдена');
        return;
    }
    
    try {
        // 1. Обновляем счетчик скачиваний в Firebase
        const bookRef = db.collection('books').doc(bookId);
        await bookRef.update({
            downloads: firebase.firestore.FieldValue.increment(1)
        });
        
        // 2. Увеличиваем общий счетчик
        totalDownloads++;
        updateStats();
        
        // 3. Скачиваем файл
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = `${bookTitle}.pdf`;
        link.target = '_blank';
        
        // Добавляем временные параметры для Google Drive
        if (fileUrl.includes('drive.google.com')) {
            // Для Google Drive добавляем параметр принудительного скачивания
            if (!fileUrl.includes('export=download')) {
                link.href = fileUrl + '&export=download';
            }
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 4. Показываем уведомление
        showNotification(`Книга "${bookTitle}" скачивается!`);
        
        // 5. Обновляем отображение счетчика на карточке
        const downloadBtn = document.querySelector(`[data-id="${bookId}"]`);
        if (downloadBtn) {
            const countElement = downloadBtn.parentElement.querySelector('.download-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent.match(/\d+/)) || 0;
                countElement.innerHTML = `<i class="fas fa-download"></i> Скачали: ${currentCount + 1} раз`;
            }
        }
        
    } catch (error) {
        console.error('Ошибка при скачивании:', error);
        alert('Произошла ошибка при скачивании. Попробуйте еще раз.');
    }
}

// ====================
// ФИЛЬТРАЦИЯ И ПОИСК
// ====================
function setupFilters() {
    // Поиск
    searchInput.addEventListener('input', () => {
        filterBooks();
    });
    
    // Фильтр по категории
    categoryFilter.addEventListener('change', () => {
        filterBooks();
    });
    
    // Сброс фильтров
    resetFilters.addEventListener('click', () => {
        searchInput.value = '';
        categoryFilter.value = '';
        displayBooks(allBooks);
    });
}

function filterBooks() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    
    const filteredBooks = allBooks.filter(book => {
        // Поиск по названию и автору
        const matchesSearch = !searchTerm || 
            (book.title && book.title.toLowerCase().includes(searchTerm)) ||
            (book.author && book.author.toLowerCase().includes(searchTerm));
        
        // Фильтр по категории
        const matchesCategory = !selectedCategory || 
            (book.category && book.category === selectedCategory);
        
        return matchesSearch && matchesCategory;
    });
    
    displayBooks(filteredBooks);
}

// ====================
// ОБНОВЛЕНИЕ СТАТИСТИКИ
// ====================
function updateStats() {
    totalBooksElement.textContent = allBooks.length;
    totalDownloadsElement.textContent = totalDownloads;
}

// ====================
// УВЕДОМЛЕНИЯ
// ====================
function showNotification(message) {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #48bb78;
        color: white;
        padding: 1rem 2rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i> ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Добавляем CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .error-message, .no-books {
        grid-column: 1 / -1;
        text-align: center;
        padding: 4rem;
        background: white;
        border-radius: 15px;
        color: #2d3748;
    }
    
    .error-message i, .no-books i {
        font-size: 3rem;
        color: #f56565;
        margin-bottom: 1rem;
    }
    
    .no-books i {
        color: #667eea;
    }
`;
document.head.appendChild(style);

// ====================
// ИНИЦИАЛИЗАЦИЯ
// ====================
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем книги
    loadBooks();
    
    // Настраиваем фильтры
    setupFilters();
    
    // Обновляем каждые 30 секунд на случай добавления новых книг
    setInterval(loadBooks, 30000);
});
