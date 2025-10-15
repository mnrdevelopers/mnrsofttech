// session-manager.js - Advanced Session Security
class SessionManager {
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTime = 5 * 60 * 1000; // 5 minutes warning
        this.lastActivity = Date.now();
        this.warningShown = false;
        this.init();
    }

    init() {
        this.setupActivityListeners();
        this.startSessionTimer();
    }

    setupActivityListeners() {
        // Track user activity
        const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        activities.forEach(activity => {
            document.addEventListener(activity, () => {
                this.resetTimer();
            });
        });
    }

    resetTimer() {
        this.lastActivity = Date.now();
        this.warningShown = false;
        this.hideWarning();
    }

    startSessionTimer() {
        setInterval(() => {
            const idleTime = Date.now() - this.lastActivity;
            
            if (idleTime > this.sessionTimeout && authSystem.currentUser) {
                this.logoutDueToInactivity();
            } else if (idleTime > this.warningTime && !this.warningShown && authSystem.currentUser) {
                this.showWarning();
            }
        }, 1000);
    }

    showWarning() {
        this.warningShown = true;
        const timeLeft = Math.ceil((this.sessionTimeout - (Date.now() - this.lastActivity)) / 1000);
        
        const warningHTML = `
            <div id="sessionWarning" class="session-warning">
                <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                <h3>Session Timeout Warning</h3>
                <p>Your session will expire due to inactivity in:</p>
                <div class="session-timer" id="sessionTimer">${timeLeft}s</div>
                <p>Move your mouse or press any key to continue</p>
                <button onclick="sessionManager.resetTimer()" class="btn btn-primary mt-2">
                    <i class="fas fa-sync-alt me-2"></i>Continue Session
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', warningHTML);
        
        // Update timer every second
        const timerElement = document.getElementById('sessionTimer');
        let countdown = timeLeft;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (timerElement) {
                timerElement.textContent = countdown + 's';
            }
            if (countdown <= 0 || !this.warningShown) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    hideWarning() {
        const warning = document.getElementById('sessionWarning');
        if (warning) {
            warning.remove();
        }
    }

    logoutDueToInactivity() {
        showToast('Session expired due to inactivity', 'warning');
        authSystem.handleLogout();
    }
}

// Initialize session manager
let sessionManager;

// Enhanced security wrapper for all database operations
const secureDB = {
    async add(collection, data) {
        return await authSystem.secureDBOperation('create', collection, data);
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
    
    async query(collection, conditions) {
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
    sessionManager = new SessionManager();
});
