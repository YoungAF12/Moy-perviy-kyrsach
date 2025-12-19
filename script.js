// Конфигурация Firebase - ЗАМЕНИТЕ ЭТИ ДАННЫЕ СВОИМИ!
const firebaseConfig = {
  apiKey: "AIzaSyDqnau8N2mHjhOTMpxXqYe8EDGfxqGqQn0",
  authDomain: "my-first-kyrsachic.firebaseapp.com",
  projectId: "my-first-kyrsachic",
  storageBucket: "my-first-kyrsachic.firebasestorage.app",
  messagingSenderId: "741117010262",
  appId: "1:741117010262:web:2972f2e62517ccc2b9f6f7",
  measurementId: "G-81YS0ZHEXX"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM элементы
const pages = {
    home: document.getElementById('homePage'),
    library: document.getElementById('libraryPage'),
    login: document.getElementById('loginPage'),
    register: document.getElementById('registerPage'),
    dashboard: document.getElementById('dashboardPage')
};

const navLinks = {
    home: document.getElementById('homeLink'),
    library: document.getElementById('libraryLink'),
    login: document.getElementById('loginLink'),
    register: document.getElementById('registerLink'),
    dashboard: document.getElementById('dashboardLink'),
    logout: document.getElementById('logoutLink')
};

const userInfo = document.getElementById('userInfo');
const userEmail = document.getElementById('userEmail');
const booksContainer = document.getElementById('booksContainer');
const adminBooksList = document.getElementById('adminBooksList');
const searchInput = document.getElementById('searchInput');
const bookModal = document.getElementById('bookModal');
const modalContent = document.getElementById('modalContent');
const notification = document.getElementById('notification');

// Текущий пользователь
let currentUser = null;
let allBooks = [];

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initEventListeners();
    checkAuthState();
    loadBooks();
});

// Инициализация обработчиков событий
function initEventListeners() {
    // Навигация
    navLinks.home.addEventListener('click', () => showPage('home'));
    navLinks.library.addEventListener('click', () => showPage('library'));
    navLinks.login.addEventListener('click', () => showPage('login'));
    navLinks.register.addEventListener('click', () => showPage('register'));
    navLinks.dashboard.addEventListener('click', () => showPage('dashboard'));
    navLinks.logout.addEventListener('click', logout);
    
    // Кнопка "Начать чтение"
    document.getElementById('exploreBtn').addEventListener('click', () => showPage('library'));
    
    // Переключение между входом и регистрацией
    document.getElementById('goToRegister').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('register');
    });
    
    document.getElementById('goToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('login');
    });
    
    // Формы
    document.getElementById('loginForm').addEventListener('submit', loginUser);
    document.getElementById('registerForm').addEventListener('submit', registerUser);
    document.getElementById('addBookForm').addEventListener('submit', addBook);
    
    // Поиск
    searchInput.addEventListener('input', filterBooks);
    
    // Модальное окно
    document.querySelector('.close-modal').addEventListener('click', () => {
        bookModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === bookModal) {
            bookModal.style.display = 'none';
        }
    });
}

// Показать страницу
function showPage(pageName) {
    // Скрыть все страницы
    Object.values(pages).forEach(page => {
        page.classList.remove('active');
    });
    
    // Убрать активный класс у всех ссылок
    Object.values(navLinks).forEach(link => {
        link.classList.remove('active');
    });
    
    // Показать нужную страницу
    pages[pageName].classList.add('active');
    
    // Активировать нужную ссылку
    if (navLinks[pageName]) {
        navLinks[pageName].classList.add('active');
    }
    
    // Загрузить книги если это библиотека
    if (pageName === 'library') {
        loadBooks();
    }
    
    // Загрузить книги для админки
    if (pageName === 'dashboard' && currentUser) {
        loadAdminBooks();
    }
}

// Проверка состояния аутентификации
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        updateUI();
        
        if (user) {
            // Проверяем, является ли пользователь админом
            checkIfAdmin(user.email);
        }
    });
}

// Обновление интерфейса
function updateUI() {
    if (currentUser) {
        // Показать пользовательскую информацию
        userInfo.style.display = 'flex';
        userEmail.textContent = currentUser.email;
        
        // Показать/скрыть элементы навигации
        navLinks.login.style.display = 'none';
        navLinks.register.style.display = 'none';
        navLinks.logout.style.display = 'flex';
        
        // Проверить админские права
        if (isAdminEmail(currentUser.email)) {
            navLinks.dashboard.style.display = 'flex';
        } else {
            navLinks.dashboard.style.display = 'none';
        }
    } else {
        // Скрыть пользовательскую информацию
        userInfo.style.display = 'none';
        
        // Показать элементы навигации
        navLinks.login.style.display = 'flex';
        navLinks.register.style.display = 'flex';
        navLinks.logout.style.display = 'none';
        navLinks.dashboard.style.display = 'none';
        
        // Если на дашборде, перейти на главную
        if (pages.dashboard.classList.contains('active')) {
            showPage('home');
        }
    }
}

