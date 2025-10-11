// Authentication functions
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const app = document.getElementById('app');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const userEmail = document.getElementById('userEmail');

    // Show/hide forms
    showRegisterLink.addEventListener('click', function(e) {
        e.preventDefault();
        loginForm.classList.add('d-none');
        registerForm.classList.remove('d-none');
    });

    showLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        registerForm.classList.add('d-none');
        loginForm.classList.remove('d-none');
    });

    // Login with email/password
    loginBtn.addEventListener('click', function() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showAlert('Please enter both email and password', 'danger');
            return;
        }
        
        showLoading(true);
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                showLoading(false);
                authModal.hide();
                showAlert('Login successful!', 'success');
            })
            .catch((error) => {
                showLoading(false);
                const errorCode = error.code;
                let errorMessage = 'Login failed. Please try again.';
                
                if (errorCode === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email.';
                } else if (errorCode === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password.';
                } else if (errorCode === 'auth/invalid-email') {
                    errorMessage = 'Invalid email address.';
                }
                
                showAlert(errorMessage, 'danger');
            });
    });

    // Register with email/password
    registerBtn.addEventListener('click', function() {
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const businessName = document.getElementById('businessName').value;
        const businessContact = document.getElementById('businessContact').value;
        const businessAddress = document.getElementById('businessAddress').value;
        
        if (!email || !password || !businessName || !businessContact || !businessAddress) {
            showAlert('Please fill in all fields', 'danger');
            return;
        }
        
        if (password.length < 6) {
            showAlert('Password should be at least 6 characters', 'danger');
            return;
        }
        
        showLoading(true);
        
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed up
                const user = userCredential.user;
                
                // Save business info to Firestore
                return db.collection('users').doc(user.uid).set({
                    email: email,
                    businessName: businessName,
                    businessContact: businessContact,
                    businessAddress: businessAddress,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    invoicePrefix: 'INV'
                });
            })
            .then(() => {
                showLoading(false);
                authModal.hide();
                showAlert('Account created successfully!', 'success');
            })
            .catch((error) => {
                showLoading(false);
                const errorCode = error.code;
                let errorMessage = 'Registration failed. Please try again.';
                
                if (errorCode === 'auth/email-already-in-use') {
                    errorMessage = 'An account with this email already exists.';
                } else if (errorCode === 'auth/weak-password') {
                    errorMessage = 'Password is too weak.';
                } else if (errorCode === 'auth/invalid-email') {
                    errorMessage = 'Invalid email address.';
                }
                
                showAlert(errorMessage, 'danger');
            });
    });

    // Google login
    googleLoginBtn.addEventListener('click', function() {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        showLoading(true);
        
        auth.signInWithPopup(provider)
            .then((result) => {
                // Check if this is a new user
                const user = result.user;
                const isNewUser = result.additionalUserInfo.isNewUser;
                
                if (isNewUser) {
                    // Save basic user info to Firestore for new users
                    return db.collection('users').doc(user.uid).set({
                        email: user.email,
                        businessName: user.displayName || 'My Business',
                        businessContact: user.email,
                        businessAddress: 'Update your business address',
                        invoicePrefix: 'INV',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            })
            .then(() => {
                showLoading(false);
                authModal.hide();
                showAlert('Login successful!', 'success');
            })
            .catch((error) {
                showLoading(false);
                console.error('Google login error:', error);
                showAlert('Google login failed. Please try again.', 'danger');
            });
    });

    // Logout
    logoutBtn.addEventListener('click', function() {
        auth.signOut()
            .then(() => {
                showAlert('Logged out successfully', 'info');
            })
            .catch((error) => {
                console.error('Logout error:', error);
            });
    });

    // Auth state observer
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            userEmail.textContent = user.email;
            app.classList.remove('d-none');
            loadUserBusinessInfo(user.uid);
            loadTodayInvoices(user.uid);
        } else {
            // User is signed out
            app.classList.add('d-none');
            authModal.show();
        }
    });

    // Show/hide loading spinner
    function showLoading(show) {
        if (show) {
            loadingSpinner.classList.remove('d-none');
        } else {
            loadingSpinner.classList.add('d-none');
        }
    }

    // Show alert message
    function showAlert(message, type) {
        // Remove any existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Add alert to page
        document.body.insertBefore(alert, document.body.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // Load user business info with better error handling
    function loadUserBusinessInfo(userId) {
        db.collection('users').doc(userId).get()
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    // Set business info in settings form
                    document.getElementById('settingsBusinessName').value = userData.businessName || '';
                    document.getElementById('settingsBusinessContact').value = userData.businessContact || '';
                    document.getElementById('settingsBusinessAddress').value = userData.businessAddress || '';
                    document.getElementById('settingsBusinessTax').value = userData.taxNumber || '';
                    document.getElementById('settingsInvoicePrefix').value = userData.invoicePrefix || 'INV';
                }
            })
            .catch((error) => {
                console.error('Error loading user data:', error);
                // Don't show alert for permission errors during initial load
                if (!error.message.includes('permission')) {
                    showAlert('Error loading user data', 'danger');
                }
            });
    }

    // Load today's invoices for summary with better query
    function loadTodayInvoices(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Use createdAt field instead of date for better querying
        db.collection('invoices')
            .where('userId', '==', userId)
            .where('createdAt', '>=', today)
            .get()
            .then((querySnapshot) => {
                let count = 0;
                let revenue = 0;
                
                querySnapshot.forEach((doc) => {
                    count++;
                    const invoice = doc.data();
                    revenue += invoice.total || 0;
                });
                
                document.getElementById('todayInvoicesCount').textContent = count;
                document.getElementById('todayRevenue').textContent = `₹${revenue.toFixed(2)}`;
            })
            .catch((error) => {
                console.error('Error loading today invoices:', error);
                // Don't show alert for index errors during initial load
                if (!error.message.includes('index')) {
                    showAlert('Error loading today\'s invoices', 'warning');
                }
            });
    }
});
