document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Add item button
    document.getElementById('addItem').addEventListener('click', addNewItemRow);
    
    // Remove item button event delegation
    document.getElementById('itemsContainer').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
            const itemRow = e.target.closest('.item-row');
            if (document.querySelectorAll('.item-row').length > 1) {
                itemRow.remove();
            } else {
                // If it's the last row, just clear the values
                itemRow.querySelectorAll('input').forEach(input => input.value = '');
                itemRow.querySelector('.item-qty').value = '1';
                itemRow.querySelector('.item-warranty').value = 'no-warranty';
                itemRow.querySelector('.custom-warranty-input').style.display = 'none';
            }
            generateInvoicePreview();
        }
    });
    
    // Warranty selection change handler
    document.getElementById('itemsContainer').addEventListener('change', function(e) {
        if (e.target.classList.contains('item-warranty')) {
            const customWarrantyInput = e.target.closest('.item-row').querySelector('.custom-warranty-input');
            if (e.target.value === 'custom') {
                customWarrantyInput.style.display = 'block';
            } else {
                customWarrantyInput.style.display = 'none';
            }
            generateInvoicePreview();
        }
    });
    
    // Save invoice button
    document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoiceToFirebase);
    
    // Load invoices button
    document.getElementById('loadInvoicesBtn').addEventListener('click', loadInvoicesFromFirebase);
    
    // Preview button
    document.getElementById('previewBtn').addEventListener('click', generateInvoicePreview);
    
    // Download PDF button
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPDF);
    
    // Download JPEG button
    document.getElementById('downloadJpgBtn').addEventListener('click', downloadAsJPEG);
    
    // Print button
    document.getElementById('printBtn').addEventListener('click', printInvoice);
    
    // Modal functionality
    setupModal();
    
    // Auto-generate preview when inputs change
    document.getElementById('invoiceForm').addEventListener('input', function() {
        // Throttle the preview generation to avoid performance issues
        if (this.previewTimeout) {
            clearTimeout(this.previewTimeout);
        }
        this.previewTimeout = setTimeout(generateInvoicePreview, 500);
    });
    
    // Add initial item row
    addNewItemRow();
});

