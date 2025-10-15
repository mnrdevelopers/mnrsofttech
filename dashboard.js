// Dashboard Management
let paymentChart = null;
let incomeChart = null;
let dashboardInitialized = false;

function initializeDashboard() {
    if (dashboardInitialized) {
        console.log('Dashboard already initialized');
        return;
    }
    
    // Check if user is authenticated
    if (!authSystem || !authSystem.currentUser) {
        console.log('Dashboard: User not authenticated, skipping initialization');
        return;
    }
    
    try {
        console.log('Dashboard: Initializing...');
        setupDashboardEventListeners();
        
        // Load data immediately if dashboard tab is active
        const dashboardTab = document.getElementById('dashboard');
        if (dashboardTab && dashboardTab.classList.contains('active')) {
            updateDashboard();
        }
        
        dashboardInitialized = true;
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Dashboard initialization failed:', error);
    }
}

function setupDashboardEventListeners() {
    // Refresh dashboard when tab is shown
    const dashboardTab = document.getElementById('dashboard-tab');
    if (dashboardTab) {
        dashboardTab.addEventListener('shown.bs.tab', function() {
            console.log('Dashboard tab shown, updating data...');
            updateDashboard();
        });
    }
}

async function updateDashboard() {
    // Check authentication before proceeding
    if (!authSystem || !authSystem.currentUser) {
        console.log('Dashboard: User not authenticated, cannot load data');
        return;
    }

    try {
        console.log('Starting dashboard data update...');
        
        // Show loading state for dashboard cards
        const dashboardCards = document.querySelector('#dashboard .row.mb-4');
        if (dashboardCards) {
            dashboardCards.classList.add('section-loading');
        }
        
        // Update card texts to loading
        const totalIncomeEl = document.getElementById('totalIncome');
        const pendingAmountEl = document.getElementById('pendingAmount');
        const totalCustomersEl = document.getElementById('totalCustomers');
        const monthlyCustomersEl = document.getElementById('monthlyCustomers');
        
        if (totalIncomeEl) totalIncomeEl.textContent = 'Loading...';
        if (pendingAmountEl) pendingAmountEl.textContent = 'Loading...';
        if (totalCustomersEl) totalCustomersEl.textContent = 'Loading...';
        if (monthlyCustomersEl) monthlyCustomersEl.textContent = 'Loading...';

        // Show loading for charts
        const paymentChartCanvas = document.getElementById('paymentChart');
        const incomeChartCanvas = document.getElementById('incomeChart');
        
        if (paymentChartCanvas) {
            paymentChartCanvas.innerHTML = '<div class="preview-loading"><div class="loading-spinner"></div><p>Loading chart...</p></div>';
        }
        if (incomeChartCanvas) {
            incomeChartCanvas.innerHTML = '<div class="preview-loading"><div class="loading-spinner"></div><p>Loading chart...</p></div>';
        }
        
        console.log('Fetching data from Firestore...');
        
        // Use secureDB for authenticated queries
        const invoicesSnapshot = await secureDB.query('invoices');
        const customersSnapshot = await secureDB.query('customers');
        
        console.log(`Found ${invoicesSnapshot.size} invoices and ${customersSnapshot.size} customers`);
        
        let totalIncome = 0;
        let pendingAmount = 0;
        let monthlyCustomers = 0;
        const customers = new Set();
        
        // Payment status counts
        const paymentCounts = {
            paid: 0,
            unpaid: 0,
            partial: 0
        };
        
        // Monthly income data (last 6 months)
        const monthlyIncome = Array(6).fill(0);
        const monthLabels = [];
        
        // Generate month labels for last 6 months
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            monthLabels.push(date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
        }
        
        console.log('Processing invoices for dashboard...');
        
        invoicesSnapshot.forEach(doc => {
            const invoice = doc.data();
            
            // Count unique customers
            if (invoice.customerName) {
                customers.add(invoice.customerName);
            }
            
            // Calculate total income from paid and partial invoices
            if (invoice.paymentStatus === 'paid') {
                totalIncome += invoice.grandTotal || 0;
                paymentCounts.paid++;
            } else if (invoice.paymentStatus === 'partial') {
                totalIncome += invoice.amountPaid || 0;
                paymentCounts.partial++;
            } else if (invoice.paymentStatus === 'unpaid') {
                paymentCounts.unpaid++;
            }
            
            // Calculate pending amount
            if (invoice.paymentStatus === 'unpaid') {
                pendingAmount += invoice.grandTotal || 0;
            } else if (invoice.paymentStatus === 'partial') {
                pendingAmount += (invoice.grandTotal || 0) - (invoice.amountPaid || 0);
            }
            
            // Count monthly billing customers
            if (invoice.paymentType === 'monthly') {
                monthlyCustomers++;
            }
            
            // Calculate monthly income for chart (last 6 months)
            try {
                let invoiceDate;
                if (invoice.invoiceDate) {
                    if (typeof invoice.invoiceDate === 'string') {
                        invoiceDate = new Date(invoice.invoiceDate);
                    } else if (invoice.invoiceDate.toDate) {
                        invoiceDate = invoice.invoiceDate.toDate();
                    } else {
                        invoiceDate = new Date(invoice.createdAt || new Date());
                    }
                } else {
                    invoiceDate = new Date(invoice.createdAt || new Date());
                }
                
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const invoiceMonth = invoiceDate.getMonth();
                const invoiceYear = invoiceDate.getFullYear();
                
                const monthDiff = (currentYear - invoiceYear) * 12 + (currentMonth - invoiceMonth);
                if (monthDiff >= 0 && monthDiff < 6) {
                    if (invoice.paymentStatus === 'paid') {
                        monthlyIncome[5 - monthDiff] += invoice.grandTotal || 0;
                    } else if (invoice.paymentStatus === 'partial') {
                        monthlyIncome[5 - monthDiff] += invoice.amountPaid || 0;
                    }
                }
            } catch (error) {
                console.warn('Error processing date for monthly chart:', error);
            }
        });
        
        console.log('Dashboard calculations completed:', {
            totalIncome,
            pendingAmount,
            totalCustomers: customers.size,
            monthlyCustomers,
            paymentCounts,
            monthlyIncome
        });
        
        // Update dashboard cards
        if (totalIncomeEl) totalIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
        if (pendingAmountEl) pendingAmountEl.textContent = `₹${pendingAmount.toFixed(2)}`;
        if (totalCustomersEl) totalCustomersEl.textContent = customers.size;
        if (monthlyCustomersEl) monthlyCustomersEl.textContent = monthlyCustomers;
        
        // Update charts
        updatePaymentChart(paymentCounts);
        updateIncomeChart(monthlyIncome, monthLabels);
        
        console.log('Dashboard update completed successfully');
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        
        // Only show error if user is authenticated and actually viewing dashboard
        const dashboardTab = document.getElementById('dashboard');
        if (dashboardTab && dashboardTab.classList.contains('active')) {
            showToast('Error loading dashboard data', 'error');
        }
        
        // Set error state
        const totalIncomeEl = document.getElementById('totalIncome');
        const pendingAmountEl = document.getElementById('pendingAmount');
        const totalCustomersEl = document.getElementById('totalCustomers');
        const monthlyCustomersEl = document.getElementById('monthlyCustomers');
        
        if (totalIncomeEl) totalIncomeEl.textContent = 'Error';
        if (pendingAmountEl) pendingAmountEl.textContent = 'Error';
        if (totalCustomersEl) totalCustomersEl.textContent = 'Error';
        if (monthlyCustomersEl) monthlyCustomersEl.textContent = 'Error';
        
    } finally {
        // Hide loading state
        const dashboardCards = document.querySelector('#dashboard .row.mb-4');
        if (dashboardCards) {
            dashboardCards.classList.remove('section-loading');
        }
    }
}

