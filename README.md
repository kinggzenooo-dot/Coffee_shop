# The Daily Grind - Coffee Shop System

A comprehensive web-based Coffee Shop Management System featuring customer ordering, barista/staff order fulfillment, and an administrator management dashboard.

## Features

- **Customer Ordering Portal (`index.html`)**: Browse items by category, customize drinks (milk, sweetness), view cart, and place orders.
- **Barista Portal (`barista.html`)**: Dedicated live kitchen display system for baristas to manage incoming drink preparation and order statuses.
- **Staff POS Portal (`staff.html`)**: Point-of-sale interface for in-store checkout and cash/card handling.
- **Admin Dashboard (`admin.html` / `dashboard.html`)**: Manage menu items, track real-time revenue and sales statistics, monitor inventory, manage staff accounts, and view notifications.
- **Flask REST API Backend (`server.py`)**: Persistent SQLite database backend handling orders, products, users, stock history, and system settings.

## Getting Started

### Prerequisites

- Python 3.8+
- Flask & Flask-CORS

### Installation

1. Install dependencies:
   ```bash
   pip install flask flask-cors
   ```

2. Start the backend server:
   ```bash
   python server.py
   ```

3. Open your browser and navigate to:
   - Customer Portal: `http://localhost:5000/index.html`
   - Barista Portal: `http://localhost:5000/barista.html`
   - Staff POS: `http://localhost:5000/staff.html`
   - Admin Portal: `http://localhost:5000/admin.html`