// Проверка админского email
function isAdminEmail(email) {
    // Здесь можно добавить логику проверки
    // Например, проверять в базе данных или по списку
    const adminEmails = ['admin@example.com', 'your-email@gmail.com'];
    return adminEmails.includes(email);
}

// Проверка админских прав
function checkIfAdmin(email) {
    // Для простоты - проверка по email
    // В реальном приложении лучше использовать Firestore для хранения ролей
    console.log('Проверка прав для:', email);
}

// Вход пользователя
async function loginUser(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showNotification('Вход выполнен успешно!', 'success');
        showPage('library');
        document.getElementById('loginForm').reset();
    } catch (error) {
        showNotification(getErrorMessage(error.code), 'error');
    }
}

// Регистрация пользователя
async function registerUser(e) {
    e.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }
    
    try {
        await auth.createUserWithEmailAndPassword(email, password);
        showNotification('Регистрация успешна!', 'success');
        showPage('library');
        document.getElementById('registerForm').reset();
    } catch (error) {
        showNotification(getErrorMessage(error.code), 'error');
    }
}

// Выход
async function logout() {
    try {
        await auth.signOut();
        showNotification('Вы вышли из системы', 'success');
        showPage('home');
    } catch (error) {
        showNotification('Ошибка при выходе', 'error');
    }
}

// Загрузка книг
async function loadBooks() {
    booksContainer.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загружаем книги...</p>
        </div>
    `;
    
    try {
        const snapshot = await db.collection('books').get();
        allBooks = [];
        
        booksContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const book = { id: doc.id, ...doc.data() };
            allBooks.push(book);
            renderBookCard(book);
        });
        
        if (allBooks.length === 0) {
            booksContainer.innerHTML = `
                <div class="no-books">
                    <i class="fas fa-book-open" style="font-size: 4rem; color: white; margin-bottom: 1rem;"></i>
                    <h3 style="color: white;">Пока нет книг в библиотеке</h3>
                    <p style="color: rgba(255,255,255,0.8);">Администратор скоро добавит новые книги</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        showNotification('Ошибка загрузки книг', 'error');
    }
}

// Отображение карточки книги
function renderBookCard(book) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.id = book.id;
    
    // Используем стандартную обложку если нет своей
    const coverUrl = book.coverUrl || `https://via.placeholder.com/300x200/667eea/ffffff?text=${encodeURIComponent(book.title.substring(0, 20))}`;
    
    bookCard.innerHTML = `
        <div class="book-cover" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <i class="fas fa-book"></i>
        </div>
        <div class="book-info">
            <h3>${book.title}</h3>
            <p><i class="fas fa-user"></i> ${book.author || 'Неизвестный автор'}</p>
            <p><i class="fas fa-tag"></i> ${book.genre || 'Не указан'}</p>
            <div class="book-genre">PDF</div>
            <button class="btn-primary download-btn" style="width: 100%;">
                <i class="fas fa-download"></i> Скачать
            </button>
            <button class="btn-success view-btn" style="width: 100%; margin-top: 10px;">
                <i class="fas fa-info-circle"></i> Подробнее
            </button>
        </div>
    `;
    
    // Обработчики для кнопок
    bookCard.querySelector('.download-btn').addEventListener('click', () => downloadBook(book));
    bookCard.querySelector('.view-btn').addEventListener('click', () => showBookDetails(book));
    
    booksContainer.appendChild(bookCard);
}

