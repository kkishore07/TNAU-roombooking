import express from 'express';
import db from '../db.js';
import { buildWhatsAppMessage } from './bookings.js';

const router = express.Router();

// GET /api/whatsapp/booking-link/:bookingId - Generate WhatsApp click-to-chat URL
router.get('/booking-link/:bookingId', (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ? OR b.booking_code = ?
    `).get(bookingId, bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general') || {};
    const { message, cleanPhone, whatsappUrl } = buildWhatsAppMessage(
      booking,
      { name: booking.room_name, category: booking.room_category },
      settings
    );

    res.json({
      success: true,
      data: {
        phone: cleanPhone,
        message,
        url: whatsappUrl,
        customer_name: booking.customer_name,
        booking_code: booking.booking_code
      }
    });
  } catch (error) {
    console.error('Error generating WhatsApp link:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/whatsapp/custom-message - Generate custom WhatsApp link with specified text
router.post('/custom-message', (req, res) => {
  try {
    const { phone, text } = req.body;
    if (!phone || !text) {
      return res.status(400).json({ success: false, message: 'Phone and text are required' });
    }

    const rawPhone = phone.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;

    res.json({
      success: true,
      data: {
        phone: cleanPhone,
        text,
        url: whatsappUrl
      }
    });
  } catch (error) {
    console.error('Error creating custom WhatsApp link:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
