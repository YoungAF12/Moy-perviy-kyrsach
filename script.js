// ============ КОНФИГУРАЦИЯ FIREBASE ============
// ВАЖНО: Замените эту конфигурацию на вашу из Firebase Console!
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
const storage = firebase.storage();

// ============ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ============
const categories = ["Все", "Классика", "Фэнтези", "Научная фантастика", "Детектив", "Детская литература", "Философия", "Научно-популярная", "Бизнес", "Программирование"];
let currentUser = null;
let adminUser = null;
let isAdminMode = false;
let booksData = []; // Храним загруженные книги

// ============ DOM ЭЛЕМЕНТЫ ============
const booksGrid = document.getElementById('booksGrid');
const categoryFilter = document.getElementById('categoryFilter');
const loadingBooks = document.getElementById('loadingBooks');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const addBookModal = document.getElementById('addBookModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const closeRegisterModal = document.getElementById('closeRegisterModal');
const closeAddBookModal = document.getElementById('closeAddBookModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const addBookForm = document.getElementById('addBookForm');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const pdfUpload = document.getElementById('pdfUpload');
const coverUpload = document.getElementById('coverUpload');
const uploadProgress = document.getElementById('uploadProgress');
const fileInfo = document.getElementById('fileInfo');

// ============ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ============
document.addEventListener('DOMContentLoaded', function() {
    console.log("Digital Library initialized");
    initCategories();
    loadBooksFromFirestore();
    initAuth();
    setupEventListeners();
    setupAddBookForm();
});

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

// Функция для преобразования Google Drive ссылки в прямую ссылку для скачивания
function convertGoogleDriveLinkToDirect(googleDriveUrl) {
    if (!googleDriveUrl || !googleDriveUrl.includes('drive.google.com')) {
        return googleDriveUrl;
    }
    
    try {
        let fileId = '';
        
        // Разные форматы Google Drive ссылок
        // 1. https://drive.google.com/file/d/FILE_ID/view
        // 2. https://drive.google.com/open?id=FILE_ID
        // 3. https://drive.google.com/uc?id=FILE_ID
        
        if (googleDriveUrl.includes('/d/')) {
            // Формат: /d/FILE_ID/
            const match = googleDriveUrl.match(/\/d\/([^\/]+)/);
            if (match) fileId = match[1];
        } else if (googleDriveUrl.includes('id=')) {
            // Формат: ?id=FILE_ID или &id=FILE_ID
            const match = googleDriveUrl.match(/[\?&]id=([^&]+)/);
            if (match) fileId = match[1];
        }
        
        if (fileId) {
            // Создаем прямую ссылку для скачивания
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
        
        return googleDriveUrl;
    } catch (error) {
        console.error('Error converting Google Drive link:', error);
        return googleDriveUrl;
    }
}

// Показать уведомление
function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Обновление статистики пользователя
function updateUserDownloadStats(bookId, bookTitle) {
    if (!currentUser) return;
    
    db.collection("users").doc(currentUser.uid).update({
        lastDownload: firebase.firestore.FieldValue.serverTimestamp(),
        downloadsCount: firebase.firestore.FieldValue.increment(1)
    }).catch(error => {
        console.error("Error updating user stats:", error);
    });
}

// ============ ФУНКЦИИ ДЛЯ РАБОТЫ С КНИГАМИ ============

// Загрузка книг из Firestore
function loadBooksFromFirestore() {
    loadingBooks.style.display = 'block';
    loadingBooks.innerHTML = '<div class="loader"></div><p>Загрузка книг...</p>';
    
    db.collection("books").orderBy("title").get()
        .then((querySnapshot) => {
            booksData = [];
            querySnapshot.forEach((doc) => {
                const book = doc.data();
                book.id = doc.id;
                
                // Преобразуем ссылку Google Drive при загрузке
                if (book.fileUrl && book.fileUrl.includes('drive.google.com')) {
                    book.directDownloadUrl = convertGoogleDriveLinkToDirect(book.fileUrl);
                } else {
                    book.directDownloadUrl = book.fileUrl;
                }
                
                booksData.push(book);
            });
            
            if (booksData.length === 0) {
                console.log("No books found in Firestore");
                displayNoBooksMessage();
            } else {
                console.log(`Loaded ${booksData.length} books from Firestore`);
                displayBooks(booksData);
            }
        })
        .catch((error) => {
            console.error("Error loading books:", error);
            displayNoBooksMessage();
            showNotification('Ошибка загрузки книг: ' + error.message, 'error');
        });
}

// Сообщение, если книг нет
function displayNoBooksMessage() {
    booksGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <i class="fas fa-book" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <h3>Библиотека пуста</h3>
            <p>Книги еще не добавлены. Станьте первым, кто добавит книгу!</p>
            ${currentUser && adminUser ? 
                '<button id="addFirstBookBtn" class="btn" style="margin-top: 20px;">Добавить первую книгу</button>' : 
                ''
            }
        </div>
    `;
    loadingBooks.style.display = 'none';
    
    if (currentUser && adminUser) {
        document.getElementById('addFirstBookBtn').addEventListener('click', () => {
            addBookModal.style.display = 'flex';
        });
    }
}

// Инициализация категорий
function initCategories() {
    categoryFilter.innerHTML = '';
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = `category-btn ${category === 'Все' ? 'active' : ''}`;
        button.textContent = category;
        button.dataset.category = category;
        button.addEventListener('click', (e) => filterByCategory(e, category));
        categoryFilter.appendChild(button);
    });
}

// Фильтрация книг по категории
function filterByCategory(e, category) {
    // Обновляем активную кнопку
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    if (category === 'Все') {
        displayBooks(booksData);
    } else {
        const filteredBooks = booksData.filter(book => book.category === category);
        displayBooks(filteredBooks);
    }
}

// Отображение книг
function displayBooks(books) {
    booksGrid.innerHTML = '';
    loadingBooks.style.display = 'none';
    
    if (!books || books.length === 0) {
        booksGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <p>Книги не найдены</p>
            </div>
        `;
        return;
    }
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        // Используем directDownloadUrl если есть, иначе оригинальную ссылку
        const downloadUrl = book.directDownloadUrl || book.fileUrl;
        const isGoogleDrive = downloadUrl && downloadUrl.includes('drive.google.com');
        
        bookCard.innerHTML = `
            <div class="book-cover">
                <img src="${book.cover || 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'}" 
                     alt="${book.title}" 
                     onerror="this.src='https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
                ${isAdminMode ? `
                <div class="book-actions">
                    <button class="book-action-btn book-action-delete" data-id="${book.id}" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>` : ''}
            </div>
            <div class="book-info">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
                <p class="book-description">${book.description || 'Описание отсутствует'}</p>
                <div class="book-details">
                    <div class="book-meta">
                        <span class="book-category">${book.category || 'Не указана'}</span>
                        <span class="book-format">${book.format || 'PDF'}</span>
                        ${book.fileSize ? `<span class="book-size">${book.fileSize}</span>` : ''}
                    </div>
                    <div class="book-details-grid">
                        ${book.year ? `<div class="book-detail-item">
                            <span class="book-detail-label">Год</span>
                            <span class="book-detail-value">${book.year}</span>
                        </div>` : ''}
                        ${book.pages ? `<div class="book-detail-item">
                            <span class="book-detail-label">Страниц</span>
                            <span class="book-detail-value">${book.pages}</span>
                        </div>` : ''}
                        ${book.language ? `<div class="book-detail-item">
                            <span class="book-detail-label">Язык</span>
                            <span class="book-detail-value">${book.language}</span>
                        </div>` : ''}
                    </div>
                </div>
                <div class="book-meta" style="margin-top: 15px;">
                    <span style="font-size: 0.9rem; color: #666;">Скачано: ${book.downloads || 0}</span>
                    ${downloadUrl ? `
                    <a href="${downloadUrl}" class="book-download" target="_blank" data-id="${book.id}" ${isGoogleDrive ? 'rel="noopener noreferrer"' : ''}>
                        <i class="fas fa-download"></i> Скачать PDF
                    </a>
                    ` : `
                    <span class="book-download" style="background-color: #ccc; cursor: not-allowed;">
                        <i class="fas fa-download"></i> Ссылка отсутствует
                    </span>
                    `}
                </div>
            </div>
        `;
        booksGrid.appendChild(bookCard);
    });
    
    // Обработчики для ссылок скачивания - обновляем счетчик
    document.querySelectorAll('.book-download[data-id]').forEach(link => {
        link.addEventListener('click', function(e) {
            if (!currentUser) {
                e.preventDefault();
                showNotification('Для скачивания книг необходимо войти в систему', 'error');
                loginModal.style.display = 'flex';
                return;
            }
            
            const bookId = this.getAttribute('data-id');
            updateDownloadCount(bookId);
        });
    });
    
    // Обработчики для админских кнопок удаления
    if (isAdminMode) {
        document.querySelectorAll('.book-action-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const bookId = this.getAttribute('data-id');
                deleteBook(bookId);
            });
        });
    }
}

