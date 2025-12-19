// Load books from Firestore
async function loadBooks() {
    const booksContainer = document.getElementById('books-container');
    booksContainer.innerHTML = '<div class="loading">Loading books...</div>';
    
    try {
        const snapshot = await db.collection('books').orderBy('downloads', 'desc').limit(20).get();
        
        if (snapshot.empty) {
            booksContainer.innerHTML = '<div class="no-books">No books available yet.</div>';
            return;
        }
        
        booksContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const book = doc.data();
            book.id = doc.id;
            createBookCard(book);
        });
    } catch (error) {
        console.error('Error loading books:', error);
        booksContainer.innerHTML = '<div class="error">Failed to load books. Please try again.</div>';
    }
}

// Create book card element
function createBookCard(book) {
    const booksContainer = document.getElementById('books-container');
    
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.id = book.id;
    
    bookCard.innerHTML = `
        <div class="book-cover">
            <i class="fas fa-book"></i>
        </div>
        <div class="book-info">
            <h3 class="book-title">${book.title || 'Untitled'}</h3>
            <p class="book-author">
                <i class="fas fa-user-edit"></i>
                ${book.author || 'Unknown Author'}
            </p>
            <p class="book-description">${(book.description || 'No description available').substring(0, 100)}...</p>
            <div class="book-stats">
                <span class="download-count">
                    <i class="fas fa-download"></i>
                    ${book.downloads || 0} downloads
                </span>
                <button class="btn-primary download-btn" data-id="${book.id}">
                    Download PDF
                </button>
            </div>
        </div>
    `;
    
    booksContainer.appendChild(bookCard);
    
    // Add download event
    bookCard.querySelector('.download-btn').addEventListener('click', () => {
        downloadBook(book);
    });
    
    // Click to show details
    bookCard.addEventListener('click', (e) => {
        if (!e.target.classList.contains('download-btn')) {
            showBookDetails(book);
        }
    });
}

// Download book function
async function downloadBook(book) {
    const user = auth.currentUser;
    
    if (!user) {
        alert('Please login to download books');
        showLoginModal();
        return;
    }
    
    try {
        // Update download count
        await db.collection('books').doc(book.id).update({
            downloads: (book.downloads || 0) + 1,
            lastDownload: new Date().toISOString()
        });
        
        // Update user's download history
        await db.collection('users').doc(user.uid).update({
            downloads: firebase.firestore.FieldValue.increment(1),
            lastDownload: new Date().toISOString(),
            recentDownloads: firebase.firestore.FieldValue.arrayUnion({
                bookId: book.id,
                bookTitle: book.title,
                downloadedAt: new Date().toISOString()
            })
        });
        
        // Open download link (Google Drive link from book document)
        if (book.driveLink) {
            window.open(book.driveLink, '_blank');
        } else if (book.pdfUrl) {
            window.open(book.pdfUrl, '_blank');
        } else {
            alert('Download link not available');
        }
        
        // Refresh books to update counts
        loadBooks();
        loadRecentDownloads(user.uid);
        
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download book');
    }
}

// Show book details modal
function showBookDetails(book) {
    const modal = document.getElementById('book-modal');
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <div class="book-details">
                <div class="book-detail-cover">
                    <i class="fas fa-book"></i>
                </div>
                <div class="book-detail-info">
                    <h2>${book.title || 'Untitled'}</h2>
                    <p class="detail-author"><strong>Author:</strong> ${book.author || 'Unknown'}</p>
                    <p class="detail-genre"><strong>Genre:</strong> ${book.genre || 'Not specified'}</p>
                    <p class="detail-pages"><strong>Pages:</strong> ${book.pages || 'N/A'}</p>
                    <p class="detail-year"><strong>Year:</strong> ${book.year || 'N/A'}</p>
                    <p class="detail-description">${book.description || 'No description available.'}</p>
                    <div class="detail-stats">
                        <span><i class="fas fa-download"></i> ${book.downloads || 0} downloads</span>
                        <span><i class="fas fa-eye"></i> ${book.views || 0} views</span>
                    </div>
                    <button class="btn-primary download-btn-full" data-id="${book.id}">
                        <i class="fas fa-download"></i> Download PDF (${book.size || 'N/A'})
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Download button
    modal.querySelector('.download-btn-full').addEventListener('click', () => {
        downloadBook(book);
    });
}

// Load user's recent downloads
async function loadRecentDownloads(userId) {
    const recentContainer = document.getElementById('recent-container');
    
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const recentDownloads = userData.recentDownloads || [];
            
            recentContainer.innerHTML = '';
            
            // Display last 5 downloads
            recentDownloads.slice(-5).reverse().forEach(download => {
                const downloadEl = document.createElement('div');
                downloadEl.className = 'recent-item';
                downloadEl.innerHTML = `
                    <i class="fas fa-file-pdf"></i>
                    <span>${download.bookTitle}</span>
                    <small>${new Date(download.downloadedAt).toLocaleDateString()}</small>
                `;
                recentContainer.appendChild(downloadEl);
            });
        }
    } catch (error) {
        console.error('Error loading recent downloads:', error);
    }
}

// Search books
function searchBooks(query) {
    // Implement search functionality
    console.log('Searching for:', query);
    // You would query Firestore with the search term
}

// Initialize books when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    
    // Set up search
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-bar button');
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', () => {
            searchBooks(searchInput.value);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchBooks(searchInput.value);
            }
        });
    }
    
    // Load recent downloads if user is logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            loadRecentDownloads(user.uid);
        }
    });
});
