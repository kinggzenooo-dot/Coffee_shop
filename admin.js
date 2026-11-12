/**
 * The Daily Grind Coffee Shop - Administration & Analytics Portal
 * Fully integrated with Python Flask API Backend (API client abstraction)
 */

document.addEventListener('DOMContentLoaded', async () => {
  
  // ==========================================================================
  // 1. STATE MANAGEMENT
  // ==========================================================================

  let products = [];
  let categories = [];
  let customers = [];
  let orders = [];
  let stockHistory = [];
  let staffAccounts = [];
  let notifications = [];
  let settings = {
    shop_name: 'The Daily Grind Coffee Shop',
    phone: '+1 (555) 019-8822',
    address: '123 Espresso Lane, Caramel Heights, NY 10001',
    currency: '$',
    tax_rate: 8.0,
    low_stock_threshold: 10,
    default_status: 'Preparing'
  };

  const curr = () => settings.currency || '$';

  // Category Icon SVGs
  const categoryIcons = {
    Coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
    'Non-Coffee': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 22H6L4 6h16l-2 16z" /><path d="M14 2L8 6" /><path d="M4 6h16" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="8" y1="15" x2="16" y2="15" /></svg>`,
    Tea: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a3 3 0 0 1 0 6h-1" /><path d="M2 8h16v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8z" /><path d="M6 2c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1zm4 0c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1zm4 0c0 .5-.5 1-1 1s-1-.5-1-1 .5-1 1-1 1 .5 1 1z" /></svg>`,
    Pastries: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 14c2.5-3.5 6-5.5 9-5.5s6.5 2 9 5.5c-3.5 1-6.5 1.5-9 1.5s-5.5-.5-9-1.5z" /><path d="M7 11.5c1.5-1.5 3-2.5 5-2.5s3.5 1 5 2.5" /><path d="M10 9.5c.5-.5 1-.5 2-.5s1.5 0 2 .5" /></svg>`,
    Snacks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3c-4 0-7 2-7 6 0 1 0 2.5 1 3.5L5 20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l-1-7.5c1-1 1-2.5 1-3.5 0-4-3-6-7-6z" /><path d="M8 8c1-1 2-1 4-1s3 0 4 1" /></svg>`,
    Desserts: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 19h20M2 19V11c3-2 6-3 10-3s7 1 10 3v8" /><path d="M12 8V4M10 4h4" /><path d="M2 14c4 1 8-1 12 0s6-1 8 0" /></svg>`,
    'Add-ons': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9" stroke-dasharray="3 3" /></svg>`
  };

  // ==========================================================================
  // 2. DATA LOADERS
  // ==========================================================================

  const loadAllData = async () => {
    try {
      const [prodsData, catsData, custsData, ordsData, histData, staffData, notifsData, settsData] = await Promise.all([
        window.API.getProducts(),
        window.API.getCategories(),
        window.API.getCustomers(),
        window.API.getOrders(),
        window.API.getStockHistory(),
        window.API.getStaff(),
        window.API.getNotifications(),
        window.API.getSettings()
      ]);

      if (Array.isArray(prodsData)) products = prodsData;
      if (Array.isArray(catsData)) categories = catsData;
      if (Array.isArray(custsData)) customers = custsData;
      if (Array.isArray(ordsData)) orders = ordsData;
      if (Array.isArray(histData)) stockHistory = histData;
      if (Array.isArray(staffData)) staffAccounts = staffData;
      if (Array.isArray(notifsData)) notifications = notifsData;
      if (settsData && typeof settsData === 'object') {
        settings = { ...settings, ...settsData };
        populateSettingsFields();
      }

      updateCategoryDropdowns();
      updateNotifBadge();
      renderAllViews();
    } catch (err) {
      console.error('Error loading admin portal data:', err);
    }
  };

  const populateSettingsFields = () => {
    const sName = document.getElementById('set-shop-name');
    const sPhone = document.getElementById('set-phone');
    const sAddr = document.getElementById('set-address');
    const sCurr = document.getElementById('set-currency');
    const sTax = document.getElementById('set-tax-rate');
    const sThresh = document.getElementById('set-low-stock-threshold');
    const sStat = document.getElementById('set-default-status');

    if (sName) sName.value = settings.shop_name || '';
    if (sPhone) sPhone.value = settings.phone || '';
    if (sAddr) sAddr.value = settings.address || '';
    if (sCurr) sCurr.value = settings.currency || '$';
    if (sTax) sTax.value = settings.tax_rate ?? 8.0;
    if (sThresh) sThresh.value = settings.low_stock_threshold ?? 10;
    if (sStat) sStat.value = settings.default_status || 'Preparing';
  };

  const updateCategoryDropdowns = () => {
    const prodCatSelect = document.getElementById('prod-category');
    if (prodCatSelect && categories.length > 0) {
      const currentVal = prodCatSelect.value;
      prodCatSelect.innerHTML = categories.map(c => {
        const catName = typeof c === 'string' ? c : c.name;
        return `<option value="${catName}">${catName}</option>`;
      }).join('');
      if (currentVal && categories.some(c => (typeof c === 'string' ? c : c.name) === currentVal)) {
        prodCatSelect.value = currentVal;
      }
    }
  };

  const updateNotifBadge = () => {
    const badge = document.getElementById('admin-notif-count');
    if (!badge) return;
    const unreadCount = notifications.filter(n => n.unread).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
  };


  // ==========================================================================
  // 3. NAVIGATION & ROUTING
  // ==========================================================================

  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : '⚠️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  let currentSection = 'dashboard';
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');
  const sectionTitle = document.getElementById('section-title');
  const sectionSubtext = document.getElementById('section-subtext');

  const titleMappings = {
    dashboard: { title: 'Dashboard', sub: 'System-wide Sales Overview & Store Management' },
    orders: { title: 'Orders', sub: 'Order Management & Fulfillment Tracking' },
    customers: { title: 'Customers', sub: 'Customer Directory & Loyalty Management' },
    products: { title: 'Products', sub: 'Product Catalog Management & Pricing' },
    categories: { title: 'Categories', sub: 'Menu Category Organization' },
    inventory: { title: 'Inventory', sub: 'Stock Control & Inventory Log' },
    sales: { title: 'Sales', sub: 'Sales Analytics & Revenue Breakdown' },
    reports: { title: 'Reports', sub: 'Management Reports & PDF/CSV Export' },
    'product-performance': { title: 'Product Performance', sub: 'Sales Leaderboards & Ranking' },
    'staff-users': { title: 'Staff / Users', sub: 'User Accounts & Access Control' },
    notifications: { title: 'Notifications', sub: 'System Alerts & Inventory Triggers' },
    settings: { title: 'Settings', sub: 'Coffee Shop System Configurations' }
  };

  const switchSection = (target) => {
    currentSection = target;
    navItems.forEach(item => {
      if (item.getAttribute('data-target') === target) {
        item.classList.add('active');
        item.setAttribute('aria-current', 'page');
      } else {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
      }
    });

    sections.forEach(section => {
      if (section.getAttribute('id') === `sect-${target}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    if (titleMappings[target]) {
      if (sectionTitle) sectionTitle.textContent = titleMappings[target].title;
      if (sectionSubtext) sectionSubtext.textContent = titleMappings[target].sub;
    }

    if (target === 'dashboard') renderDashboard();
    if (target === 'orders') renderAdminOrders();
    if (target === 'customers') renderAdminCustomers();
    if (target === 'products') renderAdminProducts();
    if (target === 'categories') renderAdminCategories();
    if (target === 'inventory') renderAdminInventory();
    if (target === 'sales') renderSalesAnalytics();
    if (target === 'reports') generateReportPreview();
    if (target === 'product-performance') renderSalesAnalytics();
    if (target === 'staff-users') renderStaffUsers();
    if (target === 'notifications') renderNotifications();
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target) switchSection(target);
    });
  });

  // Logout button
  document.getElementById('btn-logout-sidebar')?.addEventListener('click', () => {
    showToast('Logging out of administrator session...', 'success');
    sessionStorage.clear();
    localStorage.removeItem('tgd_current_user');
    localStorage.removeItem('dailygrind_current_user');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 800);
  });

  // User shortcut display
  const sessionUser = JSON.parse(
    localStorage.getItem('tgd_current_user') || 
    localStorage.getItem('dailygrind_current_user') || 
    sessionStorage.getItem('tgd_current_user')
  );
  if (sessionUser && sessionUser.name) {
    const userShortcutName = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    const avatarEl = document.querySelector('.avatar.admin-avatar');
    if (userShortcutName) userShortcutName.textContent = sessionUser.name;
    if (userRoleEl) userRoleEl.textContent = 'Super Administrator';
    if (avatarEl) avatarEl.textContent = sessionUser.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
  }


  // ==========================================================================
  // 4. MODULE 1: DASHBOARD
  // ==========================================================================

  const renderDashboard = () => {
    const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled');
    const totalSales = nonCancelledOrders.reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0), 0);
    const totalOrdersCount = orders.length;
    const completedOrdersCount = orders.filter(o => o.status === 'Completed').length;
    const avgOrderVal = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;

    if (document.getElementById('dash-total-sales')) document.getElementById('dash-total-sales').textContent = `${curr()}${totalSales.toFixed(2)}`;
    if (document.getElementById('dash-total-orders')) document.getElementById('dash-total-orders').textContent = totalOrdersCount;
    if (document.getElementById('dash-avg-order-val')) document.getElementById('dash-avg-order-val').textContent = `${curr()}${avgOrderVal.toFixed(2)}`;
    if (document.getElementById('dash-completed-orders')) document.getElementById('dash-completed-orders').textContent = completedOrdersCount;

    // Product performance map
    const rankingTbody = document.getElementById('dash-product-ranking-tbody');
    const productSalesMap = {};
    const categorySalesMap = {};

    nonCancelledOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (!productSalesMap[item.name]) {
          productSalesMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
        }
        const qty = item.qty || 1;
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        productSalesMap[item.name].qty += qty;
        productSalesMap[item.name].revenue += price * qty;

        const prodObj = products.find(pr => pr.name.toLowerCase() === item.name.toLowerCase());
        const cat = prodObj ? prodObj.category : 'Coffee';
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + qty;
      });
    });

    const sortedProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty);
    const topProd = sortedProducts[0] ? sortedProducts[0].name : (products[0]?.name || 'Signature Espresso');
    const topCat = Object.entries(categorySalesMap).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Coffee';

    if (document.getElementById('dash-best-product')) document.getElementById('dash-best-product').textContent = topProd;
    if (document.getElementById('dash-top-category')) document.getElementById('dash-top-category').textContent = topCat;

    if (rankingTbody) {
      if (sortedProducts.length === 0) {
        rankingTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--color-text-muted);">No sales recorded yet.</td></tr>`;
      } else {
        rankingTbody.innerHTML = sortedProducts.slice(0, 5).map((p, idx) => {
          const prodObj = products.find(pr => pr.name.toLowerCase() === p.name.toLowerCase());
          const category = prodObj ? prodObj.category : 'Coffee';
          return `
            <tr>
              <td><strong>#${idx + 1}</strong></td>
              <td>${p.name}</td>
              <td>${category}</td>
              <td>${p.qty} units</td>
              <td><strong>${curr()}${p.revenue.toFixed(2)}</strong></td>
            </tr>
          `;
        }).join('');
      }
    }

    // Inventory status counts
    const lowThreshold = settings.low_stock_threshold || 10;
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock < lowThreshold).length;
    const outOfStockCount = products.filter(p => p.stock === 0 || !p.inStock).length;

    if (document.getElementById('dash-inv-total')) document.getElementById('dash-inv-total').textContent = products.length;
    if (document.getElementById('dash-inv-low')) document.getElementById('dash-inv-low').textContent = lowStockCount;
    if (document.getElementById('dash-inv-out')) document.getElementById('dash-inv-out').textContent = outOfStockCount;

    // Customers total and top spender
    if (document.getElementById('dash-cust-total')) document.getElementById('dash-cust-total').textContent = customers.length;
    if (document.getElementById('dash-cust-new')) document.getElementById('dash-cust-new').textContent = Math.min(customers.length, 3);
    
    const sortedCusts = [...customers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
    const topCustomer = sortedCusts[0];
    const topCustBox = document.getElementById('dash-top-customer-box');
    if (topCustBox) {
      if (topCustomer) {
        const initials = (topCustomer.name || 'Member').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        topCustBox.innerHTML = `
          <div class="spotlight-left">
            <div class="spotlight-avatar">${initials}</div>
            <div>
              <span class="pill-lbl" style="color:var(--color-accent-light);">TOP SPENDING MEMBER</span>
              <h4 style="margin:2px 0 0; color:#fff;">${topCustomer.name}</h4>
              <span style="font-size:0.75rem; opacity:0.8;">Total Spent: ${curr()}${(topCustomer.totalSpend || 0).toFixed(2)} • Points: ${topCustomer.points || 0}</span>
            </div>
          </div>
          <span class="tier-badge gold">${topCustomer.tier || 'Standard Member'}</span>
        `;
      } else {
        topCustBox.innerHTML = `<p style="color:var(--color-text-muted); margin:0;">No customer accounts registered yet.</p>`;
      }
    }

    // Activity feed
    const feed = document.getElementById('dash-activity-feed');
    if (feed) {
      const recentOrders = orders.slice(0, 4);
      if (recentOrders.length === 0) {
        feed.innerHTML = `<p style="color:var(--color-text-muted); font-size:0.875rem;">No recent activities logged.</p>`;
      } else {
        feed.innerHTML = recentOrders.map(o => {
          const totalVal = typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0;
          return `
            <div class="activity-item">
              <div class="act-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg></div>
              <div class="act-details">
                <span class="act-title">Order ${o.id} (${o.status}) - ${o.customerName || 'Walk-in'}</span>
                <span class="act-time">${o.date || 'Today'} &bull; ${curr()}${totalVal.toFixed(2)}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  };

  // Dashboard quick links
  document.getElementById('dash-link-product-perf')?.addEventListener('click', () => switchSection('product-performance'));
  document.getElementById('dash-link-inventory')?.addEventListener('click', () => switchSection('inventory'));
  document.getElementById('dash-link-customers')?.addEventListener('click', () => switchSection('customers'));


  // ==========================================================================
  // 5. MODULE 2: ORDERS MANAGEMENT
  // ==========================================================================

  let adminOrderSearch = '';
  let adminOrderStatusFilter = 'all';

  const renderAdminOrders = () => {
    const tableBody = document.getElementById('admin-orders-table-body');
    if (!tableBody) return;

    let filtered = orders.filter(o => {
      const matchesStatus = adminOrderStatusFilter === 'all' || o.status === adminOrderStatusFilter;
      const matchesSearch = (o.id || '').toLowerCase().includes(adminOrderSearch.toLowerCase()) || 
                            (o.customerName || '').toLowerCase().includes(adminOrderSearch.toLowerCase()) ||
                            (o.date || '').toLowerCase().includes(adminOrderSearch.toLowerCase()) ||
                            (o.paymentMethod || '').toLowerCase().includes(adminOrderSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:28px; color:var(--color-text-muted);">No orders match current filter criteria.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(o => {
      const itemsSummary = (o.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ') || 'No items';
      const isPOS = (o.channel || '').includes('POS');
      const totalNum = typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0;

      return `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td>${o.date || 'Today'}</td>
          <td>${o.customerName || 'Walk-in'}</td>
          <td><span class="channel-tag ${isPOS ? 'pos' : 'online'}">${isPOS ? 'POS' : 'Online'}</span></td>
          <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemsSummary}">${itemsSummary}</td>
          <td><strong>${curr()}${totalNum.toFixed(2)}</strong></td>
          <td>${o.paymentMethod || 'Cash'}</td>
          <td><span class="status-badge ${(o.status || 'pending').toLowerCase()}">${o.status}</span></td>
          <td>
            <div class="table-actions-cell">
              <select class="status-select-sm admin-order-status-sel" data-id="${o.id}">
                <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                <option value="Ready" ${o.status === 'Ready' ? 'selected' : ''}>Ready</option>
                <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
              <button class="btn-sm btn-outline btn-view-admin-order" data-id="${o.id}">View</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('.admin-order-status-sel').forEach(select => {
      select.addEventListener('change', async () => {
        const orderId = select.getAttribute('data-id');
        const newStatus = select.value;
        const res = await window.API.updateOrderStatus(orderId, newStatus);
        if (res && res.status === 'success') {
          const ord = orders.find(o => o.id === orderId);
          if (ord) ord.status = newStatus;
          renderAdminOrders();
          renderDashboard();
          showToast(`Order ${orderId} updated to ${newStatus}.`, 'success');
        } else {
          showToast(`Failed to update order status.`, 'warning');
        }
      });
    });

    tableBody.querySelectorAll('.btn-view-admin-order').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-id');
        const ord = orders.find(o => o.id === orderId);
        if (ord) openAdminOrderModal(ord);
      });
    });
  };

  document.getElementById('admin-order-search')?.addEventListener('input', (e) => {
    adminOrderSearch = e.target.value;
    renderAdminOrders();
  });

  document.querySelectorAll('#admin-order-status-tabs .status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#admin-order-status-tabs .status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      adminOrderStatusFilter = tab.getAttribute('data-status');
      renderAdminOrders();
    });
  });

  // ADMIN ORDER DETAILS MODAL
  const adminOrderModal = document.getElementById('admin-order-details-modal');
  const btnCloseAdminOrder = document.getElementById('btn-close-admin-order-modal');

  const openAdminOrderModal = (order) => {
    const idEl = document.getElementById('admin-detail-modal-order-id');
    const badgeEl = document.getElementById('admin-detail-modal-status-badge');
    const bodyEl = document.getElementById('admin-order-details-body');

    if (idEl) idEl.textContent = `Order ${order.id}`;
    if (badgeEl) {
      badgeEl.className = `status-badge ${(order.status || 'pending').toLowerCase()}`;
      badgeEl.textContent = order.status;
    }

    const totalNum = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
    const subtotalNum = typeof order.subtotal === 'number' ? order.subtotal : parseFloat(order.subtotal) || 0;
    const discountNum = typeof order.discount === 'number' ? order.discount : parseFloat(order.discount) || 0;
    const taxNum = typeof order.tax === 'number' ? order.tax : parseFloat(order.tax) || 0;

    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <span style="font-size:0.75rem; color: var(--color-text-muted); font-weight:700; text-transform:uppercase;">Customer & Channel</span>
            <h4 style="margin: 4px 0 2px;">${order.customerName || 'Walk-in Customer'}</h4>
            <span style="font-size:0.85rem; color: var(--color-text-muted);">Channel: <strong>${order.channel || 'POS Register'}</strong></span>
          </div>
          <div>
            <span style="font-size:0.75rem; color: var(--color-text-muted); font-weight:700; text-transform:uppercase;">Order Metadata</span>
            <p style="margin: 4px 0 0; font-size:0.85rem;">Date: ${order.date || 'Today'}</p>
            <p style="margin: 2px 0 0; font-size:0.85rem;">Payment: <strong>${order.paymentMethod || 'Cash'}</strong></p>
          </div>
        </div>

        <h4 style="margin-bottom: 10px;">Itemized Purchase Breakdown</h4>
        <div style="border: 1px solid rgba(139,90,43,0.15); border-radius: 8px; overflow:hidden; margin-bottom: 20px;">
          <table class="orders-table" style="margin:0;">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Customizations</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(i => `
                <tr>
                  <td><strong>${i.name}</strong></td>
                  <td>${i.customizations || 'Standard'}</td>
                  <td>${i.qty || 1}</td>
                  <td>${curr()}${(((i.price || 0)) * (i.qty || 1)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content: flex-end;">
          <div style="width: 250px;">
            <div class="billing-row"><span>Subtotal:</span><span>${curr()}${subtotalNum.toFixed(2)}</span></div>
            <div class="billing-row discount-row"><span>Discount:</span><span>-${curr()}${discountNum.toFixed(2)}</span></div>
            <div class="billing-row"><span>Tax:</span><span>${curr()}${taxNum.toFixed(2)}</span></div>
            <div class="billing-divider"></div>
            <div class="billing-row total-row"><span>Total:</span><span>${curr()}${totalNum.toFixed(2)}</span></div>
          </div>
        </div>
      `;
    }

    adminOrderModal?.classList.add('active');
  };

  btnCloseAdminOrder?.addEventListener('click', () => adminOrderModal?.classList.remove('active'));


  // ==========================================================================
  // 6. MODULE 3: CUSTOMER MANAGEMENT
  // ==========================================================================

  let adminCustSearch = '';

  const renderAdminCustomers = () => {
    const grid = document.getElementById('admin-customers-grid');
    if (!grid) return;

    let filtered = customers.filter(c => 
      (c.name || '').toLowerCase().includes(adminCustSearch.toLowerCase()) || 
      (c.email || '').toLowerCase().includes(adminCustSearch.toLowerCase()) || 
      (c.phone || '').includes(adminCustSearch) ||
      (c.tier || '').toLowerCase().includes(adminCustSearch.toLowerCase())
    );

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-muted);">No customers found matching search.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(c => {
      const initials = (c.name || 'Member').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const tierClass = (c.tier || 'standard').toLowerCase().split(' ')[0];
      return `
        <div class="customer-card">
          <div class="cust-card-top">
            <div class="cust-avatar-large">${initials}</div>
            <div class="cust-card-details">
              <h4 class="cust-card-name">${c.name}</h4>
              <span class="cust-card-contact">${c.email}</span>
              <span class="cust-card-contact">${c.phone || 'No phone provided'}</span>
              <span class="tier-badge ${tierClass}">${c.tier || 'Standard Member'}</span>
            </div>
          </div>
          <div class="cust-card-stats">
            <div class="stat-item"><span class="stat-lbl">Points</span><span class="stat-val">${c.points || 0}</span></div>
            <div class="stat-item"><span class="stat-lbl">Spent</span><span class="stat-val">${curr()}${(c.totalSpend || 0).toFixed(2)}</span></div>
            <div class="stat-item"><span class="stat-lbl">Orders</span><span class="stat-val">${c.totalOrders || 0}</span></div>
          </div>
          <div class="cust-card-actions" style="margin-top: 12px; display: flex; gap: 8px;">
            <button class="btn-sm btn-outline btn-admin-cust-history" data-id="${c.id}" style="width: 100%;">View Order History</button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-admin-cust-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const cId = btn.getAttribute('data-id');
        const cust = customers.find(c => c.id === cId);
        if (cust) openAdminCustomerHistoryModal(cust);
      });
    });
  };

  document.getElementById('admin-customer-search')?.addEventListener('input', (e) => {
    adminCustSearch = e.target.value;
    renderAdminCustomers();
  });

  // CUSTOMER HISTORY MODAL
  const adminCustHistoryModal = document.getElementById('admin-customer-history-modal');
  const btnCloseAdminCustHistory = document.getElementById('btn-close-admin-cust-history-modal');

  const openAdminCustomerHistoryModal = (cust) => {
    const nameHeader = document.getElementById('admin-cust-history-modal-name');
    const subHeader = document.getElementById('admin-cust-history-modal-sub');
    const body = document.getElementById('admin-cust-history-modal-body');

    if (nameHeader) nameHeader.textContent = `${cust.name}'s Order History`;
    if (subHeader) subHeader.textContent = `${cust.tier || 'Standard Member'} • Total Lifetime Spent: ${curr()}${(cust.totalSpend || 0).toFixed(2)} • Points: ${cust.points || 0}`;

    const custOrders = orders.filter(o => o.customerId === cust.id || o.customerName === cust.name);

    if (body) {
      if (custOrders.length === 0) {
        body.innerHTML = `<p style="text-align:center; padding: 30px; color: var(--color-text-muted);">No order history found for this customer account.</p>`;
      } else {
        body.innerHTML = `
          <table class="orders-table" style="width:100%;">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Purchased Items</th>
                <th>Total</th>
                <th>Channel</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${custOrders.map(o => {
                const totalNum = typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0;
                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${o.date || 'Today'}</td>
                    <td>${(o.items || []).map(i => `${i.qty || 1}x ${i.name}`).join(', ')}</td>
                    <td><strong>${curr()}${totalNum.toFixed(2)}</strong></td>
                    <td>${o.channel || 'POS'}</td>
                    <td><span class="status-badge ${(o.status || 'pending').toLowerCase()}">${o.status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }

    adminCustHistoryModal?.classList.add('active');
  };

  btnCloseAdminCustHistory?.addEventListener('click', () => adminCustHistoryModal?.classList.remove('active'));

  // ADD CUSTOMER MODAL
  const addCustModal = document.getElementById('add-customer-modal');
  const btnOpenAddCust = document.getElementById('admin-btn-add-customer');
  const btnCloseAddCust = document.getElementById('btn-close-add-cust-modal');
  const btnCancelAddCust = document.getElementById('btn-cancel-add-cust');
  const addCustForm = document.getElementById('add-customer-form');

  btnOpenAddCust?.addEventListener('click', () => {
    if (addCustForm) addCustForm.reset();
    addCustModal?.classList.add('active');
  });
  btnCloseAddCust?.addEventListener('click', () => addCustModal?.classList.remove('active'));
  btnCancelAddCust?.addEventListener('click', () => addCustModal?.classList.remove('active'));

  addCustForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-cust-name')?.value.trim();
    const email = document.getElementById('new-cust-email')?.value.trim();
    const phone = document.getElementById('new-cust-phone')?.value.trim();
    const tier = document.getElementById('new-cust-tier')?.value;

    if (!name || !email) {
      showToast('Please provide both name and email.', 'warning');
      return;
    }

    const res = await window.API.addCustomer({ name, email, phone, tier });
    if (res && res.status === 'success') {
      showToast(`Customer ${name} registered successfully!`, 'success');
      addCustModal?.classList.remove('active');
      const updatedCusts = await window.API.getCustomers();
      if (updatedCusts) customers = updatedCusts;
      renderAdminCustomers();
      renderDashboard();
    } else {
      showToast(res?.message || 'Error registering customer.', 'warning');
    }
  });


  // ==========================================================================
  // 7. MODULE 4: PRODUCTS MANAGEMENT (CRUD)
  // ==========================================================================

  let adminProdSearch = '';

  const renderAdminProducts = () => {
    const tbody = document.getElementById('admin-products-table-body');
    if (!tbody) return;

    let filtered = products.filter(p => 
      (p.name || '').toLowerCase().includes(adminProdSearch.toLowerCase()) ||
      (p.desc || '').toLowerCase().includes(adminProdSearch.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(adminProdSearch.toLowerCase())
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:28px; color:var(--color-text-muted);">No products found matching "${adminProdSearch}".</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const hasImg = Boolean(p.image && p.image.trim() !== '');
      const visualThumb = hasImg
        ? `<img src="${p.image}" class="admin-prod-thumb" alt="${p.name}">`
        : `<div class="pos-card-img" style="width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:6px; background:rgba(218,165,32,0.1); color:var(--color-accent);">${categoryIcons[p.category] || categoryIcons['Coffee']}</div>`;

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              ${visualThumb}
              <div><strong>${p.name}</strong><br><span style="font-size:0.75rem; color:var(--color-text-muted);">${p.desc || ''}</span></div>
            </div>
          </td>
          <td>${p.category || 'General'}</td>
          <td><strong>${curr()}${parseFloat(p.price).toFixed(2)}</strong></td>
          <td>${p.stock || 0} units</td>
          <td>
            <span class="item-options-text">${p.hasMilk ? 'Milk' : ''} ${p.hasSweetness ? 'Sweetness' : ''}</span>
          </td>
          <td>
            <span class="stock-tag ${p.inStock ? 'in-stock' : 'out-stock'}">${p.inStock ? 'Active' : 'Deactivated'}</span>
          </td>
          <td>
            <div class="table-actions-cell">
              <button class="btn-sm btn-outline btn-edit-prod" data-id="${p.id}">Edit</button>
              <button class="btn-sm btn-outline btn-toggle-prod" data-id="${p.id}">${p.inStock ? 'Deactivate' : 'Activate'}</button>
              <button class="btn-sm btn-outline btn-delete-prod" data-id="${p.id}" style="color:var(--color-danger); border-color:rgba(239,68,68,0.3);">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-edit-prod').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-id');
        const prod = products.find(p => p.id === pId);
        if (prod) openProductModal(prod);
      });
    });

    tbody.querySelectorAll('.btn-toggle-prod').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pId = btn.getAttribute('data-id');
        const res = await window.API.toggleProductStock(pId);
        if (res && res.status === 'success') {
          const prod = products.find(p => p.id === pId);
          if (prod) prod.inStock = res.in_stock;
          renderAdminProducts();
          renderAdminInventory();
          renderDashboard();
          showToast(`Product status updated.`, 'success');
        } else {
          showToast('Failed to update product status.', 'warning');
        }
      });
    });

    tbody.querySelectorAll('.btn-delete-prod').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pId = btn.getAttribute('data-id');
        const prod = products.find(p => p.id === pId);
        if (!prod) return;
        if (confirm(`Are you sure you want to permanently delete "${prod.name}"?`)) {
          const res = await window.API.deleteProduct(pId);
          if (res && res.status === 'success') {
            products = products.filter(p => p.id !== pId);
            renderAdminProducts();
            renderAdminInventory();
            renderAdminCategories();
            renderDashboard();
            showToast(`Product "${prod.name}" removed from catalog.`, 'info');
          } else {
            showToast('Failed to delete product.', 'warning');
          }
        }
      });
    });
  };

  document.getElementById('admin-product-search')?.addEventListener('input', (e) => {
    adminProdSearch = e.target.value;
    renderAdminProducts();
  });

  // ADD/EDIT PRODUCT MODAL & IMAGE UPLOADER
  const prodModal = document.getElementById('admin-product-modal');
  const btnOpenAddProd = document.getElementById('admin-btn-open-add-product');
  const btnCloseProdModal = document.getElementById('btn-close-prod-modal');
  const btnCancelProdModal = document.getElementById('btn-cancel-prod-modal');
  const prodForm = document.getElementById('admin-product-form');

  const prodImgData = document.getElementById('prod-image-data');
  const prodImgFile = document.getElementById('prod-image-file');
  const prodImgUrl = document.getElementById('prod-image-url');
  const prodImgPreviewWrap = document.getElementById('prod-img-preview-wrap');
  const prodImgPreview = document.getElementById('prod-img-preview');
  const btnRemoveProdImg = document.getElementById('btn-remove-prod-img');

  const setProductImagePreview = (src) => {
    if (src && src.trim() !== '') {
      if (prodImgData) prodImgData.value = src;
      if (prodImgPreview) prodImgPreview.src = src;
      if (prodImgPreviewWrap) prodImgPreviewWrap.style.display = 'block';
    } else {
      if (prodImgData) prodImgData.value = '';
      if (prodImgUrl) prodImgUrl.value = '';
      if (prodImgFile) prodImgFile.value = '';
      if (prodImgPreview) prodImgPreview.src = '';
      if (prodImgPreviewWrap) prodImgPreviewWrap.style.display = 'none';
    }
  };

  // Compress and resize image file to lightweight WebP/JPEG data URL
  const compressImageFile = (file, maxDim = 600, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Image File selection with auto-compression
  prodImgFile?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setProductImagePreview(dataUrl);
      if (prodImgUrl) prodImgUrl.value = '';
    } catch (err) {
      console.warn('Error reading image file:', err);
    }
  });

  // Image URL input
  prodImgUrl?.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url) {
      setProductImagePreview(url);
    } else {
      setProductImagePreview('');
    }
  });

  // Remove image
  btnRemoveProdImg?.addEventListener('click', () => {
    setProductImagePreview('');
  });


  const openProductModal = (prod = null) => {
    if (prodForm) prodForm.reset();
    updateCategoryDropdowns();
    if (prod) {
      document.getElementById('admin-prod-modal-title').textContent = 'Edit Product';
      document.getElementById('edit-prod-id').value = prod.id;
      document.getElementById('prod-name').value = prod.name;
      document.getElementById('prod-category').value = prod.category;
      document.getElementById('prod-price').value = prod.price;
      document.getElementById('prod-stock-count').value = prod.stock;
      document.getElementById('prod-desc').value = prod.desc || '';
      document.getElementById('prod-has-milk').checked = !!prod.hasMilk;
      document.getElementById('prod-has-sweetness').checked = !!prod.hasSweetness;
      if (prodImgUrl) prodImgUrl.value = prod.image && !prod.image.startsWith('data:') ? prod.image : '';
      setProductImagePreview(prod.image || '');
    } else {
      document.getElementById('admin-prod-modal-title').textContent = 'Add New Product';
      document.getElementById('edit-prod-id').value = '';
      setProductImagePreview('');
    }
    prodModal?.classList.add('active');
  };

  btnOpenAddProd?.addEventListener('click', () => openProductModal(null));
  btnCloseProdModal?.addEventListener('click', () => prodModal?.classList.remove('active'));
  btnCancelProdModal?.addEventListener('click', () => prodModal?.classList.remove('active'));

  prodForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('edit-prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const category = document.getElementById('prod-category').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock-count').value);
    const desc = document.getElementById('prod-desc').value.trim();
    const hasMilk = document.getElementById('prod-has-milk').checked;
    const hasSweetness = document.getElementById('prod-has-sweetness').checked;
    const image = prodImgData ? prodImgData.value.trim() : '';

    if (!name || isNaN(price) || isNaN(stock)) {
      showToast('Please fill all required product fields.', 'warning');
      return;
    }

    const payload = {
      name,
      category,
      price,
      stock,
      desc,
      hasMilk,
      hasSweetness,
      image,
      inStock: stock > 0
    };

    if (editId) {
      const res = await window.API.updateProduct(editId, payload);
      if (res && res.status === 'success') {
        const prod = products.find(p => p.id === editId);
        if (prod) Object.assign(prod, payload);
        showToast(`Product "${name}" updated successfully!`, 'success');
      } else {
        showToast('Error updating product.', 'warning');
      }
    } else {
      const res = await window.API.addProduct(payload);
      if (res && res.status === 'success') {
        payload.id = res.id;
        products.push(payload);
        showToast(`Product "${name}" added to menu catalog!`, 'success');
      } else {
        showToast('Error adding product.', 'warning');
      }
    }

    // Refresh products list from server
    const updated = await window.API.getProducts();
    if (updated) products = updated;
    renderAdminProducts();
    renderAdminInventory();
    renderAdminCategories();
    renderDashboard();
    prodModal?.classList.remove('active');
  });


  // ==========================================================================
  // 8. MODULE 5: CATEGORIES MANAGEMENT
  // ==========================================================================

  const renderAdminCategories = () => {
    const grid = document.getElementById('admin-categories-grid');
    if (!grid) return;

    if (categories.length === 0) {
      grid.innerHTML = `<p style="color:var(--color-text-muted); grid-column:1/-1;">No menu categories configured.</p>`;
      return;
    }

    grid.innerHTML = categories.map(c => {
      const catName = typeof c === 'string' ? c : c.name;
      const itemCount = products.filter(p => p.category === catName).length;
      return `
        <div class="category-card">
          <div class="cat-card-left">
            <div class="cat-icon-box" style="width:40px; height:40px; border-radius:8px; background:rgba(218,165,32,0.1); color:var(--color-accent); display:flex; align-items:center; justify-content:center;">${categoryIcons[catName] || categoryIcons['Coffee']}</div>
            <div>
              <h4 class="cat-card-title">${catName}</h4>
              <span class="cat-card-count">${itemCount} Products</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="stock-tag in-stock">${c.status || 'Active'}</span>
            <button class="btn-sm btn-outline btn-delete-cat" data-id="${c.id || catName}" style="color:var(--color-danger); border-color:rgba(239,68,68,0.3); padding:4px 8px;">&times;</button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-delete-cat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catId = btn.getAttribute('data-id');
        if (confirm(`Delete category "${catId}"? Items in this category will remain in catalog.`)) {
          const res = await window.API.deleteCategory(catId);
          if (res && res.status === 'success') {
            categories = categories.filter(c => (c.id !== catId && c.name !== catId && c !== catId));
            updateCategoryDropdowns();
            renderAdminCategories();
            showToast(`Category removed.`, 'info');
          } else {
            showToast('Failed to delete category.', 'warning');
          }
        }
      });
    });
  };

  // ADD CATEGORY MODAL
  const catModal = document.getElementById('admin-category-modal');
  const btnOpenAddCat = document.getElementById('admin-btn-open-add-category');
  const btnCloseCat = document.getElementById('btn-close-cat-modal');
  const btnCancelCat = document.getElementById('btn-cancel-cat-modal');
  const catForm = document.getElementById('admin-category-form');

  btnOpenAddCat?.addEventListener('click', () => {
    if (catForm) catForm.reset();
    catModal?.classList.add('active');
  });
  btnCloseCat?.addEventListener('click', () => catModal?.classList.remove('active'));
  btnCancelCat?.addEventListener('click', () => catModal?.classList.remove('active'));

  catForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cat-name')?.value.trim();
    if (!name) return;

    const res = await window.API.addCategory(name);
    if (res && res.status === 'success') {
      showToast(`Category "${name}" created!`, 'success');
      catModal?.classList.remove('active');
      const updatedCats = await window.API.getCategories();
      if (updatedCats) categories = updatedCats;
      updateCategoryDropdowns();
      renderAdminCategories();
    } else {
      showToast(res?.message || 'Error adding category.', 'warning');
    }
  });


  // ==========================================================================
  // 9. MODULE 6: INVENTORY MANAGEMENT
  // ==========================================================================

  let adminInvSearch = '';
  let adminInvFilter = 'all';

  const renderAdminInventory = () => {
    const tbody = document.getElementById('admin-inventory-table-body');
    if (!tbody) return;

    const lowThreshold = settings.low_stock_threshold || 10;
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock < lowThreshold).length;
    const outOfStockCount = products.filter(p => p.stock === 0 || !p.inStock).length;

    if (document.getElementById('inv-total-skus')) document.getElementById('inv-total-skus').textContent = products.length;
    if (document.getElementById('inv-low-skus')) document.getElementById('inv-low-skus').textContent = lowStockCount;
    if (document.getElementById('inv-out-skus')) document.getElementById('inv-out-skus').textContent = outOfStockCount;

    let filtered = products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(adminInvSearch.toLowerCase()) ||
                            (p.category || '').toLowerCase().includes(adminInvSearch.toLowerCase());
      if (adminInvFilter === 'low') return matchesSearch && p.stock > 0 && p.stock < lowThreshold;
      if (adminInvFilter === 'out') return matchesSearch && (p.stock === 0 || !p.inStock);
      return matchesSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:28px; color:var(--color-text-muted);">No inventory items match filter.</td></tr>`;
    } else {
      tbody.innerHTML = filtered.map(p => {
        let statusTag = '<span class="stock-tag in-stock">In Stock</span>';
        if (p.stock === 0 || !p.inStock) statusTag = '<span class="stock-tag out-stock">Out of Stock</span>';
        else if (p.stock < lowThreshold) statusTag = `<span class="stock-tag" style="background:rgba(234,179,8,0.15); color:#ca8a04; font-weight:600;">Low Stock (&lt; ${lowThreshold})</span>`;

        return `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.category || 'General'}</td>
            <td><strong>${p.stock} units</strong></td>
            <td>${statusTag}</td>
            <td>
              <button class="btn-sm btn-outline btn-adjust-stock" data-id="${p.id}">Adjust Stock</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    tbody.querySelectorAll('.btn-adjust-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-id');
        const prod = products.find(p => p.id === pId);
        if (prod) openStockModal(prod);
      });
    });

    // Stock History Table
    const histTbody = document.getElementById('admin-stock-history-tbody');
    if (histTbody) {
      if (stockHistory.length === 0) {
        histTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--color-text-muted);">No stock adjustments logged.</td></tr>`;
      } else {
        histTbody.innerHTML = stockHistory.slice(0, 10).map(h => `
          <tr>
            <td>${h.timestamp}</td>
            <td><strong>${h.product_name || h.productName}</strong></td>
            <td><span class="stock-tag ${h.type === 'Restock' ? 'in-stock' : 'warning-metric'}">${h.type}</span></td>
            <td><strong>${h.qty}</strong></td>
            <td>${h.adjusted_by || h.adjustedBy || 'Admin Director'}</td>
          </tr>
        `).join('');
      }
    }
  };

  document.getElementById('admin-inventory-search')?.addEventListener('input', (e) => {
    adminInvSearch = e.target.value;
    renderAdminInventory();
  });

  document.querySelectorAll('#admin-inventory-filter-tabs .status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#admin-inventory-filter-tabs .status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      adminInvFilter = tab.getAttribute('data-filter');
      renderAdminInventory();
    });
  });

  // STOCK ADJUSTMENT MODAL
  const stockModal = document.getElementById('admin-stock-modal');
  const btnCloseStockModal = document.getElementById('btn-close-stock-modal');
  const btnCancelStockModal = document.getElementById('btn-cancel-stock-modal');
  const stockForm = document.getElementById('admin-stock-form');

  const openStockModal = (prod) => {
    document.getElementById('stock-prod-id').value = prod.id;
    document.getElementById('stock-modal-title').textContent = `Adjust Stock: ${prod.name}`;
    document.getElementById('stock-modal-subtitle').textContent = `Current Stock Level: ${prod.stock} units`;
    document.getElementById('stock-adjust-qty').value = '';
    document.getElementById('stock-adjust-reason').value = '';
    stockModal?.classList.add('active');
  };

  btnCloseStockModal?.addEventListener('click', () => stockModal?.classList.remove('active'));
  btnCancelStockModal?.addEventListener('click', () => stockModal?.classList.remove('active'));

  stockForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pId = document.getElementById('stock-prod-id').value;
    const adjustQty = parseInt(document.getElementById('stock-adjust-qty').value);
    const reason = document.getElementById('stock-adjust-reason').value.trim() || 'Manual adjustment';

    const prod = products.find(p => p.id === pId);
    if (!prod || isNaN(adjustQty)) {
      showToast('Please enter a valid stock quantity adjustment.', 'warning');
      return;
    }

    const res = await window.API.adjustInventory(pId, adjustQty, reason, 'Admin Director');
    if (res && res.status === 'success') {
      const [updatedProds, updatedHist] = await Promise.all([
        window.API.getProducts(),
        window.API.getStockHistory()
      ]);
      if (updatedProds) products = updatedProds;
      if (updatedHist) stockHistory = updatedHist;

      renderAdminInventory();
      renderAdminProducts();
      renderDashboard();
      stockModal?.classList.remove('active');
      showToast(`Updated stock for ${prod.name}.`, 'success');
    } else {
      showToast('Failed to apply stock change.', 'warning');
    }
  });


  // ==========================================================================
  // 10. MODULE 7 & 9: SALES ANALYTICS & PRODUCT PERFORMANCE
  // ==========================================================================

  let adminSalesPeriod = 'today';

  const renderSalesAnalytics = () => {
    const periodSalesEl = document.getElementById('sales-period-total');
    const periodOrdersEl = document.getElementById('sales-period-orders');
    const periodAovEl = document.getElementById('sales-period-aov');
    const periodTopCatEl = document.getElementById('sales-period-top-cat');

    const nonCancelled = orders.filter(o => o.status !== 'Cancelled');
    const totalSales = nonCancelled.reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0), 0);
    const ordersCount = nonCancelled.length;
    const aov = ordersCount > 0 ? totalSales / ordersCount : 0;

    if (periodSalesEl) periodSalesEl.textContent = `${curr()}${totalSales.toFixed(2)}`;
    if (periodOrdersEl) periodOrdersEl.textContent = ordersCount;
    if (periodAovEl) periodAovEl.textContent = `${curr()}${aov.toFixed(2)}`;

    // Category breakdown bars
    const catBars = document.getElementById('sales-category-bars');
    const catRevenue = {};
    let totalItemsRev = 0;

    nonCancelled.forEach(o => {
      (o.items || []).forEach(item => {
        const prodObj = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
        const cat = prodObj ? prodObj.category : 'Coffee';
        const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
        const itemRev = price * (item.qty || 1);
        catRevenue[cat] = (catRevenue[cat] || 0) + itemRev;
        totalItemsRev += itemRev;
      });
    });

    const topCategoryEntry = Object.entries(catRevenue).sort((a,b) => b[1] - a[1])[0];
    if (periodTopCatEl) periodTopCatEl.textContent = topCategoryEntry ? topCategoryEntry[0] : 'Coffee';

    if (catBars) {
      const catEntries = Object.entries(catRevenue);
      if (catEntries.length === 0 || totalItemsRev === 0) {
        catBars.innerHTML = `<p style="color:var(--color-text-muted); font-size:0.875rem;">No sales data available for category chart.</p>`;
      } else {
        catBars.innerHTML = catEntries.map(([catName, rev]) => {
          const pct = Math.round((rev / totalItemsRev) * 100);
          return `
            <div class="chart-bar-item" style="margin-bottom:12px;">
              <div class="bar-label-row" style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
                <span>${catName}</span>
                <span><strong>${pct}%</strong> (${curr()}${rev.toFixed(2)})</span>
              </div>
              <div class="bar-track" style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                <div class="bar-fill" style="width:${pct}%; height:100%; background:var(--color-accent); border-radius:4px;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Channel distribution bars (POS vs Online)
    const channelBars = document.getElementById('sales-channel-bars');
    if (channelBars) {
      let posRev = 0;
      let onlineRev = 0;

      nonCancelled.forEach(o => {
        const tot = typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0;
        if ((o.channel || '').includes('POS')) posRev += tot;
        else onlineRev += tot;
      });

      const grandTotal = posRev + onlineRev;
      if (grandTotal === 0) {
        channelBars.innerHTML = `<p style="color:var(--color-text-muted); font-size:0.875rem;">No channel sales data available.</p>`;
      } else {
        const posPct = Math.round((posRev / grandTotal) * 100);
        const onlinePct = 100 - posPct;
        channelBars.innerHTML = `
          <div class="chart-bar-item" style="margin-bottom:16px;">
            <div class="bar-label-row" style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
              <span>POS Register Terminal</span>
              <span><strong>${posPct}%</strong> (${curr()}${posRev.toFixed(2)})</span>
            </div>
            <div class="bar-track" style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
              <div class="bar-fill" style="width:${posPct}%; height:100%; background:#3b82f6; border-radius:4px;"></div>
            </div>
          </div>
          <div class="chart-bar-item">
            <div class="bar-label-row" style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
              <span>Online Customer Portal</span>
              <span><strong>${onlinePct}%</strong> (${curr()}${onlineRev.toFixed(2)})</span>
            </div>
            <div class="bar-track" style="height:8px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
              <div class="bar-fill" style="width:${onlinePct}%; height:100%; background:#10b981; border-radius:4px;"></div>
            </div>
          </div>
        `;
      }
    }

    // Leaderboard in Product Performance
    const leaderboard = document.getElementById('admin-perf-leaderboard-tbody');
    if (leaderboard) {
      const prodStats = {};
      nonCancelled.forEach(o => {
        (o.items || []).forEach(item => {
          if (!prodStats[item.name]) {
            prodStats[item.name] = { name: item.name, qty: 0, revenue: 0 };
          }
          const qty = item.qty || 1;
          const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
          prodStats[item.name].qty += qty;
          prodStats[item.name].revenue += price * qty;
        });
      });

      const sorted = Object.values(prodStats).sort((a, b) => b.qty - a.qty);
      if (sorted.length === 0) {
        leaderboard.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--color-text-muted);">No sales data available.</td></tr>`;
      } else {
        leaderboard.innerHTML = sorted.map((p, idx) => {
          const prodObj = products.find(pr => pr.name.toLowerCase() === p.name.toLowerCase());
          const cat = prodObj ? prodObj.category : 'General';
          const price = prodObj ? parseFloat(prodObj.price) : (p.revenue / (p.qty || 1));
          return `
            <tr>
              <td><strong>#${idx + 1}</strong></td>
              <td><strong>${p.name}</strong></td>
              <td>${cat}</td>
              <td>${curr()}${price.toFixed(2)}</td>
              <td>${p.qty} units</td>
              <td><strong>${curr()}${p.revenue.toFixed(2)}</strong></td>
              <td><span style="color:#2e7d32; font-weight:700;">★ High Demand</span></td>
            </tr>
          `;
        }).join('');
      }
    }
  };

  document.querySelectorAll('#admin-sales-period-tabs .status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#admin-sales-period-tabs .status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      adminSalesPeriod = tab.getAttribute('data-period');
      renderSalesAnalytics();
    });
  });


  // ==========================================================================
  // 11. MODULE 8: REPORTS GENERATOR & EXPORT
  // ==========================================================================

  const generateReportPreview = () => {
    const reportType = document.getElementById('report-type-select')?.value || 'sales';
    const reportRange = document.getElementById('report-range-select')?.value || 'today';
    const previewTitle = document.getElementById('report-preview-title');
    const container = document.getElementById('report-preview-container');

    const nonCancelled = orders.filter(o => o.status !== 'Cancelled');
    const totalRev = nonCancelled.reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : parseFloat(o.total) || 0), 0);
    const completedCount = orders.filter(o => o.status === 'Completed').length;

    if (previewTitle) {
      previewTitle.textContent = `${reportType.toUpperCase()} Report — ${reportRange.toUpperCase()}`;
    }

    if (!container) return;

    if (reportType === 'sales') {
      container.innerHTML = `
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Channel</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>${o.id}</strong></td>
                <td>${o.date || 'Today'}</td>
                <td>${o.customerName || 'Walk-in'}</td>
                <td>${o.channel || 'POS'}</td>
                <td>${o.paymentMethod || 'Cash'}</td>
                <td><span class="status-badge ${(o.status || 'pending').toLowerCase()}">${o.status}</span></td>
                <td><strong>${curr()}${parseFloat(o.total || 0).toFixed(2)}</strong></td>
              </tr>
            `).join('')}
            <tr style="background:rgba(218,165,32,0.08); font-weight:700;">
              <td colspan="6" style="text-align:right;">Total Period Revenue:</td>
              <td>${curr()}${totalRev.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (reportType === 'inventory') {
      container.innerHTML = `
        <table class="orders-table">
          <thead>
            <tr>
              <th>Product SKU</th>
              <th>Category</th>
              <th>Unit Price</th>
              <th>Current Stock</th>
              <th>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td>${curr()}${parseFloat(p.price).toFixed(2)}</td>
                <td>${p.stock} units</td>
                <td><span class="stock-tag ${p.stock > 0 ? 'in-stock' : 'out-stock'}">${p.stock > 0 ? 'In Stock' : 'Out of Stock'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'customer') {
      container.innerHTML = `
        <table class="orders-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Email</th>
              <th>Membership Tier</th>
              <th>Reward Points</th>
              <th>Total Spent</th>
              <th>Order Count</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.email}</td>
                <td><span class="tier-badge gold">${c.tier || 'Standard Member'}</span></td>
                <td>${c.points || 0} pts</td>
                <td><strong>${curr()}${(c.totalSpend || 0).toFixed(2)}</strong></td>
                <td>${c.totalOrders || 0} orders</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = `
        <table class="orders-table">
          <thead>
            <tr>
              <th>Metric / Audit Item</th>
              <th>Recorded Value</th>
              <th>Status Indicator</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Audited Gross Revenue</td>
              <td><strong>${curr()}${totalRev.toFixed(2)}</strong></td>
              <td><span class="stock-tag in-stock">Audited</span></td>
            </tr>
            <tr>
              <td>Total Order Volume</td>
              <td>${orders.length} orders (${completedCount} completed)</td>
              <td><span class="stock-tag in-stock">Verified</span></td>
            </tr>
            <tr>
              <td>Active Customer Base</td>
              <td>${customers.length} registered accounts</td>
              <td><span class="stock-tag in-stock">Active</span></td>
            </tr>
            <tr>
              <td>Inventory SKU Catalog</td>
              <td>${products.length} menu items</td>
              <td><span class="stock-tag in-stock">Synced</span></td>
            </tr>
          </tbody>
        </table>
      `;
    }
  };

  document.getElementById('btn-generate-report')?.addEventListener('click', () => {
    generateReportPreview();
    showToast('Report generated successfully.', 'success');
  });

  document.getElementById('btn-print-report')?.addEventListener('click', () => {
    window.print();
    showToast('Report sent to printer.', 'info');
  });

  document.getElementById('btn-csv-report')?.addEventListener('click', () => {
    const reportType = document.getElementById('report-type-select')?.value || 'sales';
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'sales') {
      csvContent += 'Order ID,Date,Customer,Channel,Payment,Status,Total\n';
      orders.forEach(o => {
        csvContent += `"${o.id}","${o.date || ''}","${o.customerName || ''}","${o.channel || ''}","${o.paymentMethod || ''}","${o.status || ''}","${o.total || 0}"\n`;
      });
    } else if (reportType === 'inventory') {
      csvContent += 'Product Name,Category,Price,Stock\n';
      products.forEach(p => {
        csvContent += `"${p.name}","${p.category}","${p.price}","${p.stock}"\n`;
      });
    } else {
      csvContent += 'Customer Name,Email,Phone,Tier,Points,Total Spent,Orders\n';
      customers.forEach(c => {
        csvContent += `"${c.name}","${c.email}","${c.phone || ''}","${c.tier || ''}","${c.points || 0}","${c.totalSpend || 0}","${c.totalOrders || 0}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `the_daily_grind_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export downloaded!', 'success');
  });


  // ==========================================================================
  // 12. MODULE 10: STAFF & USERS LOGIC
  // ==========================================================================

  const renderStaffUsers = () => {
    const tbody = document.getElementById('admin-staff-table-body');
    if (!tbody) return;

    if (staffAccounts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--color-text-muted);">No staff accounts found.</td></tr>`;
      return;
    }

    tbody.innerHTML = staffAccounts.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.email}</td>
        <td><span class="tier-badge gold">${s.role}</span></td>
        <td>${s.station || 'Station #01'}</td>
        <td><span class="stock-tag ${s.status === 'Active' ? 'in-stock' : 'out-stock'}">${s.status}</span></td>
        <td>
          <button class="btn-sm btn-outline btn-toggle-staff" data-id="${s.id}">${s.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-toggle-staff').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sId = btn.getAttribute('data-id');
        const res = await window.API.updateStaffStatus(sId);
        if (res && res.status === 'success') {
          const st = staffAccounts.find(s => s.id === sId);
          if (st) st.status = res.status_updated || (st.status === 'Active' ? 'Inactive' : 'Active');
          renderStaffUsers();
          showToast(`Staff account status updated.`, 'success');
        } else {
          showToast('Failed to toggle staff status.', 'warning');
        }
      });
    });
  };

  // ADD STAFF MODAL
  const staffModal = document.getElementById('admin-staff-modal');
  const btnOpenStaff = document.getElementById('admin-btn-add-staff');
  const btnCloseStaff = document.getElementById('btn-close-staff-acc-modal');
  const btnCancelStaff = document.getElementById('btn-cancel-staff-acc');
  const staffForm = document.getElementById('admin-staff-form');

  btnOpenStaff?.addEventListener('click', () => {
    if (staffForm) staffForm.reset();
    staffModal?.classList.add('active');
  });
  btnCloseStaff?.addEventListener('click', () => staffModal?.classList.remove('active'));
  btnCancelStaff?.addEventListener('click', () => staffModal?.classList.remove('active'));

  staffForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('staff-acc-name')?.value.trim();
    const email = document.getElementById('staff-acc-email')?.value.trim();
    const role = document.getElementById('staff-acc-role')?.value;

    if (!name || !email) {
      showToast('Name and email are required.', 'warning');
      return;
    }

    const res = await window.API.addStaff({ name, email, role });
    if (res && res.status === 'success') {
      showToast(`Created staff account for ${name}!`, 'success');
      staffModal?.classList.remove('active');
      const updatedStaff = await window.API.getStaff();
      if (updatedStaff) staffAccounts = updatedStaff;
      renderStaffUsers();
    } else {
      showToast(res?.message || 'Error creating staff account.', 'warning');
    }
  });


  // ==========================================================================
  // 13. MODULE 11: NOTIFICATIONS
  // ==========================================================================

  const renderNotifications = () => {
    const list = document.getElementById('admin-notif-list');
    if (!list) return;

    if (notifications.length === 0) {
      list.innerHTML = `<p style="color:var(--color-text-muted); padding:20px; text-align:center;">No notifications at this time.</p>`;
      return;
    }

    list.innerHTML = notifications.map(n => `
      <div class="notif-card ${n.unread ? 'unread' : ''}">
        <div class="notif-left">
          <div class="notif-icon-box ${n.type || 'order'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="notif-text">
            <span class="notif-title">${n.title}</span>
            <span class="notif-desc">${n.desc}</span>
            <span class="notif-time">${n.time}</span>
          </div>
        </div>
      </div>
    `).join('');
  };

  document.getElementById('btn-mark-all-read')?.addEventListener('click', async () => {
    const res = await window.API.markNotificationsRead();
    if (res && res.status === 'success') {
      notifications.forEach(n => n.unread = 0);
      updateNotifBadge();
      renderNotifications();
      showToast('All notifications marked as read.', 'info');
    } else {
      notifications.forEach(n => n.unread = 0);
      updateNotifBadge();
      renderNotifications();
    }
  });


  // ==========================================================================
  // 14. MODULE 12: SETTINGS
  // ==========================================================================

  document.getElementById('admin-settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const shop_name = document.getElementById('set-shop-name')?.value.trim();
    const phone = document.getElementById('set-phone')?.value.trim();
    const address = document.getElementById('set-address')?.value.trim();
    const currency = document.getElementById('set-currency')?.value;
    const tax_rate = parseFloat(document.getElementById('set-tax-rate')?.value);
    const low_stock_threshold = parseInt(document.getElementById('set-low-stock-threshold')?.value);
    const default_status = document.getElementById('set-default-status')?.value;

    const payload = {
      shop_name,
      phone,
      address,
      currency,
      tax_rate,
      low_stock_threshold,
      default_status
    };

    const res = await window.API.saveSettings(payload);
    if (res && res.status === 'success') {
      settings = { ...settings, ...payload };
      showToast('Store settings saved successfully!', 'success');
      renderAllViews();
    } else {
      showToast('Error saving settings.', 'warning');
    }
  });


  // ==========================================================================
  // 15. MODAL BACKDROP & ESCAPE HANDLERS
  // ==========================================================================

  document.querySelectorAll('.modal').forEach(modalEl => {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        modalEl.classList.remove('active');
      }
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });


  // ==========================================================================
  // 16. INITIALIZATION & POLLING
  // ==========================================================================

  const renderActiveView = () => {
    if (currentSection === 'dashboard') renderDashboard();
    else if (currentSection === 'orders') renderAdminOrders();
    else if (currentSection === 'customers') renderAdminCustomers();
    else if (currentSection === 'products') renderAdminProducts();
    else if (currentSection === 'categories') renderAdminCategories();
    else if (currentSection === 'inventory') renderAdminInventory();
    else if (currentSection === 'sales') renderSalesAnalytics();
    else if (currentSection === 'reports') generateReportPreview();
    else if (currentSection === 'product-performance') renderSalesAnalytics();
    else if (currentSection === 'staff-users') renderStaffUsers();
    else if (currentSection === 'notifications') renderNotifications();
  };

  const renderAllViews = () => {
    renderDashboard();
    renderAdminOrders();
    renderAdminCustomers();
    renderAdminProducts();
    renderAdminCategories();
    renderAdminInventory();
    renderSalesAnalytics();
    renderStaffUsers();
    renderNotifications();
    generateReportPreview();
  };

  // Initial load
  await loadAllData();

  // Background polling every 4 seconds to sync orders & alerts cleanly without disruptive redraws
  setInterval(async () => {
    try {
      const [ordsData, notifsData, prodsData] = await Promise.all([
        window.API.getOrders(),
        window.API.getNotifications(),
        window.API.getProducts()
      ]);
      if (Array.isArray(ordsData)) orders = ordsData;
      if (Array.isArray(notifsData)) notifications = notifsData;
      if (Array.isArray(prodsData)) products = prodsData;
      updateNotifBadge();
      renderActiveView();
    } catch (e) {}
  }, 4000);

});
