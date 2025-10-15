// expenses.js - Enhanced Expense Management System with Loan/EMI Features
let expensesInitialized = false;
let currentExpenses = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeExpensesTab();
});

function initializeExpensesTab() {
    console.log('Initializing expenses tab...');
    
    // Set up event listeners
    setupExpenseEventListeners();
    
    // Load expenses if the tab is already active
    if (document.getElementById('expenses') && document.getElementById('expenses').classList.contains('active')) {
        loadExpenses();
    }

    // Wait for the expenses tab to be shown
    const expensesTab = document.getElementById('expenses-tab');
    if (expensesTab) {
        expensesTab.addEventListener('shown.bs.tab', function() {
            console.log('Expenses tab shown, loading expenses...');
            loadExpenses();
            checkUpcomingExpenses();
        });
    }
    
    expensesInitialized = true;
}

function setupExpenseEventListeners() {
    // Add expense button
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', showAddExpenseModal);
    }

    // Save expense button
    const saveExpenseBtn = document.getElementById('saveExpenseBtn');
    if (saveExpenseBtn) {
        saveExpenseBtn.addEventListener('click', saveExpense);
    }

    // Search expenses
    const searchExpenses = document.getElementById('searchExpenses');
    if (searchExpenses) {
        searchExpenses.addEventListener('input', filterExpenses);
    }

    // Expense filters
    const filterExpenseType = document.getElementById('filterExpenseType');
    const filterExpenseCategory = document.getElementById('filterExpenseCategory');
    const filterExpenseStatus = document.getElementById('filterExpenseStatus');
    
    if (filterExpenseType) filterExpenseType.addEventListener('change', filterExpenses);
    if (filterExpenseCategory) filterExpenseCategory.addEventListener('change', filterExpenses);
    if (filterExpenseStatus) filterExpenseStatus.addEventListener('change', filterExpenses);

    // Clear expense filters
    const clearExpenseFilters = document.getElementById('clearExpenseFilters');
    if (clearExpenseFilters) {
        clearExpenseFilters.addEventListener('click', function() {
            document.getElementById('searchExpenses').value = '';
            document.getElementById('filterExpenseType').value = '';
            document.getElementById('filterExpenseCategory').value = '';
            document.getElementById('filterExpenseStatus').value = '';
            filterExpenses();
        });
    }

    // Alert settings toggle
    const expenseAlert = document.getElementById('expenseAlert');
    if (expenseAlert) {
        expenseAlert.addEventListener('change', function() {
            const alertSettings = document.getElementById('alertSettings');
            alertSettings.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Loan calculation fields
    const totalLoanAmount = document.getElementById('totalLoanAmount');
    const loanTenure = document.getElementById('loanTenure');
    const interestRate = document.getElementById('interestRate');
    
    if (totalLoanAmount) totalLoanAmount.addEventListener('input', calculateEMI);
    if (loanTenure) loanTenure.addEventListener('input', calculateEMI);
    if (interestRate) interestRate.addEventListener('input', calculateEMI);

    // Set default due date to today
    const dueDateInput = document.getElementById('expenseDueDate');
    if (dueDateInput) {
        dueDateInput.value = new Date().toISOString().split('T')[0];
    }
}

function toggleLoanFields() {
    const category = document.getElementById('expenseCategory').value;
    const loanFields = document.getElementById('loanFields');
    
    if (category === 'loan') {
        loanFields.style.display = 'block';
        // Auto-fill amount with EMI amount if calculated
        const emiAmount = document.getElementById('emiAmount').value;
        if (emiAmount && emiAmount > 0) {
            document.getElementById('expenseAmount').value = emiAmount;
        }
    } else {
        loanFields.style.display = 'none';
        // Clear loan fields
        document.getElementById('totalLoanAmount').value = '';
        document.getElementById('loanTenure').value = '';
        document.getElementById('interestRate').value = '0';
        document.getElementById('emiAmount').value = '';
        document.getElementById('remainingAmount').value = '';
        document.getElementById('loanStartDate').value = '';
        document.getElementById('loanEndDate').value = '';
        document.getElementById('loanProvider').value = '';
    }
}

function calculateEMI() {
    const principal = parseFloat(document.getElementById('totalLoanAmount').value) || 0;
    const tenure = parseInt(document.getElementById('loanTenure').value) || 0;
    const rate = parseFloat(document.getElementById('interestRate').value) || 0;
    
    if (principal > 0 && tenure > 0) {
        // Convert annual rate to monthly and decimal
        const monthlyRate = rate / 12 / 100;
        
        // EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
        const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) / 
                   (Math.pow(1 + monthlyRate, tenure) - 1);
        
        document.getElementById('emiAmount').value = emi.toFixed(2);
        document.getElementById('remainingAmount').value = principal.toFixed(2);
        
        // Auto-fill expense amount with EMI
        document.getElementById('expenseAmount').value = emi.toFixed(2);
        
        // Calculate and set loan end date
        calculateLoanEndDate();
    }
}

function calculateLoanEndDate() {
    const startDate = document.getElementById('loanStartDate').value;
    const tenure = parseInt(document.getElementById('loanTenure').value) || 0;
    
    if (startDate && tenure > 0) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(start.getMonth() + tenure);
        
        document.getElementById('loanEndDate').value = end.toISOString().split('T')[0];
    }
}