// Обновление счетчика скачиваний
function updateDownloadCount(bookId) {
    try {
        const book = booksData.find(b => b.id === bookId);
        if (!book) return;
        
        const currentDownloads = book.downloads || 0;
        const newCount = currentDownloads + 1;
        
        // Обновляем в Firestore
        db.collection("books").doc(bookId).update({
            downloads: newCount
        }).then(() => {
            // Обновляем локально
            book.downloads = newCount;
            
            // Обновляем отображение счетчика
            const downloadCountElement = document.querySelector(`.book-download[data-id="${bookId}"]`).closest('.book-meta').querySelector('span');
            if (downloadCountElement) {
                downloadCountElement.textContent = `Скачано: ${newCount}`;
            }
            
            // Обновляем статистику пользователя
            updateUserDownloadStats(bookId, book.title);
            
        }).catch(error => {
            console.error("Error updating download count:", error);
        });
    } catch (error) {
        console.error("Error in updateDownloadCount:", error);
    }
}

// Поиск книг
function searchBooks() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        const activeCategory = document.querySelector('.category-btn.active').dataset.category;
        if (activeCategory === 'Все') {
            displayBooks(booksData);
        } else {
            const filteredBooks = booksData.filter(book => book.category === activeCategory);
            displayBooks(filteredBooks);
        }
        return;
    }
    
    const filteredBooks = booksData.filter(book => 
        (book.title && book.title.toLowerCase().includes(searchTerm)) || 
        (book.author && book.author.toLowerCase().includes(searchTerm)) || 
        (book.description && book.description.toLowerCase().includes(searchTerm)) ||
        (book.category && book.category.toLowerCase().includes(searchTerm))
    );
    
    displayBooks(filteredBooks);
}

