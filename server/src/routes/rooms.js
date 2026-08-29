import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';

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
export async function getRoomAvailability(roomId, checkIn, checkOut) {
  const overlappingBookings = await Booking.countDocuments({
    room_id: roomId,
    booking_status: { $ne: 'cancelled' },
    $or: [
      { check_in_date: { $lte: checkIn }, check_out_date: { $gt: checkIn } },
      { check_in_date: { $lt: checkOut }, check_out_date: { $gte: checkOut } },
      { check_in_date: { $gte: checkIn }, check_out_date: { $lte: checkOut } }
    ]
  });

  const overlappingBlocked = await BlockedDate.countDocuments({
    room_id: roomId,
    $or: [
      { start_date: { $lte: checkIn }, end_date: { $gt: checkIn } },
      { start_date: { $lt: checkOut }, end_date: { $gte: checkOut } },
      { start_date: { $gte: checkIn }, end_date: { $lte: checkOut } }
    ]
  });

  return { overlappingBookings, overlappingBlocked };
}

// GET /api/rooms - List all rooms (optionally filtered by date range and guests)
router.get('/', async (req, res) => {
  try {
    const { checkIn, checkOut, guests, category } = req.query;

    const filter = { is_active: true };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (guests) {
      filter.capacity = { $gte: parseInt(guests, 10) };
    }

    const rooms = await Room.find(filter).sort({ price_per_night: 1 });

    const formattedRooms = await Promise.all(rooms.map(async (roomDoc) => {
      const room = roomDoc.toJSON();
      let isAvailable = true;
      let availableInventory = room.total_inventory;
      let bookedUnits = 0;

      if (checkIn && checkOut) {
        const { overlappingBookings, overlappingBlocked } = await getRoomAvailability(room.id, checkIn, checkOut);
        bookedUnits = overlappingBookings + overlappingBlocked;
        availableInventory = Math.max(0, room.total_inventory - bookedUnits);
        isAvailable = availableInventory > 0;
      }

      return {
        ...room,
        is_available: isAvailable,
        available_inventory: availableInventory,
        booked_inventory: bookedUnits
      };
    }));

    res.json({ success: true, data: formattedRooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/rooms/:id - Get single room details with booked dates calendar
router.get('/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const bookings = await Booking.find(
      { room_id: room._id, booking_status: { $ne: 'cancelled' } },
      'check_in_date check_out_date'
    );

    const blocked = await BlockedDate.find(
      { room_id: room._id },
      'start_date end_date reason'
    );

    res.json({
      success: true,
      data: {
        ...room.toJSON(),
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
router.post('/', upload.array('image_files', 8), async (req, res) => {
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
    
    // Parse amenities
    let parsedAmenities = [];
    if (amenities) {
      try {
        parsedAmenities = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
        if (!Array.isArray(parsedAmenities)) parsedAmenities = [String(amenities)];
      } catch {
        parsedAmenities = typeof amenities === 'string' ? amenities.split(',').map(s => s.trim()) : [amenities];
      }
    }

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

    if (combinedImages.length === 0) {
      combinedImages.push('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80');
    }

    const createdRoom = await Room.create({
      _id: id,
      name,
      category: category || 'Deluxe',
      description: description || '',
      price_per_night: parseFloat(price_per_night),
      capacity: parseInt(capacity || 2, 10),
      bed_type: bed_type || 'King Bed',
      room_size: room_size || '400 sq ft',
      amenities: parsedAmenities,
      images: combinedImages,
      total_inventory: parseInt(total_inventory || 1, 10),
      is_active: true,
      created_at: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: createdRoom.toJSON()
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/rooms/:id - Update existing room
router.put('/:id', upload.array('image_files', 8), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Room.findById(id);
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
      combinedImages = existing.images || [];
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

    combinedImages = Array.from(new Set(combinedImages));

    let parsedAmenities = existing.amenities;
    if (amenities !== undefined) {
      try {
        parsedAmenities = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
        if (!Array.isArray(parsedAmenities)) parsedAmenities = [String(amenities)];
      } catch {
        parsedAmenities = typeof amenities === 'string' ? amenities.split(',').map(s => s.trim()) : [amenities];
      }
    }

    const updateFields = {
      ...(name && { name }),
      ...(category && { category }),
      ...(description !== undefined && { description }),
      ...(price_per_night && { price_per_night: parseFloat(price_per_night) }),
      ...(capacity && { capacity: parseInt(capacity, 10) }),
      ...(bed_type && { bed_type }),
      ...(room_size && { room_size }),
      amenities: parsedAmenities,
      images: combinedImages,
      ...(total_inventory && { total_inventory: parseInt(total_inventory, 10) }),
      ...(is_active !== undefined && { is_active: is_active === true || is_active === '1' || is_active === 1 || is_active === 'true' })
    };

    const updated = await Room.findByIdAndUpdate(id, updateFields, { new: true });

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: updated.toJSON()
    });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/rooms/:id - Delete room
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Room.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