async function loadExpenses() {
    try {
        console.log('Loading expenses from Firestore...');
        showTableLoading('expensesTableBody', 6);
        
        const snapshot = await db.collection('expenses').orderBy('dueDate').get();
        currentExpenses = [];
        
        snapshot.forEach(doc => {
            currentExpenses.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Loaded ${currentExpenses.length} expenses`);
        displayExpenses(currentExpenses);
        updateExpenseSummary();
        checkUpcomingExpenses();
        
    } catch (error) {
        console.error('Error loading expenses:', error);
        showToast('Error loading expenses: ' + error.message, 'error');
        
        const tbody = document.getElementById('expensesTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p>Failed to load expenses</p>
                        <small class="text-muted">${error.message}</small>
                        <br>
                        <button class="btn btn-primary mt-2" onclick="loadExpenses()">
                            <i class="fas fa-redo me-2"></i>Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

function displayExpenses(expenses) {
    const tbody = document.getElementById('expensesTableBody');
    
    if (!tbody) {
        console.error('Expenses table body not found!');
        return;
    }
    
    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <i class="fas fa-money-bill-wave fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No expenses found</p>
                    <button class="btn btn-primary mt-2" onclick="showAddExpenseModal()">
                        <i class="fas fa-plus me-2"></i>Add Your First Expense
                    </button>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = expenses.map(expense => {
            const dueDate = new Date(expense.dueDate);
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let statusBadge = '';
            let rowClass = '';
            
            if (expense.status === 'paid') {
                statusBadge = '<span class="badge bg-success">Paid</span>';
            } else if (dueDate < today) {
                statusBadge = '<span class="badge bg-danger">Overdue</span>';
                rowClass = 'table-danger';
            } else if (daysUntilDue <= 3) {
                statusBadge = '<span class="badge bg-warning">Due Soon</span>';
                rowClass = 'table-warning';
            } else {
                statusBadge = '<span class="badge bg-secondary">Pending</span>';
            }
            
            // Loan details display
            let loanDetails = '-';
            if (expense.category === 'loan' && expense.loanDetails) {
                const loan = expense.loanDetails;
                loanDetails = `
                    <div class="loan-details">
                        <small>
                            <strong>Total: ₹${loan.totalAmount?.toFixed(2) || '0.00'}</strong><br>
                            <span class="text-muted">EMI: ₹${loan.emiAmount?.toFixed(2) || '0.00'}</span><br>
                            <span class="text-muted">Remaining: ₹${loan.remainingAmount?.toFixed(2) || '0.00'}</span>
                        </small>
                    </div>
                `;
            }
            
            return `
                <tr class="${rowClass}">
                    <td>
                        <strong>${expense.description}</strong>
                        ${expense.loanDetails?.loanProvider ? `<br><small class="text-muted">${expense.loanDetails.loanProvider}</small>` : ''}
                        ${expense.notes ? `<br><small class="text-muted">${expense.notes}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge ${expense.type === 'business' ? 'bg-info' : 'bg-primary'}">
                            ${expense.type === 'business' ? 'Business' : 'Personal'}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${getExpenseCategoryLabel(expense.category)}</span>
                    </td>
                    <td><strong>₹${expense.amount.toFixed(2)}</strong></td>
                    <td>
                        ${dueDate.toLocaleDateString('en-IN')}
                        ${daysUntilDue <= 7 ? `<br><small class="text-muted">${daysUntilDue} days</small>` : ''}
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <span class="badge ${expense.recurring !== 'none' ? 'bg-success' : 'bg-secondary'}">
                            ${getRecurringLabel(expense.recurring)}
                        </span>
                    </td>
                    <td>${loanDetails}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-success" onclick="markAsPaid('${expense.id}')" title="Mark as Paid">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="editExpense('${expense.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="viewLoanDetails('${expense.id}')" title="Loan Details">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteExpense('${expense.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function getExpenseCategoryLabel(category) {
    const categories = {
        'loan': 'Loan/EMI',
        'credit-card': 'Credit Card',
        'utility': 'Utility',
        'rent': 'Rent',
        'salary': 'Salary',
        'supplies': 'Supplies',
        'other': 'Other'
    };
    return categories[category] || category;
}

function getRecurringLabel(recurring) {
    const labels = {
        'none': 'One Time',
        'monthly': 'Monthly',
        'quarterly': 'Quarterly',
        'yearly': 'Yearly'
    };
    return labels[recurring] || recurring;
}

function updateExpenseSummary() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let monthlyExpenses = 0;
    let dueSoonCount = 0;
    let creditCardTotal = 0;
    let loanTotal = 0;
    let totalLoanEMI = 0;
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    currentExpenses.forEach(expense => {
        const expenseDate = new Date(expense.dueDate);
        
        // Monthly expenses (current month)
        if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
            monthlyExpenses += expense.amount;
        }
        
        // Due soon (next 7 days and not paid)
        if (expenseDate <= nextWeek && expenseDate >= today && expense.status !== 'paid') {
            dueSoonCount++;
        }
        
        // Credit card total
        if (expense.category === 'credit-card') {
            creditCardTotal += expense.amount;
        }
        
        // Loan total
        if (expense.category === 'loan') {
            loanTotal += expense.amount;
            // Sum up all loan EMI amounts
            if (expense.loanDetails?.emiAmount) {
                totalLoanEMI += expense.loanDetails.emiAmount;
            }
        }
    });
    
    document.getElementById('monthlyExpenses').textContent = `₹${monthlyExpenses.toFixed(2)}`;
    document.getElementById('dueSoonCount').textContent = dueSoonCount;
    document.getElementById('creditCardTotal').textContent = `₹${creditCardTotal.toFixed(2)}`;
    document.getElementById('loanTotal').textContent = `₹${totalLoanEMI.toFixed(2)}`;
}

function checkUpcomingExpenses() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const upcomingExpenses = currentExpenses.filter(expense => {
        const dueDate = new Date(expense.dueDate);
        return dueDate <= nextWeek && dueDate >= today && expense.status !== 'paid';
    });
    
    const alertDiv = document.getElementById('upcomingExpensesAlert');
    const listDiv = document.getElementById('upcomingExpensesList');
    
    if (upcomingExpenses.length > 0) {
        alertDiv.style.display = 'block';
        listDiv.innerHTML = upcomingExpenses.map(expense => {
            const dueDate = new Date(expense.dueDate);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                    <div>
                        <strong>${expense.description}</strong>
                        ${expense.category === 'loan' && expense.loanDetails ? `<br><small class="text-muted">EMI Payment - ${expense.loanDetails.loanProvider || ''}</small>` : ''}
                        <br>
                        <small class="text-muted">Due: ${dueDate.toLocaleDateString('en-IN')} (${daysUntilDue} days)</small>
                    </div>
                    <div>
                        <strong class="text-warning">₹${expense.amount.toFixed(2)}</strong>
                        <button class="btn btn-success btn-sm ms-2" onclick="markAsPaid('${expense.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        alertDiv.style.display = 'none';
    }
}

function showAddExpenseModal() {
    const modalLabel = document.getElementById('expenseModalLabel');
    if (!modalLabel) return;
    
    modalLabel.textContent = 'Add New Expense';
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseStatus').value = 'pending';
    document.getElementById('expenseDueDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseRecurring').value = 'none';
    document.getElementById('alertSettings').style.display = 'none';
    document.getElementById('loanFields').style.display = 'none';
    
    const modalElement = document.getElementById('expenseModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

async function saveExpense() {
    const expenseData = collectExpenseData();
    
    if (!expenseData.description) {
        showToast('Please enter expense description', 'warning');
        return;
    }
    
    if (!expenseData.amount || expenseData.amount <= 0) {
        showToast('Please enter a valid amount', 'warning');
        return;
    }
    
    if (!expenseData.dueDate) {
        showToast('Please select due date', 'warning');
        return;
    }
    
    try {
        showLoading('Saving expense...');
        
        let expenseId = document.getElementById('expenseId').value;
        const isEditing = !!expenseId;
        
        const expenseToSave = {
            ...expenseData,
            amount: parseFloat(expenseData.amount),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add loan details if category is loan
        if (expenseData.category === 'loan') {
            expenseToSave.loanDetails = {
                totalAmount: parseFloat(document.getElementById('totalLoanAmount').value) || 0,
                tenure: parseInt(document.getElementById('loanTenure').value) || 0,
                interestRate: parseFloat(document.getElementById('interestRate').value) || 0,
                emiAmount: parseFloat(document.getElementById('emiAmount').value) || 0,
                remainingAmount: parseFloat(document.getElementById('remainingAmount').value) || 0,
                loanStartDate: document.getElementById('loanStartDate').value || '',
                loanEndDate: document.getElementById('loanEndDate').value || '',
                loanProvider: document.getElementById('loanProvider').value || ''
            };
        }
        
        if (isEditing) {
            await db.collection('expenses').doc(expenseId).update(expenseToSave);
        } else {
            const newDocRef = await db.collection('expenses').add(expenseToSave);
            expenseId = newDocRef.id;
        }
        
        // Close modal
        const modalElement = document.getElementById('expenseModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        showToast(`Expense ${isEditing ? 'updated' : 'saved'} successfully!`, 'success');
        
        // Refresh expenses list
        loadExpenses();
        
    } catch (error) {
        console.error('Error saving expense:', error);
        showToast('Error saving expense: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function collectExpenseData() {
    return {
        description: document.getElementById('expenseDescription').value.trim(),
        amount: document.getElementById('expenseAmount').value,
        type: document.getElementById('expenseType').value,
        category: document.getElementById('expenseCategory').value,
        status: document.getElementById('expenseStatus').value,
        dueDate: document.getElementById('expenseDueDate').value,
        recurring: document.getElementById('expenseRecurring').value,
        notes: document.getElementById('expenseNotes').value.trim(),
        alertEnabled: document.getElementById('expenseAlert').checked,
        alertDaysBefore: document.getElementById('expenseAlert').checked ? 
            parseInt(document.getElementById('alertDaysBefore').value) : 0
    };
}

async function editExpense(expenseId) {
    try {
        showLoading('Loading expense details...');
        
        const doc = await db.collection('expenses').doc(expenseId).get();
        
        if (!doc.exists) {
            showToast('Expense not found', 'warning');
            return;
        }
        
        const expense = doc.data();
        
        const modalLabel = document.getElementById('expenseModalLabel');
        if (modalLabel) {
            modalLabel.textContent = 'Edit Expense';
        }
        
        document.getElementById('expenseId').value = expenseId;
        document.getElementById('expenseDescription').value = expense.description || '';
        document.getElementById('expenseAmount').value = expense.amount || '';
        document.getElementById('expenseType').value = expense.type || 'business';
        document.getElementById('expenseCategory').value = expense.category || 'other';
        document.getElementById('expenseStatus').value = expense.status || 'pending';
        document.getElementById('expenseDueDate').value = expense.dueDate || '';
        document.getElementById('expenseRecurring').value = expense.recurring || 'none';
        document.getElementById('expenseNotes').value = expense.notes || '';
        document.getElementById('expenseAlert').checked = expense.alertEnabled || false;
        document.getElementById('alertDaysBefore').value = expense.alertDaysBefore || 3;
        
        document.getElementById('alertSettings').style.display = 
            document.getElementById('expenseAlert').checked ? 'block' : 'none';
        
        // Load loan details if available
        if (expense.category === 'loan' && expense.loanDetails) {
            document.getElementById('totalLoanAmount').value = expense.loanDetails.totalAmount || '';
            document.getElementById('loanTenure').value = expense.loanDetails.tenure || '';
            document.getElementById('interestRate').value = expense.loanDetails.interestRate || '0';
            document.getElementById('emiAmount').value = expense.loanDetails.emiAmount || '';
            document.getElementById('remainingAmount').value = expense.loanDetails.remainingAmount || '';
            document.getElementById('loanStartDate').value = expense.loanDetails.loanStartDate || '';
            document.getElementById('loanEndDate').value = expense.loanDetails.loanEndDate || '';
            document.getElementById('loanProvider').value = expense.loanDetails.loanProvider || '';
            document.getElementById('loanFields').style.display = 'block';
        } else {
            document.getElementById('loanFields').style.display = 'none';
        }
        
        const modalElement = document.getElementById('expenseModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
        
    } catch (error) {
        console.error('Error loading expense:', error);
        showToast('Error loading expense: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function viewLoanDetails(expenseId) {
    const expense = currentExpenses.find(exp => exp.id === expenseId);
    if (!expense || expense.category !== 'loan' || !expense.loanDetails) {
        showToast('No loan details available for this expense', 'info');
        return;
    }
    
    const loan = expense.loanDetails;
    const loanDetailsHTML = `
        <div class="loan-details-modal">
            <h5>Loan Details</h5>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Total Loan Amount:</strong> ₹${loan.totalAmount?.toFixed(2) || '0.00'}</p>
                    <p><strong>Tenure:</strong> ${loan.tenure || 0} months</p>
                    <p><strong>Interest Rate:</strong> ${loan.interestRate || 0}% p.a.</p>
                </div>
                <div class="col-md-6">
                    <p><strong>EMI Amount:</strong> ₹${loan.emiAmount?.toFixed(2) || '0.00'}</p>
                    <p><strong>Remaining Amount:</strong> ₹${loan.remainingAmount?.toFixed(2) || '0.00'}</p>
                    <p><strong>Provider:</strong> ${loan.loanProvider || 'N/A'}</p>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Start Date:</strong> ${loan.loanStartDate ? new Date(loan.loanStartDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>End Date:</strong> ${loan.loanEndDate ? new Date(loan.loanEndDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                </div>
            </div>
        </div>
    `;
    
    // You can show this in a modal or alert
    const modal = new bootstrap.Modal(document.createElement('div'));
    modal._element.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Loan Details - ${expense.description}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${loanDetailsHTML}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal._element);
    modal.show();
}

async function markAsPaid(expenseId) {
    try {
        showLoading('Updating expense...');
        
        const expense = currentExpenses.find(exp => exp.id === expenseId);
        
        const updateData = {
            status: 'paid',
            paidDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Update remaining loan amount if it's a loan
        if (expense.category === 'loan' && expense.loanDetails) {
            const remainingAmount = (expense.loanDetails.remainingAmount || 0) - expense.amount;
            updateData.loanDetails = {
                ...expense.loanDetails,
                remainingAmount: Math.max(0, remainingAmount)
            };
        }
        
        await db.collection('expenses').doc(expenseId).update(updateData);
        
        showToast('Expense marked as paid!', 'success');
        
        // Refresh expenses list
        loadExpenses();
        
    } catch (error) {
        console.error('Error updating expense:', error);
        showToast('Error updating expense: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading('Deleting expense...');
        
        await db.collection('expenses').doc(expenseId).delete();
        
        showToast('Expense deleted successfully!', 'success');
        
        // Refresh expenses list
        loadExpenses();
        
    } catch (error) {
        console.error('Error deleting expense:', error);
        showToast('Error deleting expense: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function filterExpenses() {
    const searchTerm = document.getElementById('searchExpenses')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('filterExpenseType')?.value || '';
    const categoryFilter = document.getElementById('filterExpenseCategory')?.value || '';
    const statusFilter = document.getElementById('filterExpenseStatus')?.value || '';
    
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (row.querySelector('td')) {
            const description = row.cells[0].textContent.toLowerCase();
            const type = row.cells[1].textContent.toLowerCase();
            const category = row.cells[2].textContent.toLowerCase();
            const status = row.cells[5].textContent.toLowerCase();
            
            const matchesSearch = !searchTerm || description.includes(searchTerm);
            const matchesType = !typeFilter || type.includes(typeFilter);
            const matchesCategory = !categoryFilter || category.includes(categoryFilter.toLowerCase());
            const matchesStatus = !statusFilter || status.includes(statusFilter);
            
            row.style.display = matchesSearch && matchesType && matchesCategory && matchesStatus ? '' : 'none';
        }
    });
}

// Auto-check for upcoming expenses every day
setInterval(() => {
    if (document.getElementById('expenses')?.classList.contains('active')) {
        checkUpcomingExpenses();
    }
}, 24 * 60 * 60 * 1000); // Check every 24 hours

// Force reload expenses (for debugging)
function forceReloadExpenses() {
    console.log('Force reloading expenses...');
    loadExpenses();
}
