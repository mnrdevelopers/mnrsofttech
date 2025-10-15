// session-manager.js - Advanced Session Security
class SessionManager {
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.warningTime = 5 * 60 * 1000; // 5 minutes warning
        this.lastActivity = Date.now();
        this.warningShown = false;
        this.countdownInterval = null;
        this.init();
    }

    init() {
        this.setupActivityListeners();
        this.startSessionTimer();
    }

    setupActivityListeners() {
        // Track user activity
        const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activities.forEach(activity => {
            document.addEventListener(activity, () => {
                this.resetTimer();
            });
        });
    }

    resetTimer() {
        this.lastActivity = Date.now();
        if (this.warningShown) {
            this.warningShown = false;
            this.hideWarning();
        }
    }

    startSessionTimer() {
        setInterval(() => {
            if (!authSystem || !authSystem.currentUser) return;
            
            const idleTime = Date.now() - this.lastActivity;
            
            if (idleTime > this.sessionTimeout) {
                this.logoutDueToInactivity();
            } else if (idleTime > this.warningTime && !this.warningShown) {
                this.showWarning();
            }
        }, 1000);
    }

    showWarning() {
        this.warningShown = true;
        const timeLeft = Math.ceil((this.sessionTimeout - (Date.now() - this.lastActivity)) / 1000);
        
        // Remove existing warning if any
        this.hideWarning();
        
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
        let countdown = timeLeft;
        this.countdownInterval = setInterval(() => {
            countdown--;
            const timerElement = document.getElementById('sessionTimer');
            if (timerElement) {
                timerElement.textContent = countdown + 's';
            }
            if (countdown <= 0 || !this.warningShown) {
                clearInterval(this.countdownInterval);
            }
        }, 1000);
    }

    hideWarning() {
        const warning = document.getElementById('sessionWarning');
        if (warning) {
            warning.remove();
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    logoutDueToInactivity() {
        this.hideWarning();
        showToast('Session expired due to inactivity', 'warning');
        if (authSystem && authSystem.handleLogout) {
            authSystem.handleLogout();
        }
    }
}

// Initialize session manager
let sessionManager;

document.addEventListener('DOMContentLoaded', function() {
    sessionManager = new SessionManager();
});
