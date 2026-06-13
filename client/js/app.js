/**
 * app.js – Nexus HR Enterprise Suite Logic
 * Handles: Auth Guard | View Routing | CRUD API | Custom Modals | Dashboard Metrics | Form Validation
 */

// Central configuration state
window.nexusConfig = {
    allowedDepartments: [],
    allowedRoles: []
};

let currentAdmin = null;

async function verifySession() {
    const SESSION_KEY = 'nexus_admin_session';
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            throw new Error('Unauthorized');
        }
        const data = await response.json();
        currentAdmin = data;
        window.nexusConfig.allowedDepartments = data.allowedDepartments || [];
        window.nexusConfig.allowedRoles = data.allowedRoles || [];
        
        syncHeaderState(data.name, data.role);
        populateSelectOptions();

        // Apply persisted preferences (Antigravity Mode)
        window.nexusConfig.antigravityEnabled = !!data.antigravityEnabled;
        updateAntigravityUI(window.nexusConfig.antigravityEnabled);
        
        const sessionData = {
            user: data.name,
            role: data.role,
            email: data.email,
            timestamp: Date.now()
        };
        if (localStorage.getItem(SESSION_KEY)) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        }
    } catch (err) {
        console.error('Session verification failed:', err);
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.replace('/login.html');
    }
}

// ─── Auth Guard – Redirect to login if no active session ───────────────────
(async function authGuard() {
    const SESSION_KEY = 'nexus_admin_session';
    const session = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!session) {
        window.location.replace('/login.html');
        return;
    }
    // Perform backend validation
    await verifySession();
})();


// ─── Config ────────────────────────────────────────────────────────────────
const API_URL = 'https://hr-mgt-dashboard.vercel.app/api/employees';

// ─── State ─────────────────────────────────────────────────────────────────
let editMode      = false;
let currentEditId = null;
let allEmployees  = [];          // cached list of all employees
let filteredEmployees = [];      // current view list after search/filters
let deleteTargetId = null;       // stores employee ID during delete confirmation

let currentPage = 1;
const itemsPerPage = 10;

// ─── DOM Refs ───────────────────────────────────────────────────────────────
const employeeForm      = document.getElementById('employeeForm');
const employeeTable     = document.getElementById('employeeTableBody');
const formTitle         = document.getElementById('formTitle');
const formSubtitle      = document.getElementById('formSubtitle');
const saveBtn           = document.getElementById('saveBtn');
const breadcrumbAction  = document.getElementById('breadcrumb-action');

const nameInput   = document.getElementById('name');
const deptInput   = document.getElementById('department');
const roleInput   = document.getElementById('role');
const salaryInput = document.getElementById('salary');
const dateInput   = document.getElementById('joinDate');

// Delete Modal DOM Refs
const deleteModal       = document.getElementById('deleteModal');
const deleteModalAvatar = document.getElementById('deleteModalAvatar');
const deleteModalName   = document.getElementById('deleteModalName');
const deleteModalRole   = document.getElementById('deleteModalRole');
const deleteModalConfirmBtn = document.getElementById('deleteModalConfirmBtn');

const searchInput = document.getElementById('searchInput');
const departmentFilter = document.getElementById('departmentFilter');
const paginationInfo = document.getElementById('paginationInfo');
const paginationControls = document.getElementById('paginationControls');

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', fetchEmployees);
employeeForm.addEventListener('submit', handleFormSubmit);
deleteModalConfirmBtn.addEventListener('click', confirmDeleteEmployee);

// ═══════════════════════════════════════════════════════════════════
//  VIEW ROUTING
// ═══════════════════════════════════════════════════════════════════

