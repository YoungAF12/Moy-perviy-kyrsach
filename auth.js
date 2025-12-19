// Authentication State Observer
auth.onAuthStateChanged(user => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profileLink = document.getElementById('profile-link');
    
    if (user) {
        // User is signed in
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        profileLink.style.display = 'block';
        
        // Update user profile in UI
        updateUserProfile(user);
        
        // Load user-specific data
        loadUserBooks(user.uid);
    } else {
        // User is signed out
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        profileLink.style.display = 'none';
    }
});

// Login Function
async function login(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('User logged in:', userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Login error:', error.message);
        return { success: false, error: error.message };
    }
}

// Register Function
async function register(email, password, name) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Create user document in Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            downloads: 0,
            lastLogin: new Date().toISOString()
        });
        
        console.log('User registered:', userCredential.user.email);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Registration error:', error.message);
        return { success: false, error: error.message };
    }
}

// Logout Function
async function logout() {
    try {
        await auth.signOut();
        console.log('User logged out');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error.message);
    }
}

// Update User Profile in UI
function updateUserProfile(user) {
    // Load additional user data from Firestore
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                // Update UI elements with user data
                const profileElements = document.querySelectorAll('.user-name');
                profileElements.forEach(el => {
                    el.textContent = userData.name || user.email;
                });
            }
        });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const loginBtn = document.getElementById('login-btn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            showLoginModal();
        });
    }
});

// Show Login Modal
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Login to BookHaven</h2>
            <form id="login-form">
                <input type="email" id="login-email" placeholder="Email" required>
                <input type="password" id="login-password" placeholder="Password" required>
                <button type="submit" class="btn-primary">Login</button>
            </form>
            <p>Don't have an account? <a href="#" id="show-register">Register here</a></p>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Login form submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const result = await login(email, password);
        if (result.success) {
            modal.style.display = 'none';
        } else {
            alert('Login failed: ' + result.error);
        }
    });
    
    // Show register form
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterModal();
    });
}

// Show Register Modal
function showRegisterModal() {
    const modal = document.getElementById('login-modal');
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Create Account</h2>
            <form id="register-form">
                <input type="text" id="register-name" placeholder="Full Name" required>
                <input type="email" id="register-email" placeholder="Email" required>
                <input type="password" id="register-password" placeholder="Password (min. 6 characters)" required>
                <button type="submit" class="btn-primary">Register</button>
            </form>
            <p>Already have an account? <a href="#" id="show-login">Login here</a></p>
        </div>
    `;
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Register form submit
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        
        const result = await register(email, password, name);
        if (result.success) {
            modal.style.display = 'none';
        } else {
            alert('Registration failed: ' + result.error);
        }
    });
    
    // Show login form
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showLoginModal();
    });
}
