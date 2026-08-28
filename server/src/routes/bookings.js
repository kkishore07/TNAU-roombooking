import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { getRoomAvailability } from './rooms.js';
import { sendBookingNotifications } from '../services/notifications.js';

const router = express.Router();

// Helper to format WhatsApp message
export function buildWhatsAppMessage(booking, room, settings) {
  const template = settings.whatsapp_template || 
    '🌟 *Booking Confirmation - {hotel_name}* 🌟\n\nDear *{customer_name}*,\nYour room reservation is *CONFIRMED*!\n\n📋 *Booking Ref:* {booking_code}\n🏨 *Room:* {room_name} ({room_category})\n📅 *Check-in:* {check_in_date} (from 2:00 PM)\n📅 *Check-out:* {check_out_date} (until 11:00 AM)\n🌙 *Duration:* {num_nights} Night(s)\n👥 *Guests:* {num_guests} Guest(s)\n💳 *Total Amount:* {currency_symbol}{total_amount} ({payment_status})\n💳 *Payment Method:* {payment_method}\n\n📍 *Hotel Address:* {hotel_address}\n📞 *Front Desk / Support:* {hotel_phone}\n\nThank you for choosing {hotel_name}! Safe travels.';

  const message = template
    .replace(/{customer_name}/g, booking.customer_name || 'Valued Guest')
    .replace(/{booking_code}/g, booking.booking_code)
    .replace(/{room_name}/g, room.name)
    .replace(/{room_category}/g, room.category)
    .replace(/{check_in_date}/g, booking.check_in_date)
    .replace(/{check_out_date}/g, booking.check_out_date)
    .replace(/{num_nights}/g, booking.num_nights)
    .replace(/{num_guests}/g, booking.num_guests)
    .replace(/{currency_symbol}/g, settings.currency_symbol || '₹')
    .replace(/{total_amount}/g, Number(booking.total_amount).toLocaleString('en-IN'))
    .replace(/{payment_status}/g, (booking.payment_status || 'paid').toUpperCase())
    .replace(/{payment_method}/g, (booking.payment_method || 'Online').toUpperCase())
    .replace(/{hotel_name}/g, settings.hotel_name || 'Serenity Haven')
    .replace(/{hotel_address}/g, settings.address || '')
    .replace(/{hotel_phone}/g, settings.phone || '');

  // Format clean phone number without spaces or symbols
  const rawPhone = (booking.customer_phone || '').replace(/[^0-9]/g, '');
  // If Indian 10-digit number without country code, prepend 91
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

  return { message, cleanPhone, whatsappUrl };
}

