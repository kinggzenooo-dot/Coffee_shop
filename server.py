"""
The Daily Grind Coffee Shop - Python Flask REST API & Static Server
Provides database persistent backend (SQLite) for User, Staff, and Admin portals.
"""

import os
import json
import sqlite3
import time
import uuid
import requests
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Load .env file if present
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if not os.path.exists(ENV_PATH):
    ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

SUPABASE_URL = os.environ.get('SUPABASE_URL', os.environ.get('VITE_SUPABASE_URL', 'https://hkrvqmzadkkemamklqcw.supabase.co'))
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', os.environ.get('VITE_SUPABASE_ANON_KEY', ''))

def supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

def supabase_sync_user(user_data):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/users", json=user_data, headers=supabase_headers(), timeout=3)
        if user_data.get('role') in ['barista', 'staff', 'admin']:
            role = user_data['role']
            station = 'Espresso Bar' if role == 'barista' else ('Main Office' if role == 'admin' else 'Terminal #01')
            title = 'Barista' if role == 'barista' else ('Administrator' if role == 'admin' else 'Cashier / POS Staff')
            requests.post(f"{SUPABASE_URL}/rest/v1/staff_accounts", json={
                'id': f"st_{uuid.uuid4().hex[:6]}",
                'name': user_data['name'],
                'email': user_data['email'],
                'role': title,
                'station': station,
                'status': 'Active'
            }, headers=supabase_headers(), timeout=3)
    except Exception as e:
        print("Supabase user sync error:", e)

def supabase_get_user(email):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/users?email=eq.{email.lower()}&limit=1", headers=supabase_headers(), timeout=3)
        if r.status_code == 200:
            data = r.json()
            if data and len(data) > 0:
                return data[0]
    except Exception as e:
        print("Supabase get user error:", e)
    return None

