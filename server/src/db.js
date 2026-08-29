import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Room from './models/Room.js';
import Booking from './models/Booking.js';
import BlockedDate from './models/BlockedDate.js';
import Setting from './models/Setting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Connect to MongoDB Atlas and seed default data if needed.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env — cannot connect to database.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('✅ Connected to MongoDB Atlas');

    // Run one-time SQLite migration if old DB exists
    await migrateFromSQLite();

    // Seed default data if collections are empty
    await seedDefaults();
  } catch (err) {
    console.error('\n❌ MongoDB Atlas connection error:', err.message);
    console.error('────────────────────────────────────────────────────────────────────────');
    console.error('👉 Quick Fix (1 minute):');
    console.error('1. Go to https://cloud.mongodb.com and log in.');
    console.error('2. On the left sidebar under "SECURITY", click "Network Access".');
    console.error('3. Click "+ ADD IP ADDRESS".');
    console.error('4. Click "ALLOW ACCESS FROM ANYWHERE" (adds 0.0.0.0/0), then click "Confirm".');
    console.error('────────────────────────────────────────────────────────────────────────\n');
    process.exit(1);
  }
}

/**
 * One-time migration from SQLite to MongoDB.
 * Runs only if the old hotel.db file exists AND MongoDB collections are empty.
 * After successful migration the SQLite file is renamed to hotel.db.migrated.
 */
async function migrateFromSQLite() {
  const dataDir = path.join(__dirname, '..', 'data');
  const dbPath = path.join(dataDir, 'hotel.db');

  if (!fs.existsSync(dbPath)) return; // No SQLite file → nothing to migrate

  // Check if MongoDB already has data (skip if so)
  const roomCount = await Room.countDocuments();
  if (roomCount > 0) {
    console.log('ℹ️  MongoDB already has data — skipping SQLite migration');
    return;
  }

  console.log('🔄 Migrating data from SQLite → MongoDB Atlas ...');

  let Database;
  try {
    // Dynamic import — better-sqlite3 may not be installed anymore
    const mod = await import('better-sqlite3');
    Database = mod.default;
  } catch {
    console.warn('⚠️  better-sqlite3 not available — skipping migration. Install it temporarily if you need to migrate.');
    return;
  }

  try {
    const sqlite = new Database(dbPath, { readonly: true });

    // ── Migrate Settings ──
    const settingsRow = sqlite.prepare('SELECT * FROM settings WHERE id = ?').get('general');
    if (settingsRow) {
      await Setting.findOneAndUpdate(
        { _id: 'general' },
        {
          _id: 'general',
          hotel_name: settingsRow.hotel_name,
          tagline: settingsRow.tagline,
          address: settingsRow.address,
          phone: settingsRow.phone,
          email: settingsRow.email,
          whatsapp_number: settingsRow.whatsapp_number,
          currency_symbol: settingsRow.currency_symbol,
          currency_code: settingsRow.currency_code,
          tax_percentage: settingsRow.tax_percentage,
          admin_pin: settingsRow.admin_pin,
          upi_id: settingsRow.upi_id,
          upi_merchant_name: settingsRow.upi_merchant_name,
          whatsapp_template: settingsRow.whatsapp_template || ''
        },
        { upsert: true, returnDocument: 'after' }
      );
      console.log('  ✅ Settings migrated');
    }

    // ── Migrate Rooms ──
    const rooms = sqlite.prepare('SELECT * FROM rooms').all();
    if (rooms.length > 0) {
      const roomDocs = rooms.map(r => ({
        _id: r.id,
        name: r.name,
        category: r.category,
        description: r.description,
        price_per_night: r.price_per_night,
        capacity: r.capacity,
        bed_type: r.bed_type,
        room_size: r.room_size,
        amenities: safeParseJSON(r.amenities, []),
        images: safeParseJSON(r.images, []),
        total_inventory: r.total_inventory,
        is_active: Boolean(r.is_active),
        created_at: r.created_at
      }));
      await Room.insertMany(roomDocs, { ordered: false }).catch(() => {});
      console.log(`  ✅ ${rooms.length} rooms migrated`);
    }

    // ── Migrate Bookings ──
    const bookings = sqlite.prepare('SELECT * FROM bookings').all();
    if (bookings.length > 0) {
      const bookingDocs = bookings.map(b => ({
        _id: b.id,
        booking_code: b.booking_code,
        room_id: b.room_id,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        customer_email: b.customer_email || '',
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
        num_guests: b.num_guests,
        num_nights: b.num_nights,
        room_rate: b.room_rate,
        tax_amount: b.tax_amount,
        total_amount: b.total_amount,
        payment_status: b.payment_status,
        payment_method: b.payment_method,
        payment_reference: b.payment_reference || '',
        booking_status: b.booking_status,
        special_requests: b.special_requests || '',
        created_at: b.created_at
      }));
      await Booking.insertMany(bookingDocs, { ordered: false }).catch(() => {});
      console.log(`  ✅ ${bookings.length} bookings migrated`);
    }

    // ── Migrate Blocked Dates ──
    const blocked = sqlite.prepare('SELECT * FROM blocked_dates').all();
    if (blocked.length > 0) {
      const blockedDocs = blocked.map(bd => ({
        _id: bd.id,
        room_id: bd.room_id,
        start_date: bd.start_date,
        end_date: bd.end_date,
        reason: bd.reason || '',
        created_at: bd.created_at
      }));
      await BlockedDate.insertMany(blockedDocs, { ordered: false }).catch(() => {});
      console.log(`  ✅ ${blocked.length} blocked dates migrated`);
    }

    sqlite.close();

    // Rename old DB so migration won't run again
    const migratedPath = path.join(dataDir, 'hotel.db.migrated');
    fs.renameSync(dbPath, migratedPath);
    console.log('✅ SQLite → MongoDB migration complete! Old file renamed to hotel.db.migrated');

  } catch (err) {
    console.error('⚠️  Migration error (non-fatal, you can retry):', err.message);
  }
}