// POST /api/bookings - Create guest reservation (NO LOGIN REQUIRED)
router.post('/', async (req, res) => {
  try {
    const {
      room_id,
      customer_name,
      customer_phone,
      customer_email,
      check_in_date,
      check_out_date,
      num_guests,
      payment_method,
      payment_reference,
      special_requests
    } = req.body;

    if (!room_id || !customer_name || !customer_phone || !check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (Room, Name, WhatsApp Phone, Check-in and Check-out dates)'
      });
    }

    const room = db.prepare('SELECT * FROM rooms WHERE id = ? AND is_active = 1').get(room_id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found or no longer active' });
    }

    // Validate dates
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const numNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (numNights <= 0 || isNaN(numNights)) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be at least 1 night after check-in date'
      });
    }

    // Check availability collision
    const { overlappingBookings, overlappingBlocked } = getRoomAvailability(room.id, check_in_date, check_out_date);
    const availableInventory = room.total_inventory - (overlappingBookings + overlappingBlocked);

    if (availableInventory <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Sorry, this room is fully booked for your selected dates. Please select different dates or another room.'
      });
    }

    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general') || {};
    const taxRate = parseFloat(settings.tax_percentage || 12.0) / 100;

    const baseAmount = room.price_per_night * numNights;
    const taxAmount = Math.round(baseAmount * taxRate);
    const totalAmount = baseAmount + taxAmount;

    // Generate unique booking code e.g. SH-849204
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const bookingCode = `SH-${randomDigits}`;
    const bookingId = `bk-${uuidv4()}`;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO bookings (
        id, booking_code, room_id, customer_name, customer_phone, customer_email,
        check_in_date, check_out_date, num_guests, num_nights, room_rate,
        tax_amount, total_amount, payment_status, payment_method,
        payment_reference, booking_status, special_requests, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?
      )
    `);

    stmt.run(
      bookingId,
      bookingCode,
      room.id,
      customer_name.trim(),
      customer_phone.trim(),
      (customer_email || '').trim(),
      check_in_date,
      check_out_date,
      parseInt(num_guests || 1, 10),
      numNights,
      room.price_per_night,
      taxAmount,
      totalAmount,
      payment_method === 'pay_at_property' ? 'pending' : 'paid',
      payment_method || 'card',
      payment_reference || `TXN-${Date.now()}`,
      special_requests || '',
      createdAt
    );

    const createdBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    
    // Generate formatted WhatsApp message and link
    const { message: whatsappMessage, whatsappUrl, cleanPhone } = buildWhatsAppMessage(
      createdBooking,
      room,
      settings
    );

    // Send email + SMS notifications asynchronously in the background (fire-and-forget, zero wait time)
    setImmediate(() => {
      sendBookingNotifications(createdBooking, room, settings).catch(err => {
        console.error('Background notification error:', err.message);
      });
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      data: {
        booking: {
          ...createdBooking,
          room: {
            id: room.id,
            name: room.name,
            category: room.category,
            bed_type: room.bed_type,
            images: JSON.parse(room.images || '[]')
          }
        },
        whatsapp: {
          phone: cleanPhone,
          message: whatsappMessage,
          url: whatsappUrl
        },
        settings: {
          hotel_name: settings.hotel_name,
          phone: settings.phone,
          address: settings.address,
          currency_symbol: settings.currency_symbol
        }
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/:identifier - Lookup booking by ID or Booking Code
router.get('/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;
    const booking = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category, r.images as room_images, r.bed_type as room_bed_type
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ? OR b.booking_code = ?
    `).get(identifier, identifier);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }

    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general') || {};
    const { message: whatsappMessage, whatsappUrl, cleanPhone } = buildWhatsAppMessage(
      booking,
      { name: booking.room_name, category: booking.room_category },
      settings
    );

    res.json({
      success: true,
      data: {
        booking: {
          ...booking,
          room: {
            name: booking.room_name,
            category: booking.room_category,
            bed_type: booking.room_bed_type,
            images: JSON.parse(booking.room_images || '[]')
          }
        },
        whatsapp: {
          phone: cleanPhone,
          message: whatsappMessage,
          url: whatsappUrl
        },
        settings: {
          hotel_name: settings.hotel_name,
          phone: settings.phone,
          address: settings.address,
          currency_symbol: settings.currency_symbol
        }
      }
    });
  } catch (error) {
    console.error('Error looking up booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/search/by-phone - Customer lookup by phone number
router.get('/search/by-phone', (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanInput = phone.replace(/[^0-9]/g, '');
    const bookings = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category, r.images as room_images
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE REPLACE(REPLACE(REPLACE(b.customer_phone, ' ', ''), '+', ''), '-', '') LIKE ?
      ORDER BY b.created_at DESC
    `).all(`%${cleanInput}%`);

    const formatted = bookings.map(b => ({
      ...b,
      room: {
        name: b.room_name,
        category: b.room_category,
        images: JSON.parse(b.room_images || '[]')
      }
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error searching bookings by phone:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings - Admin list all bookings
router.get('/', (req, res) => {
  try {
    const { status, payment_status, search, from_date, to_date } = req.query;
    let query = `
      SELECT b.*, r.name as room_name, r.category as room_category
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND b.booking_status = ?`;
      params.push(status);
    }

    if (payment_status && payment_status !== 'all') {
      query += ` AND b.payment_status = ?`;
      params.push(payment_status);
    }

    if (from_date) {
      query += ` AND b.check_in_date >= ?`;
      params.push(from_date);
    }

    if (to_date) {
      query += ` AND b.check_out_date <= ?`;
      params.push(to_date);
    }

    if (search) {
      query += ` AND (b.customer_name LIKE ? OR b.customer_phone LIKE ? OR b.booking_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY b.created_at DESC`;

    const bookings = db.prepare(query).all(...params);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/bookings/:id/status - Update booking status / payment status (Admin)
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { booking_status, payment_status } = req.body;

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const stmt = db.prepare(`
      UPDATE bookings SET
        booking_status = COALESCE(?, booking_status),
        payment_status = COALESCE(?, payment_status)
      WHERE id = ?
    `);

    stmt.run(booking_status || null, payment_status || null, id);

    const updated = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ?
    `).get(id);

    res.json({ success: true, message: 'Status updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/:identifier/cancel - Customer self-cancellation
router.post('/:identifier/cancel', (req, res) => {
  try {
    const { identifier } = req.params;
    const { reason, phone } = req.body;

    const booking = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ? OR b.booking_code = ?
    `).get(identifier, identifier);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking is already cancelled.' });
    }

    if (booking.booking_status === 'checked_out') {
      return res.status(400).json({ success: false, message: 'Completed / checked-out bookings cannot be cancelled.' });
    }

    // Optional phone number check if provided for extra verification
    if (phone) {
      const cleanInput = phone.replace(/[^0-9]/g, '');
      const cleanBookingPhone = (booking.customer_phone || '').replace(/[^0-9]/g, '');
      if (cleanInput && !cleanBookingPhone.includes(cleanInput) && !cleanInput.includes(cleanBookingPhone)) {
        return res.status(403).json({ success: false, message: 'Phone number does not match this reservation.' });
      }
    }

    const cancelReason = reason ? `Customer Cancellation: ${reason}` : 'Cancelled by customer';
    const notes = booking.special_requests 
      ? `${booking.special_requests} | [${cancelReason}]`
      : cancelReason;

    // Update status to cancelled and payment_status if pending
    db.prepare(`
      UPDATE bookings SET
        booking_status = 'cancelled',
        special_requests = ?
      WHERE id = ?
    `).run(notes, booking.id);

    const updated = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ?
    `).get(booking.id);

    res.json({
      success: true,
      message: `Reservation ${booking.booking_code} has been cancelled successfully.`,
      data: {
        booking: {
          ...updated,
          room: {
            name: updated.room_name,
            category: updated.room_category
          }
        }
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/bookings/:id - Cancel or delete booking (Admin)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM bookings WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking removed successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
