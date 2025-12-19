// Firebase конфигурация - ЗАМЕНИТЕ НА ВАШУ КОНФИГУРАЦИЮ
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

// Данные приложения
let currentUser = null;
let books = [];

// DOM элементы
const elements = {
    // Навигация
    loginBtn: document.getElementById('loginBtn'),
    registerBtn: document.getElementById('registerBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    navLinks: document.querySelectorAll('.nav-link'),
    
    // Модальное окно
    authModal: document.getElementById('authModal'),
    closeModal: document.querySelector('.close-modal'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    
    // Формы
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    registerName: document.getElementById('registerName'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    
    // Страницы
    pages: document.querySelectorAll('.page'),
    
    // Библиотека
    booksContainer: document.getElementById('booksContainer'),
    searchInput: document.getElementById('searchInput'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    
    // Профиль
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    userStats: document.getElementById('userStats'),
    guestMessage: document.getElementById('guestMessage'),
    downloadCount: document.getElementById('downloadCount'),
    favoriteCount: document.getElementById('favoriteCount'),
    readingTime: document.getElementById('readingTime'),
    recentDownloads: document.getElementById('recentDownloads'),
    loginFromProfile: document.getElementById('loginFromProfile'),
    
    // Уведомления
    notification: document.getElementById('notification'),
    notificationText: document.getElementById('notificationText')
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    loadBooks();
    setupEventListeners();
});

// Инициализация Firebase состояния
function initApp() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        updateUI();
        if (user) {
            loadUserData(user.uid);
        }
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href').substring(1);
            switchPage(target);
            elements.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // Кнопки авторизации
    elements.loginBtn.addEventListener('click', () => showAuthModal('login'));
    elements.registerBtn.addEventListener('click', () => showAuthModal('register'));
    elements.logoutBtn.addEventListener('click', logout);
    elements.loginFromProfile.addEventListener('click', () => showAuthModal('login'));
    
    // Модальное окно
    elements.closeModal.addEventListener('click', () => elements.authModal.classList.add('hidden'));
    elements.authModal.addEventListener('click', (e) => {
        if (e.target === elements.authModal) {
            elements.authModal.classList.add('hidden');
        }
    });
    
    // Табы в модальном окне
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            elements.loginForm.classList.toggle('hidden', tab !== 'login');
            elements.registerForm.classList.toggle('hidden', tab !== 'register');
        });
    });
    
    // Форма входа
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await login(
            elements.loginEmail.value,
            elements.loginPassword.value
        );
    });
    
    // Форма регистрации
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await register(
            elements.registerName.value,
            elements.registerEmail.value,
            elements.registerPassword.value
        );
    });
    
    // Поиск книг
    elements.searchInput.addEventListener('input', filterBooks);
    
    // Фильтры книг
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterBooks();
        });
    });
}

// Загрузка книг из Firebase
async function loadBooks() {
    try {
        // Примерные данные книг (в реальном приложении загружайте из Firebase)
        books = [
            {
                id: '1',
                title: 'Введение в программирование',
                author: 'Иван Иванов',
                category: 'education',
                cover: '📚',
                description: 'Основы программирования для начинающих',
                downloadUrl: 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID_1',
                downloads: 150
            },
            {
                id: '2',
                title: 'Мастер и Маргарита',
                author: 'Михаил Булгаков',
                category: 'fiction',
                cover: '📖',
                description: 'Классика русской литературы',
                downloadUrl: 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID_2',
                downloads: 300
            },
            {
                id: '3',
                title: 'Бизнес с нуля',
                author: 'Алексей Петров',
                category: 'business',
                cover: '💼',
                description: 'Практическое руководство',
                downloadUrl: 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID_3',
                downloads: 200
            },
            {
                id: '4',
                title: 'Гарри Поттер и философский камень',
                author: 'Дж. К. Роулинг',
                category: 'fiction',
                cover: '⚡',
                description: 'Первая книга серии',
                downloadUrl: 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID_4',
                downloads: 500
            },
            {
                id: '5',
                title: 'Искусство переговоров',
                author: 'Мария Сидорова',
                category: 'business',
                cover: '🤝',
                description: 'Секреты успешных переговоров',
                downloadUrl: 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID_5',
                downloads: 120
            },
            {
                id: '6',
                title: 'Физика для всех',
                author: 'Сергей Смирнов',
                category: 'education',
                cover: '🔬',
                description: 'Основы физики в простом изложении',
                downloadUrl: 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID_6',
                downloads: 180
            }
        ];
        
        renderBooks(books);
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        showNotification('Ошибка загрузки книг', 'error');
    }
}

