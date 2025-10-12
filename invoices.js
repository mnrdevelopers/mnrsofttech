// Invoices Management
let currentInvoices = [];
let currentPage = 1;
const invoicesPerPage = 10;
let deleteInvoiceId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize invoices tab
    setupInvoicesTab();
});

function setupInvoicesTab() {
    // Load invoices when tab is shown
    document.getElementById('invoices-tab').addEventListener('shown.bs.tab', function() {
        loadInvoicesForTable();
    });

    // Search functionality
    document.getElementById('searchInvoices').addEventListener('input', function() {
        filterInvoices();
    });

    // Filter functionality
    document.getElementById('filterStatus').addEventListener('change', filterInvoices);
    document.getElementById('filterType').addEventListener('change', filterInvoices);

    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', function() {
        document.getElementById('searchInvoices').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterType').value = '';
        filterInvoices();
    });

    // Delete modal setup
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (deleteInvoiceId) {
            deleteInvoice(deleteInvoiceId);
        }
    });
}

async function loadInvoicesForTable() {
    try {
        const snapshot = await db.collection('invoices').orderBy('createdAt', 'desc').get();
        currentInvoices = [];
        
        snapshot.forEach(doc => {
            currentInvoices.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderInvoicesTable();
        
    } catch (error) {
        console.error('Error loading invoices:', error);
        showAlert('Error loading invoices: ' + error.message, 'danger');
    }
}

function renderInvoicesTable(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('invoicesTableBody');
    const tableInfo = document.getElementById('tableInfo');
    const pagination = document.getElementById('pagination');
    
    if (currentInvoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No invoices found</p>
                </td>
            </tr>
        `;
        tableInfo.textContent = 'Showing 0 invoices';
        pagination.innerHTML = '';
        return;
    }

    // Apply filters
    let filteredInvoices = [...currentInvoices];
    const searchTerm = document.getElementById('searchInvoices').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const typeFilter = document.getElementById('filterType').value;

    if (searchTerm) {
        filteredInvoices = filteredInvoices.filter(invoice => 
            invoice.invoiceNumber?.toLowerCase().includes(searchTerm) ||
            invoice.customerName?.toLowerCase().includes(searchTerm) ||
            invoice.customerContact?.toLowerCase().includes(searchTerm)
        );
    }

    if (statusFilter) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.paymentStatus === statusFilter);
    }

    if (typeFilter) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.paymentType === typeFilter);
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
    const startIndex = (page - 1) * invoicesPerPage;
    const endIndex = Math.min(startIndex + invoicesPerPage, filteredInvoices.length);
    const pageInvoices = filteredInvoices.slice(startIndex, endIndex);

    // Render table rows
    tbody.innerHTML = pageInvoices.map(invoice => `
        <tr>
            <td><strong>${invoice.invoiceNumber || 'N/A'}</strong></td>
            <td>${formatInvoiceDateForDisplay(invoice)}</td>
            <td>${invoice.customerName || 'N/A'}</td>
            <td>${invoice.customerContact || 'N/A'}</td>
            <td>
                <span class="badge ${invoice.paymentType === 'monthly' ? 'bg-info' : 'bg-secondary'}">
                    ${invoice.paymentType === 'monthly' ? 'Monthly' : 'One Time'}
                </span>
            </td>
            <td>
                <span class="badge ${getPaymentStatusBadgeClass(invoice.paymentStatus)}">
                    ${getPaymentStatusText(invoice.paymentStatus)}
                </span>
            </td>
            <td><strong>₹${(invoice.grandTotal || 0).toFixed(2)}</strong></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewInvoice('${invoice.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-outline-warning" onclick="openEditModal('${invoice.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="confirmDelete('${invoice.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Update table info
    tableInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredInvoices.length} invoices`;

    // Render pagination
    renderPagination(pagination, page, totalPages);
}

function renderPagination(pagination, currentPage, totalPages) {
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="renderInvoicesTable(${currentPage - 1})">Previous</a>
            </li>
        `;
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="renderInvoicesTable(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="renderInvoicesTable(${currentPage + 1})">Next</a>
            </li>
        `;
    }

    pagination.innerHTML = paginationHTML;
}

function filterInvoices() {
    renderInvoicesTable(1);
}

function getPaymentStatusBadgeClass(status) {
    switch (status) {
        case 'paid': return 'bg-success';
        case 'partial': return 'bg-warning';
        case 'unpaid': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function getPaymentStatusText(status) {
    switch (status) {
        case 'paid': return 'Paid';
        case 'partial': return 'Partial';
        case 'unpaid': return 'Unpaid';
        default: return status;
    }
}

async function viewInvoice(invoiceId) {
    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        
        if (!doc.exists) {
            showAlert('Invoice not found', 'warning');
            return;
        }

        const invoice = doc.data();
        deleteInvoiceId = invoiceId; // Store for edit functionality
        
        const modal = new bootstrap.Modal(document.getElementById('viewInvoiceModal'));
        
        document.getElementById('viewInvoiceContent').innerHTML = generateInvoicePreviewHTML(invoice);
        modal.show();
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        showAlert('Error loading invoice: ' + error.message, 'danger');
    }
}

function generateInvoicePreviewHTML(invoice) {
    const formattedDate = formatInvoiceDateForDisplay(invoice);
    const paymentBadge = getPaymentStatusBadgeClass(invoice.paymentStatus);
    const paymentText = getPaymentStatusText(invoice.paymentStatus);

    return `
        <div class="invoice-template">
            <div class="invoice-header">
                <div class="invoice-title">INVOICE <span class="badge ${paymentBadge}">${paymentText}</span></div>
                <div class="invoice-meta">
                    <div class="invoice-number">Invoice #${invoice.invoiceNumber || '---'}</div>
                    <div class="invoice-date">Date: ${formattedDate}</div>
                </div>
            </div>
            
            <div class="invoice-company">
                <div class="company-name">MNR SoftTech Solutions</div>
                <div class="company-details">
                    Computer Software & Hardware Services<br>
                    Contact: Maniteja (mnrdeveloper11@gmail.com)<br>
                    Phone: +91 7416006394 (Whatsapp only)
                </div>
            </div>
            
            <div class="invoice-customer">
                <div class="customer-title">BILL TO:</div>
                <div class="customer-details">
                    ${invoice.customerName || 'Customer Name'}<br>
                    ${invoice.customerContact ? 'Phone: ' + invoice.customerContact + '<br>' : ''}
                    ${invoice.customerAddress || 'Address not provided'}
                </div>
            </div>
            
            ${invoice.paymentType === 'monthly' ? `
                <div class="monthly-billing-info">
                    <strong>Monthly Billing Plan</strong><br>
                    Billing Cycle: ${invoice.billingCycle} Month(s)<br>
                    ${invoice.nextBillingDate ? `Next Billing: ${new Date(invoice.nextBillingDate).toLocaleDateString('en-IN')}` : ''}
                </div>
            ` : ''}
            
            ${invoice.items && invoice.items.length > 0 ? `
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th class="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr>
                                <td>
                                    ${item.description}
                                    ${item.warranty && item.warranty !== 'no-warranty' ? 
                                        `<span class="warranty-badge">
                                            Warranty: ${formatWarrantyText(item.warranty)}
                                        </span>` : ''}
                                </td>
                                <td>${item.quantity}</td>
                                <td>₹${item.price.toFixed(2)}</td>
                                <td class="text-right">₹${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="invoice-totals">
                    <div class="invoice-totals-row">
                        <span class="invoice-totals-label">Subtotal:</span>
                        <span class="invoice-totals-value">₹${invoice.grandTotal.toFixed(2)}</span>
                    </div>
                    ${invoice.amountPaid > 0 ? `
                        <div class="invoice-totals-row">
                            <span class="invoice-totals-label">Amount Paid:</span>
                            <span class="invoice-totals-value" style="color: #2e7d32;">₹${invoice.amountPaid.toFixed(2)}</span>
                        </div>
                        <div class="invoice-totals-row">
                            <span class="invoice-totals-label">Balance Due:</span>
                            <span class="invoice-totals-value" style="color: #c62828;">₹${invoice.balanceDue.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="invoice-totals-row invoice-grand-total">
                        <span class="invoice-totals-label">${invoice.amountPaid > 0 ? 'Total Amount' : 'Amount Due'}:</span>
                        <span class="invoice-totals-value">₹${invoice.grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            ` : '<p style="text-align: center; padding: 2rem; color: #666;">No items</p>'}
            
            <div class="warranty-disclaimer">
                <h3>Warranty Terms</h3>
                <p>Warranty covers manufacturing defects only. Does not cover:</p>
                <ul>
                    <li>Physical damage or liquid damage</li>
                    <li>Unauthorized repairs or modifications</li>
                    <li>Software issues not related to hardware</li>
                </ul>
                <p>Original invoice required for all warranty claims.</p>
            </div>
            
            ${invoice.notes ? `
                <div class="invoice-notes">
                    <div class="invoice-notes-title">Notes:</div>
                    <div class="invoice-notes-content">${invoice.notes}</div>
                </div>
            ` : ''}
            
            <div class="text-center mt-4">
                <button class="btn btn-primary" onclick="printInvoiceFromView('${invoice.id}')">
                    <i class="fas fa-print me-2"></i>Print Invoice (A4)
                </button>
            </div>
        </div>
    `;
}

async function printInvoiceFromView(invoiceId) {
    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        if (!doc.exists) return;

        const invoice = doc.data();
        const printWindow = window.open('', '_blank');
        
        const printContent = generateInvoicePreviewHTML(invoice);
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MNR SoftTech Solutions - Invoice ${invoice.invoiceNumber}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    body {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto;
                        font-family: Arial, sans-serif;
                        font-size: 12pt;
                        line-height: 1.4;
                        background: white;
                    }
                    .invoice-template {
                        width: 100%;
                        min-height: 277mm;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                    }
                    .invoice-header {
                        margin-bottom: 20mm;
                    }
                    .invoice-table {
                        font-size: 10pt;
                    }
                    .invoice-table th,
                    .invoice-table td {
                        padding: 6px 4px;
                    }
                    .warranty-badge {
                        font-size: 8pt;
                        padding: 1px 4px;
                    }
                    .btn {
                        display: none !important;
                    }
                </style>
            </head>
            <body>
                ${printContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() {
                                window.close();
                            }, 500);
                        }, 250);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        
    } catch (error) {
        console.error('Error printing invoice:', error);
    }
}

async function openEditModal(invoiceId) {
    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        
        if (!doc.exists) {
            showAlert('Invoice not found', 'warning');
            return;
        }

        const invoice = doc.data();
        
        // Load the invoice for editing in the generate tab
        loadInvoiceForEdit(invoiceId);
        
    } catch (error) {
        console.error('Error loading invoice for edit:', error);
        showAlert('Error loading invoice: ' + error.message, 'danger');
    }
}

function confirmDelete(invoiceId) {
    const invoice = currentInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    deleteInvoiceId = invoiceId;
    document.getElementById('deleteInvoiceInfo').textContent = 
        `Invoice #${invoice.invoiceNumber} - ${invoice.customerName} - ₹${(invoice.grandTotal || 0).toFixed(2)}`;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteInvoiceModal'));
    modal.show();
}

async function deleteInvoice(invoiceId) {
    try {
        await db.collection('invoices').doc(invoiceId).delete();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteInvoiceModal'));
        modal.hide();
        
        showAlert('Invoice deleted successfully!', 'success');
        
        // Refresh the invoices table and dashboard
        loadInvoicesForTable();
        updateDashboard();
        
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showAlert('Error deleting invoice: ' + error.message, 'danger');
    }
}