function switchView(viewId, element) {
    // Hide all views
    ['dashboard-view', 'directory-view', 'add-view', 'reports-view', 'settings-view'].forEach(id => {
        const view = document.getElementById(id);
        if (view) view.classList.add('d-none');
    });

    // Show the requested view
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.remove('d-none');

    // Update active state in sidebar links
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    
    if (element) {
        element.classList.add('active');
    } else {
        if (viewId === 'dashboard-view') {
            document.getElementById('nav-dashboard').classList.add('active');
        } else if (viewId === 'directory-view' || viewId === 'add-view') {
            document.getElementById('nav-employees').classList.add('active');
        }
    }

    if (viewId === 'add-view' && !editMode) {
        resetFormUI();
    }
    
    if (viewId === 'settings-view') {
        loadSettingsView();
    }
}

// ═══════════════════════════════════════════════════════════════════
//  DATA FETCHING & SYNC
// ═══════════════════════════════════════════════════════════════════

async function fetchEmployees() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

        allEmployees = await res.json();
        
        // Mock Employee IDs if none exist (for UI demo)
        allEmployees.forEach((emp, index) => {
            if (!emp.empId) emp.empId = `#EMP-${2045 + index}`;
        });

        filteredEmployees = [...allEmployees];
        currentPage = 1;
        
        updateDashboard(allEmployees);
        renderTablePage();
    } catch (err) {
        console.error('fetchEmployees error:', err);
        employeeTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger py-5">
                    <strong>Failed to load employee database.</strong><br>
                    <small>Verify the backend server is running on port 5000 and MongoDB is active.</small>
                </td>
            </tr>`;
    }
}

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD METRICS & WIDGET FEED
// ═══════════════════════════════════════════════════════════════════

function updateDashboard(employees) {
    const totalCount = employees.length;
    document.getElementById('stat-total').textContent = totalCount.toLocaleString();

    const depts = new Set(employees.map(e => e.department?.trim()).filter(Boolean));
    document.getElementById('stat-dept').textContent = depts.size;

    const currentYear = new Date().getFullYear();
    const newCount = employees.filter(e => e.joinDate && new Date(e.joinDate).getFullYear() === currentYear).length;
    document.getElementById('stat-new').textContent = newCount;

    document.getElementById('stat-active').textContent = totalCount.toLocaleString();
    document.getElementById('stat-active-percentage').textContent = totalCount > 0 ? '100.0%' : '0.0%';

    const activityContainer = document.getElementById('activity-list-container');
    activityContainer.innerHTML = '';

    if (employees.length === 0) {
        activityContainer.innerHTML = '<div class="text-center text-muted py-4">No recent activity.</div>';
    } else {
        const sortedForActivity = [...employees].sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate)).slice(0, 5);
        sortedForActivity.forEach(emp => {
            const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
            const timeAgoStr = getTimeAgo(emp.joinDate);
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="emp-name-cell" style="flex:1;">
                    <div class="avatar-placeholder">${initials}</div>
                    <div>
                        <strong>${escHtml(emp.name)}</strong>
                        <span>Joined as <span class="text-primary">${escHtml(emp.role)}</span> in ${escHtml(emp.department)}</span>
                    </div>
                </div>
                <div class="activity-time">${timeAgoStr}</div>
            `;
            activityContainer.appendChild(activityItem);
        });
    }

    const healthContainer = document.getElementById('health-bar-container');
    healthContainer.innerHTML = '';

    if (employees.length === 0) {
        healthContainer.innerHTML = '<div class="text-center text-muted py-4">No department metrics.</div>';
    } else {
        const deptCounts = {};
        employees.forEach(emp => {
            const d = emp.department || 'Other';
            deptCounts[d] = (deptCounts[d] || 0) + 1;
        });

        const deptStats = Object.keys(deptCounts).map(name => {
            return {
                name,
                count: deptCounts[name],
                percentage: Math.round((deptCounts[name] / totalCount) * 100)
            };
        }).sort((a, b) => b.count - a.count).slice(0, 3);
        
        deptStats.forEach((dept) => {
            const barItem = document.createElement('div');
            barItem.className = 'health-item';
            barItem.innerHTML = `
                <div class="health-item-header">
                    <span>${escHtml(dept.name)}</span>
                    <span class="text-muted">${dept.percentage}%</span>
                </div>
                <div class="health-bar-bg">
                    <div class="health-bar-fill" style="width: ${dept.percentage}%"></div>
                </div>
            `;
            healthContainer.appendChild(barItem);
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
//  TABLE DIRECTORY RENDERING & PAGINATION & FILTER
// ═══════════════════════════════════════════════════════════════════

function handleFilterChange() {
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const dept = departmentFilter ? departmentFilter.value : '';
    
    filteredEmployees = allEmployees.filter(e => {
        const matchQuery = !q
            || e.name?.toLowerCase().includes(q)
            || e.empId?.toLowerCase().includes(q)
            || e.role?.toLowerCase().includes(q)
            || e.department?.toLowerCase().includes(q);
        const matchDept = !dept || e.department === dept;
        return matchQuery && matchDept;
    });
    
    currentPage = 1; // Reset to page 1
    renderTablePage();
}

/**
 * Global search handler – called from the topbar search bar.
 * Switches to the Employee Directory view, syncs the query into the
 * directory's own search input, and triggers the filter.
 */
function handleGlobalSearch(value) {
    // Switch to directory view (employees list)
    const navEl = document.getElementById('nav-employees');
    switchView('directory-view', navEl);

    // Sync the typed value into the directory's local search input
    if (searchInput) {
        searchInput.value = value;
    }

    // Run the filter
    handleFilterChange();
}

function changePage(deltaOrPage) {
    if (typeof deltaOrPage === 'string') {
        if (deltaOrPage === 'prev') currentPage = Math.max(1, currentPage - 1);
        if (deltaOrPage === 'next') currentPage = Math.min(Math.ceil(filteredEmployees.length / itemsPerPage), currentPage + 1);
    } else {
        currentPage = deltaOrPage;
    }
    renderTablePage();
}

function renderTablePage() {
    employeeTable.innerHTML = '';

    if (filteredEmployees.length === 0) {
        employeeTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-5">
                    No employees match your search criteria.
                </td>
            </tr>`;
        paginationInfo.textContent = 'Showing 0 employees';
        paginationControls.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageItems = filteredEmployees.slice(startIdx, endIdx);

    pageItems.forEach(emp => {
        const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
        const dateFormatted = formatDate(emp.joinDate);
        const salaryFormatted = emp.salary != null ? '$' + Number(emp.salary).toLocaleString('en-US') : '—';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 text-muted">${escHtml(emp.empId || '')}</td>
            <td>
                <div class="emp-name-cell">
                    <div class="avatar-placeholder">${initials}</div>
                    <div>
                        <strong>${escHtml(emp.name)}</strong>
                        <span>${escHtml(emp.name).toLowerCase().replace(' ', '.')}@nexushr.com</span>
                    </div>
                </div>
            </td>
            <td><span class="badge-dept">${escHtml(emp.department)}</span></td>
            <td class="badge-role">${escHtml(emp.role)}</td>
            <td class="fw-medium">${salaryFormatted}</td>
            <td class="text-muted">${dateFormatted}</td>
            <td class="pe-4 text-end">
                <button class="btn-action" title="Edit" onclick="editEmployee('${emp._id}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="btn-action delete" title="Delete" onclick="openDeleteModal('${emp._id}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        employeeTable.appendChild(tr);
    });

    paginationInfo.textContent = `Showing ${startIdx + 1}-${Math.min(endIdx, filteredEmployees.length)} of ${filteredEmployees.length} employees`;
    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    let html = `<button class="page-btn" onclick="changePage('prev')" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>`;
    
    for(let i=1; i<=totalPages; i++) {
        if(i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<button class="page-btn" disabled>...</button>`;
        }
    }
    
    html += `<button class="page-btn" onclick="changePage('next')" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>`;
    paginationControls.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════
//  CREATE & UPDATE OPERATION
// ═══════════════════════════════════════════════════════════════════

async function handleFormSubmit(e) {
    e.preventDefault();

    if (!employeeForm.checkValidity()) {
        employeeForm.classList.add('was-validated');
        showToast('Please fill out all required fields correctly.', 'error');
        return;
    }

    const selectedMode = document.querySelector('input[name="workMode"]:checked')?.value || 'Hybrid';

    const payload = {
        name:       nameInput.value.trim(),
        department: deptInput.value,
        role:       roleInput.value.trim(),
        salary:     Number(salaryInput.value),
        joinDate:   dateInput.value,
        workMode:   selectedMode
    };

    const method   = editMode ? 'PUT'  : 'POST';
    const endpoint = editMode ? `${API_URL}/${currentEditId}` : API_URL;

    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

    try {
        const res = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        showToast(editMode ? 'Employee updated successfully!' : 'Employee registered successfully!', 'success');
        resetFormUI();
        await fetchEmployees();
        switchView('directory-view');

    } catch (err) {
        console.error('Save error:', err);
        showToast(`Failed to save: ${err.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = editMode ? 'Update Employee' : 'Save Employee';
    }
}

function editEmployee(id) {
    const emp = allEmployees.find(e => e._id === id);
    if (!emp) return;

    editMode      = true;
    currentEditId = id;

    nameInput.value   = emp.name || '';
    deptInput.value   = emp.department || '';
    roleInput.value   = emp.role || '';
    salaryInput.value = emp.salary || '';
    dateInput.value   = isoDate(emp.joinDate);

    const targetMode = emp.workMode || 'Hybrid';
    const radio = document.querySelector(`input[name="workMode"][value="${targetMode}"]`);
    if (radio) radio.checked = true;

    formTitle.textContent    = 'Edit Employee Record';
    formSubtitle.textContent = 'Update the information details below to edit this member\'s profile.';
    saveBtn.textContent      = 'Update Employee';
    breadcrumbAction.textContent = 'Edit Employee';

    switchView('add-view');
}

// ═══════════════════════════════════════════════════════════════════
//  DELETE OPERATION (CUSTOM OVERLAY MODAL)
// ═══════════════════════════════════════════════════════════════════

function openDeleteModal(id) {
    const emp = allEmployees.find(e => e._id === id);
    if (!emp) return;

    deleteTargetId = id;
    
    deleteModalName.textContent = emp.name;
    deleteModalRole.textContent = `${emp.department} • ${emp.role}`;
    
    const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    deleteModalAvatar.textContent = initials;

    deleteModal.classList.remove('d-none');
}

function closeDeleteModal() {
    deleteModal.classList.add('d-none');
    deleteTargetId = null;
}

async function confirmDeleteEmployee() {
    if (!deleteTargetId) return;

    try {
        const res = await fetch(`${API_URL}/${deleteTargetId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        closeDeleteModal();
        showToast('Employee record deleted successfully.', 'success');
        await fetchEmployees();
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Failed to delete employee.', 'error');
    }
}

function cancelForm() {
    resetFormUI();
    switchView('directory-view');
}

function resetFormUI() {
    employeeForm.reset();
    employeeForm.classList.remove('was-validated');
    editMode      = false;
    currentEditId = null;
    formTitle.textContent    = 'Add New Employee';
    formSubtitle.textContent = 'Complete the information below to register a new member to the enterprise suite.';
    saveBtn.textContent      = 'Save Employee';
    breadcrumbAction.textContent = 'Add New Employee';
}

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleString('default', { month: 'short', day: '2-digit', year: 'numeric' });
}

function isoDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toISOString().split('T')[0];
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getTimeAgo(dateStr) {
    if (!dateStr) return 'some time ago';
    const d = new Date(dateStr);
    if (isNaN(d)) return 'some time ago';
    
    const diffMs = new Date() - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        return diffHrs <= 0 ? 'just joined' : `${diffHrs} hours ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 30) {
        return `${diffDays} days ago`;
    } else {
        const diffMonths = Math.floor(diffDays / 30);
        return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    const svgIcon = type === 'success' 
        ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

    toast.innerHTML = `${svgIcon}<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ═══════════════════════════════════════════════════════════════════
//  DYNAMIC DROPDOWNS & HEADER SYNC
// ═══════════════════════════════════════════════════════════════════

function populateSelectOptions() {
    const deptFilter = document.getElementById('departmentFilter');
    const deptSelect = document.getElementById('department');
    const roleSelect = document.getElementById('role');

    if (deptFilter && window.nexusConfig.allowedDepartments) {
        const currentVal = deptFilter.value;
        deptFilter.innerHTML = '<option value="">All Departments</option>';
        window.nexusConfig.allowedDepartments.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept;
            deptFilter.appendChild(opt);
        });
        deptFilter.value = currentVal;
    }

    if (deptSelect && window.nexusConfig.allowedDepartments) {
        const currentVal = deptSelect.value;
        deptSelect.innerHTML = '<option value="" disabled selected>Select Department</option>';
        window.nexusConfig.allowedDepartments.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept;
            opt.textContent = dept;
            deptSelect.appendChild(opt);
        });
        deptSelect.value = currentVal;
    }

    if (roleSelect && window.nexusConfig.allowedRoles) {
        const currentVal = roleSelect.value;
        roleSelect.innerHTML = '<option value="" disabled selected>Select Role</option>';
        window.nexusConfig.allowedRoles.forEach(role => {
            const opt = document.createElement('option');
            opt.value = role;
            opt.textContent = role;
            roleSelect.appendChild(opt);
        });
        roleSelect.value = currentVal;
    }
}

function syncHeaderState(name, role) {
    const sidebarName = document.getElementById('sidebar-profile-name');
    const sidebarRole = document.getElementById('sidebar-profile-role');
    const sidebarAvatar = document.getElementById('sidebar-profile-avatar');
    const topbarName = document.getElementById('topbar-profile-name');
    const topbarRole = document.getElementById('topbar-profile-role');

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarRole && role) sidebarRole.textContent = role;
    if (topbarName) topbarName.textContent = name;
    if (topbarRole && role) topbarRole.textContent = role;

    if (sidebarAvatar && name) {
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        sidebarAvatar.textContent = initials;
    }
}

