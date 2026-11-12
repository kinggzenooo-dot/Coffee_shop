/**
 * The Daily Grind Coffee Shop - API Client Integration
 * Syncs frontend interfaces (Customer, Staff POS, Admin) with the Python Flask Backend API.
 */

// If served directly from Flask backend on port 5000 or relative path, use current origin; otherwise target port 5000.
const API_BASE_URL = (window.location.protocol.startsWith('http') && (window.location.port === '5000' || window.location.port === ''))
  ? `${window.location.origin}/api`
  : 'http://127.0.0.1:5000/api';

const API = {
  // Auth
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await res.json();
    } catch (e) {
      console.warn('API login error:', e);
      return null;
    }
  },

  async signup(name, email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      return await res.json();
    } catch (e) {
      console.warn('API signup error:', e);
      return null;
    }
  },

  // Products
  async getProducts() {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getProducts error:', e);
    }
    return null;
  },

  async addProduct(productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateProduct(productId, productData) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async toggleProductStock(productId) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}/toggle`, {
        method: 'PUT'
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async deleteProduct(productId) {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Categories
  async getCategories() {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getCategories error:', e);
    }
    return null;
  },

  async addCategory(name) {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async deleteCategory(categoryId) {
    try {
      const res = await fetch(`${API_BASE_URL}/categories/${encodeURIComponent(categoryId)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Orders
  async getOrders() {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getOrders error:', e);
    }
    return null;
  },

  async createOrder(orderData) {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Customers
  async getCustomers() {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('API getCustomers error:', e);
    }
    return null;
  },

  async addCustomer(customerData) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateCustomer(customerId, customerData) {
    try {
      const res = await fetch(`${API_BASE_URL}/customers/${encodeURIComponent(customerId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Inventory
  async adjustInventory(productId, adjustQty, reason, adjustedBy) {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, adjust_qty: adjustQty, reason, adjusted_by: adjustedBy })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async getStockHistory() {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/history`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // Staff
  async getStaff() {
    try {
      const res = await fetch(`${API_BASE_URL}/staff`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async addStaff(staffData) {
    try {
      const res = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async updateStaffStatus(staffId) {
    try {
      const res = await fetch(`${API_BASE_URL}/staff/${encodeURIComponent(staffId)}/status`, {
        method: 'PUT'
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  // Notifications
  async getNotifications() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async markNotificationsRead() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
        method: 'POST'
      });
      return await res.json();
    } catch (e) {}
    return null;
  },

  // Settings
  async getSettings() {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  async saveSettings(settingsData) {
    try {
      const res = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  }
};

window.API = API;

