import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = express.Router();

// POST /api/admin/login - Authenticate with Admin PIN
router.post('/login', (req, res) => {
  try {
    const { pin } = req.body;
    const settings = db.prepare('SELECT admin_pin FROM settings WHERE id = ?').get('general');
    const validPin = settings ? settings.admin_pin : '1234';

    if (pin === validPin) {
      // In a small app, return a simple session token
      const token = `admin_tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      res.json({
        success: true,
        message: 'Admin authentication successful',
        data: { token, role: 'owner' }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid Admin PIN. Please try again.' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/stats - Overview analytics & operational summary
router.get('/stats', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total Bookings & Revenue
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN booking_status != 'cancelled' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue,
        SUM(CASE WHEN booking_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_payments
      FROM bookings
    `).get();

    // Today's Check-ins
    const todayCheckIns = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.check_in_date = ? AND b.booking_status != 'cancelled'
    `).all(today);

    // Today's Check-outs
    const todayCheckOuts = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.check_out_date = ? AND b.booking_status != 'cancelled'
    `).all(today);

    // Active Rooms & Capacity
    const roomMetrics = db.prepare(`
      SELECT 
        COUNT(*) as total_rooms,
        SUM(total_inventory) as total_units
      FROM rooms WHERE is_active = 1
    `).get();

    // Current Active Stay Bookings (check_in <= today < check_out)
    const currentOccupied = db.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE check_in_date <= ? AND check_out_date > ? AND booking_status != 'cancelled'
    `).get(today, today).count;

    const totalUnits = roomMetrics.total_units || 1;
    const occupancyRate = Math.min(100, Math.round((currentOccupied / totalUnits) * 100));

    // Recent 5 bookings
    const recentBookings = db.prepare(`
      SELECT b.*, r.name as room_name, r.category as room_category
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      ORDER BY b.created_at DESC
      LIMIT 8
    `).all();

    res.json({
      success: true,
      data: {
        total_revenue: totals.total_revenue || 0,
        paid_revenue: totals.paid_revenue || 0,
        total_bookings: totals.total_bookings || 0,
        confirmed_count: totals.confirmed_count || 0,
        pending_payments: totals.pending_payments || 0,
        total_rooms: roomMetrics.total_rooms || 0,
        total_units: totalUnits,
        current_occupied_units: currentOccupied,
        occupancy_rate: occupancyRate,
        today_checkins: todayCheckIns,
        today_checkouts: todayCheckOuts,
        recent_bookings: recentBookings
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/blocked-dates - List blocked room date ranges
router.get('/blocked-dates', (req, res) => {
  try {
    const blocked = db.prepare(`
      SELECT bd.*, r.name as room_name, r.category as room_category
      FROM blocked_dates bd
      LEFT JOIN rooms r ON bd.room_id = r.id
      ORDER BY bd.start_date ASC
    `).all();

    res.json({ success: true, data: blocked });
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/blocked-dates - Block dates for a room
router.post('/blocked-dates', (req, res) => {
  try {
    const { room_id, start_date, end_date, reason } = req.body;
    if (!room_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Room, start date, and end date are required' });
    }

    const id = `blk-${uuidv4()}`;
    const stmt = db.prepare(`
      INSERT INTO blocked_dates (id, room_id, start_date, end_date, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, room_id, start_date, end_date, reason || 'Maintenance / Private Hold', new Date().toISOString());

    const created = db.prepare(`
      SELECT bd.*, r.name as room_name
      FROM blocked_dates bd
      LEFT JOIN rooms r ON bd.room_id = r.id
      WHERE bd.id = ?
    `).get(id);

    res.status(201).json({ success: true, message: 'Room dates blocked successfully', data: created });
  } catch (error) {
    console.error('Error blocking room dates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/blocked-dates/:id - Delete blocked date
router.delete('/blocked-dates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM blocked_dates WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Blocked date record not found' });
    }

    res.json({ success: true, message: 'Blocked date removed successfully' });
  } catch (error) {
    console.error('Error deleting blocked date:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/settings - Get settings
router.get('/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general') || {};
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/settings - Update settings
router.put('/settings', (req, res) => {
  try {
    const {
      hotel_name,
      tagline,
      address,
      phone,
      email,
      whatsapp_number,
      currency_symbol,
      currency_code,
      tax_percentage,
      admin_pin,
      upi_id,
      upi_merchant_name,
      whatsapp_template
    } = req.body;

    const stmt = db.prepare(`
      UPDATE settings SET
        hotel_name = COALESCE(?, hotel_name),
        tagline = COALESCE(?, tagline),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        whatsapp_number = COALESCE(?, whatsapp_number),
        currency_symbol = COALESCE(?, currency_symbol),
        currency_code = COALESCE(?, currency_code),
        tax_percentage = COALESCE(?, tax_percentage),
        admin_pin = COALESCE(?, admin_pin),
        upi_id = COALESCE(?, upi_id),
        upi_merchant_name = COALESCE(?, upi_merchant_name),
        whatsapp_template = COALESCE(?, whatsapp_template)
      WHERE id = 'general'
    `);

    stmt.run(
      hotel_name || null,
      tagline || null,
      address || null,
      phone || null,
      email || null,
      whatsapp_number || null,
      currency_symbol || null,
      currency_code || null,
      tax_percentage !== undefined ? parseFloat(tax_percentage) : null,
      admin_pin || null,
      upi_id || null,
      upi_merchant_name || null,
      whatsapp_template || null
    );

    const updated = db.prepare('SELECT * FROM settings WHERE id = ?').get('general');
    res.json({ success: true, message: 'Settings updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/test-notifications - Send a test email to verify credentials
router.post('/test-notifications', async (req, res) => {
  try {
    const { target_email } = req.body;
    const settings = db.prepare('SELECT * FROM settings WHERE id = ?').get('general') || {};
    
    const dummyBooking = {
      id: 'test-diagnostic',
      booking_code: 'TNAU-TEST-001',
      customer_name: 'Admin Test',
      customer_email: target_email || process.env.GMAIL_USER,
      customer_phone: '9786000328',
      check_in_date: '2026-09-01',
      check_out_date: '2026-09-02',
      num_nights: 1,
      num_guests: 1,
      total_amount: 1999,
      payment_status: 'paid',
      payment_method: 'upi'
    };

    const dummyRoom = { name: 'Executive Suite', category: 'Suite' };
    const { sendBookingNotifications } = await import('../services/notifications.js');
    const result = await sendBookingNotifications(dummyBooking, dummyRoom, settings);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