// ═══════════════════════════════════════════════════════════════════
//  SUITE SETTINGS VIEW LOGIC & TAG CHIP MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

let tempDepartments = [];
let tempRoles = [];

function loadSettingsView() {
    if (!currentAdmin) return;

    // Populate profile form fields
    document.getElementById('adminName').value = currentAdmin.name || '';
    document.getElementById('adminEmail').value = currentAdmin.email || '';

    // Clear password change fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';

    // Reset password strength indicator
    document.getElementById('pwdStrengthBar').style.width = '0%';
    document.getElementById('pwdStrengthText').textContent = '';

    // Load dynamic defaults from config
    tempDepartments = [...(window.nexusConfig.allowedDepartments || [])];
    tempRoles = [...(window.nexusConfig.allowedRoles || [])];

    // Render Tag Containers
    renderDeptTags();
    renderRoleTags();

    // Sync Experimental settings status
    updateAntigravityUI(!!window.nexusConfig.antigravityEnabled);
}

function renderDeptTags() {
    const container = document.getElementById('deptTagContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (tempDepartments.length === 0) {
        container.innerHTML = '<span class="text-muted small py-1">No departments added.</span>';
        return;
    }

    tempDepartments.forEach((dept, index) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `
            <span>${escHtml(dept)}</span>
            <button type="button" class="tag-chip-remove" onclick="handleRemoveDept(${index})" title="Remove department">×</button>
        `;
        container.appendChild(chip);
    });
}

