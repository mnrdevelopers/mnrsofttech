[file name]: dashboard.js
[file content begin]
// Dashboard Management
let paymentChart = null;
let incomeChart = null;
let currentFilter = 'all'; // 'all', 'month', 'quarter', 'year', 'custom'

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard when tab is shown
    document.getElementById('dashboard-tab').addEventListener('shown.bs.tab', function() {
        initializeDashboard();
    });
});

function initializeDashboard() {
    // Set default date for custom filter
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    document.getElementById('customStartDate').valueAsDate = firstDay;
    document.getElementById('customEndDate').valueAsDate = today;
    
    // Add event listeners for filters
    document.getElementById('timeFilter').addEventListener('change', function() {
        currentFilter = this.value;
        toggleCustomDateFilter();
        updateDashboard();
    });
    
    document.getElementById('applyCustomFilter').addEventListener('click', function() {
        if (validateCustomDates()) {
            updateDashboard();
        }
    });
    
    document.getElementById('resetFilter').addEventListener('click', function() {
        document.getElementById('timeFilter').value = 'all';
        currentFilter = 'all';
        toggleCustomDateFilter();
        updateDashboard();
    });
    
    // Initial dashboard update
    updateDashboard();
}

function toggleCustomDateFilter() {
    const customDateFilter = document.getElementById('customDateFilter');
    if (currentFilter === 'custom') {
        customDateFilter.style.display = 'block';
    } else {
        customDateFilter.style.display = 'none';
    }
}

function validateCustomDates() {
    const startDate = new Date(document.getElementById('customStartDate').value);
    const endDate = new Date(document.getElementById('customEndDate').value);
    
    if (startDate > endDate) {
        showToast('Start date cannot be after end date', 'error');
        return false;
    }
    
    return true;
}

function getDateRange() {
    const now = new Date();
    let startDate, endDate;
    
    switch(currentFilter) {
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'custom':
            startDate = new Date(document.getElementById('customStartDate').value);
            endDate = new Date(document.getElementById('customEndDate').value);
            break;
        default: // 'all'
            startDate = null;
            endDate = null;
    }
    
    return { startDate, endDate };
}

function isDateInRange(invoiceDate, startDate, endDate) {
    if (!startDate || !endDate) return true;
    
    return invoiceDate >= startDate && invoiceDate <= endDate;
}

async function updateDashboard() {
    try {
        // Show loading state for dashboard cards
        showCardLoading('dashboard-cards');
        
        document.getElementById('totalIncome').textContent = 'Loading...';
        document.getElementById('pendingAmount').textContent = 'Loading...';
        document.getElementById('totalCustomers').textContent = 'Loading...';
        document.getElementById('monthlyCustomers').textContent = 'Loading...';

        // Show loading for charts
        const paymentChartCanvas = document.getElementById('paymentChart');
        const incomeChartCanvas = document.getElementById('incomeChart');
        
        if (paymentChartCanvas) {
            paymentChartCanvas.innerHTML = '<div class="preview-loading"><div class="loading-spinner"></div><p>Loading chart...</p></div>';
        }
        if (incomeChartCanvas) {
            incomeChartCanvas.innerHTML = '<div class="preview-loading"><div class="loading-spinner"></div><p>Loading chart...</p></div>';
        }
        
        const snapshot = await db.collection('invoices').get();
        let totalIncome = 0;
        let pendingAmount = 0;
        let monthlyCustomers = 0;
        const customers = new Set();
        const monthlyCustomersSet = new Set();
        
        // Payment status counts
        const paymentCounts = {
            paid: 0,
            unpaid: 0,
            partial: 0
        };
        
        // Get date range based on filter
        const { startDate, endDate } = getDateRange();
        
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
        
        console.log('Processing invoices for dashboard with filter:', currentFilter);
        console.log('Date range:', { startDate, endDate });
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            
            // Parse invoice date
            let invoiceDate;
            try {
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
            } catch (error) {
                console.warn('Error parsing invoice date:', error);
                invoiceDate = new Date(invoice.createdAt || new Date());
            }
            
            // Check if invoice is within date range
            if (!isDateInRange(invoiceDate, startDate, endDate)) {
                return; // Skip this invoice
            }
            
            console.log('Processing invoice:', {
                id: doc.id,
                customer: invoice.customerName,
                status: invoice.paymentStatus,
                amountPaid: invoice.amountPaid,
                grandTotal: invoice.grandTotal,
                date: invoiceDate
            });
            
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
                monthlyCustomersSet.add(invoice.customerName);
            }
            
            // Calculate monthly income for chart (last 6 months)
            try {
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
        
        monthlyCustomers = monthlyCustomersSet.size;
        
        console.log('Final Dashboard Calculations:', {
            totalIncome,
            pendingAmount,
            totalCustomers: customers.size,
            monthlyCustomers,
            paymentCounts,
            monthlyIncome
        });
        
        // Update dashboard cards
        document.getElementById('totalIncome').textContent = `₹${totalIncome.toFixed(2)}`;
        document.getElementById('pendingAmount').textContent = `₹${pendingAmount.toFixed(2)}`;
        document.getElementById('totalCustomers').textContent = customers.size;
        document.getElementById('monthlyCustomers').textContent = monthlyCustomers;
        
        // Update filter display
        updateFilterDisplay();
        
        // Update charts
        updatePaymentChart(paymentCounts);
        updateIncomeChart(monthlyIncome, monthLabels);
        
    } catch (error) {
        console.error('Error updating dashboard:', error);
        
        // Set error state
        document.getElementById('totalIncome').textContent = 'Error';
        document.getElementById('pendingAmount').textContent = 'Error';
        document.getElementById('totalCustomers').textContent = 'Error';
        document.getElementById('monthlyCustomers').textContent = 'Error';
        
        showToast('Error loading dashboard data', 'error');
    } finally {
        hideCardLoading('dashboard-cards');
    }
}

function updateFilterDisplay() {
    const filterDisplay = document.getElementById('filterDisplay');
    const { startDate, endDate } = getDateRange();
    
    let displayText = '';
    
    switch(currentFilter) {
        case 'month':
            displayText = `Showing data for ${startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
            break;
        case 'quarter':
            const quarter = Math.floor(startDate.getMonth() / 3) + 1;
            displayText = `Showing data for Q${quarter} ${startDate.getFullYear()}`;
            break;
        case 'year':
            displayText = `Showing data for ${startDate.getFullYear()}`;
            break;
        case 'custom':
            displayText = `Showing data from ${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}`;
            break;
        default:
            displayText = 'Showing all data';
    }
    
    filterDisplay.textContent = displayText;
}

function updatePaymentChart(paymentCounts) {
    const ctx = document.getElementById('paymentChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (paymentChart) {
        paymentChart.destroy();
    }
    
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
}

function updateIncomeChart(monthlyIncome, monthLabels) {
    const ctx = document.getElementById('incomeChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (incomeChart) {
        incomeChart.destroy();
    }
    
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
}
[file content end]
