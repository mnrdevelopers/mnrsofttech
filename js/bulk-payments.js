// Bulk Payment Processing
document.addEventListener('DOMContentLoaded', function() {
    initializeBulkPayments();
});

function initializeBulkPayments() {
    // Load customers for bulk payment
    loadBulkPaymentCustomers();
    
    // Set today's date as default
    document.getElementById('bulkPaymentDate').value = new Date().toISOString().split('T')[0];
    
    // Load unpaid invoices button
    document.getElementById('loadUnpaidInvoicesBtn').addEventListener('click', loadUnpaidInvoicesForBulk);
    
    // Select all checkbox
    document.getElementById('selectAllBulk').addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('#bulkPaymentBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateBulkPaymentSummary();
    });
    
    // Mark as paid button
    document.getElementById('markAsPaidBtn').addEventListener('click', markInvoicesAsPaid);
    
    // Mark as partial button
    document.getElementById('markPartialBtn').addEventListener('click', showPartialPaymentModal);
    
    // Confirm partial payment
    document.getElementById('confirmPartialBtn').addEventListener('click', markInvoicesAsPartial);
    
    // Update remaining amount when partial amount changes
    document.getElementById('partialAmount').addEventListener('input', updateRemainingAmount);
}

async function loadBulkPaymentCustomers() {
    try {
        const snapshot = await db.collection('invoices').get();
        const customers = new Set();
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            if (invoice.customerName && (invoice.paymentStatus === 'unpaid' || invoice.paymentStatus === 'partial')) {
                customers.add(invoice.customerName);
            }
        });
        
        const customerSelect = document.getElementById('bulkPaymentCustomer');
        customerSelect.innerHTML = '<option value="">-- Select Customer --</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer;
            option.textContent = customer;
            customerSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading customers for bulk payment:', error);
    }
}