// ============ АУТЕНТИФИКАЦИЯ И ПОЛЬЗОВАТЕЛИ ============

// Инициализация аутентификации
function initAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            console.log("User logged in:", user.email);
            checkAdminStatus(user);
            updateUIForLoggedInUser();
        } else {
            currentUser = null;
            adminUser = null;
            isAdminMode = false;
            updateUIForLoggedOutUser();
        }
    });
}

// Проверка статуса администратора
function checkAdminStatus(user) {
    db.collection("users").doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                if (userData.role === 'admin') {
                    adminUser = user;
                    console.log("Admin user detected:", user.email);
                    showAdminPanel();
                }
            } else {
                // Создаем документ пользователя
                createUserDocument(user);
            }
        })
        .catch(error => {
            console.error("Error checking admin status:", error);
        });
}

// Создание документа пользователя
function createUserDocument(user) {
    db.collection("users").doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: 'user',
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        downloadsCount: 0
    }, { merge: true })
    .then(() => {
        console.log("User document created for:", user.email);
    })
    .catch(error => {
        console.error("Error creating user document:", error);
    });
}

// Регистрация
function register(name, email, password) {
    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            return userCredential.user.updateProfile({
                displayName: name
            }).then(() => userCredential.user);
        })
        .then((user) => {
            return db.collection("users").doc(user.uid).set({
                uid: user.uid,
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: 'user',
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                downloadsCount: 0
            });
        })
        .then(() => {
            registerModal.style.display = 'none';
            registerForm.reset();
            showNotification('Регистрация выполнена успешно!', 'success');
        })
        .catch(error => {
            console.error("Registration error:", error);
            let errorMessage = 'Ошибка регистрации';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Этот email уже используется';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Неверный формат email';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Пароль слишком слабый';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'Ошибка доступа к базе данных';
            }
            
            showNotification(errorMessage, 'error');
        });
}