function updatePaymentChart(paymentCounts) {
    const ctx = document.getElementById('paymentChart');
    if (!ctx) {
        console.log('Payment chart canvas not found');
        return;
    }
    
    // Clear loading message
    ctx.innerHTML = '';
    
    // Destroy existing chart if it exists
    if (paymentChart) {
        paymentChart.destroy();
    }
    
    try {
        paymentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Unpaid', 'Partial'],
                datasets: [{
                    data: [paymentCounts.paid, paymentCounts.unpaid, paymentCounts.partial],
                    backgroundColor: [
                        '#28a745', // Green for paid
                        '#dc3545', // Red for unpaid
                        '#ffc107'  // Yellow for partial
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        console.log('Payment chart updated successfully');
    } catch (error) {
        console.error('Error creating payment chart:', error);
    }
}

function updateIncomeChart(monthlyIncome, monthLabels) {
    const ctx = document.getElementById('incomeChart');
    if (!ctx) {
        console.log('Income chart canvas not found');
        return;
    }
    
    // Clear loading message
    ctx.innerHTML = '';
    
    // Destroy existing chart if it exists
    if (incomeChart) {
        incomeChart.destroy();
    }
    
    try {
        incomeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Monthly Income (₹)',
                    data: monthlyIncome,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Income: ₹${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toFixed(0);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        console.log('Income chart updated successfully');
    } catch (error) {
        console.error('Error creating income chart:', error);
    }
}

// Make initializeDashboard available globally
window.initializeDashboard = initializeDashboard;
