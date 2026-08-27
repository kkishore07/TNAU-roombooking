import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'hotel.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price_per_night REAL NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 2,
      bed_type TEXT NOT NULL DEFAULT 'King Bed',
      room_size TEXT DEFAULT '450 sq ft',
      amenities TEXT NOT NULL, -- JSON array
      images TEXT NOT NULL,    -- JSON array
      total_inventory INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_code TEXT UNIQUE NOT NULL,
      room_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      num_guests INTEGER NOT NULL DEFAULT 1,
      num_nights INTEGER NOT NULL DEFAULT 1,
      room_rate REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'paid', -- 'paid', 'pending', 'refunded'
      payment_method TEXT NOT NULL DEFAULT 'card', -- 'card', 'upi', 'razorpay', 'stripe', 'pay_at_property'
      payment_reference TEXT,
      booking_status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'checked_in', 'checked_out', 'cancelled'
      special_requests TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocked_dates (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      hotel_name TEXT NOT NULL,
      tagline TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      whatsapp_number TEXT,
      currency_symbol TEXT DEFAULT '₹',
      currency_code TEXT DEFAULT 'INR',
      tax_percentage REAL DEFAULT 12.0,
      admin_pin TEXT DEFAULT '1234',
      upi_id TEXT DEFAULT 'hotelstay@upi',
      upi_merchant_name TEXT DEFAULT 'Luxury Hotel & Suites',
      whatsapp_template TEXT
    );
  `);

  // Seed default settings if not exists
  const settingsRow = db.prepare('SELECT id FROM settings WHERE id = ?').get('general');
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO settings (
        id, hotel_name, tagline, address, phone, email, whatsapp_number,
        currency_symbol, currency_code, tax_percentage, admin_pin, upi_id, upi_merchant_name, whatsapp_template
      ) VALUES (
        'general',
        'Serenity Haven Luxury Villas & Suites',
        'Experience Unmatched Serenity & Coastal Luxury',
        'Beachside Road, Palolem, South Goa, India - 403702',
        '+91 98765 43210',
        'bookings@serenityhaven.com',
        '+919876543210',
        '₹',
        'INR',
        12.0,
        '1234',
        'serenityhaven@okaxis',
        'Serenity Haven Retreat',
        '🌟 *Booking Confirmation - Serenity Haven* 🌟\n\nDear *{customer_name}*,\nYour booking has been *CONFIRMED*!\n\n📋 *Booking Ref:* {booking_code}\n🏨 *Room:* {room_name}\n📅 *Check-in:* {check_in_date} (from 2:00 PM)\n📅 *Check-out:* {check_out_date} (until 11:00 AM)\n👥 *Guests:* {num_guests}\n💳 *Total Amount:* {currency_symbol}{total_amount} ({payment_status})\n\n📍 *Location & Map:* {hotel_address}\n📞 *Front Desk / Support:* {hotel_phone}\n\nWe look forward to hosting you for a memorable stay!'
      )
    `).run();
  }

  // Seed starter rooms if table is empty
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomCount === 0) {
    const defaultRooms = [
      {
        id: 'room-1',
        name: 'Presidential Ocean Villa with Private Pool',
        category: 'Villa',
        description: 'Ultra-luxurious standalone villa with unobstructed panoramic ocean views, private infinity plunge pool, sun loungers, master marble bathroom with soaking jacuzzi tub, and 24/7 personal butler service.',
        price_per_night: 8499,
        capacity: 4,
        bed_type: '1 King Bed + 1 Queen Daybed',
        room_size: '1,200 sq ft',
        amenities: JSON.stringify([
          'Private Plunge Pool',
          'Oceanfront View',
          'High-Speed Wi-Fi',
          'Complimentary Breakfast',
          'Jacuzzi Bath & Rainfall Shower',
          'Air Conditioning',
          '65" OLED Smart TV',
          'Espresso Coffee Machine',
          'Mini Bar & Wine Cooler',
          'Private Patio & Sunbeds'
        ]),
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80'
        ]),
        total_inventory: 2,
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'room-2',
        name: 'Royal Heritage Suite with Balcony',
        category: 'Suite',
        description: 'Exquisite suite featuring warm teak wood decor, private walk-out balcony overlooking lush tropical gardens, plush King mattress with 500 thread-count Egyptian cotton linens, and a dedicated living lounge.',
        price_per_night: 5499,
        capacity: 3,
        bed_type: 'King Bed',
        room_size: '680 sq ft',
        amenities: JSON.stringify([
          'Lush Garden View',
          'Private Balcony',
          'High-Speed Wi-Fi',
          'Complimentary Breakfast',
          'Air Conditioning',
          '55" 4K Smart TV',
          'Rainfall Shower',
          'Working Desk',
          'Tea & Coffee Maker',
          '24-Hour Room Service'
        ]),
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80'
        ]),
        total_inventory: 3,
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'room-3',
        name: 'Deluxe King Room with Mountain Vista',
        category: 'Deluxe',
        description: 'Spacious and contemporary room featuring full-height soundproof windows with stunning green hills view, ambient smart lighting, bespoke furnishings, and an open glass rainforest shower.',
        price_per_night: 3799,
        capacity: 2,
        bed_type: 'King Bed',
        room_size: '420 sq ft',
        amenities: JSON.stringify([
          'Scenic Hill View',
          'High-Speed Wi-Fi',
          'Smart Climate AC',
          '50" Smart TV',
          'Rainforest Shower',
          'Electronic Safe',
          'Daily Housekeeping',
          'Complimentary Bottled Water'
        ]),
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
        ]),
        total_inventory: 4,
        is_active: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'room-4',
        name: 'Cozy Twin Garden Studio',
        category: 'Deluxe',
        description: 'Comfortable and vibrant studio room equipped with two twin beds, direct ground floor terrace access, quiet workspace, and quick walk to the swimming pool and restaurant.',
        price_per_night: 2999,
        capacity: 2,
        bed_type: '2 Single Twin Beds',
        room_size: '360 sq ft',
        amenities: JSON.stringify([
          'Garden Access',
          'Twin Beds',
          'High-Speed Wi-Fi',
          'Air Conditioning',
          '43" Smart TV',
          'Rainfall Shower',
          'Work Desk',
          'Pool Access'
        ]),
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'
        ]),
        total_inventory: 3,
        is_active: 1,
        created_at: new Date().toISOString()
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO rooms (
        id, name, category, description, price_per_night, capacity, bed_type,
        room_size, amenities, images, total_inventory, is_active, created_at
      ) VALUES (
        @id, @name, @category, @description, @price_per_night, @capacity, @bed_type,
        @room_size, @amenities, @images, @total_inventory, @is_active, @created_at
      )
    `);

    for (const room of defaultRooms) {
      insertStmt.run(room);
    }
  }
}

export default db;