// Вход
function login(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            
            return db.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                name: user.displayName || email.split('@')[0],
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        })
        .then(() => {
            loginModal.style.display = 'none';
            loginForm.reset();
            showNotification('Вход выполнен успешно!', 'success');
        })
        .catch(error => {
            let errorMessage = 'Ошибка входа';
            
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Неверный формат email';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'Пользователь не найден';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Неверный пароль';
            }
            
            showNotification(errorMessage, 'error');
        });
}

// Выход
function logout() {
    auth.signOut()
        .then(() => {
            showNotification('Вы успешно вышли из системы', 'info');
        })
        .catch(error => {
            showNotification('Ошибка выхода: ' + error.message, 'error');
        });
}

// Обновление интерфейса для авторизованного пользователя
function updateUIForLoggedInUser() {
    const userContainer = document.querySelector('.user-info');
    if (!userContainer) return;
    
    userContainer.innerHTML = `
        <span>${currentUser.displayName || currentUser.email}</span>
        <button id="logoutBtn" class="btn btn-outline">Выйти</button>
    `;
    
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// Обновление интерфейса для неавторизованного пользователя
function updateUIForLoggedOutUser() {
    const userContainer = document.querySelector('.user-info');
    if (!userContainer) return;
    
    userContainer.innerHTML = `
        <button id="loginBtn" class="btn btn-outline">Войти</button>
        <button id="registerBtn" class="btn">Регистрация</button>
    `;
    
    document.getElementById('loginBtn').addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });
    
    document.getElementById('registerBtn').addEventListener('click', () => {
        registerModal.style.display = 'flex';
    });
}

// ============ АДМИН ПАНЕЛЬ ============

// Показать панель администратора
function showAdminPanel() {
    const booksSection = document.querySelector('.books-section .container');
    const existingPanel = document.querySelector('.admin-panel');
    
    if (existingPanel) {
        existingPanel.remove();
    }
    
    const adminPanelHTML = `
        <div class="admin-panel">
            <div class="admin-header">
                <h3>Панель администратора</h3>
                <div class="admin-toggle">
                    <span>Режим админа:</span>
                    <label class="switch">
                        <input type="checkbox" id="adminToggle" ${isAdminMode ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>
            <div class="admin-controls">
                <button id="addBookBtn" class="btn">
                    <i class="fas fa-plus"></i> Добавить книгу
                </button>
                <button id="viewUsersBtn" class="btn btn-outline">
                    <i class="fas fa-users"></i> Пользователи
                </button>
                <button id="refreshBooksBtn" class="btn btn-outline">
                    <i class="fas fa-sync"></i> Обновить
                </button>
            </div>
        </div>
    `;
    
    const sectionHeader = booksSection.querySelector('.section-header');
    booksSection.insertAdjacentHTML('afterbegin', adminPanelHTML);
    
    // Назначаем обработчики
    document.getElementById('adminToggle').addEventListener('change', function(e) {
        isAdminMode = e.target.checked;
        loadBooksFromFirestore();
    });
    
    document.getElementById('addBookBtn').addEventListener('click', () => {
        addBookModal.style.display = 'flex';
    });
    
    document.getElementById('viewUsersBtn').addEventListener('click', showUsersList);
    document.getElementById('refreshBooksBtn').addEventListener('click', loadBooksFromFirestore);
}

