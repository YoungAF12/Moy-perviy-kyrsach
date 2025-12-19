// Firebase конфигурация - ЗАМЕНИТЕ НА ВАШУ КОНФИГУРАЦИЮ
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
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
        // Загружаем книги после инициализации
        loadBooksFromFirebase();
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
async function loadBooksFromFirebase() {
    try {
        elements.booksContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Загрузка книг...
            </div>
        `;
        
        const booksSnapshot = await db.collection('books').get();
        books = [];
        
        if (booksSnapshot.empty) {
            elements.booksContainer.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-book"></i>
                    <p>В библиотеке пока нет книг</p>
                </div>
            `;
            return;
        }
        
        booksSnapshot.forEach(doc => {
            const bookData = doc.data();
            books.push({
                id: doc.id,
                ...bookData
            });
        });
        
        renderBooks(books);
        
    } catch (error) {
        console.error('Ошибка загрузки книг:', error);
        elements.booksContainer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Ошибка загрузки книг</p>
            </div>
        `;
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
        <div class="book-card" data-category="${book.category || 'other'}">
            <div class="book-cover">
                ${book.cover || '📚'}
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p class="book-author">
                    <i class="fas fa-user-edit"></i> ${book.author || 'Неизвестный автор'}
                </p>
                <div class="book-tags">
                    <span class="tag">${getCategoryName(book.category)}</span>
                    <span class="tag"><i class="fas fa-download"></i> ${book.downloads || 0}</span>
                    <span class="tag"><i class="fas fa-file-pdf"></i> PDF</span>
                </div>
                <p>${book.description || 'Описание отсутствует'}</p>
                <div class="book-actions">
                    <button class="btn btn-primary" onclick="downloadBook('${book.id}', '${book.title}', '${book.downloadUrl}')">
                        <i class="fas fa-download"></i> Скачать PDF
                    </button>
                    ${currentUser ? `
                        <button class="btn btn-outline" onclick="addToFavorites('${book.id}')">
                            <i class="far fa-heart"></i> В избранное
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
                            (book.author && book.author.toLowerCase().includes(searchTerm)) ||
                            (book.description && book.description.toLowerCase().includes(searchTerm));
        
        const matchesFilter = activeFilter === 'all' || (book.category && book.category === activeFilter);
        
        return matchesSearch && matchesFilter;
    });
    
    renderBooks(filtered);
}

// Скачивание книги
async function downloadBook(bookId, bookTitle, downloadUrl) {
    if (!currentUser) {
        showNotification('Войдите в систему для скачивания', 'warning');
        showAuthModal('login');
        return;
    }
    
    if (!downloadUrl) {
        showNotification('Ссылка для скачивания отсутствует', 'error');
        return;
    }
    
    try {
        // Открываем ссылку на скачивание в новом окне
        window.open(downloadUrl, '_blank');
        
        // Обновляем статистику скачиваний книги
        await db.collection('books').doc(bookId).update({
            downloads: firebase.firestore.FieldValue.increment(1)
        });
        
        // Обновляем статистику пользователя
        await updateUserDownloadStats(bookId, bookTitle);
        
        showNotification(`Книга "${bookTitle}" скачивается`, 'success');
        
    } catch (error) {
        console.error('Ошибка скачивания:', error);
        showNotification('Ошибка скачивания', 'error');
    }
}

// Обновление статистики скачивания пользователя
async function updateUserDownloadStats(bookId, bookTitle) {
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
            // Создаем документ пользователя если не существует
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
    if (!currentUser) {
        showNotification('Войдите в систему', 'warning');
        return;
    }
    
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
                // Удаление из избранного
                const newFavorites = favorites.filter(id => id !== bookId);
                await userRef.update({ favorites: newFavorites });
                showNotification('Удалено из избранного', 'info');
                loadUserData(currentUser.uid);
            }
        }
        
    } catch (error) {
        console.error('Ошибка работы с избранным:', error);
        showNotification('Ошибка', 'error');
    }
}

// Авторизация
async function login(email, password) {
    try {
        // Показываем загрузку
        const submitBtn = elements.loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
        submitBtn.disabled = true;
        
        await auth.signInWithEmailAndPassword(email, password);
        elements.authModal.classList.add('hidden');
        elements.loginForm.reset();
        showNotification('Успешный вход!', 'success');
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification(getAuthErrorMessage(error), 'error');
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = elements.loginForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        submitBtn.disabled = false;
    }
}

