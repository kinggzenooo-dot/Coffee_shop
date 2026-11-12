/**
 * The Daily Grind Coffee Shop - Barista Kitchen Display System (KDS) Logic
 * Fully integrated with Python Flask REST API via api_client.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Vector SVG Definitions
  const categoryIcons = {
    Coffee: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
    'Non-Coffee': `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 22H6L4 6h16l-2 16z" /><path d="M14 2L8 6" /><path d="M4 6h16"/><line x1="9" y1="11" x2="15" y2="11" /></svg>`,
    Tea: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8h1a3 3 0 0 1 0 6h-1" /><path d="M2 8h16v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8z" /></svg>`,
    Pastries: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 14c2.5-3.5 6-5.5 9-5.5s6.5 2 9 5.5c-3.5 1-6.5 1.5-9 1.5s-5.5-.5-9-1.5z" /></svg>`,
    Snacks: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3c-4 0-7 2-7 6 0 1 0 2.5 1 3.5L5 20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l-1-7.5c1-1 1-2.5 1-3.5 0-4-3-6-7-6z" /></svg>`,
    Desserts: `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 19h20M2 19V11c3-2 6-3 10-3s7 1 10 3v8" /></svg>`,
    'Add-ons': `<svg class="category-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9" stroke-dasharray="3 3" /></svg>`
  };

  // State
  let orders = [];
  let products = [];
  let settings = { currency: '$' };
  let currentStatusFilter = 'active';
  let currentChannelFilter = 'all';
  let soundEnabled = true;
  let knownOrderIds = new Set();
  let checkedItemsState = new Set(); // Store "orderId_itemIndex" for checked items
  let isFirstLoad = true;

  const curr = () => settings.currency || '$';

  // Toast System
  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : 'ℹ';
    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(100px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Play Notification Chime
  const playNewOrderChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      const audioEl = document.getElementById('order-chime-sound');
      if (audioEl) audioEl.play().catch(() => {});
    }
  };

  // Sound Toggle Handler
  const btnToggleSound = document.getElementById('btn-toggle-sound');
  btnToggleSound?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    document.getElementById('sound-icon').textContent = soundEnabled ? '🔔' : '🔕';
    document.getElementById('sound-text').textContent = soundEnabled ? 'Sound ON' : 'Sound OFF';
    showToast(soundEnabled ? 'Order sound alerts enabled.' : 'Order sound alerts muted.', 'info');
  });

  // Calculate elapsed time from timestamp or parse date
  const getElapsedSeconds = (order) => {
    if (order.timestamp) {
      const ts = typeof order.timestamp === 'number' && order.timestamp < 1e11 ? order.timestamp * 1000 : order.timestamp;
      return Math.max(0, Math.floor((Date.now() - ts) / 1000));
    }
    return 60;
  };

  const formatElapsedTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m ago`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Load All Data from API
  const loadKDSData = async () => {
    try {
      const [ords, prods, sets] = await Promise.all([
        window.API.getOrders(),
        window.API.getProducts(),
        window.API.getSettings()
      ]);

      if (Array.isArray(prods)) products = prods;
      if (sets && typeof sets === 'object') settings = { ...settings, ...sets };

      if (Array.isArray(ords)) {
        // Detect newly arrived active orders
        if (!isFirstLoad) {
          const newOrders = ords.filter(o => !knownOrderIds.has(o.id) && ['Pending', 'Preparing'].includes(o.status));
          if (newOrders.length > 0) {
            playNewOrderChime();
            showToast(`🔥 ${newOrders.length} new ticket(s) received on the line!`, 'warning');
          }
        }

        orders = ords;
        knownOrderIds = new Set(ords.map(o => o.id));
        isFirstLoad = false;
      }
    } catch (e) {
      console.warn('KDS data load error:', e);
    }
  };

  // Update Badges & Counters
  const updateTabBadges = () => {
    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    const preparingCount = orders.filter(o => o.status === 'Preparing').length;
    const readyCount = orders.filter(o => o.status === 'Ready').length;
    const completedCount = orders.filter(o => ['Completed', 'Cancelled'].includes(o.status)).length;
    const activeCount = pendingCount + preparingCount + readyCount;

    document.getElementById('badge-tab-active').textContent = activeCount;
    document.getElementById('badge-tab-pending').textContent = pendingCount;
    document.getElementById('badge-tab-preparing').textContent = preparingCount;
    document.getElementById('badge-tab-ready').textContent = readyCount;
    document.getElementById('badge-tab-completed').textContent = completedCount;

    const countText = document.getElementById('kds-active-count-text');
    if (countText) {
      countText.textContent = `${activeCount} Active ${activeCount === 1 ? 'Ticket' : 'Tickets'}`;
    }
  };

  // Render KDS Ticket Cards
  const renderKDSTickets = () => {
    const container = document.getElementById('kds-tickets-container');
    if (!container) return;

    updateTabBadges();

    // Filter by status tab
    let filtered = orders.filter(o => {
      if (currentStatusFilter === 'active') {
        return ['Pending', 'Preparing', 'Ready'].includes(o.status);
      } else if (currentStatusFilter === 'Completed') {
        return ['Completed', 'Cancelled'].includes(o.status);
      } else {
        return o.status === currentStatusFilter;
      }
    });

    // Filter by channel
    if (currentChannelFilter === 'online') {
      filtered = filtered.filter(o => (o.channel || '').toLowerCase().includes('online'));
    } else if (currentChannelFilter === 'pos') {
      filtered = filtered.filter(o => (o.channel || '').toLowerCase().includes('pos'));
    }

    // Sort: Pending first, then Preparing, then Ready, then newest
    filtered.sort((a, b) => {
      const rank = { 'Pending': 1, 'Preparing': 2, 'Ready': 3, 'Completed': 4, 'Cancelled': 5 };
      const rankA = rank[a.status] || 99;
      const rankB = rank[b.status] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="kds-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:54px; height:54px; stroke:var(--kds-accent); margin-bottom:12px;">
            <path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/>
          </svg>
          <h3>All Caught Up, Barista!</h3>
          <p>No orders currently in the ${currentStatusFilter === 'active' ? 'active brewing queue' : currentStatusFilter} queue.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(order => {
      const isPOS = (order.channel || '').includes('POS');
      const elapsedSec = getElapsedSeconds(order);
      let timerClass = 'timer-normal';
      if (elapsedSec > 600) timerClass = 'timer-urgent';
      else if (elapsedSec > 300) timerClass = 'timer-warning';

      const statusClass = `status-${(order.status || 'pending').toLowerCase()}`;

      const itemsHTML = (order.items || []).map((item, idx) => {
        const itemKey = `${order.id}_${idx}`;
        const isDone = checkedItemsState.has(itemKey);

        // Parse customizations if string
        let tagsHTML = '';
        if (item.customizations) {
          const parts = item.customizations.split(',').map(s => s.trim()).filter(Boolean);
          tagsHTML = parts.map(part => {
            const isNote = part.toLowerCase().includes('note');
            return `<span class="kds-tag ${isNote ? 'note-tag' : ''}">${part}</span>`;
          }).join('');
        }

        return `
          <div class="kds-item-row ${isDone ? 'item-done' : ''}" data-key="${itemKey}">
            <input type="checkbox" class="kds-item-check" ${isDone ? 'checked' : ''}>
            <div class="kds-item-details">
              <div class="kds-item-header">
                <span class="kds-item-name">${item.name}</span>
                <span class="kds-item-qty">${item.qty}x</span>
              </div>
              ${tagsHTML ? `<div class="kds-custom-tags">${tagsHTML}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Action buttons based on current state
      let actionButtons = '';
      if (order.status === 'Pending') {
        actionButtons = `<button class="btn-kds-action btn-brew-start" data-id="${order.id}" data-next="Preparing">🔥 Start Brewing</button>`;
      } else if (order.status === 'Preparing') {
        actionButtons = `<button class="btn-kds-action btn-mark-ready" data-id="${order.id}" data-next="Ready">✅ Mark Ready for Pickup</button>`;
      } else if (order.status === 'Ready') {
        actionButtons = `<button class="btn-kds-action btn-mark-completed" data-id="${order.id}" data-next="Completed">🎉 Handed to Customer</button>`;
      } else {
        actionButtons = `<button class="btn-kds-action btn-recall" data-id="${order.id}" data-next="Preparing">↩️ Recall Ticket</button>`;
      }

      return `
        <div class="kds-ticket-card ${statusClass}" data-id="${order.id}">
          <div class="kds-card-header">
            <div class="kds-card-title-group">
              <span class="kds-order-id">${order.id}</span>
              <span class="kds-cust-name">${order.customerName || 'Walk-in Customer'}</span>
            </div>
            <div class="kds-header-right">
              <span class="kds-channel-badge ${isPOS ? 'pos' : 'online'}">${isPOS ? 'POS' : 'Online'}</span>
              <span class="kds-timer ${timerClass}" data-ts="${order.timestamp}">⏱️ ${formatElapsedTimer(elapsedSec)}</span>
            </div>
          </div>

          <div class="kds-card-items">
            ${itemsHTML}
          </div>

          <div class="kds-card-footer">
            ${actionButtons}
          </div>
        </div>
      `;
    }).join('');

    // Attach Action Button Handlers
    container.querySelectorAll('.btn-kds-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const orderId = btn.getAttribute('data-id');
        const nextStatus = btn.getAttribute('data-next');

        btn.disabled = true;
        btn.textContent = 'Updating...';

        const res = await window.API.updateOrderStatus(orderId, nextStatus);
        if (res && res.status === 'success') {
          const ord = orders.find(o => o.id === orderId);
          if (ord) ord.status = nextStatus;
          renderKDSTickets();
          showToast(`Order ${orderId} updated to ${nextStatus}!`, 'success');
        } else {
          showToast('Failed to update ticket status.', 'error');
          btn.disabled = false;
        }
      });
    });

    // Attach Item Strike-Through Checkbox Handlers
    container.querySelectorAll('.kds-item-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const key = row.getAttribute('data-key');
        const checkbox = row.querySelector('.kds-item-check');
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        if (checkbox.checked) {
          checkedItemsState.add(key);
          row.classList.add('item-done');
        } else {
          checkedItemsState.delete(key);
          row.classList.remove('item-done');
        }
      });
    });
  };

  // Status Filter Tabs
  document.querySelectorAll('.kds-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.kds-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatusFilter = tab.getAttribute('data-status');
      renderKDSTickets();
    });
  });

  // Channel Filter Dropdown
  document.getElementById('kds-channel-filter')?.addEventListener('change', (e) => {
    currentChannelFilter = e.target.value;
    renderKDSTickets();
  });

  // Second-by-Second Timer Updater for Active Ticket Timers
  setInterval(() => {
    document.querySelectorAll('.kds-timer').forEach(timerEl => {
      const ts = parseFloat(timerEl.getAttribute('data-ts'));
      if (ts) {
        const rawSec = Math.max(0, Math.floor((Date.now() - (ts < 1e11 ? ts * 1000 : ts)) / 1000));
        timerEl.textContent = `⏱️ ${formatElapsedTimer(rawSec)}`;
        timerEl.className = 'kds-timer';
        if (rawSec > 600) timerEl.classList.add('timer-urgent');
        else if (rawSec > 300) timerEl.classList.add('timer-warning');
        else timerEl.classList.add('timer-normal');
      }
    });
  }, 1000);


  // ==========================================================================
  // BARISTA QUICK STOCK & DEPLETION MANAGER MODAL
  // ==========================================================================
  const stockModal = document.getElementById('barista-stock-modal');
  const btnOpenStock = document.getElementById('btn-open-stock-manager');
  const btnCloseStock = document.getElementById('btn-close-barista-stock');
  const stockSearchInput = document.getElementById('barista-stock-search');

  let stockFilterSearch = '';

  const renderBaristaStockList = () => {
    const grid = document.getElementById('barista-stock-grid');
    if (!grid) return;

    let filtered = products.filter(p => 
      p.name.toLowerCase().includes(stockFilterSearch.toLowerCase()) || 
      p.category.toLowerCase().includes(stockFilterSearch.toLowerCase())
    );

    if (filtered.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding:20px; color:var(--kds-text-muted);">No items match "${stockFilterSearch}".</p>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isAvailable = p.inStock && (p.stock === undefined || p.stock > 0);
      return `
        <div class="barista-stock-card ${!isAvailable ? 'out-of-stock' : ''}">
          <div class="barista-stock-info">
            <h5>${p.name}</h5>
            <span>${p.category} • ${p.stock !== undefined ? `${p.stock} in inventory` : ''}</span>
          </div>
          <button class="btn-toggle-stock-switch ${isAvailable ? 'in-stock' : 'out-stock'}" data-id="${p.id}">
            ${isAvailable ? '✓ In Stock' : '✕ Out of Stock'}
          </button>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-toggle-stock-switch').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pId = btn.getAttribute('data-id');
        const prod = products.find(p => p.id === pId);
        if (!prod) return;

        btn.disabled = true;
        btn.textContent = '...';

        const res = await window.API.toggleProductStock(pId);
        if (res && res.status === 'success') {
          prod.inStock = res.in_stock;
          renderBaristaStockList();
          showToast(`${prod.name} marked ${prod.inStock ? 'In Stock' : 'Out of Stock'}.`, 'info');
        } else {
          showToast('Failed to update stock status.', 'error');
          btn.disabled = false;
        }
      });
    });
  };

  btnOpenStock?.addEventListener('click', () => {
    renderBaristaStockList();
    stockModal?.classList.add('active');
  });

  btnCloseStock?.addEventListener('click', () => {
    stockModal?.classList.remove('active');
  });

  stockSearchInput?.addEventListener('input', (e) => {
    stockFilterSearch = e.target.value;
    renderBaristaStockList();
  });


  // ==========================================================================
  // BARISTA RECIPE GUIDE MODAL
  // ==========================================================================
  const recipeModal = document.getElementById('barista-recipe-modal');
  const btnOpenRecipe = document.getElementById('btn-open-recipe-guide');
  const btnCloseRecipe = document.getElementById('btn-close-recipe-modal');

  btnOpenRecipe?.addEventListener('click', () => recipeModal?.classList.add('active'));
  btnCloseRecipe?.addEventListener('click', () => recipeModal?.classList.remove('active'));

  // Modal Backdrop & Escape handler
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) m.classList.remove('active');
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
  });

  // Logout
  document.getElementById('btn-barista-logout')?.addEventListener('click', () => {
    showToast('Signing out Barista station...', 'info');
    setTimeout(() => {
      localStorage.removeItem('tgd_current_user');
      localStorage.removeItem('dailygrind_current_user');
      sessionStorage.removeItem('tgd_current_user');
      window.location.href = 'index.html';
    }, 600);
  });

  // Sync Barista User Session Name
  const sessionUser = JSON.parse(
    localStorage.getItem('tgd_current_user') || 
    localStorage.getItem('dailygrind_current_user') || 
    sessionStorage.getItem('tgd_current_user')
  );
  if (sessionUser && sessionUser.name) {
    const nameEl = document.getElementById('barista-name-display');
    if (nameEl) nameEl.textContent = sessionUser.name;
    const avatarEl = document.querySelector('.barista-avatar');
    if (avatarEl) {
      avatarEl.textContent = sessionUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
  }

  // Initial Load
  await loadKDSData();
  renderKDSTickets();

  // Supabase Realtime instantaneous event listeners
  if (window.CoffeeRealtime) {
    window.CoffeeRealtime.on('order_created', async (newOrder) => {
      console.log('⚡ [Supabase Realtime] New incoming order:', newOrder);
      await loadKDSData();
      renderKDSTickets();
      showToast(`🔔 New ticket: ${newOrder && newOrder.id ? newOrder.id : 'Order'} received!`, 'info');
    });

    window.CoffeeRealtime.on('order_status_updated', async (data) => {
      console.log('⚡ [Supabase Realtime] Order status updated:', data);
      await loadKDSData();
      renderKDSTickets();
    });

    window.CoffeeRealtime.on('product_updated', async () => {
      await loadKDSData();
    });
  }

  // Background polling backup every 4s
  setInterval(async () => {
    await loadKDSData();
    renderKDSTickets();
  }, 4000);
});
