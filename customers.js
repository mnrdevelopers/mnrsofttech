// customers.js - Customer Management System
document.addEventListener('DOMContentLoaded', function() {
    initializeCustomersTab();
});

function initializeCustomersTab() {
    // Initialize when tab is shown
    document.getElementById('customers-tab').addEventListener('shown.bs.tab', function() {
        loadCustomers();
    });

    // Add customer button
    document.getElementById('addCustomerBtn').addEventListener('click', showAddCustomerModal);

    // Save customer button
    document.getElementById('saveCustomerBtn').addEventListener('click', saveCustomer);

    // Search customers
    document.getElementById('searchCustomers').addEventListener('input', filterCustomers);

    // Customer type filter
    document.getElementById('filterCustomerType').addEventListener('change', filterCustomers);

    // Clear customer filters
    document.getElementById('clearCustomerFilters').addEventListener('click', function() {
        document.getElementById('searchCustomers').value = '';
        document.getElementById('filterCustomerType').value = '';
        filterCustomers();
    });

    // Edit customer modal setup
    document.getElementById('saveEditCustomerBtn').addEventListener('click', updateCustomer);
}

async function loadCustomers() {
    try {
        showLoading('Loading customers...');
        
        const snapshot = await db.collection('customers').orderBy('name').get();
        const customers = [];
        
        snapshot.forEach(doc => {
            customers.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayCustomers(customers);
        
    } catch (error) {
        console.error('Error loading customers:', error);
        showToast('Error loading customers: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function displayCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    const customerSelects = document.querySelectorAll('.customer-select');
    
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No customers found</p>
                    <button class="btn btn-primary mt-2" onclick="showAddCustomerModal()">
                        <i class="fas fa-plus me-2"></i>Add Your First Customer
                    </button>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="customer-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                            ${getCustomerInitials(customer.name)}
                        </div>
                        <div>
                            <strong>${customer.name}</strong>
                            ${customer.customerType === 'monthly' ? 
                                '<span class="badge bg-info ms-2">Monthly</span>' : 
                                '<span class="badge bg-secondary ms-2">One Time</span>'}
                        </div>
                    </div>
                </td>
                <td>${customer.contact || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>
                    <small class="text-muted">${customer.address ? customer.address.substring(0, 50) + (customer.address.length > 50 ? '...' : '') : 'No address'}</small>
                </td>
                <td>${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td>
                    <span class="badge ${customer.status === 'active' ? 'bg-success' : 'bg-warning'}">
                        ${customer.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="selectCustomerForInvoice('${customer.id}')" title="Use for Invoice">
                            <i class="fas fa-file-invoice"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editCustomer('${customer.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteCustomer('${customer.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Update customer dropdowns
    updateCustomerSelects(customers, customerSelects);
}

function updateCustomerSelects(customers, selects) {
    const sortedCustomers = customers.sort((a, b) => a.name.localeCompare(b.name));
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select Customer --</option>';
        
        sortedCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} ${customer.contact ? `(${customer.contact})` : ''}`;
            option.dataset.customerData = JSON.stringify(customer);
            select.appendChild(option);
        });
        
        // Restore previous value if it exists
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function getCustomerInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
}

function showAddCustomerModal() {
    document.getElementById('customerModalLabel').textContent = 'Add New Customer';
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('customerStatus').value = 'active';
    
    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
    modal.show();
}

async function saveCustomer() {
    const customerData = collectCustomerData();
    
    if (!customerData.name) {
        showToast('Please enter customer name', 'warning');
        return;
    }
    
    try {
        showLoading('Saving customer...');
        
        // Generate a unique ID based on name and contact
        const customerId = customerData.name.toLowerCase().replace(/\s+/g, '_') + 
                          (customerData.contact ? '_' + customerData.contact : '_' + Date.now());
        
        const customerToSave = {
            ...customerData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await db.collection('customers').doc(customerId).set(customerToSave);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
        modal.hide();
        
        showToast('Customer saved successfully!', 'success');
        
        // Refresh customers list
        loadCustomers();
        
    } catch (error) {
        console.error('Error saving customer:', error);
        showToast('Error saving customer: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function editCustomer(customerId) {
    try {
        showLoading('Loading customer details...');
        
        const doc = await db.collection('customers').doc(customerId).get();
        
        if (!doc.exists) {
            showToast('Customer not found', 'warning');
            return;
        }
        
        const customer = doc.data();
        
        // Populate form
        document.getElementById('customerModalLabel').textContent = 'Edit Customer';
        document.getElementById('customerId').value = customerId;
        document.getElementById('customerName').value = customer.name || '';
        document.getElementById('customerContact').value = customer.contact || '';
        document.getElementById('customerEmail').value = customer.email || '';
        document.getElementById('customerAddress').value = customer.address || '';
        document.getElementById('customerType').value = customer.customerType || 'one-time';
        document.getElementById('customerStatus').value = customer.status || 'active';
        document.getElementById('customerNotes').value = customer.notes || '';
        
        const modal = new bootstrap.Modal(document.getElementById('customerModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading customer:', error);
        showToast('Error loading customer: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function updateCustomer() {
    const customerId = document.getElementById('customerId').value;
    const customerData = collectCustomerData();
    
    if (!customerId) {
        showToast('Customer ID not found', 'error');
        return;
    }
    
    try {
        showLoading('Updating customer...');
        
        const customerToUpdate = {
            ...customerData,
            updatedAt: new Date().toISOString()
        };
        
        await db.collection('customers').doc(customerId).update(customerToUpdate);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
        modal.hide();
        
        showToast('Customer updated successfully!', 'success');
        
        // Refresh customers list
        loadCustomers();
        
    } catch (error) {
        console.error('Error updating customer:', error);
        showToast('Error updating customer: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function collectCustomerData() {
    return {
        name: document.getElementById('customerName').value.trim(),
        contact: document.getElementById('customerContact').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        customerType: document.getElementById('customerType').value,
        status: document.getElementById('customerStatus').value,
        notes: document.getElementById('customerNotes').value.trim()
    };
}

async function deleteCustomer(customerId) {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading('Deleting customer...');
        
        // Check if customer has any invoices
        const invoicesSnapshot = await db.collection('invoices')
            .where('customerId', '==', customerId)
            .get();
        
        if (!invoicesSnapshot.empty) {
            showToast('Cannot delete customer with existing invoices. Please delete the invoices first.', 'warning');
            return;
        }
        
        await db.collection('customers').doc(customerId).delete();
        
        showToast('Customer deleted successfully!', 'success');
        
        // Refresh customers list
        loadCustomers();
        
    } catch (error) {
        console.error('Error deleting customer:', error);
        showToast('Error deleting customer: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function selectCustomerForInvoice(customerId) {
    // Switch to generate invoice tab
    const generateTab = new bootstrap.Tab(document.getElementById('generate-tab'));
    generateTab.show();
    
    // Load customer data after a short delay
    setTimeout(async () => {
        try {
            const doc = await db.collection('customers').doc(customerId).get();
            
            if (doc.exists) {
                const customer = doc.data();
                document.getElementById('customerName').value = customer.name || '';
                document.getElementById('customerContact').value = customer.contact || '';
                document.getElementById('customerAddress').value = customer.address || '';
                
                // Set payment type based on customer type
                if (customer.customerType === 'monthly') {
                    document.getElementById('paymentType').value = 'monthly';
                    document.getElementById('monthlyBillingFields').style.display = 'block';
                }
                
                showToast(`Customer ${customer.name} loaded for invoice`, 'success');
            }
        } catch (error) {
            console.error('Error loading customer for invoice:', error);
        }
    }, 300);
}

function filterCustomers() {
    const searchTerm = document.getElementById('searchCustomers').value.toLowerCase();
    const typeFilter = document.getElementById('filterCustomerType').value;
    
    const rows = document.querySelectorAll('#customersTableBody tr');
    
    rows.forEach(row => {
        if (row.querySelector('td')) { // Skip the "no customers" row
            const name = row.cells[0].textContent.toLowerCase();
            const contact = row.cells[1].textContent.toLowerCase();
            const email = row.cells[2].textContent.toLowerCase();
            const type = row.cells[0].querySelector('.badge').textContent.toLowerCase();
            
            const matchesSearch = !searchTerm || 
                                name.includes(searchTerm) || 
                                contact.includes(searchTerm) || 
                                email.includes(searchTerm);
            
            const matchesType = !typeFilter || 
                              (typeFilter === 'monthly' && type === 'monthly') ||
                              (typeFilter === 'one-time' && type === 'one time');
            
            row.style.display = matchesSearch && matchesType ? '' : 'none';
        }
    });
}

// Function to populate customer dropdown in other modules
function populateCustomerDropdown(selectElement) {
    loadCustomers().then(() => {
        // The loadCustomers function already updates all customer selects
    });
}

// Quick customer add from invoice form
function quickAddCustomer() {
    const name = document.getElementById('customerName').value;
    const contact = document.getElementById('customerContact').value;
    const address = document.getElementById('customerAddress').value;
    
    if (!name) {
        showToast('Please enter customer name first', 'warning');
        return;
    }
    
    // Pre-fill the customer modal
    document.getElementById('customerModalLabel').textContent = 'Add New Customer';
    document.getElementById('customerId').value = '';
    document.getElementById('customerName').value = name;
    document.getElementById('customerContact').value = contact;
    document.getElementById('customerAddress').value = address;
    document.getElementById('customerStatus').value = 'active';
    
    // Clear other fields
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerNotes').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
    modal.show();
}