// Регистрация
async function register(name, email, password) {
    try {
        // Показываем загрузку
        const submitBtn = elements.registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
        submitBtn.disabled = true;
        
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
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = elements.registerForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
        submitBtn.disabled = false;
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
            elements.userName.textContent = userData.name || currentUser.displayName || 'Пользователь';
            elements.userEmail.textContent = currentUser.email;
            elements.downloadCount.textContent = userData.downloads || 0;
            elements.favoriteCount.textContent = userData.favorites?.length || 0;
            elements.readingTime.textContent = `${Math.floor((userData.downloads || 0) * 0.5)}ч`;
            
            // Отображаем недавние скачивания
            if (userData.recentDownloads?.length > 0) {
                elements.recentDownloads.innerHTML = userData.recentDownloads
                    .slice(0, 5)
                    .map(item => `
                        <div class="recent-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--light-gray); margin-bottom: 10px; border-radius: var(--radius-sm);">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-book" style="color: var(--primary);"></i>
                                <span>${item.title}</span>
                            </div>
                            <small style="color: var(--gray);">${new Date(item.downloadedAt).toLocaleDateString()}</small>
                        </div>
                    `).join('');
            } else {
                elements.recentDownloads.innerHTML = `
                    <p class="empty-message">Вы еще не скачивали книги</p>
                `;
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
    
    // Обновляем книги при переходе в библиотеку
    if (pageId === 'library') {
        loadBooksFromFirebase();
    }
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
        'science': 'Наука',
        'other': 'Другое'
    };
    return categories[category] || category || 'Другое';
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
            return 'Пароль слишком слабый (минимум 6 символов)';
        case 'auth/network-request-failed':
            return 'Ошибка сети. Проверьте подключение';
        case 'auth/too-many-requests':
            return 'Слишком много попыток. Попробуйте позже';
        default:
            return 'Ошибка авторизации: ' + error.message;
    }
}

// Функция для добавления книг (для администратора)
async function addBookToFirebase(bookData) {
    try {
        await db.collection('books').add({
            ...bookData,
            downloads: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        showNotification('Книга добавлена успешно!', 'success');
        loadBooksFromFirebase();
    } catch (error) {
        console.error('Ошибка добавления книги:', error);
        showNotification('Ошибка добавления книги', 'error');
    }
}

// Функция для удаления всех книг (очистка базы)
async function deleteAllBooks() {
    if (!confirm('Вы уверены? Это удалит ВСЕ книги из базы данных!')) {
        return;
    }
    
    try {
        const booksSnapshot = await db.collection('books').get();
        const batch = db.batch();
        
        booksSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        showNotification('Все книги удалены', 'success');
        loadBooksFromFirebase();
    } catch (error) {
        console.error('Ошибка удаления книг:', error);
        showNotification('Ошибка удаления книг', 'error');
    }
}

// Функция для добавления тестовых книг (если база пустая)
async function addSampleBooks() {
    const sampleBooks = [
        {
            title: 'Война и мир',
            author: 'Лев Толстой',
            category: 'fiction',
            cover: '📖',
            description: 'Классика русской литературы о войне 1812 года',
            downloadUrl: 'https://drive.google.com/uc?export=download&id=ВАШ_ID_1',
            pageCount: 1225,
            language: 'Русский'
        },
        {
            title: 'JavaScript для начинающих',
            author: 'Иван Петров',
            category: 'education',
            cover: '💻',
            description: 'Основы программирования на JavaScript',
            downloadUrl: 'https://drive.google.com/uc?export=download&id=ВАШ_ID_2',
            pageCount: 350,
            language: 'Русский'
        }
    ];
    
    for (const book of sampleBooks) {
        await addBookToFirebase(book);
    }
}

// Делаем функции глобальными для тестирования
window.addBookToFirebase = addBookToFirebase;
window.deleteAllBooks = deleteAllBooks;
window.addSampleBooks = addSampleBooks;
window.loadBooksFromFirebase = loadBooksFromFirebase;

// Инициализация при загрузке
window.onload = function() {
    // Проверяем, есть ли сохраненная страница
    const savedPage = localStorage.getItem('currentPage') || 'home';
    switchPage(savedPage);
    
    // Устанавливаем активную ссылку в навигации
    elements.navLinks.forEach(link => {
        if (link.getAttribute('href').substring(1) === savedPage) {
            link.classList.add('active');
        }
    });
    
    // Сохраняем текущую страницу при переключении
    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const page = link.getAttribute('href').substring(1);
            localStorage.setItem('currentPage', page);
        });
    });
    
    // Автоматический вход для тестирования (можно удалить)
    // auth.signInWithEmailAndPassword("test@test.com", "123456").catch(console.error);
};