function renderRoleTags() {
    const container = document.getElementById('roleTagContainer');
    if (!container) return;
    container.innerHTML = '';

    if (tempRoles.length === 0) {
        container.innerHTML = '<span class="text-muted small py-1">No roles added.</span>';
        return;
    }

    tempRoles.forEach((role, index) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `
            <span>${escHtml(role)}</span>
            <button type="button" class="tag-chip-remove" onclick="handleRemoveRole(${index})" title="Remove role">×</button>
        `;
        container.appendChild(chip);
    });
}

window.handleAddDept = function() {
    const input = document.getElementById('newDeptInput');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;

    if (tempDepartments.includes(value)) {
        showToast('Department is already in allowed list.', 'error');
        return;
    }

    tempDepartments.push(value);
    input.value = '';
    renderDeptTags();
};

window.handleRemoveDept = function(index) {
    if (index >= 0 && index < tempDepartments.length) {
        tempDepartments.splice(index, 1);
        renderDeptTags();
    }
};

window.handleAddRole = function() {
    const input = document.getElementById('newRoleInput');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;

    if (tempRoles.includes(value)) {
        showToast('Role is already in allowed list.', 'error');
        return;
    }

    tempRoles.push(value);
    input.value = '';
    renderRoleTags();
};

window.handleRemoveRole = function(index) {
    if (index >= 0 && index < tempRoles.length) {
        tempRoles.splice(index, 1);
        renderRoleTags();
    }
};