// Показать список пользователей
function showUsersList() {
    if (!adminUser) {
        showNotification('Доступно только администраторам', 'error');
        return;
    }
    
    db.collection("users").get()
        .then((querySnapshot) => {
            let usersHTML = '<h3>Зарегистрированные пользователи</h3>';
            let userCount = 0;
            
            usersHTML += '<div style="max-height: 400px; overflow-y: auto; margin-top: 20px;">';
            usersHTML += '<table style="width: 100%; border-collapse: collapse;">';
            usersHTML += '<thead><tr>';
            usersHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Имя</th>';
            usersHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Email</th>';
            usersHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Роль</th>';
            usersHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Дата регистрации</th>';
            usersHTML += '<th style="padding: 10px; border: 1px solid #ddd;">Скачано</th>';
            usersHTML += '</tr></thead><tbody>';
            
            querySnapshot.forEach((doc) => {
                const user = doc.data();
                userCount++;
                
                const createdAt = user.createdAt ? 
                    new Date(user.createdAt.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString('ru-RU') : 
                    'Не указана';
                
                usersHTML += '<tr>';
                usersHTML += `<td style="padding: 10px; border: 1px solid #ddd;">${user.name || 'Не указано'}</td>`;
                usersHTML += `<td style="padding: 10px; border: 1px solid #ddd;">${user.email}</td>`;
                usersHTML += `<td style="padding: 10px; border: 1px solid #ddd;">
                    <select class="role-select" data-uid="${doc.id}" style="width: 100%; padding: 5px;">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>Пользователь</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Администратор</option>
                    </select>
                </td>`;
                usersHTML += `<td style="padding: 10px; border: 1px solid #ddd;">${createdAt}</td>`;
                usersHTML += `<td style="padding: 10px; border: 1px solid #ddd;">${user.downloadsCount || 0}</td>`;
                usersHTML += '</tr>';
            });
            
            usersHTML += '</tbody></table></div>';
            usersHTML += `<p style="margin-top: 10px;"><strong>Всего пользователей:</strong> ${userCount}</p>`;
            usersHTML += `<button id="saveRolesBtn" class="btn" style="margin-top: 10px;">Сохранить изменения</button>`;
            
            showUsersModal(usersHTML);
        })
        .catch((error) => {
            console.error("Error getting users:", error);
            showNotification('Ошибка загрузки пользователей', 'error');
        });
}

// Показать модальное окно с пользователями
function showUsersModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close-modal" id="closeUsersModal">&times;</span>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeUsersModal').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('saveRolesBtn').addEventListener('click', () => {
        saveUserRoles(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Сохранение ролей пользователей
function saveUserRoles(modal) {
    const roleSelects = document.querySelectorAll('.role-select');
    let updatePromises = [];
    
    roleSelects.forEach(select => {
        const uid = select.getAttribute('data-uid');
        const newRole = select.value;
        
        updatePromises.push(
            db.collection("users").doc(uid).update({
                role: newRole
            })
        );
    });
    
    Promise.all(updatePromises)
        .then(() => {
            modal.remove();
            showNotification('Роли пользователей обновлены', 'success');
        })
        .catch((error) => {
            console.error("Error updating roles:", error);
            showNotification('Ошибка обновления ролей', 'error');
        });
}

// Удаление книги
function deleteBook(bookId) {
    if (!confirm('Вы уверены, что хотите удалить эту книгу?')) {
        return;
    }
    
    db.collection("books").doc(bookId).delete()
        .then(() => {
            showNotification('Книга удалена', 'success');
            // Удаляем книгу из локального массива
            booksData = booksData.filter(book => book.id !== bookId);
            displayBooks(booksData);
        })
        .catch(error => {
            console.error("Error deleting book:", error);
            showNotification('Ошибка удаления книги', 'error');
        });
}

// ============ ДОБАВЛЕНИЕ КНИГ ============

// Настройка формы добавления книги
function setupAddBookForm() {
    // Предпросмотр обложки
    coverUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('previewImage');
                if (preview) {
                    preview.src = e.target.result;
                    document.getElementById('coverPreview').style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Информация о PDF файле
    pdfUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const fileSize = (file.size / (1024 * 1024)).toFixed(2);
            fileInfo.textContent = `Файл: ${file.name} (${fileSize} MB)`;
        }
    });
    
    // Обработка отправки формы
    addBookForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!adminUser) {
            showNotification('Только администраторы могут добавлять книги', 'error');
            return;
        }
        
        const bookTitle = document.getElementById('bookTitle').value.trim();
        const bookAuthor = document.getElementById('bookAuthor').value.trim();
        const bookCategory = document.getElementById('bookCategory').value;
        const pdfFile = pdfUpload.files[0];
        
        if (!bookTitle || !bookAuthor || !bookCategory) {
            showNotification('Заполните все обязательные поля', 'error');
            return;
        }
        
        if (!pdfFile) {
            showNotification('Выберите PDF файл', 'error');
            return;
        }
        
        // Показываем индикатор загрузки
        const submitBtn = addBookForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="button-loader"></div> Загрузка...';
        submitBtn.disabled = true;
        
        try {
            // Загружаем PDF
            const pdfFileName = `books/${Date.now()}_${pdfFile.name.replace(/[^a-z0-9.]/gi, '_')}`;
            const pdfRef = storage.ref().child(pdfFileName);
            
            uploadProgress.style.display = 'block';
            const pdfSnapshot = await pdfRef.put(pdfFile);
            const pdfUrl = await pdfSnapshot.ref.getDownloadURL();
            
            // Загружаем обложку, если есть
            let coverUrl = document.getElementById('bookCover').value.trim();
            const coverFile = coverUpload.files[0];
            
            if (coverFile) {
                const coverFileName = `covers/${Date.now()}_${coverFile.name.replace(/[^a-z0-9.]/gi, '_')}`;
                const coverRef = storage.ref().child(coverFileName);
                const coverSnapshot = await coverRef.put(coverFile);
                coverUrl = await coverSnapshot.ref.getDownloadURL();
            }
            
            if (!coverUrl) {
                coverUrl = 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80';
            }
            
            // Сохраняем книгу в Firestore
            const bookData = {
                title: bookTitle,
                author: bookAuthor,
                description: document.getElementById('bookDescription').value.trim(),
                category: bookCategory,
                cover: coverUrl,
                fileUrl: pdfUrl,
                fileName: pdfFile.name,
                fileSize: (pdfFile.size / (1024 * 1024)).toFixed(2) + ' MB',
                year: parseInt(document.getElementById('bookYear').value) || new Date().getFullYear(),
                language: document.getElementById('bookLanguage').value.trim() || 'Русский',
                pages: parseInt(document.getElementById('bookPages').value) || 0,
                format: 'PDF',
                downloads: 0,
                addedBy: adminUser.uid,
                addedAt: new Date().toISOString(),
                approved: true
            };
            
            const docRef = await db.collection("books").add(bookData);
            bookData.id = docRef.id;
            
            // Добавляем книгу в локальный массив
            booksData.push(bookData);
            
            showNotification('Книга успешно добавлена!', 'success');
            resetAddBookForm();
            addBookModal.style.display = 'none';
            displayBooks(booksData);
            
        } catch (error) {
            console.error("Error adding book:", error);
            showNotification('Ошибка добавления книги: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            uploadProgress.style.display = 'none';
        }
    });
    
    // Закрытие модального окна
    closeAddBookModal.addEventListener('click', () => {
        addBookModal.style.display = 'none';
        resetAddBookForm();
    });
}