async function loadUnpaidInvoicesForBulk() {
    const customer = document.getElementById('bulkPaymentCustomer').value;
    
    if (!customer) {
        showToast('Please select a customer', 'warning');
        return;
    }
    
    try {
        showLoading('Loading unpaid invoices...', 'dots');
        
        const snapshot = await db.collection('invoices')
            .where('customerName', '==', customer)
            .get();
        
        const unpaidInvoices = [];
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            // Include both unpaid and partial invoices
            if (invoice.paymentStatus === 'unpaid' || invoice.paymentStatus === 'partial') {
                unpaidInvoices.push({
                    id: doc.id,
                    ...invoice,
                    originalDate: new Date(invoice.invoiceDate || invoice.createdAt)
                });
            }
        });
        
        // Sort by date (oldest first)
        unpaidInvoices.sort((a, b) => a.originalDate - b.originalDate);
        
        displayUnpaidInvoices(unpaidInvoices);
        
    } catch (error) {
        console.error('Error loading unpaid invoices:', error);
        showToast('Error loading unpaid invoices: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function displayUnpaidInvoices(invoices) {
    const tbody = document.getElementById('bulkPaymentBody');
    const section = document.getElementById('bulkPaymentSection');
    
    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    <i class="fas fa-check-circle fa-2x mb-2"></i><br>
                    No unpaid invoices found for this customer
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = invoices.map(invoice => {
            const dueAmount = invoice.paymentStatus === 'partial' ? 
                (invoice.grandTotal - (invoice.amountPaid || 0)) : 
                invoice.grandTotal;
                
            return `
                <tr>
                    <td>
                        <input type="checkbox" class="bulk-invoice-checkbox" value="${invoice.id}" 
                               data-amount="${dueAmount}" data-total="${invoice.grandTotal}"
                               data-paid="${invoice.amountPaid || 0}"
                               onchange="updateBulkPaymentSummary()">
                    </td>
                    <td>${invoice.invoiceNumber}</td>
                    <td>${invoice.originalDate.toLocaleDateString('en-IN')}</td>
                    <td>
                        <small>${invoice.items ? invoice.items.map(item => item.description).join(', ') : 'No items'}</small>
                    </td>
                    <td>
                        <strong>₹${dueAmount.toFixed(2)}</strong>
                        ${invoice.paymentStatus === 'partial' ? 
                            `<br><small class="text-muted">(Total: ₹${invoice.grandTotal.toFixed(2)}, Paid: ₹${(invoice.amountPaid || 0).toFixed(2)})</small>` : ''}
                    </td>
                    <td>
                        <span class="badge ${getPaymentStatusBadgeClass(invoice.paymentStatus)}">
                            ${getPaymentStatusText(invoice.paymentStatus)}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    section.style.display = 'block';
    updateBulkPaymentSummary();
}

function updateBulkPaymentSummary() {
    const checkboxes = document.querySelectorAll('#bulkPaymentBody .bulk-invoice-checkbox:checked');
    const totalSelected = document.getElementById('totalSelectedAmount');
    const selectedCount = document.getElementById('selectedCount');
    
    let totalAmount = 0;
    
    checkboxes.forEach(checkbox => {
        totalAmount += parseFloat(checkbox.dataset.amount);
    });
    
    totalSelected.textContent = `₹${totalAmount.toFixed(2)}`;
    selectedCount.textContent = `${checkboxes.length} invoices selected (₹${totalAmount.toFixed(2)})`;
    
    // Enable/disable buttons based on selection
    const markAsPaidBtn = document.getElementById('markAsPaidBtn');
    const markPartialBtn = document.getElementById('markPartialBtn');
    
    const hasSelection = checkboxes.length > 0;
    markAsPaidBtn.disabled = !hasSelection;
    markPartialBtn.disabled = !hasSelection;
}

function getSelectedBulkInvoices() {
    const checkboxes = document.querySelectorAll('#bulkPaymentBody .bulk-invoice-checkbox:checked');
    const selectedInvoices = [];
    
    checkboxes.forEach(checkbox => {
        selectedInvoices.push({
            id: checkbox.value,
            dueAmount: parseFloat(checkbox.dataset.amount),
            totalAmount: parseFloat(checkbox.dataset.total),
            alreadyPaid: parseFloat(checkbox.dataset.paid)
        });
    });
    
    return selectedInvoices;
}

async function markInvoicesAsPaid() {
    const selectedInvoices = getSelectedBulkInvoices();
    const paymentDate = document.getElementById('bulkPaymentDate').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (selectedInvoices.length === 0) {
        showToast('Please select at least one invoice to mark as paid', 'warning');
        return;
    }
    
    const totalAmount = selectedInvoices.reduce((sum, invoice) => sum + invoice.dueAmount, 0);
    
    const confirmation = confirm(
        `Mark ${selectedInvoices.length} invoices as paid?\n\n` +
        `Total Amount: ₹${totalAmount.toFixed(2)}\n` +
        `Payment Date: ${paymentDate}\n` +
        `Payment Method: ${paymentMethod}\n\n` +
        `This action cannot be undone.`
    );
    
    if (!confirmation) return;
    
    try {
        showLoading(`Processing payment for ${selectedInvoices.length} invoices...`);
        
        const batch = db.batch();
        
        for (const invoice of selectedInvoices) {
            const invoiceRef = db.collection('invoices').doc(invoice.id);
            
            // Update invoice with payment details
            const updateData = {
                paymentStatus: 'paid',
                amountPaid: invoice.totalAmount,
                balanceDue: 0,
                paymentDate: paymentDate,
                paymentMethod: paymentMethod,
                updatedAt: new Date().toISOString()
            };
            
            batch.update(invoiceRef, updateData);
        }
        
        // Commit the batch
        await batch.commit();
        
        showToast(`Successfully marked ${selectedInvoices.length} invoices as paid!`, 'success');
        
        // Refresh the invoices table and dashboard
        loadInvoicesForTable();
        updateDashboard();
        
        // Reload unpaid invoices for the same customer
        setTimeout(() => loadUnpaidInvoicesForBulk(), 1000);
        
    } catch (error) {
        console.error('Error marking invoices as paid:', error);
        showToast('Error marking invoices as paid: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function showPartialPaymentModal() {
    const selectedInvoices = getSelectedBulkInvoices();
    
    if (selectedInvoices.length === 0) {
        showAlert('Please select at least one invoice for partial payment', 'warning');
        return;
    }
    
    const totalDue = selectedInvoices.reduce((sum, invoice) => sum + invoice.dueAmount, 0);
    
    // Set total due amount
    document.getElementById('totalDueAmount').textContent = `₹${totalDue.toFixed(2)}`;
    document.getElementById('partialAmount').value = '';
    document.getElementById('partialNotes').value = '';
    document.getElementById('remainingAmount').textContent = `₹${totalDue.toFixed(2)}`;
    
    // Store selected invoices for the modal
    window.currentPartialInvoices = selectedInvoices;
    
    const modal = new bootstrap.Modal(document.getElementById('partialPaymentModal'));
    modal.show();
}

function updateRemainingAmount() {
    const partialAmount = parseFloat(document.getElementById('partialAmount').value) || 0;
    const totalDue = window.currentPartialInvoices.reduce((sum, invoice) => sum + invoice.dueAmount, 0);
    const remaining = totalDue - partialAmount;
    
    document.getElementById('remainingAmount').textContent = `₹${remaining.toFixed(2)}`;
    
    // Highlight if partial amount exceeds due amount
    const remainingElement = document.getElementById('remainingAmount');
    if (remaining < 0) {
        remainingElement.style.color = '#dc3545';
    } else {
        remainingElement.style.color = '';
    }
}

async function markInvoicesAsPartial() {
    const partialAmount = parseFloat(document.getElementById('partialAmount').value);
    const paymentNotes = document.getElementById('partialNotes').value;
    const paymentDate = document.getElementById('bulkPaymentDate').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!partialAmount || partialAmount <= 0) {
        showToast('Please enter a valid partial payment amount', 'warning');
        return;
    }
    
    const selectedInvoices = window.currentPartialInvoices;
    const totalDue = selectedInvoices.reduce((sum, invoice) => sum + invoice.dueAmount, 0);
    
    if (partialAmount > totalDue) {
        showToast('Partial payment amount cannot exceed total due amount', 'warning');
        return;
    }
    
    try {
        showLoading(`Processing partial payment for ${selectedInvoices.length} invoices...`);
        
        const batch = db.batch();
        
        // Distribute partial payment proportionally across selected invoices
        for (const invoice of selectedInvoices) {
            const invoiceRef = db.collection('invoices').doc(invoice.id);
            
            // Calculate this invoice's share of the partial payment
            const invoiceShare = (invoice.dueAmount / totalDue) * partialAmount;
            const newAmountPaid = invoice.alreadyPaid + invoiceShare;
            const newBalanceDue = invoice.totalAmount - newAmountPaid;
            
            const updateData = {
                paymentStatus: newBalanceDue > 0 ? 'partial' : 'paid',
                amountPaid: parseFloat(newAmountPaid.toFixed(2)),
                balanceDue: parseFloat(newBalanceDue.toFixed(2)),
                paymentDate: paymentDate,
                paymentMethod: paymentMethod,
                paymentNotes: paymentNotes,
                updatedAt: new Date().toISOString()
            };
            
            batch.update(invoiceRef, updateData);
        }
        
        // Commit the batch
        await batch.commit();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('partialPaymentModal'));
        modal.hide();
        
        showToast(`Partial payment of ₹${partialAmount.toFixed(2)} applied to ${selectedInvoices.length} invoices!`, 'success');
        
        // Refresh the invoices table and dashboard
        loadInvoicesForTable();
        updateDashboard();
        
        // Reload unpaid invoices for the same customer
        setTimeout(() => loadUnpaidInvoicesForBulk(), 1000);
        
    } catch (error) {
        console.error('Error processing partial payment:', error);
        showToast('Error processing partial payment: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}
