import express from 'express';
import db from '../db.js';

const router = express.Router();

// POST /api/payments/process - Process or verify payment
router.post('/process', async (req, res) => {
  try {
    const {
      booking_id,
      amount,
      payment_method, // 'card', 'upi', 'razorpay', 'stripe', 'pay_at_property'
      card_number,
      upi_reference,
      gateway_payment_id
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    // Generate a unique transaction ID
    const transactionId = gateway_payment_id || upi_reference || `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // If booking_id provided, update database
    if (booking_id) {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id);
      if (booking) {
        db.prepare(`
          UPDATE bookings SET
            payment_status = ?,
            payment_method = ?,
            payment_reference = ?
          WHERE id = ?
        `).run(
          payment_method === 'pay_at_property' ? 'pending' : 'paid',
          payment_method || 'card',
          transactionId,
          booking_id
        );
      }
    }

    // Simulate real gateway processing latency for realistic UX
    await new Promise(resolve => setTimeout(resolve, 800));

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        transaction_id: transactionId,
        amount: parseFloat(amount),
        status: payment_method === 'pay_at_property' ? 'pending' : 'paid',
        payment_method: payment_method || 'card',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/payments/config - Get active payment methods & settings (UPI ID, merchant name, currency)
router.get('/config', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general') || {};
    res.json({
      success: true,
      data: {
        currency_symbol: settings.currency_symbol || '₹',
        currency_code: settings.currency_code || 'INR',
        upi_id: settings.upi_id || 'hotelstay@upi',
        upi_merchant_name: settings.upi_merchant_name || 'Serenity Haven Luxury Retreat',
        tax_percentage: settings.tax_percentage || 12.0,
        gateways: {
          test_mode: true,
          upi_enabled: true,
          cards_enabled: true,
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