// Сброс формы добавления книги
function resetAddBookForm() {
    addBookForm.reset();
    const coverPreview = document.getElementById('coverPreview');
    if (coverPreview) {
        coverPreview.style.display = 'none';
    }
    uploadProgress.style.display = 'none';
    uploadProgress.value = 0;
    fileInfo.textContent = '';
}

// ============ ОБРАБОТЧИКИ СОБЫТИЙ ============

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск
    if (searchBtn) {
        searchBtn.addEventListener('click', searchBooks);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                searchBooks();
            }
        });
    }
    
    // Модальные окна
    if (closeLoginModal) {
        closeLoginModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }
    
    if (closeRegisterModal) {
        closeRegisterModal.addEventListener('click', () => {
            registerModal.style.display = 'none';
        });
    }
    
    // Переключение между модальными окнами
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.style.display = 'none';
            registerModal.style.display = 'flex';
        });
    }
    
    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.style.display = 'none';
            loginModal.style.display = 'flex';
        });
    }
    
    // Формы
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            if (email && password) {
                login(email, password);
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!name || !email || !password || !confirmPassword) {
                showNotification('Заполните все поля', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Пароли не совпадают', 'error');
                return;
            }
            
            register(name, email, password);
        });
    }
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (e.target === registerModal) {
            registerModal.style.display = 'none';
        }
        if (e.target === addBookModal) {
            addBookModal.style.display = 'none';
            resetAddBookForm();
        }
    });
    
    // Плавная прокрутка
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#!') return;
            
            e.preventDefault();
            const targetElement = document.querySelector(href);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
console.log("Digital Library application initialized");