// ═══════════════════════════════════════════════════════════════════
//  SAVE OPERATIONS (SETTINGS & PASSWORD)
// ═══════════════════════════════════════════════════════════════════

async function saveAdminProfile() {
    const name = document.getElementById('adminName').value.trim();
    const email = document.getElementById('adminEmail').value.trim();

    if (!name || !email) {
        throw new Error('Full Name and Email Address are required fields.');
    }

    if (tempDepartments.length === 0) {
        throw new Error('Application defaults must configure at least one allowed department.');
    }

    if (tempRoles.length === 0) {
        throw new Error('Application defaults must configure at least one allowed role.');
    }

    const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name,
            email,
            allowedDepartments: tempDepartments,
            allowedRoles: tempRoles
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Failed to update administrator profile.');
    }

    currentAdmin = data;
    window.nexusConfig.allowedDepartments = data.allowedDepartments || [];
    window.nexusConfig.allowedRoles = data.allowedRoles || [];

    syncHeaderState(data.name, data.role);
    populateSelectOptions();

    // Re-verify session to update local cache
    const SESSION_KEY = 'nexus_admin_session';
    const sessionData = {
        user: data.name,
        role: data.role,
        email: data.email,
        timestamp: Date.now()
    };
    if (localStorage.getItem(SESSION_KEY)) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
}