/**
 * Seed default data (settings + starter rooms) if MongoDB is empty.
 */
async function seedDefaults() {
  // ── Seed Settings ──
  const existingSettings = await Setting.findById('general');
  if (!existingSettings) {
    await Setting.create({
      _id: 'general',
      hotel_name: 'TNAU Guest House',
      tagline: 'Tamil Nadu Agricultural University Guest House & VIP Residency',
      address: 'TNAU Campus, Lawley Road, Coimbatore, Tamil Nadu - 641003',
      phone: '+91 97860 00328',
      email: 'guesthouse@tnau.ac.in',
      whatsapp_number: '9786000328',
      currency_symbol: '₹',
      currency_code: 'INR',
      tax_percentage: 12.0,
      admin_pin: '1234',
      upi_id: '9786000328@fam',
      upi_merchant_name: 'TNAU Guest House',
      whatsapp_template: '🌟 *Booking Confirmation - TNAU Guest House* 🌟\n\nDear *{customer_name}*,\nYour room reservation is *CONFIRMED*!\n\n📋 *Booking Ref:* {booking_code}\n🏨 *Room:* {room_name}\n📅 *Check-in:* {check_in_date} (from 2:00 PM)\n📅 *Check-out:* {check_out_date} (until 11:00 AM)\n👥 *Guests:* {num_guests}\n💳 *Total Amount:* {currency_symbol}{total_amount} ({payment_status})\n\n📍 *Location:* {hotel_address}\n📞 *Front Desk / Support:* {hotel_phone}\n\nThank you for choosing TNAU Guest House!'
    });
    console.log('🌱 Default settings seeded');
  }

  // ── Seed Starter Rooms ──
  const roomCount = await Room.countDocuments();
  if (roomCount === 0) {
    const defaultRooms = [
      {
        _id: 'room-1',
        name: 'Presidential Ocean Villa with Private Pool',
        category: 'Villa',
        description: 'Ultra-luxurious standalone villa with unobstructed panoramic ocean views, private infinity plunge pool, sun loungers, master marble bathroom with soaking jacuzzi tub, and 24/7 personal butler service.',
        price_per_night: 8499,
        capacity: 4,
        bed_type: '1 King Bed + 1 Queen Daybed',
        room_size: '1,200 sq ft',
        amenities: [
          'Private Plunge Pool', 'Oceanfront View', 'High-Speed Wi-Fi',
          'Complimentary Breakfast', 'Jacuzzi Bath & Rainfall Shower',
          'Air Conditioning', '65" OLED Smart TV', 'Espresso Coffee Machine',
          'Mini Bar & Wine Cooler', 'Private Patio & Sunbeds'
        ],
        images: [
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80'
        ],
        total_inventory: 2,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        _id: 'room-2',
        name: 'Royal Heritage Suite with Balcony',
        category: 'Suite',
        description: 'Exquisite suite featuring warm teak wood decor, private walk-out balcony overlooking lush tropical gardens, plush King mattress with 500 thread-count Egyptian cotton linens, and a dedicated living lounge.',
        price_per_night: 5499,
        capacity: 3,
        bed_type: 'King Bed',
        room_size: '680 sq ft',
        amenities: [
          'Lush Garden View', 'Private Balcony', 'High-Speed Wi-Fi',
          'Complimentary Breakfast', 'Air Conditioning', '55" 4K Smart TV',
          'Rainfall Shower', 'Working Desk', 'Tea & Coffee Maker',
          '24-Hour Room Service'
        ],
        images: [
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80'
        ],
        total_inventory: 3,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        _id: 'room-3',
        name: 'Deluxe King Room with Mountain Vista',
        category: 'Deluxe',
        description: 'Spacious and contemporary room featuring full-height soundproof windows with stunning green hills view, ambient smart lighting, bespoke furnishings, and an open glass rainforest shower.',
        price_per_night: 3799,
        capacity: 2,
        bed_type: 'King Bed',
        room_size: '420 sq ft',
        amenities: [
          'Scenic Hill View', 'High-Speed Wi-Fi', 'Smart Climate AC',
          '50" Smart TV', 'Rainforest Shower', 'Electronic Safe',
          'Daily Housekeeping', 'Complimentary Bottled Water'
        ],
        images: [
          'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
        ],
        total_inventory: 4,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        _id: 'room-4',
        name: 'Cozy Twin Garden Studio',
        category: 'Deluxe',
        description: 'Comfortable and vibrant studio room equipped with two twin beds, direct ground floor terrace access, quiet workspace, and quick walk to the swimming pool and restaurant.',
        price_per_night: 2999,
        capacity: 2,
        bed_type: '2 Single Twin Beds',
        room_size: '360 sq ft',
        amenities: [
          'Garden Access', 'Twin Beds', 'High-Speed Wi-Fi',
          'Air Conditioning', '43" Smart TV', 'Rainfall Shower',
          'Work Desk', 'Pool Access'
        ],
        images: [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'
        ],
        total_inventory: 3,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    await Room.insertMany(defaultRooms);
    console.log('🌱 Default rooms seeded (4 rooms)');
  }
}

/**
 * Safely parse a JSON string, returning fallback on error.
 */
function safeParseJSON(str, fallback = []) {
  try {
    return typeof str === 'string' ? JSON.parse(str) : (str || fallback);
  } catch {
    return fallback;
  }
}

export default mongoose;
