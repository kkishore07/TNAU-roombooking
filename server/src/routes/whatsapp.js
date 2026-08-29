import express from 'express';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Setting from '../models/Setting.js';
import { buildWhatsAppMessage } from './bookings.js';

const router = express.Router();

// GET /api/whatsapp/booking-link/:bookingId - Generate WhatsApp click-to-chat URL
router.get('/booking-link/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({
      $or: [{ _id: bookingId }, { booking_code: bookingId }]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const room = await Room.findById(booking.room_id);
    const settings = (await Setting.findById('general')) || {};

    const { message, cleanPhone, whatsappUrl } = buildWhatsAppMessage(
      booking.toJSON(),
      room || { name: 'Reserved Room', category: '' },
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