async function saveAdminPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('All password change form fields are required.');
    }

    if (newPassword !== confirmPassword) {
        throw new Error('Confirm password does not match the new password.');
    }

    if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters in length.');
    }

    const res = await fetch('/api/admin/change-password', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            currentPassword,
            newPassword
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Password update failed.');
    }

    // Reset password change fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('pwdStrengthBar').style.width = '0%';
    document.getElementById('pwdStrengthText').textContent = '';
}

window.saveSettings = async function() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const spinner = document.getElementById('settingsSpinner');

    saveBtn.disabled = true;
    spinner.classList.remove('d-none');

    try {
        // 1. Save Profile Details & Default Tags
        await saveAdminProfile();
        showToast('Admin profile and application defaults saved successfully.', 'success');

        // 2. Save Password change if any field is filled out
        const curPwd = document.getElementById('currentPassword').value;
        const newPwd = document.getElementById('newPassword').value;
        const conPwd = document.getElementById('confirmPassword').value;

        if (curPwd || newPwd || conPwd) {
            await saveAdminPassword();
            showToast('Security password has been updated successfully.', 'success');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        saveBtn.disabled = false;
        spinner.classList.add('d-none');
    }
};

window.cancelSettingsChanges = function() {
    loadSettingsView();
    showToast('Changes discarded. Loaded previous settings.', 'success');
};

// ═══════════════════════════════════════════════════════════════════
//  PASSWORD VISIBILITY & STRENGTH METER
// ═══════════════════════════════════════════════════════════════════

window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);

    if (type === 'text') {
        btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    } else {
        btn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    }
};

