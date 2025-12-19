// Firebase конфигурация - ЗАМЕНИТЕ ЭТИ ДАННЫЕ НА ВАШИ!
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

// ==================== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ====================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        updateUI();
        if (user) {
            loadUserData(user.uid);
        }
        loadBooksFromFirebase();
    });
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

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

// ==================== РАБОТА С КНИГАМИ ====================

async function loadBooksFromFirebase() {
    try {
        console.log('Загружаем книги из коллекции "books"...');
        const booksSnapshot = await db.collection('books').orderBy('createdAt', 'desc').get();
        books = [];
        
        if (booksSnapshot.empty) {
            console.log('Коллекция "books" пустая. Книг нет.');
            elements.booksContainer.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-book"></i>
                    <p>В библиотеке пока нет книг</p>
                    ${currentUser ? `
                        <p style="margin-top: 10px; font-size: 14px;">
                            Используйте консоль (F12) для добавления книг<br>
                            addBookToFirebase({ title: "...", ... })
                        </p>
                    ` : ''}
                </div>
            `;
            return;
        }
        
        console.log(`Найдено ${booksSnapshot.size} книг в коллекции "books"`);
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
                <p style="font-size: 12px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
        showNotification('Ошибка загрузки книг', 'error');
    }
}

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
                    ${book.pageCount ? `<span class="tag"><i class="fas fa-file"></i> ${book.pageCount} стр.</span>` : ''}
                </div>
                <p>${book.description || 'Описание отсутствует'}</p>
                <div class="book-actions">
                    <button class="btn btn-primary" onclick="downloadBook('${book.id}', '${book.title}', '${book.downloadUrl}')">
                        <i class="fas fa-download"></i> Скачать PDF
                    </button>
                    ${currentUser ? `
                        <button class="btn btn-outline" onclick="toggleFavorite('${book.id}')">
                            <i class="far fa-heart"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

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

// ==================== СКАЧИВАНИЕ КНИГ ====================

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
        // Открываем ссылку на скачивание
        window.open(downloadUrl, '_blank');
        
        // Обновляем счетчик скачиваний книги в коллекции "books"
        const bookRef = db.collection('books').doc(bookId);
        await bookRef.update({
            downloads: firebase.firestore.FieldValue.increment(1),
            lastDownloaded: new Date().toISOString()
        });
        
        // Обновляем статистику пользователя в коллекции "users"
        await updateUserDownloadStats(bookId, bookTitle);
        
        showNotification(`Книга "${bookTitle}" скачивается`, 'success');
        
    } catch (error) {
        console.error('Ошибка скачивания:', error);
        showNotification('Ошибка при скачивании', 'error');
    }
}

// ==================== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ====================

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
            const newDownload = {
                bookId: bookId,
                title: bookTitle,
                downloadedAt: new Date().toISOString()
            };
            
            // Удаляем дубликаты и добавляем в начало
            const filteredDownloads = recentDownloads.filter(item => item.bookId !== bookId);
            filteredDownloads.unshift(newDownload);
            
            // Ограничиваем до 5 последних скачиваний
            if (filteredDownloads.length > 5) {
                filteredDownloads.pop();
            }
            
            await userRef.update({
                downloads: downloads + 1,
                recentDownloads: filteredDownloads,
                lastDownload: new Date().toISOString()
            });
        } else {
            // Создаем документ пользователя в коллекции "users"
            await userRef.set({
                name: currentUser.displayName || 'Пользователь',
                email: currentUser.email,
                downloads: 1,
                recentDownloads: [{
                    bookId: bookId,
                    title: bookTitle,
                    downloadedAt: new Date().toISOString()
                }],
                favorites: [],
                createdAt: new Date().toISOString(),
                uid: currentUser.uid
            });
        }
        
        // Обновляем UI
        loadUserData(currentUser.uid);
        
    } catch (error) {
        console.error('Ошибка обновления статистики пользователя:', error);
    }
}

