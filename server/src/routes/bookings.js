import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Setting from '../models/Setting.js';
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
    .replace(/{room_name}/g, room?.name || 'Reserved Room')
    .replace(/{room_category}/g, room?.category || '')
    .replace(/{check_in_date}/g, booking.check_in_date)
    .replace(/{check_out_date}/g, booking.check_out_date)
    .replace(/{num_nights}/g, booking.num_nights)
    .replace(/{num_guests}/g, booking.num_guests)
    .replace(/{currency_symbol}/g, settings.currency_symbol || '₹')
    .replace(/{total_amount}/g, Number(booking.total_amount).toLocaleString('en-IN'))
    .replace(/{payment_status}/g, (booking.payment_status || 'paid').toUpperCase())
    .replace(/{payment_method}/g, (booking.payment_method || 'Online').toUpperCase())
    .replace(/{hotel_name}/g, settings.hotel_name || 'TNAU Guest House')
    .replace(/{hotel_address}/g, settings.address || '')
    .replace(/{hotel_phone}/g, settings.phone || '');

  // Format clean phone number without spaces or symbols
  const rawPhone = (booking.customer_phone || '').replace(/[^0-9]/g, '');
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

    const room = await Room.findOne({ _id: room_id, is_active: true });
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
    const { overlappingBookings, overlappingBlocked } = await getRoomAvailability(room._id, check_in_date, check_out_date);
    const availableInventory = room.total_inventory - (overlappingBookings + overlappingBlocked);

    if (availableInventory <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Sorry, this room is fully booked for your selected dates. Please select different dates or another room.'
      });
    }

    const settings = (await Setting.findById('general')) || {};
    const taxRate = parseFloat(settings.tax_percentage !== undefined ? settings.tax_percentage : 12.0) / 100;

    const baseAmount = room.price_per_night * numNights;
    const taxAmount = Math.round(baseAmount * taxRate);
    const totalAmount = baseAmount + taxAmount;

    // Generate unique booking code e.g. TNAU-849204
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const bookingCode = `TNAU-${randomDigits}`;
    const bookingId = `bk-${uuidv4()}`;
    const createdAt = new Date().toISOString();

    const isPendingPayment = payment_method === 'pay_at_property' || payment_method === 'razorpay';
    const initialPaymentStatus = isPendingPayment ? 'pending' : 'paid';

    const createdBooking = await Booking.create({
      _id: bookingId,
      booking_code: bookingCode,
      room_id: room._id,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone.trim(),
      customer_email: (customer_email || '').trim(),
      check_in_date,
      check_in_time: req.body.check_in_time || '02:00 PM',
      check_out_date,
      num_guests: parseInt(num_guests || 1, 10),
      num_nights: numNights,
      room_rate: room.price_per_night,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_status: initialPaymentStatus,
      payment_method: payment_method || 'card',
      payment_reference: payment_reference || (initialPaymentStatus === 'paid' ? `TXN-${Date.now()}` : ''),
      booking_status: 'confirmed',
      special_requests: special_requests || '',
      created_at: createdAt
    });

    const bookingJSON = createdBooking.toJSON();

    // Generate formatted WhatsApp message and link
    const { message: whatsappMessage, whatsappUrl, cleanPhone } = buildWhatsAppMessage(
      bookingJSON,
      room,
      settings
    );

    // Send email + SMS notifications asynchronously for instant confirmations
    if (initialPaymentStatus === 'paid' || payment_method === 'pay_at_property') {
      setImmediate(() => {
        sendBookingNotifications(bookingJSON, room, settings).catch(err => {
          console.error('Background notification error:', err.message);
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      data: {
        booking: {
          ...bookingJSON,
          room: {
            id: room.id,
            name: room.name,
            category: room.category,
            bed_type: room.bed_type,
            images: room.images || []
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
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const booking = await Booking.findOne({
      $or: [{ _id: identifier }, { booking_code: identifier }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }

    const room = await Room.findById(booking.room_id);
    const settings = (await Setting.findById('general')) || {};

    const bookingJSON = booking.toJSON();
    const { message: whatsappMessage, whatsappUrl, cleanPhone } = buildWhatsAppMessage(
      bookingJSON,
      room || { name: 'Reserved Room', category: '' },
      settings
    );

    res.json({
      success: true,
      data: {
        booking: {
          ...bookingJSON,
          room: room ? {
            name: room.name,
            category: room.category,
            bed_type: room.bed_type,
            images: room.images || []
          } : null
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
router.get('/search/by-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanInput = phone.replace(/[^0-9]/g, '');
    const regex = new RegExp(cleanInput, 'i');

    const bookings = await Booking.find({ customer_phone: regex }).sort({ created_at: -1 });

    const formatted = await Promise.all(bookings.map(async (b) => {
      const room = await Room.findById(b.room_id);
      return {
        ...b.toJSON(),
        room_name: room?.name || 'Reserved Room',
        room_category: room?.category || '',
        room: room ? {
          name: room.name,
          category: room.category,
          images: room.images || []
        } : null
      };
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error searching bookings by phone:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings - Admin list all bookings
router.get('/', async (req, res) => {
  try {
    const { status, payment_status, search, from_date, to_date } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.booking_status = status;
    }

    if (payment_status && payment_status !== 'all') {
      filter.payment_status = payment_status;
    }

    if (from_date) {
      filter.check_in_date = { $gte: from_date };
    }

    if (to_date) {
      filter.check_out_date = { $lte: to_date };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { customer_name: searchRegex },
        { customer_phone: searchRegex },
        { booking_code: searchRegex }
      ];
    }

    const bookings = await Booking.find(filter).sort({ created_at: -1 });

    const formatted = await Promise.all(bookings.map(async (b) => {
      const room = await Room.findById(b.room_id);
      return {
        ...b.toJSON(),
        room_name: room?.name || 'Reserved Room',
        room_category: room?.category || ''
      };
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/bookings/:id/status - Update booking status / payment status (Admin)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_status, payment_status } = req.body;

    const existing = await Booking.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking_status) existing.booking_status = booking_status;
    if (payment_status) existing.payment_status = payment_status;

    await existing.save();

    const room = await Room.findById(existing.room_id);

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        ...existing.toJSON(),
        room_name: room?.name || 'Reserved Room',
        room_category: room?.category || ''
      }
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/:identifier/cancel - Customer self-cancellation
router.post('/:identifier/cancel', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { reason, phone } = req.body;

    const booking = await Booking.findOne({
      $or: [{ _id: identifier }, { booking_code: identifier }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking reservation not found' });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This booking is already cancelled.' });
    }

    if (booking.booking_status === 'checked_out') {
      return res.status(400).json({ success: false, message: 'Completed / checked-out bookings cannot be cancelled.' });
    }

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

    booking.booking_status = 'cancelled';
    booking.special_requests = notes;
    await booking.save();

    const room = await Room.findById(booking.room_id);

    res.json({
      success: true,
      message: `Reservation ${booking.booking_code} has been cancelled successfully.`,
      data: {
        booking: {
          ...booking.toJSON(),
          room: {
            name: room?.name || 'Reserved Room',
            category: room?.category || ''
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Booking.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking removed successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
