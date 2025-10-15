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
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

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

        if (!email || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            showLoading('Signing in...');
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            
            // Update user's last login
            await db.collection('users').doc(this.currentUser.uid).set({
                lastLogin: new Date().toISOString()
            }, { merge: true });
            
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

        if (!name || !email || !password || !confirmPassword) {
            showToast('Please fill in all fields', 'error');
            return;
        }

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
        const authScreen = document.getElementById('authScreen');
        const main = document.querySelector('main');
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        
        if (authScreen) authScreen.style.display = 'flex';
        if (main) main.style.display = 'none';
        if (header) header.style.display = 'none';
        if (footer) footer.style.display = 'none';
    }

    hideAuthScreen() {
        const authScreen = document.getElementById('authScreen');
        const main = document.querySelector('main');
        const header = document.querySelector('header');
        const footer = document.querySelector('footer');
        
        if (authScreen) authScreen.style.display = 'none';
        if (main) main.style.display = 'block';
        if (header) header.style.display = 'block';
        if (footer) footer.style.display = 'block';
        
        this.addUserInfoToHeader();
    }

  addUserInfoToHeader() {
    const header = document.querySelector('header .logo-container');
    if (!header) return;
    
    // Remove existing user info
    const existingUserInfo = header.querySelector('.user-info');
    if (existingUserInfo) existingUserInfo.remove();

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
        <div class="user-dropdown">
            <button class="user-btn" onclick="toggleDropdown()">
                <i class="fas fa-user-circle me-2"></i>
                ${this.getUserDisplayName()}
                <i class="fas fa-chevron-down ms-2"></i>
            </button>
            <div class="user-dropdown-content" id="userDropdown">
                <button id="logoutBtn" class="logout-btn" onclick="authSystem.handleLogout()">
                    <i class="fas fa-sign-out-alt me-2"></i>Sign Out
                </button>
            </div>
        </div>
    `;
    
    header.appendChild(userInfo);
}

getUserDisplayName() {
    if (this.currentUser.email) {
        return this.currentUser.email.split('@')[0]; // Show only username part
    }
    return 'User';
}

// Global function for dropdown toggle
function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.user-dropdown')) {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }
});

    // Secure database operations
    async secureDBOperation(operation, collection, data = null, docId = null) {
        if (!this.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            let result;
            
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
                    if (docId) {
                        result = await db.collection(collection).doc(docId).get();
                        // Check if user owns this document
                        if (result.exists && result.data().createdBy !== this.currentUser.uid) {
                            throw new Error('Access denied');
                        }
                    } else {
                        result = await db.collection(collection)
                            .where('createdBy', '==', this.currentUser.uid)
                            .get();
                    }
                    break;
                    
                case 'set':
                    result = await db.collection(collection).doc(docId).set({
                        ...data,
                        createdBy: this.currentUser.uid,
                        createdAt: new Date().toISOString()
                    });
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
    const targetTab = document.getElementById(tabName + 'Tab');
    const targetButton = event.target;
    
    if (targetTab) targetTab.classList.add('active');
    if (targetButton) targetButton.classList.add('active');
}

// Global secureDB object for other scripts to use
const secureDB = {
    async add(collection, data) {
        return await authSystem.secureDBOperation('create', collection, data);
    },
    
    async set(collection, docId, data) {
        return await authSystem.secureDBOperation('set', collection, data, docId);
    },
    
    async update(collection, docId, data) {
        return await authSystem.secureDBOperation('update', collection, data, docId);
    },
    
    async delete(collection, docId) {
        return await authSystem.secureDBOperation('delete', collection, null, docId);
    },
    
    async get(collection, docId = null) {
        return await authSystem.secureDBOperation('get', collection, null, docId);
    },
    
    async query(collection, conditions = []) {
        if (!authSystem.currentUser) throw new Error('Not authenticated');
        
        let query = db.collection(collection).where('createdBy', '==', authSystem.currentUser.uid);
        
        // Add additional conditions
        conditions.forEach(condition => {
            query = query.where(condition.field, condition.operator, condition.value);
        });
        
        return await query.get();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    authSystem = new AuthSystem();
});