async function toggleFavorite(bookId) {
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
            
            if (favorites.includes(bookId)) {
                // Удаляем из избранного
                const newFavorites = favorites.filter(id => id !== bookId);
                await userRef.update({ favorites: newFavorites });
                showNotification('Удалено из избранного', 'info');
            } else {
                // Добавляем в избранное
                favorites.push(bookId);
                await userRef.update({ favorites });
                showNotification('Добавлено в избранное', 'success');
            }
            
            loadUserData(currentUser.uid);
        }
        
    } catch (error) {
        console.error('Ошибка работы с избранным:', error);
        showNotification('Ошибка', 'error');
    }
}

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
                        <div class="recent-item">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-book" style="color: var(--primary);"></i>
                                <span>${item.title || 'Без названия'}</span>
                            </div>
                            <small style="color: var(--gray);">
                                ${new Date(item.downloadedAt).toLocaleDateString('ru-RU')}
                            </small>
                        </div>
                    `).join('');
            } else {
                elements.recentDownloads.innerHTML = `
                    <p class="empty-message">Вы еще не скачивали книги</p>
                `;
            }
        } else {
            // Если документ не существует, создаем его
            const userRef = db.collection('users').doc(uid);
            await userRef.set({
                name: currentUser.displayName || 'Пользователь',
                email: currentUser.email,
                downloads: 0,
                recentDownloads: [],
                favorites: [],
                createdAt: new Date().toISOString(),
                uid: uid
            });
            
            loadUserData(uid); // Загружаем заново
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}

// ==================== АВТОРИЗАЦИЯ ====================

async function login(email, password) {
    try {
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
        const submitBtn = elements.loginForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Войти';
        submitBtn.disabled = false;
    }
}

async function register(name, email, password) {
    try {
        const submitBtn = elements.registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
        submitBtn.disabled = true;
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        
        // Создаем документ в коллекции "users"
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            downloads: 0,
            recentDownloads: [],
            favorites: [],
            createdAt: new Date().toISOString(),
            uid: userCredential.user.uid
        });
        
        elements.authModal.classList.add('hidden');
        elements.registerForm.reset();
        showNotification('Регистрация успешна!', 'success');
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showNotification(getAuthErrorMessage(error), 'error');
    } finally {
        const submitBtn = elements.registerForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Зарегистрироваться';
        submitBtn.disabled = false;
    }
}

async function logout() {
    try {
        await auth.signOut();
        showNotification('Вы вышли из системы', 'info');
        books = []; // Очищаем книги при выходе
        loadBooksFromFirebase(); // Перезагружаем книги
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showNotification('Ошибка выхода', 'error');
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function updateUI() {
    const isLoggedIn = !!currentUser;
    
    elements.loginBtn.classList.toggle('hidden', isLoggedIn);
    elements.registerBtn.classList.toggle('hidden', isLoggedIn);
    elements.logoutBtn.classList.toggle('hidden', !isLoggedIn);
    
    elements.userStats.classList.toggle('hidden', !isLoggedIn);
    elements.guestMessage.classList.toggle('hidden', isLoggedIn);
    
    if (isLoggedIn) {
        elements.userName.textContent = currentUser.displayName || 'Пользователь';
        elements.userEmail.textContent = currentUser.email;
    } else {
        elements.userName.textContent = 'Гость';
        elements.userEmail.textContent = 'Войдите в систему, чтобы увидеть профиль';
    }
}

function showAuthModal(tab = 'login') {
    elements.authModal.classList.remove('hidden');
    
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    elements.loginForm.classList.toggle('hidden', tab !== 'login');
    elements.registerForm.classList.toggle('hidden', tab !== 'register');
    
    if (tab === 'login') {
        elements.loginForm.reset();
    } else {
        elements.registerForm.reset();
    }
}

function switchPage(pageId) {
    elements.pages.forEach(page => {
        page.classList.toggle('active', page.id === pageId);
    });
    
    window.scrollTo(0, 0);
    
    if (pageId === 'library') {
        loadBooksFromFirebase();
    }
}

function showNotification(message, type = 'info') {
    elements.notificationText.textContent = message;
    elements.notification.className = `notification ${type}`;
    elements.notification.classList.remove('hidden');
    
    setTimeout(() => {
        elements.notification.classList.add('hidden');
    }, 3000);
}

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

function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email': return 'Некорректный email адрес';
        case 'auth/user-disabled': return 'Пользователь заблокирован';
        case 'auth/user-not-found': return 'Пользователь не найден';
        case 'auth/wrong-password': return 'Неверный пароль';
        case 'auth/email-already-in-use': return 'Email уже используется';
        case 'auth/weak-password': return 'Пароль слишком слабый (минимум 6 символов)';
        case 'auth/network-request-failed': return 'Ошибка сети. Проверьте подключение';
        default: return 'Ошибка авторизации: ' + error.message;
    }
}

// ==================== АДМИНИСТРАТИВНЫЕ ФУНКЦИИ ====================

async function addBookToFirebase(bookData) {
    try {
        // Добавляем книгу в коллекцию "books"
        await db.collection('books').add({
            title: bookData.title || 'Без названия',
            author: bookData.author || 'Неизвестный автор',
            category: bookData.category || 'other',
            description: bookData.description || 'Описание отсутствует',
            downloadUrl: bookData.downloadUrl || '',
            cover: bookData.cover || '📚',
            downloads: 0,
            pageCount: bookData.pageCount || 0,
            language: bookData.language || 'Русский',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        showNotification('Книга добавлена в коллекцию "books"!', 'success');
        loadBooksFromFirebase(); // Перезагружаем книги
        
    } catch (error) {
        console.error('Ошибка добавления книги:', error);
        showNotification('Ошибка добавления книги: ' + error.message, 'error');
    }
}

async function deleteAllBooks() {
    if (!confirm('Вы уверены? Это удалит ВСЕ книги из коллекции "books"!')) {
        return;
    }
    
    try {
        const booksSnapshot = await db.collection('books').get();
        const batch = db.batch();
        
        booksSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        showNotification('Все книги удалены из коллекции "books"', 'success');
        loadBooksFromFirebase();
        
    } catch (error) {
        console.error('Ошибка удаления книг:', error);
        showNotification('Ошибка удаления книг', 'error');
    }
}

async function fixUserData() {
    if (!currentUser) {
        showNotification('Войдите в систему', 'warning');
        return;
    }
    
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.set({
            name: currentUser.displayName || 'Пользователь',
            email: currentUser.email,
            downloads: 0,
            recentDownloads: [],
            favorites: [],
            createdAt: new Date().toISOString(),
            uid: currentUser.uid
        }, { merge: true });
        
        showNotification('Данные пользователя исправлены', 'success');
        loadUserData(currentUser.uid);
        
    } catch (error) {
        console.error('Ошибка исправления данных:', error);
        showNotification('Ошибка исправления данных', 'error');
    }
}

async function debugDatabase() {
    console.log('=== DEBUG DATABASE ===');
    
    try {
        // Коллекция books
        const booksSnapshot = await db.collection('books').get();
        console.log('Коллекция "books":');
        if (booksSnapshot.empty) {
            console.log('  Пустая! Используйте addBookToFirebase() для добавления книг');
        } else {
            booksSnapshot.forEach(doc => {
                console.log(`  - ${doc.id}: ${doc.data().title}`);
            });
        }
        
        // Коллекция users
        const usersSnapshot = await db.collection('users').get();
        console.log('Коллекция "users":');
        if (usersSnapshot.empty) {
            console.log('  Пустая!');
        } else {
            usersSnapshot.forEach(doc => {
                console.log(`  - ${doc.id}: ${doc.data().email}`);
            });
        }
        
    } catch (error) {
        console.error('Ошибка отладки:', error);
    }
}

// Делаем функции глобальными для использования из консоли
window.addBookToFirebase = addBookToFirebase;
window.deleteAllBooks = deleteAllBooks;
window.fixUserData = fixUserData;
window.debugDatabase = debugDatabase;
window.loadBooksFromFirebase = loadBooksFromFirebase;

// Инициализация при загрузке
window.onload = function() {
    const savedPage = localStorage.getItem('currentPage') || 'home';
    switchPage(savedPage);
    
    elements.navLinks.forEach(link => {
        if (link.getAttribute('href').substring(1) === savedPage) {
            link.classList.add('active');
        }
    });
    
    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const page = link.getAttribute('href').substring(1);
            localStorage.setItem('currentPage', page);
        });
    });
};
