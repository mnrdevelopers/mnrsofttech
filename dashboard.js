// Dashboard Management
let paymentChart = null;
let incomeChart = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard when tab is shown
    document.getElementById('dashboard-tab').addEventListener('shown.bs.tab', function() {
        updateDashboard();
    });
});

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
        
        console.log('Processing invoices for dashboard:');
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            
            console.log('Invoice data:', {
                id: doc.id,
                customer: invoice.customerName,
                status: invoice.paymentStatus,
                amountPaid: invoice.amountPaid,
                grandTotal: invoice.grandTotal,
                items: invoice.items?.length || 0
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
