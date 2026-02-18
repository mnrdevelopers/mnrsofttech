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
            const logoutBtn = e.target.closest('#logoutBtn');
            if (logoutBtn) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Mobile Header Logout button
        const headerLogoutBtn = document.getElementById('headerLogoutBtn');
        if (headerLogoutBtn) {
            headerLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
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
        const wrapper = document.getElementById('wrapper');
        
        if (authScreen) authScreen.style.display = 'flex';
        if (wrapper) wrapper.style.display = 'none';
    }

    hideAuthScreen() {
        const authScreen = document.getElementById('authScreen');
        const wrapper = document.getElementById('wrapper');
        
        if (authScreen) authScreen.style.display = 'none';
        if (wrapper) wrapper.style.display = 'flex';
        
        this.addUserInfoToHeader();
    }

    addUserInfoToHeader() {
        const userInfoContainer = document.getElementById('userInfoContainer');
        if (!userInfoContainer) return;
        
        // Remove existing user info if any
        userInfoContainer.innerHTML = '';

        userInfoContainer.innerHTML = `
            <div class="dropdown">
                <div class="user-display" id="userDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                    <div class="user-avatar">
                        ${this.getUserAvatar()}
                    </div>
                    <div class="d-none d-md-block">
                        <div class="user-name">${this.currentUser.displayName || this.currentUser.email}</div>
                    </div>
                    <i class="fas fa-chevron-down ms-2 small text-muted d-none d-md-block" style="font-size: 0.7rem;"></i>
                </div>
                <ul class="dropdown-menu dropdown-menu-end animate slideIn" aria-labelledby="userDropdown">
                    <li><h6 class="dropdown-header">Signed in as<br><strong class="text-dark">${this.currentUser.displayName || this.currentUser.email}</strong></h6></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item" href="#" id="profileLink"><i class="fas fa-user-circle me-2 text-primary"></i>My Profile</a></li>
                    <li><a class="dropdown-item" href="#" id="settingsLink"><i class="fas fa-cog me-2 text-secondary"></i>Settings</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="fas fa-sign-out-alt me-2"></i>Sign Out</a></li>
                </ul>
            </div>
        `;

        // Add event listener for profile link
        document.getElementById('profileLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showProfileTab();
        });

        // Add event listener for settings link
        document.getElementById('settingsLink').addEventListener('click', (e) => {
            e.preventDefault();
            const settingsModalElement = document.getElementById('settingsModal');
            if (settingsModalElement) {
                const settingsModal = new bootstrap.Modal(settingsModalElement);
                settingsModal.show();
            }
        });
    }

    getUserAvatar() {
        if (this.currentUser.photoURL) {
            return `<img src="${this.currentUser.photoURL}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
        const name = this.currentUser.displayName || this.currentUser.email;
        return name.charAt(0).toUpperCase();
    }

    showProfileTab() {
        // Hide sidebar on mobile if open
        const wrapper = document.getElementById('wrapper');
        if (wrapper && wrapper.classList.contains('toggled')) {
            wrapper.classList.remove('toggled');
        }

        // Deactivate all tabs
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));

        // Activate profile tab
        const profileTab = document.getElementById('profile');
        if (profileTab) {
            profileTab.classList.add('show', 'active');
            document.getElementById('pageTitle').textContent = 'User Profile';
            
            // Populate profile form
            this.populateProfileForm();
        }
    }

    populateProfileForm() {
        const displayNameInput = document.getElementById('profileDisplayName');
        const emailInput = document.getElementById('profileEmail');
        const photoURLInput = document.getElementById('profilePhotoURL');
        const avatarPreview = document.getElementById('profileAvatarPreview');

        if (displayNameInput) displayNameInput.value = this.currentUser.displayName || '';
        if (emailInput) emailInput.value = this.currentUser.email || '';
        if (photoURLInput) photoURLInput.value = this.currentUser.photoURL || '';
        
        if (avatarPreview) {
            if (this.currentUser.photoURL) {
                avatarPreview.innerHTML = `<img src="${this.currentUser.photoURL}" alt="Avatar">`;
            } else {
                const name = this.currentUser.displayName || this.currentUser.email;
                avatarPreview.innerHTML = name.charAt(0).toUpperCase();
            }
        }
    }

    async updateUserProfile(displayName, photoURL) {
        try {
            showLoading('Updating profile...');
            
            await this.currentUser.updateProfile({
                displayName: displayName,
                photoURL: photoURL || null
            });
            
            // Update Firestore user document as well
            await db.collection('users').doc(this.currentUser.uid).set({
                displayName: displayName,
                email: this.currentUser.email,
                photoURL: photoURL || null,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            showToast('Profile updated successfully', 'success');
            this.addUserInfoToHeader(); // Refresh header
            this.populateProfileForm(); // Refresh form
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Error updating profile: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
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
        
        // Check if user is authenticated before initializing
        if (this.currentUser) {
            console.log('User authenticated, initializing components...');
            
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
        } else {
            console.log('No authenticated user, skipping component initialization');
        }
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
