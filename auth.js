// auth.js - Complete Authentication System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Logout button (will be added dynamically)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'logoutBtn') {
                this.handleLogout();
            }
        });
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            showLoading('Signing in...');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            this.hideAuthScreen();
            showToast('Successfully signed in!', 'success');
        } catch (error) {
            console.error('Login error:', error);
            this.handleAuthError(error);
        } finally {
            hideLoading();
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            showLoading('Creating account...');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;

            // Save user profile
            await db.collection('users').doc(this.currentUser.uid).set({
                name: name,
                email: email,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });

            this.hideAuthScreen();
            showToast('Account created successfully!', 'success');
        } catch (error) {
            console.error('Registration error:', error);
            this.handleAuthError(error);
        } finally {
            hideLoading();
        }
    }

    async handleLogout() {
        try {
            showLoading('Signing out...');
            await auth.signOut();
            this.currentUser = null;
            this.showAuthScreen();
            showToast('Successfully signed out', 'info');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error signing out', 'error');
        } finally {
            hideLoading();
        }
    }

    handleAuthError(error) {
        let message = 'Authentication failed';
        
        switch (error.code) {
            case 'auth/invalid-email':
                message = 'Invalid email address';
                break;
            case 'auth/user-disabled':
                message = 'This account has been disabled';
                break;
            case 'auth/user-not-found':
                message = 'No account found with this email';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password';
                break;
            case 'auth/email-already-in-use':
                message = 'Email already in use';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Please check your connection';
                break;
            default:
                message = error.message;
        }
        
        showToast(message, 'error');
    }

    showAuthScreen() {
        document.getElementById('authScreen').style.display = 'flex';
        document.querySelector('main').style.display = 'none';
        document.querySelector('header').style.display = 'none';
        document.querySelector('footer').style.display = 'none';
    }

    hideAuthScreen() {
        document.getElementById('authScreen').style.display = 'none';
        document.querySelector('main').style.display = 'block';
        document.querySelector('header').style.display = 'block';
        document.querySelector('footer').style.display = 'block';
        this.addUserInfoToHeader();
    }

    addUserInfoToHeader() {
        const header = document.querySelector('header .logo-container');
        if (!header.querySelector('.user-info')) {
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            userInfo.innerHTML = `
                <div class="user-dropdown">
                    <button class="user-btn">
                        <i class="fas fa-user-circle me-2"></i>
                        <span id="userEmail">${this.currentUser.email}</span>
                        <i class="fas fa-chevron-down ms-2"></i>
                    </button>
                    <div class="user-dropdown-content">
                        <button id="logoutBtn" class="logout-btn">
                            <i class="fas fa-sign-out-alt me-2"></i>Sign Out
                        </button>
                    </div>
                </div>
            `;
            header.appendChild(userInfo);
        }
    }

    checkAuthState() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.hideAuthScreen();
                console.log('User authenticated:', user.email);
            } else {
                this.showAuthScreen();
            }
        });
    }

    // Secure database operations
    async secureDBOperation(operation, collection, data = null, docId = null) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            let result;
            const userDocRef = db.collection('users').doc(this.currentUser.uid);
            
            switch (operation) {
                case 'create':
                    result = await db.collection(collection).add({
                        ...data,
                        createdBy: this.currentUser.uid,
                        createdAt: new Date().toISOString()
                    });
                    break;
                    
                case 'update':
                    result = await db.collection(collection).doc(docId).update({
                        ...data,
                        updatedBy: this.currentUser.uid,
                        updatedAt: new Date().toISOString()
                    });
                    break;
                    
                case 'delete':
                    result = await db.collection(collection).doc(docId).delete();
                    break;
                    
                case 'get':
                    result = docId ? 
                        await db.collection(collection).doc(docId).get() :
                        await db.collection(collection).where('createdBy', '==', this.currentUser.uid).get();
                    break;
            }
            
            return result;
        } catch (error) {
            console.error('Secure DB operation error:', error);
            throw error;
        }
    }
}

// Initialize authentication system
let authSystem;

document.addEventListener('DOMContentLoaded', function() {
    authSystem = new AuthSystem();
});

// Tab switching function
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.auth-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}
