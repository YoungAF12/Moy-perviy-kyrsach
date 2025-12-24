let currentBookId = null;

// Загрузка книг при старте
document.addEventListener('DOMContentLoaded', loadBooks);

async function loadBooks() {
    try {
        const response = await fetch('/api/books');
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

function displayBooks(books) {
    const bookList = document.getElementById('bookList');
    bookList.innerHTML = '';

    books.forEach(book => {
        const bookElement = document.createElement('div');
        bookElement.className = 'book-card';
        bookElement.innerHTML = `
            <div class="book-cover">
                <i class="fas fa-book fa-3x"></i>
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p class="author">${book.author || 'Автор неизвестен'}</p>
                <p class="description">${book.description || ''}</p>
                <div class="book-tags">${book.tags ? book.tags.split(',').map(tag => 
                    `<span class="tag">${tag.trim()}</span>`).join('') : ''}</div>
                <button onclick="openBook(${book.id}, '${book.title}', '${book.file_path}')">
                    <i class="fas fa-book-open"></i> Читать
                </button>
            </div>
        `;
        bookList.appendChild(bookElement);
    });
}

async function openBook(id, title, filePath) {
    currentBookId = id;
    
    // Показываем читалку
    document.getElementById('bookList').style.display = 'none';
    document.getElementById('readerSection').style.display = 'block';
    document.getElementById('readerTitle').textContent = title;
    
    // Загружаем информацию о книге
    const bookInfo = document.getElementById('bookInfo');
    bookInfo.innerHTML = `<h4>${title}</h4>`;
    
    // Загружаем PDF
    const pdfViewer = document.getElementById('pdfViewer');
    pdfViewer.innerHTML = `<iframe src="/books/uploads/${filePath}" 
        style="width:100%; height:600px;" frameborder="0"></iframe>`;
    
    // Загружаем прогресс
    await loadProgress(id);
}

async function uploadBook() {
    const fileInput = document.getElementById('bookFile');
    const title = document.getElementById('bookTitle').value;
    const author = document.getElementById('bookAuthor').value;
    const description = document.getElementById('bookDescription').value;
    const tags = document.getElementById('bookTags').value;

    if (!fileInput.files[0] || !title) {
        alert('Пожалуйста, заполните название и выберите файл');
        return;
    }

    const formData = new FormData();
    formData.append('bookFile', fileInput.files[0]);
    formData.append('title', title);
    formData.append('author', author);
    formData.append('description', description);
    formData.append('tags', tags);

    try {
        const response = await fetch('/api/books/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        alert(result.message);
        loadBooks();
        
        // Очищаем форму
        ['bookTitle', 'bookAuthor', 'bookDescription', 'bookTags'].forEach(id => {
            document.getElementById(id).value = '';
        });
        fileInput.value = '';
    } catch (error) {
        console.error('Error uploading book:', error);
    }
}

async function saveProgress() {
    const currentPage = document.getElementById('currentPage').value;
    const notes = document.getElementById('readingNotes').value;

    const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            bookId: currentBookId,
            lastPage: currentPage,
            notes: notes
        })
    });

    const result = await response.json();
    console.log('Progress saved:', result);
}

async function loadProgress(bookId) {
    // Здесь можно добавить загрузку сохраненного прогресса
    // Упрощенная версия - просто сбрасываем поля
    document.getElementById('currentPage').value = '1';
    document.getElementById('readingNotes').value = '';
}

function filterByTag(tag) {
    fetch(`/api/books/tag/${tag}`)
        .then(response => response.json())
        .then(books => displayBooks(books))
        .catch(error => console.error('Error filtering by tag:', error));
}

function closeReader() {
    document.getElementById('bookList').style.display = 'grid';
    document.getElementById('readerSection').style.display = 'none';
    currentBookId = null;
}