window.checkPasswordStrength = function(password) {
    const bar = document.getElementById('pwdStrengthBar');
    const text = document.getElementById('pwdStrengthText');
    if (!bar || !text) return;

    if (!password) {
        bar.style.width = '0%';
        bar.style.backgroundColor = '#E5E7EB';
        text.textContent = '';
        return;
    }

    if (password.length < 6) {
        bar.style.width = '20%';
        bar.style.backgroundColor = '#EF4444'; // Red
        text.textContent = 'Too short (min 6 chars)';
        text.style.color = '#EF4444';
        return;
    }

    let score = 0;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
        bar.style.width = '40%';
        bar.style.backgroundColor = '#F97316'; // Orange
        text.textContent = 'Weak';
        text.style.color = '#F97316';
    } else if (score === 3) {
        bar.style.width = '70%';
        bar.style.backgroundColor = '#EAB308'; // Yellow
        text.textContent = 'Moderate';
        text.style.color = '#EAB308';
    } else {
        bar.style.width = '100%';
        bar.style.backgroundColor = '#10B981'; // Green
        text.textContent = 'Strong';
        text.style.color = '#10B981';
    }
};

// ═══════════════════════════════════════════════════════════════════
//  LOGOUT CONTROLLER
// ═══════════════════════════════════════════════════════════════════

window.handleLogout = async function() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout error:', err);
    }
    const SESSION_KEY = 'nexus_admin_session';
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.replace('/login.html');
};

// ═══════════════════════════════════════════════════════════════════
//  EXPERIMENTAL PREFERENCES (ANTIGRAVITY MODE)
// ═══════════════════════════════════════════════════════════════════

window.toggleAntigravityState = async function() {
    const settingsBtn = document.getElementById('antigravitySettingsBtn');
    const topbarBtn = document.getElementById('antigravityTopbarBtn');
    const spinner = document.getElementById('antigravitySpinner');
    const btnText = document.getElementById('antigravityBtnText');

    const previousState = !!window.nexusConfig.antigravityEnabled;
    const nextState = !previousState;

    // Optimistic UI Update: Toggle layout class instantly
    updateAntigravityUI(nextState);

    // Disable button and show spinner
    if (settingsBtn) settingsBtn.disabled = true;
    if (topbarBtn) topbarBtn.disabled = true;
    if (spinner) spinner.classList.remove('d-none');

    try {
        const response = await fetch('/api/preferences/toggle-antigravity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to toggle preference');
        }

        // Commit updated state
        updateAntigravityUI(!!data.antigravityEnabled);
        showToast(data.antigravityEnabled ? 'Antigravity Mode enabled.' : 'Antigravity Mode disabled.', 'success');
    } catch (err) {
        console.error('Toggle antigravity error:', err);
        // Rollback state on failure
        updateAntigravityUI(previousState);
        showToast('Failed to sync preferences with server.', 'error');
    } finally {
        if (settingsBtn) settingsBtn.disabled = false;
        if (topbarBtn) topbarBtn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
    }
};

window.updateAntigravityUI = function(enabled) {
    window.nexusConfig.antigravityEnabled = enabled;
    const btnText = document.getElementById('antigravityBtnText');
    const settingsBtn = document.getElementById('antigravitySettingsBtn');
    const topbarBtn = document.getElementById('antigravityTopbarBtn');

    if (enabled) {
        document.body.classList.add('antigravity-active');
        if (btnText) btnText.textContent = 'Disable Antigravity';
        if (settingsBtn) {
            settingsBtn.classList.remove('btn-light');
            settingsBtn.classList.add('btn-primary');
        }
        if (topbarBtn) {
            topbarBtn.style.color = 'var(--primary)';
            topbarBtn.style.background = 'var(--primary-light)';
        }
    } else {
        document.body.classList.remove('antigravity-active');
        if (btnText) btnText.textContent = 'Enable Antigravity';
        if (settingsBtn) {
            settingsBtn.classList.remove('btn-primary');
            settingsBtn.classList.add('btn-light');
        }
        if (topbarBtn) {
            topbarBtn.style.color = '';
            topbarBtn.style.background = '';
        }
    }
};


