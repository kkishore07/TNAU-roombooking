/**
 * payments.js
 * Free & Direct Payment Processing (UPI QR, UPI Intent, Pay at Property)
 * No 3rd-party payment gateway or transaction fees needed.
 */

import express from 'express';
import db from '../db.js';
import { sendBookingNotifications } from '../services/notifications.js';

const router = express.Router();

// ─── POST /api/payments/process ──────────────────────────────────────────────
// Record payment reference, update booking payment status, and trigger notifications
router.post('/process', async (req, res) => {
  try {
    const {
      booking_id,
      amount,
      payment_method, // 'upi', 'pay_at_property', 'bank_transfer'
      upi_reference,
      gateway_payment_id
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    const transactionId = upi_reference || gateway_payment_id
      || `UPI_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    let booking = null;
    let notifications = { email: { sent: false }, sms: { sent: false } };

    if (booking_id) {
      const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
      if (existing) {
        const isPaid = payment_method !== 'pay_at_property';
        db.prepare(`
          UPDATE bookings SET
            payment_status    = ?,
            payment_method    = ?,
            payment_reference = ?
          WHERE id = ?
        `).run(isPaid ? 'paid' : 'pending', payment_method || 'upi', transactionId, booking_id);

        booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
        const room     = booking?.room_id ? db.prepare('SELECT * FROM rooms WHERE id = ?').get(booking.room_id) : null;
        const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general') || {};
        
        // Trigger automated Email + SMS in background
        setImmediate(() => {
          sendBookingNotifications(booking, room, settings).catch(err => {
            console.error('Background notification error in payments:', err.message);
          });
        });
      }
    }

    res.json({
      success: true,
      message: 'Payment details recorded successfully',
      data: {
        transaction_id: transactionId,
        amount:         parseFloat(amount),
        status:         payment_method === 'pay_at_property' ? 'pending' : 'paid',
        payment_method: payment_method || 'upi',
        timestamp:      new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/payments/config ─────────────────────────────────────────────────
// Returns UPI details & active payment options from settings
router.get('/config', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general') || {};

    res.json({
      success: true,
      data: {
        currency_symbol:       settings.currency_symbol || '₹',
        currency_code:         settings.currency_code   || 'INR',
        upi_id:                settings.upi_id          || '9786000328@fam',
        upi_merchant_name:     settings.upi_merchant_name || settings.hotel_name || 'TNAU Guest House',
        tax_percentage:        settings.tax_percentage  || 12.0,
        gateways: {
          upi_enabled:             true,
          pay_at_property_enabled: true
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