@app.route('/api/supabase/config', methods=['GET'])
def get_supabase_config():
    return jsonify({
        'url': SUPABASE_URL,
        'anonKey': SUPABASE_KEY
    })

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'coffeeshop.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users / Customers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'customer',
            phone TEXT,
            address TEXT,
            tier TEXT DEFAULT 'Standard Member',
            points INTEGER DEFAULT 0,
            total_spend REAL DEFAULT 0.0,
            total_orders INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER DEFAULT 20,
            desc TEXT,
            in_stock INTEGER DEFAULT 1,
            has_milk INTEGER DEFAULT 0,
            has_sweetness INTEGER DEFAULT 0,
            image TEXT DEFAULT ''
        )
    ''')

    # Migration check: Ensure 'image' column exists in existing database
    cursor.execute("PRAGMA table_info(products)")
    columns = [row['name'] for row in cursor.fetchall()]
    if 'image' not in columns:
        cursor.execute("ALTER TABLE products ADD COLUMN image TEXT DEFAULT ''")

    # Backfill default images for seeded products if empty
    default_images = {
        'Signature Espresso': 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80',
        'Vanilla Latte': 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80',
        'Nitro Cold Brew': 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
        'Caramel Macchiato': 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
        'Artisanal Hot Chocolate': 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80',
        'Ceremonial Matcha Latte': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
        'Jasmine Pearl Tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
        'Classic Earl Grey': 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80',
        'French Butter Croissant': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
        'Almond Frangipane Croissant': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
        'Wild Blueberry Muffin': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80',
        'Smashed Avocado Toast': 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&auto=format&fit=crop&q=80',
        'Smoked Salmon Bagel': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
        'Classic Tiramisu': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
        'Decadent Fudge Cake': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
        'Extra Espresso Shot': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        'Whipped Sweet Cream': 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80'
    }
    for p_name, img_url in default_images.items():
        cursor.execute("UPDATE products SET image = ? WHERE name = ? AND (image IS NULL OR image = '')", (img_url, p_name))



    # 3. Categories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'Active'
        )
    ''')

    # 4. Orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            customer_name TEXT,
            customer_id TEXT,
            channel TEXT NOT NULL,
            items_json TEXT NOT NULL,
            subtotal REAL NOT NULL,
            discount REAL DEFAULT 0.0,
            tax REAL NOT NULL,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            cash_tendered REAL DEFAULT 0.0,
            change_due REAL DEFAULT 0.0,
            status TEXT DEFAULT 'Preparing',
            timestamp INTEGER NOT NULL
        )
    ''')

    # 5. Stock History table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            product_name TEXT NOT NULL,
            type TEXT NOT NULL,
            qty TEXT NOT NULL,
            adjusted_by TEXT NOT NULL
        )
    ''')

    # 6. Staff Accounts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff_accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            station TEXT NOT NULL,
            status TEXT DEFAULT 'Active'
        )
    ''')

    # 7. Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            desc TEXT NOT NULL,
            time TEXT NOT NULL,
            type TEXT NOT NULL,
            unread INTEGER DEFAULT 1
        )
    ''')

    # 8. Settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY,
            shop_name TEXT DEFAULT 'The Daily Grind Coffee Shop',
            phone TEXT DEFAULT '+1 (555) 019-8822',
            address TEXT DEFAULT '123 Espresso Lane, Caramel Heights, NY 10001',
            currency TEXT DEFAULT '$',
            tax_rate REAL DEFAULT 8.0,
            low_stock_threshold INTEGER DEFAULT 10,
            default_status TEXT DEFAULT 'Preparing'
        )
    ''')

    # Ensure default system accounts are seeded
    default_users = [
        ('admin1', 'Admin Director', 'admin@dailygrind.com', 'password123', 'admin', '+1 (555) 019-8800', 'Executive Office', 'Platinum Member', 1000, 500.00, 20),
        ('staff1', 'Sarah Jenkins (Cashier)', 'sarah.j@dailygrind.com', 'password123', 'staff', '+1 (555) 019-8801', 'Terminal #01', 'Gold Member', 500, 250.00, 10),
        ('barista1', 'Marcus Vance (Barista)', 'barista@dailygrind.com', 'password123', 'barista', '+1 (555) 019-8803', 'Espresso Bar Station', 'Staff Member', 0, 0, 0),
        ('barista2', 'Marcus Vance', 'marcus.v@dailygrind.com', 'password123', 'barista', '+1 (555) 019-8803', 'Espresso Bar Station', 'Staff Member', 0, 0, 0),
        ('c1', 'John Doe', 'john.doe@example.com', 'password123', 'customer', '+1 (555) 234-5678', '123 Espresso Lane, NY 10001', 'Gold Member', 420, 142.50, 8),
        ('c2', 'Jane Smith', 'jane.smith@example.com', 'password123', 'customer', '+1 (555) 891-2345', '456 Mocha Ave, NY 10002', 'Silver Member', 180, 68.00, 4)
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO users (id, name, email, password, role, phone, address, tier, points, total_spend, total_orders)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', default_users)

    default_staff = [
        ('st1', 'Admin Director', 'admin@dailygrind.com', 'Administrator', 'Main Office', 'Active'),
        ('st2', 'Sarah Jenkins', 'sarah.j@dailygrind.com', 'Head Cashier', 'Terminal #01', 'Active'),
        ('st3', 'Marcus Vance', 'marcus.v@dailygrind.com', 'Barista', 'Espresso Bar', 'Active'),
        ('st4', 'Marcus Vance', 'barista@dailygrind.com', 'Barista', 'Espresso Bar', 'Active')
    ]
    cursor.executemany('''
        INSERT OR IGNORE INTO staff_accounts (id, name, email, role, station, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', default_staff)

    conn.commit()

    # Seed data if DB is empty
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        seed_data(cursor)
        conn.commit()

    conn.close()


def seed_data(cursor):
    # Seed Products with high-quality coffee and food photos
    products = [
        ('p1', 'Signature Espresso', 'Coffee', 3.50, 45, 'Rich, dark double shot with sweet caramel notes.', 1, 1, 1, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80'),
        ('p2', 'Vanilla Latte', 'Coffee', 4.75, 32, 'Espresso combined with steamed milk and Madagascar vanilla.', 1, 1, 1, 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80'),
        ('p3', 'Nitro Cold Brew', 'Coffee', 5.25, 4, 'Slow-steeped cold brew infused with nitrogen for a velvety head.', 1, 1, 1, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80'),
        ('p4', 'Caramel Macchiato', 'Coffee', 5.50, 18, 'Steamed milk stained with espresso and marked with caramel drizzle.', 1, 1, 1, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80'),
        ('p5', 'Artisanal Hot Chocolate', 'Non-Coffee', 4.25, 20, 'Melted Belgian chocolate blocks steamed with whole milk.', 1, 1, 1, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80'),
        ('p6', 'Ceremonial Matcha Latte', 'Non-Coffee', 4.75, 0, 'Stone-ground green tea whisked with creamy oat milk.', 0, 1, 1, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80'),
        ('p7', 'Jasmine Pearl Tea', 'Tea', 3.75, 15, 'Hand-rolled green tea leaves scented with fresh jasmine flowers.', 1, 0, 1, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'),
        ('p8', 'Classic Earl Grey', 'Tea', 3.75, 22, 'Premium black tea leaves infused with natural oil of bergamot.', 1, 1, 1, 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80'),
        ('p9', 'French Butter Croissant', 'Pastries', 3.25, 28, 'Flaky, multi-layered puff pastry baked to golden perfection.', 1, 0, 0, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80'),
        ('p10', 'Almond Frangipane Croissant', 'Pastries', 3.75, 12, 'Twice-baked croissant filled with almond cream and topped with sliced almonds.', 1, 0, 0, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'),
        ('p11', 'Wild Blueberry Muffin', 'Pastries', 3.00, 16, 'Moist muffin packed with Maine blueberries and a sugar streusel topping.', 1, 0, 0, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80'),
        ('p12', 'Smashed Avocado Toast', 'Snacks', 7.50, 10, 'Hass avocado, cherry tomatoes, and red pepper flakes on sourdough.', 1, 0, 0, 'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&auto=format&fit=crop&q=80'),
        ('p13', 'Smoked Salmon Bagel', 'Snacks', 8.75, 8, 'Toasted bagel with cream cheese, smoked salmon, capers, and red onion.', 1, 0, 0, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80'),
        ('p14', 'Classic Tiramisu', 'Desserts', 5.50, 14, 'Espresso-soaked ladyfingers layered with whipped mascarpone cocoa.', 1, 0, 0, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80'),
        ('p15', 'Decadent Fudge Cake', 'Desserts', 5.00, 9, 'Layered dark chocolate fudge cake served warm with raspberry sauce.', 1, 0, 0, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80'),
        ('p16', 'Extra Espresso Shot', 'Add-ons', 1.00, 100, 'An additional shot of our signature roasted espresso blend.', 1, 0, 0, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'),
        ('p17', 'Whipped Sweet Cream', 'Add-ons', 0.50, 50, 'Freshly whipped heavy cream sweetened with vanilla.', 1, 0, 0, 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80')
    ]
    cursor.executemany('''
        INSERT INTO products (id, name, category, price, stock, desc, in_stock, has_milk, has_sweetness, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', products)


    # Seed Categories
    cats = [('Coffee', 'Active'), ('Non-Coffee', 'Active'), ('Tea', 'Active'), ('Pastries', 'Active'), ('Snacks', 'Active'), ('Desserts', 'Active'), ('Add-ons', 'Active')]
    cursor.executemany("INSERT INTO categories (name, status) VALUES (?, ?)", cats)

    # Seed Users / Customers
    users = [
        ('c1', 'John Doe', 'john.doe@example.com', 'password123', 'customer', '+1 (555) 234-5678', '123 Espresso Lane, NY 10001', 'Gold Member', 420, 142.50, 8),
        ('c2', 'Jane Smith', 'jane.smith@example.com', 'password123', 'customer', '+1 (555) 891-2345', '456 Mocha Ave, NY 10002', 'Silver Member', 180, 68.00, 4),
        ('c3', 'Alex Rivera', 'alex.rivera@example.com', 'password123', 'customer', '+1 (555) 345-6789', '789 Latte Way, NY 10003', 'Platinum Member', 890, 320.00, 19),
        ('c4', 'Sarah Connor', 'sarah.c@example.com', 'password123', 'customer', '+1 (555) 902-1144', '321 Roast Blvd, NY 10004', 'Standard Member', 45, 18.50, 1),
        ('admin1', 'Admin Director', 'admin@dailygrind.com', 'password123', 'admin', '+1 (555) 019-8800', 'Executive Office', 'Platinum Member', 1000, 500.00, 20),
        ('staff1', 'Sarah Jenkins', 'sarah.j@dailygrind.com', 'password123', 'staff', '+1 (555) 019-8801', 'Terminal #01', 'Gold Member', 500, 250.00, 10)
    ]
    cursor.executemany('''
        INSERT INTO users (id, name, email, password, role, phone, address, tier, points, total_spend, total_orders)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', users)

    # Seed Orders
    items1 = json.dumps([{"name": "Vanilla Latte", "qty": 1, "customizations": "Regular, Whole Milk, Normal", "price": 4.75}])
    items2 = json.dumps([{"name": "French Butter Croissant", "qty": 2, "customizations": "", "price": 3.25}, {"name": "Signature Espresso", "qty": 1, "customizations": "Regular, Whole Milk, Normal", "price": 3.50}])
    items3 = json.dumps([{"name": "Ceremonial Matcha Latte", "qty": 1, "customizations": "Medium, Oat Milk, Half Sweet", "price": 5.25}])

    orders_data = [
        ('#TGD-10492', 'Today, 10:15 AM', 'John Doe', 'c1', 'Online Portal', items1, 4.75, 0.48, 0.34, 4.61, 'Credit Card', 4.61, 0, 'Preparing', int(time.time() - 3600)),
        ('#TGD-POS-10488', 'Today, 09:40 AM', 'Jane Smith', 'c2', 'POS Register #01', items2, 10.00, 0.50, 0.76, 10.26, 'Cash', 20.00, 9.74, 'Ready', int(time.time() - 7200)),
        ('#TGD-POS-10475', 'Today, 08:30 AM', 'Walk-in Customer', None, 'POS Register #01', items3, 5.25, 0.0, 0.42, 5.67, 'Mobile Wallet', 5.67, 0, 'Completed', int(time.time() - 11000))
    ]
    cursor.executemany('''
        INSERT INTO orders (id, date, customer_name, customer_id, channel, items_json, subtotal, discount, tax, total, payment_method, cash_tendered, change_due, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', orders_data)

    # Seed Stock History
    history = [
        ('Today, 08:00 AM', 'Signature Espresso', 'Restock', '+50', 'Admin Director'),
        ('Yesterday, 04:15 PM', 'Nitro Cold Brew', 'Deduction', '-6', 'Sarah Jenkins')
    ]
    cursor.executemany("INSERT INTO stock_history (timestamp, product_name, type, qty, adjusted_by) VALUES (?, ?, ?, ?, ?)", history)

    # Seed Staff Accounts
    staff = [
        ('st1', 'Admin Director', 'admin@dailygrind.com', 'Administrator', 'Main Office', 'Active'),
        ('st2', 'Sarah Jenkins', 'sarah.j@dailygrind.com', 'Head Cashier', 'Terminal #01', 'Active'),
        ('st3', 'Marcus Vance', 'marcus.v@dailygrind.com', 'Barista', 'Espresso Bar', 'Active')
    ]
    cursor.executemany("INSERT INTO staff_accounts (id, name, email, role, station, status) VALUES (?, ?, ?, ?, ?, ?)", staff)

    # Seed Notifications
    notifs = [
        ('n1', 'Low Stock Alert', 'Nitro Cold Brew is running low (4 units remaining).', '10 mins ago', 'low-stock', 1),
        ('n2', 'New Online Order', 'New Online Order #TGD-10492 received from John Doe.', '1 hour ago', 'order', 1),
        ('n3', 'Payment Completed', 'POS Order #TGD-POS-10488 cash payment completed ($10.26).', '2 hours ago', 'order', 1)
    ]
    cursor.executemany("INSERT INTO notifications (id, title, desc, time, type, unread) VALUES (?, ?, ?, ?, ?, ?)", notifs)

    # Seed Settings
    cursor.execute("INSERT OR IGNORE INTO settings (id, shop_name, phone, address, currency, tax_rate, low_stock_threshold, default_status) VALUES (1, 'The Daily Grind Coffee Shop', '+1 (555) 019-8822', '123 Espresso Lane, Caramel Heights, NY 10001', '$', 8.0, 10, 'Preparing')")


# Static routes with security filter
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    # Protect sensitive files from download
    blocked_files = {'coffeeshop.db', 'server.py', '.env'}
    if filename.lower() in blocked_files or filename.endswith('.db') or filename.endswith('.py') or filename.startswith('.'):
        abort(403)
    if os.path.exists(filename):
        return send_from_directory('.', filename)
    return send_from_directory('.', 'index.html')


# API ENDPOINTS

# 1. AUTH & USER ENDPOINTS
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'status': 'error', 'message': 'Email and password are required.'}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()

    # 1. Check local SQLite DB
    if user and user['password'] == password:
        conn.close()
        user_dict = dict(user)
        user_dict.pop('password', None)
        return jsonify({'status': 'success', 'user': user_dict, 'message': 'Sign in successful!'})
    
    # 2. Check Supabase cloud database
    sb_user = supabase_get_user(email)
    if sb_user and sb_user.get('password') == password:
        try:
            conn.execute('''
                INSERT OR REPLACE INTO users (id, name, email, password, role, tier, points, total_spend, total_orders)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                sb_user['id'], sb_user['name'], sb_user['email'].lower(), sb_user['password'],
                sb_user.get('role', 'customer'), sb_user.get('tier', 'Standard Member'),
                sb_user.get('points', 50), sb_user.get('total_spend', 0.0), sb_user.get('total_orders', 0)
            ))
            conn.commit()
        except Exception:
            pass
        conn.close()
        user_dict = dict(sb_user)
        user_dict.pop('password', None)
        return jsonify({'status': 'success', 'user': user_dict, 'message': 'Sign in successful!'})

    if email and password:
        # Check role-based accounts if registered in staff_accounts
        staff = conn.execute("SELECT * FROM staff_accounts WHERE LOWER(email) = ? AND status = 'Active'", (email,)).fetchone()
        if staff:
            conn.close()
            role_str = staff['role'].lower()
            if 'admin' in role_str:
                role = 'admin'
            elif 'barista' in role_str:
                role = 'barista'
            else:
                role = 'staff'
            return jsonify({
                'status': 'success',
                'user': {
                    'id': staff['id'],
                    'name': staff['name'],
                    'email': staff['email'],
                    'role': role
                },
                'message': 'Staff sign in successful!'
            })
    
    conn.close()
    return jsonify({'status': 'error', 'message': 'Invalid email address or password.'}), 401



@app.route('/api/auth/signup', methods=['POST'])
def api_signup():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    req_role = (data.get('role') or '').strip().lower()

    if not name or not email or not password:
        return jsonify({'status': 'error', 'message': 'All fields are required.'}), 400

    conn = get_db_connection()
    existing = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
    if not existing:
        existing = supabase_get_user(email)
    if existing:
        conn.close()
        return jsonify({'status': 'error', 'message': 'An account with this email already exists.'}), 400

    new_id = f"u_{uuid.uuid4().hex[:8]}"
    if req_role in ['customer', 'barista', 'staff', 'admin']:
        role = req_role
    elif 'admin' in email:
        role = 'admin'
    elif 'barista' in email:
        role = 'barista'
    elif 'staff' in email or 'cashier' in email:
        role = 'staff'
    else:
        role = 'customer'

    initial_points = 500 if role in ['admin', 'staff', 'barista'] else 50
    initial_tier = 'Staff Member' if role in ['staff', 'barista'] else ('Platinum Member' if role == 'admin' else 'Standard Member')

    conn.execute('''
        INSERT OR REPLACE INTO users (id, name, email, password, role, tier, points, total_spend, total_orders)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0)
    ''', (new_id, name, email, password, role, initial_tier, initial_points))

    # Sync to staff accounts table if employee/admin role
    if role in ['barista', 'staff', 'admin']:
        station = 'Espresso Bar' if role == 'barista' else ('Main Office' if role == 'admin' else 'Terminal #01')
        title = 'Barista' if role == 'barista' else ('Administrator' if role == 'admin' else 'Cashier / POS Staff')
        conn.execute('''
            INSERT OR IGNORE INTO staff_accounts (id, name, email, role, station, status)
            VALUES (?, ?, ?, ?, ?, 'Active')
        ''', (f"st_{uuid.uuid4().hex[:6]}", name, email, title, station))

    conn.commit()

    # Sync to Supabase cloud database
    supabase_sync_user({
        'id': new_id,
        'name': name,
        'email': email,
        'password': password,
        'role': role,
        'tier': initial_tier,
        'points': initial_points,
        'total_spend': 0.0,
        'total_orders': 0
    })

    user = conn.execute("SELECT * FROM users WHERE id = ?", (new_id,)).fetchone()
    conn.close()

    user_dict = dict(user) if user else {
        'id': new_id, 'name': name, 'email': email, 'role': role, 'tier': initial_tier, 'points': initial_points
    }
    user_dict.pop('password', None)
    return jsonify({'status': 'success', 'user': user_dict, 'message': 'Account created successfully!'})


# 2. PRODUCTS ENDPOINTS
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM products ORDER BY name ASC").fetchall()
    conn.close()

    products = []
    for r in rows:
        p = dict(r)
        p['inStock'] = bool(p['in_stock'])
        p['hasMilk'] = bool(p['has_milk'])
        p['hasSweetness'] = bool(p['has_sweetness'])
        p['image'] = p.get('image') or ''
        products.append(p)
    return jsonify(products)


@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.get_json() or {}
    new_id = data.get('id') or f"p_{uuid.uuid4().hex[:8]}"
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'status': 'error', 'message': 'Product name is required.'}), 400

    category = data.get('category', 'Coffee')
    price = float(data.get('price', 0))
    stock = int(data.get('stock', 20))
    desc = data.get('desc', '')
    image = data.get('image', '').strip()
    in_stock = 1 if ('inStock' in data and data['inStock']) or (stock > 0) else 0
    has_milk = 1 if data.get('hasMilk') else 0
    has_sweetness = 1 if data.get('hasSweetness') else 0

    conn = get_db_connection()
    conn.execute('''
        INSERT INTO products (id, name, category, price, stock, desc, in_stock, has_milk, has_sweetness, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (new_id, name, category, price, stock, desc, in_stock, has_milk, has_sweetness, image))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'id': new_id, 'image': image})


@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.get_json() or {}
    conn = get_db_connection()
    
    prod = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not prod:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Product not found'}), 404

    # Build update dynamic query
    name = data.get('name', prod['name'])
    category = data.get('category', prod['category'])
    price = float(data.get('price', prod['price']))
    desc = data.get('desc', prod['desc'])
    image = data.get('image') if 'image' in data else (prod['image'] or '')
    if image is None:
        image = ''

    
    stock = int(data.get('stock', prod['stock'])) if 'stock' in data else prod['stock']
    if 'inStock' in data:
        in_stock = 1 if data['inStock'] else 0
    else:
        in_stock = 1 if stock > 0 else prod['in_stock']

    has_milk = 1 if data.get('hasMilk', bool(prod['has_milk'])) else 0
    has_sweetness = 1 if data.get('hasSweetness', bool(prod['has_sweetness'])) else 0

    conn.execute('''
        UPDATE products 
        SET name = ?, category = ?, price = ?, stock = ?, desc = ?, in_stock = ?, has_milk = ?, has_sweetness = ?, image = ?
        WHERE id = ?
    ''', (name, category, price, stock, desc, in_stock, has_milk, has_sweetness, image, product_id))

    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'image': image})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'Empty file name'}), 400
    
    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower() or '.jpg'
    filename = f"prod_{uuid.uuid4().hex[:10]}{ext}"
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)
    
    relative_url = f"/uploads/{filename}"
    return jsonify({'status': 'success', 'url': relative_url})



@app.route('/api/products/<product_id>/toggle', methods=['PUT'])
def toggle_product_stock(product_id):
    conn = get_db_connection()
    prod = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not prod:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Product not found'}), 404

    new_in_stock = 0 if prod['in_stock'] else 1
    conn.execute("UPDATE products SET in_stock = ? WHERE id = ?", (new_in_stock, product_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'in_stock': bool(new_in_stock)})


@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})


# 3. CATEGORIES ENDPOINTS
@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM categories ORDER BY id ASC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'status': 'error', 'message': 'Category name required'}), 400

    conn = get_db_connection()
    try:
        conn.execute("INSERT INTO categories (name, status) VALUES (?, 'Active')", (name,))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success', 'name': name})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Category already exists'}), 400


@app.route('/api/categories/<category_id>', methods=['DELETE'])
def delete_category(category_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM categories WHERE id = ? OR name = ?", (category_id, category_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})


# 4. ORDERS ENDPOINTS
@app.route('/api/orders', methods=['GET'])
def get_orders():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM orders ORDER BY timestamp DESC").fetchall()
    conn.close()

    result = []
    for r in rows:
        o = dict(r)
        try:
            o['items'] = json.loads(o['items_json'])
        except Exception:
            o['items'] = []
        o['customerName'] = o['customer_name']
        o['customerId'] = o['customer_id']
        o['paymentMethod'] = o['payment_method']
        o['cashTendered'] = o['cash_tendered']
        o['changeDue'] = o['change_due']
        result.append(o)
    return jsonify(result)


@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json() or {}
    order_id = data.get('id') or f"#TGD-{uuid.uuid4().hex[:6].upper()}"
    date = data.get('date') or f"Today, {time.strftime('%I:%M %p')}"
    cust_name = data.get('customerName', 'Walk-in Customer')
    cust_id = data.get('customerId')
    channel = data.get('channel', 'POS Register #01')
    items = data.get('items', [])
    items_json = json.dumps(items)
    subtotal = float(data.get('subtotal', 0))
    discount = float(data.get('discount', 0))
    tax = float(data.get('tax', 0))
    total = float(data.get('total', 0))
    payment_method = data.get('paymentMethod', 'Cash')
    cash_tendered = float(data.get('cashTendered', total))
    change_due = float(data.get('changeDue', 0))
    status = data.get('status', 'Preparing')
    timestamp = data.get('timestamp', int(time.time()))

    conn = get_db_connection()
    conn.execute('''
        INSERT INTO orders (id, date, customer_name, customer_id, channel, items_json, subtotal, discount, tax, total, payment_method, cash_tendered, change_due, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (order_id, date, cust_name, cust_id, channel, items_json, subtotal, discount, tax, total, payment_method, cash_tendered, change_due, status, timestamp))

    # Update customer points and total spend if customer_id exists
    if cust_id:
        pts_earned = int(total * 10)
        conn.execute('''
            UPDATE users SET total_orders = total_orders + 1, total_spend = total_spend + ?, points = points + ?
            WHERE id = ?
        ''', (total, pts_earned, cust_id))
        
        # Check tier update
        user_row = conn.execute("SELECT total_spend FROM users WHERE id = ?", (cust_id,)).fetchone()
        if user_row:
            spend = user_row['total_spend']
            new_tier = 'Standard Member'
            if spend >= 300:
                new_tier = 'Platinum Member'
            elif spend >= 100:
                new_tier = 'Gold Member'
            elif spend >= 50:
                new_tier = 'Silver Member'
            conn.execute("UPDATE users SET tier = ? WHERE id = ?", (new_tier, cust_id))

    # Deduct product stock count and update in_stock availability
    for item in items:
        p_name = item.get('name')
        qty = int(item.get('qty', 1))
        if p_name:
            conn.execute('''
                UPDATE products 
                SET stock = MAX(0, stock - ?),
                    in_stock = CASE WHEN stock - ? > 0 THEN 1 ELSE 0 END
                WHERE name = ?
            ''', (qty, qty, p_name))

    # Add notification for new order
    notif_id = f"n_{uuid.uuid4().hex[:6]}"
    conn.execute('''
        INSERT INTO notifications (id, title, desc, time, type, unread)
        VALUES (?, 'New Order Received', ?, 'Just now', 'order', 1)
    ''', (notif_id, f"Order {order_id} ({channel}) by {cust_name} for ${total:.2f}"))

    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'order_id': order_id})


@app.route('/api/orders/<path:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    if not new_status:
        return jsonify({'status': 'error', 'message': 'Status is required'}), 400

    conn = get_db_connection()
    conn.execute("UPDATE orders SET status = ? WHERE id = ?", (new_status, order_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'status_updated': new_status})


# 5. CUSTOMERS ENDPOINTS
@app.route('/api/customers', methods=['GET'])
def get_customers():
    # Try Supabase first
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            r = requests.get(f"{SUPABASE_URL}/rest/v1/users?role=eq.customer&order=total_spend.desc", headers=supabase_headers(), timeout=3)
            if r.status_code == 200:
                custs = r.json()
                result = []
                for c in custs:
                    cd = dict(c)
                    cd['totalSpend'] = cd.get('total_spend', 0.0)
                    cd['totalOrders'] = cd.get('total_orders', 0)
                    cd.pop('password', None)
                    result.append(cd)
                return jsonify(result)
        except Exception:
            pass

    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM users WHERE role = 'customer' ORDER BY total_spend DESC").fetchall()
    conn.close()

    result = []
    for r in rows:
        c = dict(r)
        c['totalSpend'] = c['total_spend']
        c['totalOrders'] = c['total_orders']
        c.pop('password', None)
        result.append(c)
    return jsonify(result)


@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.get_json() or {}
    new_id = f"c_{uuid.uuid4().hex[:8]}"
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = data.get('phone', '')
    tier = data.get('tier', 'Standard Member')

    if not name or not email:
        return jsonify({'status': 'error', 'message': 'Name and email are required.'}), 400

    conn = get_db_connection()
    existing = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'status': 'error', 'message': 'A customer with this email already exists.'}), 400

    conn.execute('''
        INSERT INTO users (id, name, email, password, role, phone, tier, points, total_spend, total_orders)
        VALUES (?, ?, ?, 'password123', 'customer', ?, ?, 50, 0, 0)
    ''', (new_id, name, email, phone, tier))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'id': new_id})


@app.route('/api/customers/<customer_id>', methods=['PUT'])
def update_customer_profile(customer_id):
    data = request.get_json() or {}
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (customer_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Customer not found'}), 404

    name = data.get('name', user['name'])
    phone = data.get('phone', user['phone'])
    address = data.get('address', user['address'])

    conn.execute('''
        UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?
    ''', (name, phone, address, customer_id))
    conn.commit()

    updated = conn.execute("SELECT * FROM users WHERE id = ?", (customer_id,)).fetchone()
    conn.close()
    res = dict(updated)
    res.pop('password', None)
    return jsonify({'status': 'success', 'user': res})


# 6. INVENTORY ENDPOINTS
@app.route('/api/inventory/adjust', methods=['POST'])
def adjust_inventory():
    data = request.get_json() or {}
    product_id = data.get('product_id')
    adjust_qty = int(data.get('adjust_qty', 0))
    reason = data.get('reason', 'Adjustment')
    adjusted_by = data.get('adjusted_by', 'Admin Director')

    conn = get_db_connection()
    prod = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if prod:
        new_stock = max(0, prod['stock'] + adjust_qty)
        in_stock = 1 if new_stock > 0 else 0
        conn.execute("UPDATE products SET stock = ?, in_stock = ? WHERE id = ?", (new_stock, in_stock, product_id))
        
        timestamp_str = f"Today, {time.strftime('%I:%M %p')}"
        type_str = 'Restock' if adjust_qty >= 0 else 'Deduction'
        qty_str = f"+{adjust_qty}" if adjust_qty >= 0 else f"{adjust_qty}"
        
        conn.execute("INSERT INTO stock_history (timestamp, product_name, type, qty, adjusted_by) VALUES (?, ?, ?, ?, ?)",
                     (timestamp_str, prod['name'], type_str, qty_str, adjusted_by))
        
        # If low stock, trigger notification
        if new_stock < 10:
            notif_id = f"n_{uuid.uuid4().hex[:6]}"
            conn.execute('''
                INSERT INTO notifications (id, title, desc, time, type, unread)
                VALUES (?, 'Low Stock Alert', ?, 'Just now', 'low-stock', 1)
            ''', (notif_id, f"{prod['name']} is running low ({new_stock} units remaining)."))

        conn.commit()

    conn.close()
    return jsonify({'status': 'success'})


@app.route('/api/inventory/history', methods=['GET'])
def get_stock_history():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM stock_history ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# 7. STAFF & USERS ENDPOINTS
@app.route('/api/staff', methods=['GET'])
def get_staff():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM staff_accounts ORDER BY id ASC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/staff', methods=['POST'])
def add_staff():
    data = request.get_json() or {}
    new_id = f"st_{uuid.uuid4().hex[:6]}"
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    role = data.get('role', 'Barista')
    station = 'Main Office' if role == 'Administrator' else 'Terminal #01'

    if not name or not email:
        return jsonify({'status': 'error', 'message': 'Name and email are required.'}), 400

    conn = get_db_connection()
    existing = conn.execute("SELECT * FROM staff_accounts WHERE LOWER(email) = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Staff with this email already exists.'}), 400

    conn.execute("INSERT INTO staff_accounts (id, name, email, role, station, status) VALUES (?, ?, ?, ?, ?, 'Active')",
                 (new_id, name, email, role, station))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'id': new_id})


@app.route('/api/staff/<staff_id>/status', methods=['PUT'])
def toggle_staff_status(staff_id):
    conn = get_db_connection()
    staff = conn.execute("SELECT * FROM staff_accounts WHERE id = ?", (staff_id,)).fetchone()
    if not staff:
        conn.close()
        return jsonify({'status': 'error', 'message': 'Staff account not found'}), 404

    new_status = 'Inactive' if staff['status'] == 'Active' else 'Active'
    conn.execute("UPDATE staff_accounts SET status = ? WHERE id = ?", (new_status, staff_id))
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'status_updated': new_status})


# 8. NOTIFICATIONS & SETTINGS ENDPOINTS
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM notifications ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    conn = get_db_connection()
    conn.execute("UPDATE notifications SET unread = 0")
    conn.commit()
    conn.close()
    return jsonify({'status': 'success'})


@app.route('/api/settings', methods=['GET', 'PUT'])
def handle_settings():
    conn = get_db_connection()
    if request.method == 'PUT':
        data = request.get_json() or {}
        curr = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        shop_name = data.get('shop_name', curr['shop_name'] if curr else 'The Daily Grind Coffee Shop')
        phone = data.get('phone', curr['phone'] if curr else '+1 (555) 019-8822')
        address = data.get('address', curr['address'] if curr else '123 Espresso Lane, Caramel Heights, NY 10001')
        currency = data.get('currency', curr['currency'] if curr else '$')
        tax_rate = float(data.get('tax_rate', curr['tax_rate'] if curr else 8.0))
        low_stock_threshold = int(data.get('low_stock_threshold', curr['low_stock_threshold'] if curr else 10))
        default_status = data.get('default_status', curr['default_status'] if curr else 'Preparing')

        conn.execute('''
            UPDATE settings 
            SET shop_name = ?, phone = ?, address = ?, currency = ?, tax_rate = ?, low_stock_threshold = ?, default_status = ?
            WHERE id = 1
        ''', (shop_name, phone, address, currency, tax_rate, low_stock_threshold, default_status))
        conn.commit()
    
    settings = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
    conn.close()
    return jsonify(dict(settings) if settings else {})


# Initialize DB on startup
init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("=" * 60)
    print("THE DAILY GRIND COFFEE SHOP - PYTHON BACKEND SERVER READY")
    print(f"REST API & PORTALS LIVE AT: http://0.0.0.0:{port}")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=False)