// Отображение книг
function renderBooks(booksToRender) {
    if (booksToRender.length === 0) {
        elements.booksContainer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-search"></i>
                <p>Книги не найдены</p>
            </div>
        `;
        return;
    }
    
    elements.booksContainer.innerHTML = booksToRender.map(book => `
        <div class="book-card" data-category="${book.category}">
            <div class="book-cover">
                ${book.cover}
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p class="book-author">
                    <i class="fas fa-user-edit"></i> ${book.author}
                </p>
                <div class="book-tags">
                    <span class="tag">${getCategoryName(book.category)}</span>
                    <span class="tag"><i class="fas fa-download"></i> ${book.downloads}</span>
                </div>
                <p>${book.description}</p>
                <div class="book-actions">
                    <button class="btn btn-primary" onclick="downloadBook('${book.id}', '${book.title}')">
                        <i class="fas fa-download"></i> Скачать
                    </button>
                    ${currentUser ? `
                        <button class="btn btn-outline" onclick="addToFavorites('${book.id}')">
                            <i class="far fa-heart"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Фильтрация книг
function filterBooks() {
    const searchTerm = elements.searchInput.value.toLowerCase();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    
    const filtered = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm) ||
                            book.author.toLowerCase().includes(searchTerm) ||
                            book.description.toLowerCase().includes(searchTerm);
        
        const matchesFilter = activeFilter === 'all' || book.category === activeFilter;
        
        return matchesSearch && matchesFilter;
    });
    
    renderBooks(filtered);
}

// Скачивание книги
async function downloadBook(bookId, bookTitle) {
    if (!currentUser) {
        showNotification('Войдите в систему для скачивания', 'warning');
        showAuthModal('login');
        return;
    }
    
    try {
        const book = books.find(b => b.id === bookId);
        if (!book) return;
        
        // Открываем ссылку на скачивание
        window.open(book.downloadUrl, '_blank');
        
        // Обновляем статистику в Firebase
        await updateDownloadStats(bookId, bookTitle);
        
        showNotification(`Книга "${bookTitle}" скачивается`, 'success');
        
    } catch (error) {
        console.error('Ошибка скачивания:', error);
        showNotification('Ошибка скачивания', 'error');
    }
}

// Обновление статистики скачивания
async function updateDownloadStats(bookId, bookTitle) {
    if (!currentUser) return;
    
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const downloads = userData.downloads || 0;
            const recentDownloads = userData.recentDownloads || [];
            
            // Добавляем книгу в недавние скачивания
            recentDownloads.unshift({
                bookId,
                title: bookTitle,
                downloadedAt: new Date().toISOString()
            });
            
            // Ограничиваем до 10 последних скачиваний
            if (recentDownloads.length > 10) {
                recentDownloads.pop();
            }
            
            await userRef.update({
                downloads: downloads + 1,
                recentDownloads,
                lastDownload: new Date().toISOString()
            });
        } else {
            await userRef.set({
                name: currentUser.displayName || 'Пользователь',
                email: currentUser.email,
                downloads: 1,
                recentDownloads: [{
                    bookId,
                    title: bookTitle,
                    downloadedAt: new Date().toISOString()
                }],
                favorites: [],
                createdAt: new Date().toISOString()
            });
        }
        
        // Обновляем UI
        loadUserData(currentUser.uid);
        
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

// Добавление в избранное
async function addToFavorites(bookId) {
    if (!currentUser) return;
    
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const favorites = userData.favorites || [];
            
            if (!favorites.includes(bookId)) {
                favorites.push(bookId);
                await userRef.update({ favorites });
                showNotification('Добавлено в избранное', 'success');
                loadUserData(currentUser.uid);
            } else {
                showNotification('Уже в избранном', 'info');
            }
        }
        
    } catch (error) {
        console.error('Ошибка добавления в избранное:', error);
        showNotification('Ошибка добавления в избранное', 'error');
    }
}

// Авторизация
async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        elements.authModal.classList.add('hidden');
        elements.loginForm.reset();
        showNotification('Успешный вход!', 'success');
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification(getAuthErrorMessage(error), 'error');
    }
}

// Регистрация
async function register(name, email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        
        // Создаем документ пользователя в Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name,
            email,
            downloads: 0,
            favorites: [],
            recentDownloads: [],
            createdAt: new Date().toISOString()
        });
        
        elements.authModal.classList.add('hidden');
        elements.registerForm.reset();
        showNotification('Регистрация успешна!', 'success');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification(getAuthErrorMessage(error), 'error');
    }
}

// Выход
async function logout() {
    try {
        await auth.signOut();
        showNotification('Вы вышли из системы', 'info');
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showNotification('Ошибка выхода', 'error');
    }
}

// Загрузка данных пользователя
async function loadUserData(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Обновляем профиль
            elements.userName.textContent = userData.name;
            elements.userEmail.textContent = userData.email;
            elements.downloadCount.textContent = userData.downloads || 0;
            elements.favoriteCount.textContent = userData.favorites?.length || 0;
            elements.readingTime.textContent = `${Math.floor((userData.downloads || 0) * 0.5)}ч`;
            
            // Отображаем недавние скачивания
            if (userData.recentDownloads?.length > 0) {
                elements.recentDownloads.innerHTML = userData.recentDownloads
                    .slice(0, 5)
                    .map(item => `
                        <div class="recent-item">
                            <i class="fas fa-book"></i>
                            <span>${item.title}</span>
                            <small>${new Date(item.downloadedAt).toLocaleDateString()}</small>
                        </div>
                    `).join('');
            }
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

// Обновление UI в зависимости от состояния авторизации
function updateUI() {
    const isLoggedIn = !!currentUser;
    
    // Кнопки авторизации
    elements.loginBtn.classList.toggle('hidden', isLoggedIn);
    elements.registerBtn.classList.toggle('hidden', isLoggedIn);
    elements.logoutBtn.classList.toggle('hidden', !isLoggedIn);
    
    // Профиль
    elements.userStats.classList.toggle('hidden', !isLoggedIn);
    elements.guestMessage.classList.toggle('hidden', isLoggedIn);
    
    // Информация о пользователе
    if (isLoggedIn) {
        elements.userName.textContent = currentUser.displayName || 'Пользователь';
        elements.userEmail.textContent = currentUser.email;
    } else {
        elements.userName.textContent = 'Гость';
        elements.userEmail.textContent = 'Войдите в систему, чтобы увидеть профиль';
    }
}

// Показать модальное окно авторизации
function showAuthModal(tab = 'login') {
    elements.authModal.classList.remove('hidden');
    
    // Устанавливаем активную вкладку
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    elements.loginForm.classList.toggle('hidden', tab !== 'login');
    elements.registerForm.classList.toggle('hidden', tab !== 'register');
    
    // Сбрасываем формы
    if (tab === 'login') {
        elements.loginForm.reset();
    } else {
        elements.registerForm.reset();
    }
}

// Переключение страниц
function switchPage(pageId) {
    elements.pages.forEach(page => {
        page.classList.toggle('active', page.id === pageId);
    });
    
    // Прокрутка к верху страницы
    window.scrollTo(0, 0);
}

// Показать уведомление
function showNotification(message, type = 'info') {
    elements.notificationText.textContent = message;
    elements.notification.className = `notification ${type}`;
    elements.notification.classList.remove('hidden');
    
    setTimeout(() => {
        elements.notification.classList.add('hidden');
    }, 3000);
}

// Получение читаемого названия категории
function getCategoryName(category) {
    const categories = {
        'fiction': 'Художественная',
        'education': 'Образование',
        'business': 'Бизнес',
        'all': 'Все'
    };
    return categories[category] || category;
}

// Получение сообщения об ошибке авторизации
function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Некорректный email адрес';
        case 'auth/user-disabled':
            return 'Пользователь заблокирован';
        case 'auth/user-not-found':
            return 'Пользователь не найден';
        case 'auth/wrong-password':
            return 'Неверный пароль';
        case 'auth/email-already-in-use':
            return 'Email уже используется';
        case 'auth/weak-password':
            return 'Пароль слишком слабый';
        case 'auth/network-request-failed':
            return 'Ошибка сети. Проверьте подключение';
        default:
            return 'Ошибка авторизации. Попробуйте еще раз';
    }
}

// Добавление книг в Firebase (для администратора)
async function addBookToFirebase(bookData) {
    try {
        await db.collection('books').add({
            ...bookData,
            createdAt: new Date().toISOString(),
            downloads: 0
        });
        showNotification('Книга добавлена успешно!', 'success');
    } catch (error) {
        console.error('Ошибка добавления книги:', error);
        showNotification('Ошибка добавления книги', 'error');
    }
}

// Пример добавления книги (вызовите эту функцию из консоли браузера)
window.addBookExample = function() {
    const newBook = {
        title: 'Новая книга',
        author: 'Автор',
        category: 'fiction',
        description: 'Описание книги',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID'
    };
    addBookToFirebase(newBook);
};

// Инициализация при загрузке
window.onload = function() {
    // Проверяем, есть ли сохраненная страница
    const savedPage = localStorage.getItem('currentPage') || 'home';
    switchPage(savedPage);
    
    // Сохраняем текущую страницу при переключении
    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const page = link.getAttribute('href').substring(1);
            localStorage.setItem('currentPage', page);
        });
    });
};
