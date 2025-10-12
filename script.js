let currentEditingInvoiceId = null;

async function generateInvoiceNumber() {
    try {
        // Get all invoices to find the highest number
        const snapshot = await db.collection('invoices').get();
        let highestNumber = 0;
        
        snapshot.forEach(doc => {
            const invoice = doc.data();
            if (invoice.invoiceNumber) {
                // Extract numbers from invoice numbers like "INV-0001", "INV-0025", etc.
                const match = invoice.invoiceNumber.match(/INV-(\d+)/);
                if (match) {
                    const number = parseInt(match[1]);
                    if (!isNaN(number) && number > highestNumber) {
                        highestNumber = number;
                    }
                }
            }
        });
        
        // Generate next number
        const nextNumber = highestNumber + 1;
        return `INV-${String(nextNumber).padStart(4, '0')}`;
        
    } catch (error) {
        console.error('Error generating invoice number:', error);
        // Fallback: timestamp-based number
        return `INV-${Date.now()}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    // Generate automatic invoice number
    generateInvoiceNumber().then(invoiceNumber => {
        document.getElementById('invoiceNumber').value = invoiceNumber;
        // Generate preview with the auto-generated number
        generateInvoicePreview();
    });

    // Add item button
    document.getElementById('addItem').addEventListener('click', addNewItemRow);

    // Payment type change handler
    document.getElementById('paymentType').addEventListener('change', function() {
        const monthlyFields = document.getElementById('monthlyBillingFields');
        if (this.value === 'monthly') {
            monthlyFields.style.display = 'block';
            // Set next billing date to next month
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            document.getElementById('nextBillingDate').value = nextMonth.toISOString().split('T')[0];
        } else {
            monthlyFields.style.display = 'none';
        }
        generateInvoicePreview();
    });

    // Payment status change handler
    document.getElementById('paymentStatus').addEventListener('change', function() {
        const partialFields = document.getElementById('partialPaymentFields');
        if (this.value === 'partial') {
            partialFields.style.display = 'block';
        } else {
            partialFields.style.display = 'none';
        }
        generateInvoicePreview();
    });

    // Initialize dashboard
    initializeDashboard();
});

function generateNewInvoiceNumber() {
    showLoading('Generating invoice number...');
    generateInvoiceNumber().then(invoiceNumber => {
        document.getElementById('invoiceNumber').value = invoiceNumber;
        generateInvoicePreview();
        hideLoading();
    }).catch(error => {
        console.error('Error generating invoice number:', error);
        hideLoading();
        alert('Error generating invoice number: ' + error.message);
    });
}

// Remove item button event delegation
document.getElementById('itemsContainer').addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
        const itemRow = e.target.closest('.item-row');
        if (document.querySelectorAll('.item-row').length > 1) {
            itemRow.remove();
        } else {
            // If it's the last row, just clear the values
            itemRow.querySelectorAll('input').forEach(input => {
                if (input.type !== 'number' || input.classList.contains('item-qty')) {
                    input.value = '';
                }
            });
            itemRow.querySelector('.item-qty').value = '1';
            itemRow.querySelector('.item-warranty').value = 'no-warranty';
            itemRow.querySelector('.custom-warranty-input').style.display = 'none';
            itemRow.querySelector('.custom-warranty-input').value = '';
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
            customWarrantyInput.value = '';
        }
        generateInvoicePreview();
    }
});

// New Invoice button
document.getElementById('newInvoiceBtn').addEventListener('click', createNewInvoice);

// Save invoice button
document.getElementById('saveInvoiceBtn').addEventListener('click', saveInvoiceToFirebase);

// Preview button
document.getElementById('previewBtn').addEventListener('click', generateInvoicePreview);

// Download PDF button
document.getElementById('downloadPdfBtn').addEventListener('click', downloadAsPDF);

// Download JPEG button
document.getElementById('downloadJpgBtn').addEventListener('click', downloadAsJPEG);

// Print button
document.getElementById('printBtn').addEventListener('click', printInvoice);

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

function addNewItemRow() {
    const itemsContainer = document.getElementById('itemsContainer');
    const newItemRow = document.createElement('div');
    newItemRow.className = 'item-row';
    newItemRow.innerHTML = `
        <input type="text" class="form-control item-desc" placeholder="Description" required>
        <input type="number" class="form-control item-qty" placeholder="Qty" min="1" value="1" required>
        <input type="number" class="form-control item-price" placeholder="Price" min="0" step="0.01" required>
        <select class="form-select item-warranty">
            <option value="no-warranty">No Warranty</option>
            <option value="7-days">7 Days</option>
            <option value="15-days">15 Days</option>
            <option value="1-month">1 Month</option>
            <option value="3-months">3 Months</option>
            <option value="6-months">6 Months</option>
            <option value="1-year">1 Year</option>
            <option value="custom">Custom</option>
        </select>
        <input type="text" class="form-control custom-warranty-input" placeholder="Enter warranty details" style="display: none;">
        <button type="button" class="btn btn-danger remove-item"><i class="fas fa-times"></i></button>
    `;
    itemsContainer.appendChild(newItemRow);
    
    // Focus on the new description field
    newItemRow.querySelector('.item-desc').focus();
    
    return newItemRow;
}

function collectInvoiceData() {
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const customerName = document.getElementById('customerName').value;
    const customerContact = document.getElementById('customerContact').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const notes = document.getElementById('notes').value;
    const paymentType = document.getElementById('paymentType').value;
    const paymentStatus = document.getElementById('paymentStatus').value;
    const billingCycle = document.getElementById('billingCycle').value;
    const nextBillingDate = document.getElementById('nextBillingDate').value;
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    
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
        
        if (description && price > 0) {
            const total = quantity * price;
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
    
    const grandTotal = subtotal;
    const balanceDue = grandTotal - amountPaid;
    
    return {
        invoiceNumber,
        invoiceDate,
        customerName,
        customerContact,
        customerAddress,
        notes,
        items,
        subtotal,
        grandTotal,
        paymentType,
        paymentStatus,
        billingCycle: paymentType === 'monthly' ? parseInt(billingCycle) : null,
        nextBillingDate: paymentType === 'monthly' ? nextBillingDate : null,
        amountPaid,
        balanceDue,
        createdAt: new Date().toISOString(),
        // Include the original invoice ID if we're editing
        originalInvoiceId: currentEditingInvoiceId
    };
}

// Add a function to check if we're creating a new invoice or editing
function isEditingInvoice() {
    return currentEditingInvoiceId !== null;
}

async function saveInvoiceToFirebase() {
    const saveBtn = document.getElementById('saveInvoiceBtn');
    
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
        
        // Check if invoice number already exists (if we're creating new, not editing)
        // We'll assume if the current invoice number matches the one in the form and we're editing, it's okay
        const existingDoc = await db.collection('invoices').doc(invoiceData.invoiceNumber).get();
        const isEditing = existingDoc.exists;
        
        if (isEditing) {
            // If editing existing invoice, ask for confirmation
            const response = confirm(`Invoice ${invoiceData.invoiceNumber} already exists. Do you want to update it?`);
            if (!response) {
                return;
            }
        }
        
        // Show loading state
        setFormLoading(true);
        setButtonLoading(saveBtn, true);
        showLoading(isEditing ? 'Updating invoice...' : 'Saving invoice...');
        
        // Ensure dates are stored properly
        const invoiceToSave = {
            ...invoiceData,
            invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split('T')[0],
            createdAt: invoiceData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        console.log('Saving invoice:', invoiceToSave);
        
        // Save to Firestore
        await db.collection('invoices').doc(invoiceData.invoiceNumber).set(invoiceToSave);
        
        // Hide loading
        hideLoading();
        setFormLoading(false);
        setButtonLoading(saveBtn, false);
        
        // Show success message
        showAlert(`Invoice ${isEditing ? 'updated' : 'saved'} successfully!`, 'success');
        
        // Reset form after successful save (only for new invoices, not when editing)
        if (!isEditing) {
            resetForm();
        } else {
            // If editing, just show success message but don't reset the form
            // This allows user to make further changes if needed
            console.log('Invoice updated successfully, form not reset for further editing');
        }
        
        // Refresh dashboard
        updateDashboard();
        
    } catch (error) {
        console.error('Error saving invoice:', error);
        
        // Hide loading on error
        hideLoading();
        setFormLoading(false);
        setButtonLoading(saveBtn, false);
        
        alert('Error saving invoice: ' + error.message);
    }
}

function createNewInvoice() {
    // Clear form
    document.getElementById('invoiceForm').reset();
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Clear items container and add one empty row
    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.innerHTML = '';
    addNewItemRow();
    
    // Hide monthly billing fields
    document.getElementById('monthlyBillingFields').style.display = 'none';
    document.getElementById('partialPaymentFields').style.display = 'none';
    
    // Generate new invoice number
    generateNewInvoiceNumber();
    
    // Clear preview
    document.getElementById('invoicePreview').innerHTML = `
        <div class="preview-placeholder">
            <i class="fas fa-receipt"></i>
            <p>Your invoice will appear here</p>
        </div>
    `;
}

async function loadInvoice(invoiceId) {
    // Validate invoice ID
    if (!invoiceId || invoiceId.trim() === '') {
        console.error('loadInvoice called with empty invoice ID');
        showAlert('Error: Invalid invoice ID', 'danger');
        return;
    }
    
    try {
        // Show loading for editing
        showLoading('Loading invoice...');
        setFormLoading(true);
        
        const doc = await db.collection('invoices').doc(invoiceId).get();
        
        if (!doc.exists) {
            alert('Invoice not found');
            hideLoading();
            setFormLoading(false);
            return;
        }
        
        const invoice = doc.data();
        console.log('Loading invoice data:', invoice);
        
        // Store the original invoice ID for editing detection
        currentEditingInvoiceId = invoiceId;
        
        // Populate form fields
        document.getElementById('invoiceNumber').value = invoice.invoiceNumber || '';
        
        // Handle date field
        const invoiceDateInput = document.getElementById('invoiceDate');
        if (invoice.invoiceDate) {
            let dateValue = invoice.invoiceDate;
            
            // If it's a full ISO string, extract just the date part
            if (dateValue.includes('T')) {
                dateValue = dateValue.split('T')[0];
            }
            
            // If it's a Firebase Timestamp object
            if (dateValue.toDate) {
                const jsDate = dateValue.toDate();
                dateValue = jsDate.toISOString().split('T')[0];
            }
            
            invoiceDateInput.value = dateValue;
        } else {
            invoiceDateInput.value = '';
        }
        
        document.getElementById('customerName').value = invoice.customerName || '';
        document.getElementById('customerContact').value = invoice.customerContact || '';
        document.getElementById('customerAddress').value = invoice.customerAddress || '';
        document.getElementById('notes').value = invoice.notes || '';
        document.getElementById('paymentType').value = invoice.paymentType || 'one-time';
        document.getElementById('paymentStatus').value = invoice.paymentStatus || 'unpaid';
        document.getElementById('billingCycle').value = invoice.billingCycle || '1';
        document.getElementById('nextBillingDate').value = invoice.nextBillingDate || '';
        document.getElementById('amountPaid').value = invoice.amountPaid || '';
        
        // Show/hide fields based on payment type
        const monthlyFields = document.getElementById('monthlyBillingFields');
        const partialFields = document.getElementById('partialPaymentFields');
        monthlyFields.style.display = invoice.paymentType === 'monthly' ? 'block' : 'none';
        partialFields.style.display = invoice.paymentStatus === 'partial' ? 'block' : 'none';
        
        // Clear existing items
        const itemsContainer = document.getElementById('itemsContainer');
        itemsContainer.innerHTML = '';
        
        // Add items
        if (invoice.items && invoice.items.length > 0) {
            invoice.items.forEach((item, index) => {
                const newRow = addNewItemRow();
                populateItemRow(newRow, item);
            });
        } else {
            // Add one empty row if no items
            addNewItemRow();
        }
        
        // Generate preview
        generateInvoicePreview();
        
        // Hide loading
        hideLoading();
        setFormLoading(false);
        
    } catch (error) {
        console.error('Error loading invoice:', error);
        
        // Hide loading on error
        hideLoading();
        setFormLoading(false);
        
        alert('Error loading invoice: ' + error.message);
    }
}

function populateItemRow(row, item) {
    if (!row || !item) return;
    
    const descInput = row.querySelector('.item-desc');
    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const warrantySelect = row.querySelector('.item-warranty');
    const customWarrantyInput = row.querySelector('.custom-warranty-input');
    
    if (descInput) descInput.value = item.description || '';
    if (qtyInput) qtyInput.value = item.quantity || 1;
    if (priceInput) priceInput.value = item.price || 0;
    
    if (warrantySelect && customWarrantyInput) {
        if (item.warranty && !['no-warranty', '7-days', '15-days', '1-month', '3-months', '6-months', '1-year'].includes(item.warranty)) {
            warrantySelect.value = 'custom';
            customWarrantyInput.style.display = 'block';
            customWarrantyInput.value = item.warranty || '';
        } else {
            warrantySelect.value = item.warranty || 'no-warranty';
            customWarrantyInput.style.display = 'none';
            customWarrantyInput.value = '';
        }
    }
}

function generateInvoicePreview() {
    const invoiceData = collectInvoiceData();
    const { invoiceNumber, invoiceDate, customerName, customerContact, customerAddress, 
            notes, items, grandTotal, paymentType, paymentStatus, billingCycle, 
            nextBillingDate, amountPaid, balanceDue } = invoiceData;
    
    // Format date
    let formattedDate = 'Date not set';
    try {
        if (invoiceDate) {
            const date = new Date(invoiceDate);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }
    } catch (error) {
        console.warn('Preview date formatting error:', error);
        formattedDate = 'Invalid Date';
    }
    
    // Payment status badge
    const paymentBadges = {
        'unpaid': '<span class="badge bg-danger">Unpaid</span>',
        'paid': '<span class="badge bg-success">Paid</span>',
        'partial': '<span class="badge bg-warning">Partial</span>'
    };
    
    const paymentBadge = paymentBadges[paymentStatus] || '';
    
    // Generate HTML for the invoice with better PDF styling
    const invoiceHTML = `
        <div class="invoice-template" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; background: white; box-sizing: border-box;">
            <div class="invoice-header" style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #3498db; padding-bottom: 15px;">
                <div class="invoice-title" style="font-size: 28px; color: #2c3e50; font-weight: bold;">INVOICE ${paymentBadge}</div>
                <div class="invoice-meta" style="text-align: right;">
                    <div class="invoice-number" style="font-weight: bold; margin-bottom: 5px; font-size: 16px;">Invoice #${invoiceNumber || '---'}</div>
                    <div class="invoice-date" style="color: #666; font-size: 14px;">Date: ${formattedDate}</div>
                </div>
            </div>
            
            <div class="invoice-company" style="margin-bottom: 30px;">
                <div class="company-name" style="font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 8px;">MNR SoftTech Solutions</div>
                <div class="company-details" style="color: #666; line-height: 1.5; font-size: 14px;">
                    Computer Software & Hardware Services<br>
                    Contact: Maniteja (mnrdeveloper11@gmail.com)<br>
                    Phone: +91 7416006394 (Whatsapp only)
                </div>
            </div>
            
            <div class="invoice-customer" style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 4px; border-left: 4px solid #3498db;">
                <div class="customer-title" style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 16px;">BILL TO:</div>
                <div class="customer-details" style="color: #333; line-height: 1.5; font-size: 14px;">
                    ${customerName || 'Customer Name'}<br>
                    ${customerContact ? 'Phone: ' + customerContact + '<br>' : ''}
                    ${customerAddress || 'Address not provided'}
                </div>
            </div>
            
            ${paymentType === 'monthly' ? `
                <div class="monthly-billing-info" style="margin-bottom: 20px; padding: 12px; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                    <strong style="color: #856404;">Monthly Billing Plan</strong><br>
                    <span style="color: #856404; font-size: 14px;">
                        Billing Cycle: ${billingCycle} Month(s)<br>
                        ${nextBillingDate ? `Next Billing: ${new Date(nextBillingDate).toLocaleDateString('en-IN')}` : ''}
                    </span>
                </div>
            ` : ''}
            
            ${items.length > 0 ? `
                <table class="invoice-table" style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: left; border: 1px solid #ddd;">Description</th>
                            <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: center; border: 1px solid #ddd; width: 80px;">Qty</th>
                            <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: right; border: 1px solid #ddd; width: 100px;">Price</th>
                            <th style="background-color: #2c3e50; color: white; padding: 12px; text-align: right; border: 1px solid #ddd; width: 120px;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top;">
                                    ${item.description}
                                    ${item.warranty && item.warranty !== 'no-warranty' ? 
                                        `<span style="display: inline-block; padding: 2px 8px; background-color: #e3f2fd; color: #1976d2; border-radius: 12px; font-size: 11px; margin-left: 8px; font-weight: 500;">
                                            Warranty: ${formatWarrantyText(item.warranty)}
                                        </span>` : ''}
                                </td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; vertical-align: top;">${item.quantity}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">₹${item.price.toFixed(2)}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">₹${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="invoice-totals" style="margin-left: auto; width: 300px; border-top: 2px solid #3498db; padding-top: 15px;">
                    <div class="invoice-totals-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="invoice-totals-label" style="font-weight: bold;">Subtotal:</span>
                        <span class="invoice-totals-value" style="font-weight: bold;">₹${grandTotal.toFixed(2)}</span>
                    </div>
                    ${amountPaid > 0 ? `
                        <div class="invoice-totals-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span class="invoice-totals-label" style="font-weight: bold;">Amount Paid:</span>
                            <span class="invoice-totals-value" style="font-weight: bold; color: #2e7d32;">₹${amountPaid.toFixed(2)}</span>
                        </div>
                        <div class="invoice-totals-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span class="invoice-totals-label" style="font-weight: bold;">Balance Due:</span>
                            <span class="invoice-totals-value" style="font-weight: bold; color: #c62828;">₹${balanceDue.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="invoice-totals-row invoice-grand-total" style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd;">
                        <span class="invoice-totals-label" style="font-size: 16px; font-weight: bold;">${amountPaid > 0 ? 'Total Amount' : 'Amount Due'}:</span>
                        <span class="invoice-totals-value" style="font-size: 16px; font-weight: bold; color: #3498db;">₹${grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            ` : '<p style="text-align: center; padding: 40px; color: #666; font-size: 16px;">No items added</p>'}
            
            <div class="warranty-disclaimer" style="margin: 25px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #2c3e50; font-size: 16px;">Warranty Terms</h3>
                <p style="margin-bottom: 8px; font-size: 14px;">Warranty covers manufacturing defects only. Does not cover:</p>
                <ul style="margin: 8px 0 8px 20px; font-size: 14px;">
                    <li>Physical damage or liquid damage</li>
                    <li>Unauthorized repairs or modifications</li>
                    <li>Software issues not related to hardware</li>
                </ul>
                <p style="margin: 0; font-size: 14px;">Original invoice required for all warranty claims.</p>
            </div>
            
            ${notes ? `
                <div class="invoice-notes" style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div class="invoice-notes-title" style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Notes:</div>
                    <div class="invoice-notes-content" style="color: #666; font-size: 14px; line-height: 1.5;">${notes}</div>
                </div>
            ` : ''}
            
            <div style="margin-top: 40px; text-align: center; color: #666; font-size: 14px; padding-top: 20px; border-top: 1px solid #eee;">
                Thank you for your business!<br>
                <strong>MNR SoftTech Solutions</strong>
            </div>
        </div>
    `;
    
    // Update the preview
    const previewContainer = document.getElementById('invoicePreview');
    if (previewContainer) {
        previewContainer.innerHTML = invoiceHTML;
    }
}

// Dashboard Functions
function initializeDashboard() {
    updateDashboard();
}

function formatWarrantyText(warranty) {
    if (!warranty) return '';
    return warranty.replace(/-/g, ' ').replace(/(^|\s)\S/g, l => l.toUpperCase());
}

function downloadAsPDF() {
    // First generate the preview to ensure it's up to date
    generateInvoicePreview();
    
    showLoading('Generating PDF...');
    
    // Add a small delay to ensure DOM is updated
    setTimeout(() => {
        const element = document.getElementById('invoicePreview');
        
        // Ensure the element is visible and properly styled for PDF
        const originalDisplay = element.style.display;
        const originalWidth = element.style.width;
        element.style.display = 'block';
        element.style.width = '210mm'; // A4 width
        
        const opt = {
            margin: 10,
            filename: `MNR_Invoice_${document.getElementById('invoiceNumber').value || 'new'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait' 
            }
        };
        
        // Generate PDF
        html2pdf().set(opt).from(element).save().then(() => {
            // Restore original styles
            element.style.display = originalDisplay;
            element.style.width = originalWidth;
            hideLoading();
        }).catch(error => {
            console.error('PDF generation error:', error);
            hideLoading();
            alert('Error generating PDF: ' + error.message);
        });
    }, 500);
}

function downloadAsJPEG() {
    showLoading('Generating JPEG...');
    
    setTimeout(() => {
        generateInvoicePreview();
        const element = document.getElementById('invoicePreview');
        
        html2canvas(element).then(canvas => {
            const link = document.createElement('a');
            link.download = `MNR_Invoice_${document.getElementById('invoiceNumber').value || 'new'}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
            hideLoading();
        });
    }, 500);
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

// Helper functions for other files
function formatInvoiceDateForDisplay(invoice) {
    if (invoice.invoiceDate) {
        return new Date(invoice.invoiceDate).toLocaleDateString('en-IN');
    } else if (invoice.createdAt) {
        return new Date(invoice.createdAt).toLocaleDateString('en-IN');
    }
    return 'N/A';
}

// Add these loading functions at the top of script.js
function showLoading(message = 'Processing...') {
    const loadingHTML = `
        <div class="loading-overlay" id="loadingOverlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('btn-loading');
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading');
    }
}

function setFormLoading(isLoading) {
    const form = document.getElementById('invoiceForm');
    const saveBtn = document.getElementById('saveInvoiceBtn');
    
    if (isLoading) {
        form.classList.add('form-loading');
        setButtonLoading(saveBtn, true);
    } else {
        form.classList.remove('form-loading');
        setButtonLoading(saveBtn, false);
    }
}

function resetForm() {
    // Clear form fields
    document.getElementById('invoiceForm').reset();
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Clear items container and add one empty row
    const itemsContainer = document.getElementById('itemsContainer');
    itemsContainer.innerHTML = '';
    addNewItemRow();
    
    // Hide monthly billing fields
    document.getElementById('monthlyBillingFields').style.display = 'none';
    document.getElementById('partialPaymentFields').style.display = 'none';
    
    // Set default payment type and status
    document.getElementById('paymentType').value = 'one-time';
    document.getElementById('paymentStatus').value = 'unpaid';
    
    // Clear editing state
    currentEditingInvoiceId = null;
    
    // Generate new invoice number
    generateNewInvoiceNumber();
    
    // Clear preview
    document.getElementById('invoicePreview').innerHTML = `
        <div class="preview-placeholder">
            <i class="fas fa-receipt"></i>
            <p>Your invoice will appear here</p>
        </div>
    `;
    
    console.log('Form reset for new invoice');
}

// Add showAlert function to script.js (if not already there)
function showAlert(message, type) {
    // Remove any existing alerts first
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add alert to the top of the main content
    const main = document.querySelector('main .container');
    if (main) {
        main.insertBefore(alertDiv, main.firstChild);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