function setupModal() {
    const modal = document.getElementById('invoiceListModal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

function showModal() {
    document.getElementById('invoiceListModal').style.display = 'block';
}

function addNewItemRow() {
    const itemsContainer = document.getElementById('itemsContainer');
    const newItemRow = document.createElement('div');
    newItemRow.className = 'item-row';
    newItemRow.innerHTML = `
        <input type="text" class="item-desc" placeholder="Description" required>
        <input type="number" class="item-qty" placeholder="Qty" min="1" value="1" required>
        <input type="number" class="item-price" placeholder="Price" min="0" step="0.01" required>
        <select class="item-warranty">
            <option value="no-warranty">No Warranty</option>
            <option value="7-days">7 Days</option>
            <option value="15-days">15 Days</option>
            <option value="1-month">1 Month</option>
            <option value="3-months">3 Months</option>
            <option value="6-months">6 Months</option>
            <option value="1-year">1 Year</option>
            <option value="custom">Custom</option>
        </select>
        <input type="text" class="custom-warranty-input" placeholder="Enter warranty details" style="display: none;">
        <button type="button" class="remove-item"><i class="fas fa-times"></i></button>
    `;
    itemsContainer.appendChild(newItemRow);
    
    // Focus on the new description field
    newItemRow.querySelector('.item-desc').focus();
}

function collectInvoiceData() {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const customerName = document.getElementById('customerName').value;
    const customerContact = document.getElementById('customerContact').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const notes = document.getElementById('notes').value;
    
    // Get all items
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    let subtotal = 0;
    
    itemRows.forEach(row => {
        const description = row.querySelector('.item-desc').value;
        const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const warranty = row.querySelector('.item-warranty').value;
        const customWarranty = row.querySelector('.custom-warranty-input').value;
        const total = quantity * price;
        
        if (description) {
            items.push({
                description,
                quantity,
                price,
                warranty: warranty === 'custom' ? customWarranty : warranty,
                total
            });
            subtotal += total;
        }
    });
    
    return {
        invoiceNumber,
        invoiceDate,
        customerName,
        customerContact,
        customerAddress,
        notes,
        items,
        subtotal,
        grandTotal: subtotal,
        createdAt: new Date().toISOString()
    };
}

async function saveInvoiceToFirebase() {
    try {
        const invoiceData = collectInvoiceData();
        
        if (!invoiceData.invoiceNumber) {
            alert('Please enter an invoice number');
            return;
        }
        
        if (!invoiceData.customerName) {
            alert('Please enter customer name');
            return;
        }
        
        if (invoiceData.items.length === 0) {
            alert('Please add at least one item');
            return;
        }
        
        // Save to Firestore
        await db.collection('invoices').doc(invoiceData.invoiceNumber).set(invoiceData);
        
        alert('Invoice saved successfully!');
        
    } catch (error) {
        console.error('Error saving invoice:', error);
        alert('Error saving invoice: ' + error.message);
    }
}

async function loadInvoicesFromFirebase() {
    try {
        const snapshot = await db.collection('invoices').orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            document.getElementById('invoiceList').innerHTML = '<p>No saved invoices found.</p>';
            showModal();
            return;
        }
        
        let invoicesHTML = '';
        snapshot.forEach(doc => {
            const invoice = doc.data();
            invoicesHTML += `
                <div class="invoice-item" data-id="${doc.id}">
                    <div class="invoice-item-header">
                        <strong>${invoice.invoiceNumber}</strong>
                        <span class="invoice-date">${new Date(invoice.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div class="invoice-item-body">
                        <div>Customer: ${invoice.customerName}</div>
                        <div>Total: ₹${invoice.grandTotal.toFixed(2)}</div>
                    </div>
                    <div class="invoice-item-actions">
                        <button class="btn-small btn-load" onclick="loadInvoice('${doc.id}')">
                            <i class="fas fa-edit"></i> Load
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteInvoice('${doc.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        document.getElementById('invoiceList').innerHTML = invoicesHTML;
        showModal();
        
    } catch (error) {
        console.error('Error loading invoices:', error);
        alert('Error loading invoices: ' + error.message);
    }
}

async function loadInvoice(invoiceId) {
    try {
        const doc = await db.collection('invoices').doc(invoiceId).get();
        
        if (!doc.exists) {
            alert('Invoice not found');
            return;
        }
        
        const invoice = doc.data();
        
        // Populate form fields
        document.getElementById('invoiceNumber').value = invoice.invoiceNumber;
        document.getElementById('invoiceDate').value = invoice.invoiceDate;
        document.getElementById('customerName').value = invoice.customerName;
        document.getElementById('customerContact').value = invoice.customerContact || '';
        document.getElementById('customerAddress').value = invoice.customerAddress || '';
        document.getElementById('notes').value = invoice.notes || '';
        
        // Clear existing items
        const itemsContainer = document.getElementById('itemsContainer');
        itemsContainer.innerHTML = '';
        
        // Add items
        invoice.items.forEach((item, index) => {
            if (index === 0) {
                // Use the first existing row
                const firstRow = document.querySelector('.item-row') || addNewItemRow();
                populateItemRow(firstRow, item);
            } else {
                const newRow = addNewItemRow();
                populateItemRow(newRow, item);
            }
        });
        
        // Close modal
        document.getElementById('invoiceListModal').style.display = 'none';
        
        // Generate preview
        generateInvoicePreview();
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        alert('Error loading invoice: ' + error.message);
    }
}

function populateItemRow(row, item) {
    row.querySelector('.item-desc').value = item.description;
    row.querySelector('.item-qty').value = item.quantity;
    row.querySelector('.item-price').value = item.price;
    
    const warrantySelect = row.querySelector('.item-warranty');
    const customWarrantyInput = row.querySelector('.custom-warranty-input');
    
    if (item.warranty && !['no-warranty', '7-days', '15-days', '1-month', '3-months', '6-months', '1-year'].includes(item.warranty)) {
        warrantySelect.value = 'custom';
        customWarrantyInput.style.display = 'block';
        customWarrantyInput.value = item.warranty;
    } else {
        warrantySelect.value = item.warranty || 'no-warranty';
        customWarrantyInput.style.display = 'none';
    }
}

async function deleteInvoice(invoiceId) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        try {
            await db.collection('invoices').doc(invoiceId).delete();
            alert('Invoice deleted successfully!');
            loadInvoicesFromFirebase(); // Refresh the list
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Error deleting invoice: ' + error.message);
        }
    }
}

function generateInvoicePreview() {
    const invoiceData = collectInvoiceData();
    const { invoiceNumber, invoiceDate, customerName, customerContact, customerAddress, notes, items, grandTotal } = invoiceData;
    
    // Format date
    const formattedDate = invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';
    
    // Generate HTML for the invoice
    const invoiceHTML = `
        <div class="invoice-template">
            <div class="invoice-header">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-meta">
                    <div class="invoice-number">Invoice #${invoiceNumber || '---'}</div>
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
                    ${customerName || 'Customer Name'}<br>
                    ${customerContact ? 'Phone: ' + customerContact + '<br>' : ''}
                    ${customerAddress || 'Address not provided'}
                </div>
            </div>
            
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
                    ${items.map(item => `
                        <tr>
                            <td>
                                ${item.description}
                                ${item.warranty && item.warranty !== 'no-warranty' ? 
                                    `<span class="warranty-badge">
                                        Warranty: ${item.warranty.replace('-', ' ').replace(/(^|\s)\S/g, l => l.toUpperCase())}
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
                <div class="invoice-totals-row invoice-grand-total">
                    <span class="invoice-totals-label">Total Amount:</span>
                    <span class="invoice-totals-value">₹${grandTotal.toFixed(2)}</span>
                </div>
            </div>
            
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
            
            ${notes ? `
                <div class="invoice-notes">
                    <div class="invoice-notes-title">Notes:</div>
                    <div class="invoice-notes-content">${notes}</div>
                </div>
            ` : ''}
            
            <div style="margin-top: 3rem; text-align: center; color: #666; font-size: 0.9rem;">
                Thank you for your business!<br>
                MNR SoftTech Solutions
            </div>
        </div>
    `;
    
    // Update the preview
    const previewContainer = document.getElementById('invoicePreview');
    previewContainer.innerHTML = invoiceHTML;
}

function downloadAsPDF() {
    generateInvoicePreview();
    const element = document.getElementById('invoicePreview');
    const opt = {
        margin: 10,
        filename: `MNR_Invoice_${document.getElementById('invoiceNumber').value || 'new'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate PDF
    html2pdf().set(opt).from(element).save();
}

function downloadAsJPEG() {
    generateInvoicePreview();
    const element = document.getElementById('invoicePreview');
    
    html2canvas(element).then(canvas => {
        const link = document.createElement('a');
        link.download = `MNR_Invoice_${document.getElementById('invoiceNumber').value || 'new'}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    });
}

function printInvoice() {
    generateInvoicePreview();
    
    // Wait for the preview to generate
    setTimeout(() => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MNR SoftTech Solutions - Invoice</title>
                <style>
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: Arial, sans-serif;
                        }
                        .invoice-template {
                            width: 210mm;
                            min-height: 297mm;
                            margin: 0 auto;
                            padding: 15mm;
                            box-sizing: border-box;
                        }
                        .button-group, footer, header {
                            display: none !important;
                        }
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                    }
                    body {
                        visibility: hidden;
                    }
                    .invoice-template {
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                    }
                </style>
            </head>
            <body>
                ${document.getElementById('invoicePreview').innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 200);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }, 100);
}