// Скачивание книги
function downloadBook(book) {
    if (!currentUser) {
        showNotification('Для скачивания необходимо войти в систему', 'error');
        showPage('login');
        return;
    }
    
    if (!book.downloadUrl) {
        showNotification('Ссылка для скачивания не найдена', 'error');
        return;
    }
    
    showNotification('Начинаем скачивание...', 'success');
    
    // Создаем временную ссылку для скачивания
    const link = document.createElement('a');
    link.href = book.downloadUrl;
    link.download = `${book.title}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Логируем скачивание
    logDownload(book);
}

// Логирование скачивания
async function logDownload(book) {
    try {
        await db.collection('downloads').add({
            bookId: book.id,
            bookTitle: book.title,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Ошибка логирования:', error);
    }
}

// Показать детали книги
function showBookDetails(book) {
    modalContent.innerHTML = `
        <h2>${book.title}</h2>
        <p><strong>Автор:</strong> ${book.author || 'Неизвестный автор'}</p>
        <p><strong>Жанр:</strong> ${book.genre || 'Не указан'}</p>
        <p><strong>Описание:</strong> ${book.description || 'Описание отсутствует'}</p>
        <p><strong>Размер файла:</strong> ${book.fileSize || 'Неизвестно'}</p>
        <p><strong>Дата добавления:</strong> ${book.addedDate ? new Date(book.addedDate.seconds * 1000).toLocaleDateString() : 'Неизвестно'}</p>
        <div style="margin-top: 2rem;">
            <button class="btn-primary download-from-modal" style="width: 100%;">
                <i class="fas fa-download"></i> Скачать книгу (PDF)
            </button>
        </div>
    `;
    
    // Обработчик для скачивания из модального окна
    modalContent.querySelector('.download-from-modal').addEventListener('click', () => {
        downloadBook(book);
        bookModal.style.display = 'none';
    });
    
    bookModal.style.display = 'block';
}

// Фильтрация книг
function filterBooks() {
    const searchTerm = searchInput.value.toLowerCase();
    
    document.querySelectorAll('.book-card').forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const author = card.querySelector('p:nth-child(2)').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || author.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Добавление книги (админ)
async function addBook(e) {
    e.preventDefault();
    
    if (!currentUser || !isAdminEmail(currentUser.email)) {
        showNotification('Требуются права администратора', 'error');
        return;
    }
    
    const book = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        description: document.getElementById('bookDescription').value,
        genre: document.getElementById('bookGenre').value,
        coverUrl: document.getElementById('bookCover').value || null,
        downloadUrl: document.getElementById('googleDriveLink').value,
        addedDate: firebase.firestore.FieldValue.serverTimestamp(),
        addedBy: currentUser.email
    };
    
    // Валидация ссылки Google Drive
    if (!isValidGoogleDriveLink(book.downloadUrl)) {
        showNotification('Пожалуйста, используйте прямую ссылку на PDF файл в Google Drive', 'error');
        return;
    }
    
    try {
        await db.collection('books').add(book);
        showNotification('Книга успешно добавлена!', 'success');
        document.getElementById('addBookForm').reset();
        
        // Обновить список книг в библиотеке
        loadBooks();
        loadAdminBooks();
    } catch (error) {
        showNotification('Ошибка при добавлении книги', 'error');
        console.error('Ошибка:', error);
    }
}

// Проверка ссылки Google Drive
function isValidGoogleDriveLink(url) {
    return url.includes('drive.google.com') && (url.includes('/file/d/') || url.includes('uc?id=') || url.includes('export=download'));
}

// Загрузка книг для админки
async function loadAdminBooks() {
    try {
        const snapshot = await db.collection('books').get();
        adminBooksList.innerHTML = '';
        
        if (snapshot.empty) {
            adminBooksList.innerHTML = '<p>Нет книг в базе данных</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const book = doc.data();
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            bookItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f7fafc; border-radius: 10px; margin-bottom: 10px;">
                    <div>
                        <strong>${book.title}</strong>
                        <p style="margin: 5px 0; color: #718096;">${book.author} | ${book.genre}</p>
                        <small style="color: #a0aec0;">Добавлено: ${book.addedDate ? new Date(book.addedDate.seconds * 1000).toLocaleDateString() : 'Неизвестно'}</small>
                    </div>
                    <button class="delete-book" data-id="${doc.id}" style="background: #fc8181; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            adminBooksList.appendChild(bookItem);
        });
        
        // Добавить обработчики удаления
        document.querySelectorAll('.delete-book').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const bookId = e.target.closest('.delete-book').dataset.id;
                if (confirm('Удалить эту книгу?')) {
                    try {
                        await db.collection('books').doc(bookId).delete();
                        showNotification('Книга удалена', 'success');
                        loadAdminBooks();
                        loadBooks();
                    } catch (error) {
                        showNotification('Ошибка при удалении', 'error');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
    }
}

// Показать уведомление
function showNotification(message, type) {
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.background = type === 'success' ? 
        'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 
        'linear-gradient(135deg, #f56565 0%, #c53030 100%)';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Получить понятное сообщение об ошибке
function getErrorMessage(errorCode) {
    const messages = {
        'auth/invalid-email': 'Неверный формат email',
        'auth/user-disabled': 'Аккаунт отключен',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/email-already-in-use': 'Email уже используется',
        'auth/weak-password': 'Пароль слишком простой',
        'auth/operation-not-allowed': 'Операция не разрешена',
        'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже'
    };
    
    return messages[errorCode] || 'Произошла ошибка. Попробуйте снова.';
}

// Для отладки: вывод в консоль
console.log('Приложение инициализировано');
