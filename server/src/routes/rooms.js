import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Multer storage for room image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `room-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = express.Router();

// Helper to check room availability for a given date range
export function getRoomAvailability(roomId, checkIn, checkOut) {
  // Query active overlapping bookings (status not cancelled)
  const overlappingBookings = db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = ?
      AND booking_status != 'cancelled'
      AND (
        (check_in_date <= ? AND check_out_date > ?)
        OR (check_in_date < ? AND check_out_date >= ?)
        OR (check_in_date >= ? AND check_out_date <= ?)
      )
  `).get(roomId, checkIn, checkIn, checkOut, checkOut, checkIn, checkOut).count;

  // Query overlapping blocked dates
  const overlappingBlocked = db.prepare(`
    SELECT COUNT(*) as count FROM blocked_dates
    WHERE room_id = ?
      AND (
        (start_date <= ? AND end_date > ?)
        OR (start_date < ? AND end_date >= ?)
        OR (start_date >= ? AND end_date <= ?)
      )
  `).get(roomId, checkIn, checkIn, checkOut, checkOut, checkIn, checkOut).count;

  return { overlappingBookings, overlappingBlocked };
}

// GET /api/rooms - List all rooms (optionally filtered by date range and guests)
router.get('/', (req, res) => {
  try {
    const { checkIn, checkOut, guests, category } = req.query;

    let query = `SELECT * FROM rooms WHERE is_active = 1`;
    const params = [];

    if (category && category !== 'All') {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (guests) {
      query += ` AND capacity >= ?`;
      params.push(parseInt(guests, 10));
    }

    query += ` ORDER BY price_per_night ASC`;

    const rooms = db.prepare(query).all(...params);

    const formattedRooms = rooms.map(room => {
      let isAvailable = true;
      let availableInventory = room.total_inventory;
      let bookedUnits = 0;

      if (checkIn && checkOut) {
        const { overlappingBookings, overlappingBlocked } = getRoomAvailability(room.id, checkIn, checkOut);
        bookedUnits = overlappingBookings + overlappingBlocked;
        availableInventory = Math.max(0, room.total_inventory - bookedUnits);
        isAvailable = availableInventory > 0;
      }

      return {
        ...room,
        amenities: JSON.parse(room.amenities || '[]'),
        images: JSON.parse(room.images || '[]'),
        is_available: isAvailable,
        available_inventory: availableInventory,
        booked_inventory: bookedUnits
      };
    });

    res.json({ success: true, data: formattedRooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/rooms/:id - Get single room details with booked dates calendar
router.get('/:id', (req, res) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const bookings = db.prepare(`
      SELECT check_in_date, check_out_date FROM bookings
      WHERE room_id = ? AND booking_status != 'cancelled'
    `).all(room.id);

    const blocked = db.prepare(`
      SELECT start_date, end_date, reason FROM blocked_dates
      WHERE room_id = ?
    `).all(room.id);

    res.json({
      success: true,
      data: {
        ...room,
        amenities: JSON.parse(room.amenities || '[]'),
        images: JSON.parse(room.images || '[]'),
        booked_ranges: bookings,
        blocked_ranges: blocked
      }
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/rooms - Create new room (Admin/Owner)
router.post('/', upload.array('image_files', 8), (req, res) => {
  try {
    const {
      name,
      category,
      description,
      price_per_night,
      capacity,
      bed_type,
      room_size,
      amenities,
      image_urls,
      total_inventory
    } = req.body;

    if (!name || !price_per_night) {
      return res.status(400).json({ success: false, message: 'Name and price per night are required' });
    }

    const id = `room-${Date.now()}`;
    const parsedAmenities = typeof amenities === 'string' ? amenities : JSON.stringify(amenities || []);
    
    // Combine uploaded image filenames and any direct image URLs passed
    let combinedImages = [];
    if (image_urls) {
      try {
        const urls = typeof image_urls === 'string' ? JSON.parse(image_urls) : image_urls;
        if (Array.isArray(urls)) combinedImages.push(...urls);
      } catch {
        if (typeof image_urls === 'string' && image_urls.trim()) {
          combinedImages.push(image_urls.trim());
        }
      }
    }

    if (req.files && req.files.length > 0) {
      const uploadedPaths = req.files.map(file => `/uploads/${file.filename}`);
      combinedImages.push(...uploadedPaths);
    }

    // Default fallback image if none provided
    if (combinedImages.length === 0) {
      combinedImages.push('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80');
    }

    const stmt = db.prepare(`
      INSERT INTO rooms (
        id, name, category, description, price_per_night, capacity,
        bed_type, room_size, amenities, images, total_inventory, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    stmt.run(
      id,
      name,
      category || 'Deluxe',
      description || '',
      parseFloat(price_per_night),
      parseInt(capacity || 2, 10),
      bed_type || 'King Bed',
      room_size || '400 sq ft',
      typeof parsedAmenities === 'string' ? parsedAmenities : JSON.stringify(parsedAmenities),
      JSON.stringify(combinedImages),
      parseInt(total_inventory || 1, 10),
      new Date().toISOString()
    );

    const createdRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        ...createdRoom,
        amenities: JSON.parse(createdRoom.amenities || '[]'),
        images: JSON.parse(createdRoom.images || '[]')
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/rooms/:id - Update existing room
router.put('/:id', upload.array('image_files', 8), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const {
      name,
      category,
      description,
      price_per_night,
      capacity,
      bed_type,
      room_size,
      amenities,
      existing_images,
      image_urls,
      total_inventory,
      is_active
    } = req.body;

    let combinedImages = [];
    if (existing_images) {
      try {
        const parsed = typeof existing_images === 'string' ? JSON.parse(existing_images) : existing_images;
        if (Array.isArray(parsed)) combinedImages.push(...parsed);
      } catch {
        combinedImages.push(existing_images);
      }
    } else {
      combinedImages = JSON.parse(existing.images || '[]');
    }

    if (image_urls) {
      try {
        const urls = typeof image_urls === 'string' ? JSON.parse(image_urls) : image_urls;
        if (Array.isArray(urls)) combinedImages.push(...urls);
      } catch {
        if (typeof image_urls === 'string' && image_urls.trim()) {
          combinedImages.push(image_urls.trim());
        }
      }
    }

    if (req.files && req.files.length > 0) {
      const uploadedPaths = req.files.map(file => `/uploads/${file.filename}`);
      combinedImages.push(...uploadedPaths);
    }

    // Ensure unique
    combinedImages = Array.from(new Set(combinedImages));

    let parsedAmenities = existing.amenities;
    if (amenities !== undefined) {
      parsedAmenities = typeof amenities === 'string' ? amenities : JSON.stringify(amenities);
    }

    const stmt = db.prepare(`
      UPDATE rooms SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        price_per_night = COALESCE(?, price_per_night),
        capacity = COALESCE(?, capacity),
        bed_type = COALESCE(?, bed_type),
        room_size = COALESCE(?, room_size),
        amenities = COALESCE(?, amenities),
        images = ?,
        total_inventory = COALESCE(?, total_inventory),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `);

    stmt.run(
      name || null,
      category || null,
      description || null,
      price_per_night ? parseFloat(price_per_night) : null,
      capacity ? parseInt(capacity, 10) : null,
      bed_type || null,
      room_size || null,
      parsedAmenities,
      JSON.stringify(combinedImages),
      total_inventory ? parseInt(total_inventory, 10) : null,
      is_active !== undefined ? parseInt(is_active, 10) : null,
      id
    );

    const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    res.json({
      success: true,
      message: 'Room updated successfully',
      data: {
        ...updated,
        amenities: JSON.parse(updated.amenities || '[]'),
        images: JSON.parse(updated.images || '[]')
      }
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/rooms/:id - Delete room
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
