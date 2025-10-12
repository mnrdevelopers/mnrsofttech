// Invoices Management
let currentInvoices = [];
let currentPage = 1;
const invoicesPerPage = 10;
let deleteInvoiceId = null;
let currentViewedInvoice = null;

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
        // Show loading for table
        const tbody = document.getElementById('invoicesTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="loading-spinner" style="margin: 0 auto;"></div>
                    <p class="text-muted mt-2">Loading invoices...</p>
                </td>
            </tr>
        `;
        
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
                    <button class="btn btn-outline-warning" onclick="editInvoice('${invoice.id}')" title="Edit">
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
        const modal = new bootstrap.Modal(document.getElementById('viewInvoiceModal'));
        
        // Store the current invoice ID and data for editing and printing
        deleteInvoiceId = invoiceId;
        currentViewedInvoice = invoice;
        
        document.getElementById('viewInvoiceContent').innerHTML = generateInvoicePreviewHTML(invoice);
        modal.show();
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        showAlert('Error loading invoice: ' + error.message, 'danger');
    }
}

function printViewedInvoice() {
    if (!currentViewedInvoice) {
        showAlert('No invoice data available for printing', 'warning');
        return;
    }
    
    showLoading('Preparing invoice for printing...');
    
    setTimeout(() => {
        const printHTML = generatePrintHTML(currentViewedInvoice);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printHTML);
        printWindow.document.close();
        hideLoading();
        
        // Close the modal after opening print
        const modal = bootstrap.Modal.getInstance(document.getElementById('viewInvoiceModal'));
        modal.hide();
    }, 500);
}

// Generate print HTML for viewed invoice
function generatePrintHTML(invoice) {
    const formattedDate = formatInvoiceDateForDisplay(invoice);
    
    // Payment status text
    const paymentTexts = {
        'unpaid': 'Unpaid',
        'paid': 'Paid',
        'partial': 'Partial Payment'
    };
    
    const paymentText = paymentTexts[invoice.paymentStatus] || '';

    return `
<!DOCTYPE html>
<html>
<head>
    <title>MNR SoftTech Solutions - Invoice ${invoice.invoiceNumber || ''}</title>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: white;
            color: #333;
            line-height: 1.4;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            background: white;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #3498db;
        }
        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
        }
        .invoice-meta {
            text-align: right;
        }
        .invoice-number {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 16px;
        }
        .invoice-date {
            color: #666;
            font-size: 14px;
        }
        .company-info {
            margin-bottom: 25px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .company-details {
            color: #666;
            font-size: 14px;
            line-height: 1.5;
        }
        .customer-info {
            margin-bottom: 25px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #3498db;
        }
        .customer-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: #2c3e50;
            font-size: 16px;
        }
        .customer-details {
            color: #333;
            line-height: 1.5;
            font-size: 14px;
        }
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 14px;
        }
        .invoice-table th {
            background: #2c3e50;
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
        }
        .invoice-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .invoice-totals {
            margin-left: auto;
            width: 300px;
            border-top: 2px solid #3498db;
            padding-top: 15px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .grand-total {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
            font-size: 16px;
            font-weight: bold;
        }
        .warranty-section {
            margin: 25px 0;
            padding: 15px;
            background: #f8f9fa;
            border-left: 4px solid #3498db;
        }
        .notes-section {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 14px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        .payment-badge {
            display: inline-block;
            padding: 4px 12px;
            background: #dc3545;
            color: white;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
        .warranty-badge {
            display: inline-block;
            padding: 2px 8px;
            background: #e3f2fd;
            color: #1976d2;
            border-radius: 12px;
            font-size: 11px;
            margin-left: 8px;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .invoice-container {
                width: 100%;
                margin: 0;
                padding: 15mm;
                border: none;
                box-shadow: none;
            }
            @page {
                size: A4;
                margin: 15mm;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="invoice-title">
                INVOICE 
                <span class="payment-badge">${paymentText}</span>
            </div>
            <div class="invoice-meta">
                <div class="invoice-number">Invoice #${invoice.invoiceNumber || '---'}</div>
                <div class="invoice-date">Date: ${formattedDate}</div>
            </div>
        </div>
        
        <div class="company-info">
            <div class="company-name">MNR SoftTech Solutions</div>
            <div class="company-details">
                Computer Software & Hardware Services<br>
                Contact: Maniteja (mnrdeveloper11@gmail.com)<br>
                Phone: +91 7416006394 (Whatsapp only)
            </div>
        </div>
        
        <div class="customer-info">
            <div class="customer-title">BILL TO:</div>
            <div class="customer-details">
                ${invoice.customerName || 'Customer Name'}<br>
                ${invoice.customerContact ? 'Phone: ' + invoice.customerContact + '<br>' : ''}
                ${invoice.customerAddress || 'Address not provided'}
            </div>
        </div>
        
        ${invoice.paymentType === 'monthly' ? `
            <div style="margin-bottom: 20px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107;">
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
                        <th class="text-center">Qty</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => `
                        <tr>
                            <td>
                                ${item.description}
                                ${item.warranty && item.warranty !== 'no-warranty' ? 
                                    `<span class="warranty-badge">Warranty: ${formatWarrantyText(item.warranty)}</span>` : ''}
                            </td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-right">₹${item.price.toFixed(2)}</td>
                            <td class="text-right">₹${item.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="invoice-totals">
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span><strong>₹${invoice.grandTotal.toFixed(2)}</strong></span>
                </div>
                ${invoice.amountPaid > 0 ? `
                    <div class="totals-row">
                        <span>Amount Paid:</span>
                        <span style="color: #2e7d32;"><strong>₹${invoice.amountPaid.toFixed(2)}</strong></span>
                    </div>
                    <div class="totals-row">
                        <span>Balance Due:</span>
                        <span style="color: #c62828;"><strong>₹${invoice.balanceDue.toFixed(2)}</strong></span>
                    </div>
                ` : ''}
                <div class="totals-row grand-total">
                    <span>${invoice.amountPaid > 0 ? 'Total Amount' : 'Amount Due'}:</span>
                    <span style="color: #3498db;">₹${invoice.grandTotal.toFixed(2)}</span>
                </div>
            </div>
        ` : '<p style="text-align: center; padding: 40px; color: #666;">No items</p>'}
        
        <div class="warranty-section">
            <h3 style="margin-top: 0; color: #2c3e50;">Warranty Terms</h3>
            <p>Warranty covers manufacturing defects only. Does not cover:</p>
            <ul>
                <li>Physical damage or liquid damage</li>
                <li>Unauthorized repairs or modifications</li>
                <li>Software issues not related to hardware</li>
            </ul>
            <p>Original invoice required for all warranty claims.</p>
        </div>
        
        ${invoice.notes ? `
            <div class="notes-section">
                <div style="font-weight: bold; margin-bottom: 8px;">Notes:</div>
                <div style="color: #666;">${invoice.notes}</div>
            </div>
        ` : ''}
        
        <div class="footer">
            Thank you for your business!<br>
            <strong>MNR SoftTech Solutions</strong>
        </div>
    </div>
    
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 1000);
            }, 500);
        };
    </script>
</body>
</html>
    `;
}

function generateInvoicePreviewHTML(invoice) {
    // Store the invoice data for printing
    currentViewedInvoice = invoice;
    
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
        </div>
    `;
}

function editInvoice(invoiceId) {
    // Switch to generate tab and load the invoice
    const generateTab = new bootstrap.Tab(document.getElementById('generate-tab'));
    generateTab.show();
    
    // Load the invoice after a short delay to ensure tab is active
    setTimeout(() => {
        loadInvoice(invoiceId);
    }, 300);
}

function editCurrentInvoice() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('viewInvoiceModal'));
    modal.hide();
    
    // Use the stored deleteInvoiceId which should contain the current invoice ID
    if (deleteInvoiceId) {
        editInvoice(deleteInvoiceId);
    } else {
        console.error('No invoice ID found for editing');
        showAlert('Error: Could not find invoice to edit', 'danger');
    }
}

function confirmDelete(invoiceId) {
    if (!invoiceId) {
        console.error('confirmDelete called with empty invoice ID');
        return;
    }

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
        // Show loading for delete
        showLoading('Deleting invoice...');
        
        await db.collection('invoices').doc(invoiceId).delete();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteInvoiceModal'));
        modal.hide();
        
        // Hide loading
        hideLoading();
        
        showAlert('Invoice deleted successfully!', 'success');
        
        // Refresh the invoices table and dashboard
        loadInvoicesForTable();
        updateDashboard();
        
    } catch (error) {
        console.error('Error deleting invoice:', error);
        
        // Hide loading on error
        hideLoading();
        
        showAlert('Error deleting invoice: ' + error.message, 'danger');
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add alert to the top of the main content
    const main = document.querySelector('main');
    main.insertBefore(alertDiv, main.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
