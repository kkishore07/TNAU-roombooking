/**
 * payments.js
 * Payment Processing: Razorpay Gateway, UPI Direct, and Pay at Property
 */

import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Setting from '../models/Setting.js';
import { sendBookingNotifications } from '../services/notifications.js';

const router = express.Router();

function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

// ─── POST /api/payments/create-order ──────────────────────────────────────────
// Create a Razorpay Order for online card/UPI/netbanking checkout
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, booking_id } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server .env'
      });
    }

    // Razorpay requires amount in subunits (paise for INR)
    const options = {
      amount: Math.round(Number(amount) * 100),
      currency: currency.toUpperCase(),
      receipt: receipt || (booking_id ? `rcpt_${booking_id.slice(-8)}` : `rcpt_${Date.now()}`),
      notes: {
        booking_id: booking_id || ''
      }
    };

    const order = await rzp.orders.create(options);

    res.json({
      success: true,
      data: {
        order_id: order.id,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create payment order' });
  }
});

// ─── POST /api/payments/verify ───────────────────────────────────────────────
// Verify Razorpay payment signature and mark booking as confirmed & paid
router.post('/verify', async (req, res) => {
  try {
    const {
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, Payment ID and Signature are required for verification'
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'Razorpay secret key is not configured' });
    }

    // Generate expected signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.'
      });
    }

    let updatedBooking = null;
    if (booking_id) {
      updatedBooking = await Booking.findByIdAndUpdate(
        booking_id,
        {
          payment_status: 'paid',
          payment_method: 'razorpay',
          payment_reference: razorpay_payment_id,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        },
        { new: true }
      );

      if (updatedBooking) {
        const room = await Room.findById(updatedBooking.room_id);
        const settings = (await Setting.findById('general')) || {};

        // Trigger background email and SMS notifications
        setImmediate(() => {
          const bookingData = updatedBooking.toJSON ? updatedBooking.toJSON() : updatedBooking;
          sendBookingNotifications(bookingData, room, settings).catch(err => {
            console.error('Background notification error after Razorpay verification:', err.message);
          });
        });
      }
    }

    res.json({
      success: true,
      message: 'Payment verified and confirmed successfully',
      data: {
        booking_id,
        transaction_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        status: 'paid',
        booking: updatedBooking
      }
    });
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    res.status(500).json({ success: false, message: error.message || 'Payment verification failed' });
  }
});

// ─── POST /api/payments/process ──────────────────────────────────────────────
// Free & Direct Payment Processing (UPI Reference or Pay at Property)
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

    if (booking_id) {
      const isPaid = payment_method !== 'pay_at_property';
      booking = await Booking.findByIdAndUpdate(
        booking_id,
        {
          payment_status: isPaid ? 'paid' : 'pending',
          payment_method: payment_method || 'upi',
          payment_reference: transactionId
        },
        { new: true }
      );

      if (booking) {
        const room = await Room.findById(booking.room_id);
        const settings = (await Setting.findById('general')) || {};

        setImmediate(() => {
          const bookingData = booking.toJSON ? booking.toJSON() : booking;
          sendBookingNotifications(bookingData, room, settings).catch(err => {
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
        amount: parseFloat(amount),
        status: payment_method === 'pay_at_property' ? 'pending' : 'paid',
        payment_method: payment_method || 'upi',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/payments/config ─────────────────────────────────────────────────
// Returns UPI details, Razorpay public Key ID & active payment gateways
router.get('/config', async (req, res) => {
  try {
    const settings = (await Setting.findById('general')) || {};
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
    const hasRazorpay = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

    res.json({
      success: true,
      data: {
        currency_symbol: settings.currency_symbol || '₹',
        currency_code: settings.currency_code || 'INR',
        upi_id: settings.upi_id || '9786000328@fam',
        upi_merchant_name: settings.upi_merchant_name || settings.hotel_name || 'TNAU Guest House',
        tax_percentage: settings.tax_percentage !== undefined ? settings.tax_percentage : 12.0,
        gateways: {
          razorpay_enabled: hasRazorpay,
          razorpay_key_id: razorpayKeyId,
          upi_enabled: true,
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
