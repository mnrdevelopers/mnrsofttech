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
        // Login form only
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
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
            
            // Initialize app components after successful login
            this.initializeAppComponents();
        } catch (error) {
            console.error('Login error:', error);
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
        
        // Remove existing user info if any
        const existingUserInfo = header.querySelector('.user-info');
        if (existingUserInfo) {
            existingUserInfo.remove();
        }

        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <div class="user-display">
                <span class="user-email">
                    <i class="fas fa-user-circle me-2"></i>
                    ${this.currentUser.email}
                </span>
                <button id="logoutBtn" class="logout-btn ms-3">
                    <i class="fas fa-sign-out-alt me-2"></i>Sign Out
                </button>
            </div>
        `;
        header.appendChild(userInfo);
    }

    checkAuthState() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.hideAuthScreen();
                console.log('User authenticated:', user.email);
                
                // Initialize app components after auth
                this.initializeAppComponents();
                
            } else {
                this.showAuthScreen();
            }
        });
    }

   initializeAppComponents() {
    // Initialize app components only when authenticated
    setTimeout(() => {
        console.log('Initializing app components for authenticated user');
        
        if (typeof initializeDashboard === 'function') {
            console.log('Calling initializeDashboard...');
            initializeDashboard();
        } else {
            console.error('initializeDashboard function not found');
        }
        
        if (typeof setupInvoicesTab === 'function') setupInvoicesTab();
        if (typeof initializeConsolidationTab === 'function') initializeConsolidationTab();
        if (typeof initializeBulkPayments === 'function') initializeBulkPayments();
        if (typeof initializeCustomersTab === 'function') initializeCustomersTab();
    }, 1000);
}

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
