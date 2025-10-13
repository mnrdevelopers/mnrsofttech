// firebase-config.js - Updated version
const firebaseConfig = {
  apiKey: "AIzaSyCsgmsgUpMgb5Pw8xA_R3i9ybt6iEpNQ64",
  authDomain: "mnr-soft-tech-invoice.firebaseapp.com",
  projectId: "mnr-soft-tech-invoice",
  storageBucket: "mnr-soft-tech-invoice.firebasestorage.app",
  messagingSenderId: "846761019349",
  appId: "1:846761019349:web:98adfefb8ac2b44f115f5c",
  measurementId: "G-HTGPVDVPCR"
};

// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase initialized successfully");
    } else {
        firebase.app(); // if already initialized, use that one
        console.log("Firebase already initialized");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Initialize Firestore and Auth
const db = firebase.firestore();
const auth = firebase.auth();

// Firestore settings for better error handling
db.settings({
    ignoreUndefinedProperties: true
});

// Enable offline persistence (optional but recommended)
db.enablePersistence()
  .catch((err) => {
      console.log("Persistence failed:", err);
  });

// Authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log("User is signed in:", user.email);
        showAppContent();
    } else {
        // User is signed out
        console.log("User is signed out");
        showLoginForm();
    }
});

// Show login form
function showLoginForm() {
    // Hide main app content
    document.querySelector('main').style.display = 'none';
    document.querySelector('header').style.display = 'none';
    document.querySelector('footer').style.display = 'none';
    
    // Show login form
    const loginHTML = `
        <div class="login-container" id="loginContainer">
            <div class="login-card">
                <div class="login-header">
                    <i class="fas fa-lock fa-3x mb-3"></i>
                    <h2>MNR SoftTech Solutions</h2>
                    <p>Secure Access Portal</p>
                </div>
                <form id="loginForm">
                    <div class="mb-3">
                        <label for="loginEmail" class="form-label">Email Address</label>
                        <input type="email" class="form-control" id="loginEmail" required>
                    </div>
                    <div class="mb-3">
                        <label for="loginPassword" class="form-label">Password</label>
                        <input type="password" class="form-control" id="loginPassword" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-100 mb-3">
                        <i class="fas fa-sign-in-alt me-2"></i>Sign In
                    </button>
                    <div id="loginError" class="alert alert-danger d-none"></div>
                </form>
            </div>
        </div>
    `;
    
    // Add login form to body
    if (!document.getElementById('loginContainer')) {
        document.body.insertAdjacentHTML('afterbegin', loginHTML);
    }
    
    // Add login form event listener
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

// Show app content after successful login
function showAppContent() {
    // Remove login form if exists
    const loginContainer = document.getElementById('loginContainer');
    if (loginContainer) {
        loginContainer.remove();
    }
    
    // Show main app content
    document.querySelector('main').style.display = 'block';
    document.querySelector('header').style.display = 'block';
    document.querySelector('footer').style.display = 'block';
    
    // Add logout button to header
    addLogoutButton();
}

// Add logout button to header
function addLogoutButton() {
    // Check if logout button already exists
    if (document.getElementById('logoutBtn')) return;
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn btn-outline-light btn-sm';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Logout';
    logoutBtn.addEventListener('click', handleLogout);
    
    // Add to header
    const logoContainer = document.querySelector('.logo-container');
    logoContainer.appendChild(logoutBtn);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        showLoading('Signing in...');
        errorDiv.classList.add('d-none');
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Login successful:", userCredential.user.email);
        
    } catch (error) {
        console.error("Login error:", error);
        errorDiv.textContent = getAuthErrorMessage(error);
        errorDiv.classList.remove('d-none');
    } finally {
        hideLoading();
    }
}

// Handle logout
async function handleLogout() {
    try {
        showLoading('Signing out...');
        await auth.signOut();
        console.log("Logout successful");
    } catch (error) {
        console.error("Logout error:", error);
        showToast('Error signing out: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Get user-friendly auth error messages
function getAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/invalid-email':
            return 'Invalid email address format.';
        case 'auth/user-disabled':
            return 'This account has been disabled.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        default:
            return 'Login failed. Please check your credentials.';
    }
}

// Utility function to parse Firebase dates safely
function parseFirebaseDate(dateValue) {
    if (!dateValue) return new Date();
    
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        // Firebase Timestamp
        return dateValue.toDate();
    } else if (typeof dateValue === 'string') {
        // ISO string
        return new Date(dateValue);
    } else if (dateValue instanceof Date) {
        // Already a Date object
        return dateValue;
    } else {
        // Fallback
        return new Date();
    }
}

// Test Firestore connection (remove this after testing)
async function testFirebaseConnection() {
    try {
        const testDocRef = db.collection('test').document('connection');
        await testDocRef.set({
            test: true,
            timestamp: new Date().toISOString()
        });
        console.log("Firestore connection test successful");
        return true;
    } catch (error) {
        console.error("Firestore connection test failed:", error);
        return false;
    }
}

// Run test on load
setTimeout(testFirebaseConnection, 1000);
