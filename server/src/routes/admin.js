import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import BlockedDate from '../models/BlockedDate.js';
import Setting from '../models/Setting.js';

const router = express.Router();

// POST /api/admin/login - Authenticate with Admin Email & Password (or PIN)
router.post('/login', async (req, res) => {
  try {
    const { email, password, pin } = req.body;
    const settings = (await Setting.findById('general')) || {};

    const validEmail = (process.env.ADMIN_EMAIL || 'tnaurooms@gmail.com').toLowerCase().trim();
    const validPassword = process.env.ADMIN_PASSWORD || 'tnauroomscbe';
    const validPin = settings.admin_pin || process.env.ADMIN_PIN || '1234';

    const isEmailAuth = email && password && 
      email.toLowerCase().trim() === validEmail && 
      password === validPassword;

    const isPinAuth = pin && (pin === validPin || pin === validPassword);

    if (isEmailAuth || isPinAuth) {
      const token = `admin_tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      res.json({
        success: true,
        message: 'Admin authentication successful',
        data: { token, role: 'owner', email: validEmail }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid Admin credentials. Please check your email and password.' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/stats - Overview analytics & operational summary
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Totals aggregation
    const totalsAgg = await Booking.aggregate([
      {
        $group: {
          _id: null,
          total_bookings: { $sum: 1 },
          total_revenue: {
            $sum: {
              $cond: [{ $ne: ['$booking_status', 'cancelled'] }, '$total_amount', 0]
            }
          },
          paid_revenue: {
            $sum: {
              $cond: [{ $eq: ['$payment_status', 'paid'] }, '$total_amount', 0]
            }
          },
          confirmed_count: {
            $sum: {
              $cond: [{ $eq: ['$booking_status', 'confirmed'] }, 1, 0]
            }
          },
          pending_payments: {
            $sum: {
              $cond: [{ $eq: ['$payment_status', 'pending'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const totals = totalsAgg[0] || {
      total_bookings: 0,
      total_revenue: 0,
      paid_revenue: 0,
      confirmed_count: 0,
      pending_payments: 0
    };

    // Today's Check-ins
    const todayCheckInDocs = await Booking.find({
      check_in_date: today,
      booking_status: { $ne: 'cancelled' }
    });

    const todayCheckIns = await Promise.all(todayCheckInDocs.map(async (b) => {
      const r = await Room.findById(b.room_id);
      return {
        ...b.toJSON(),
        room_name: r?.name || 'Reserved Room',
        room_category: r?.category || ''
      };
    }));

    // Today's Check-outs
    const todayCheckOutDocs = await Booking.find({
      check_out_date: today,
      booking_status: { $ne: 'cancelled' }
    });

    const todayCheckOuts = await Promise.all(todayCheckOutDocs.map(async (b) => {
      const r = await Room.findById(b.room_id);
      return {
        ...b.toJSON(),
        room_name: r?.name || 'Reserved Room',
        room_category: r?.category || ''
      };
    }));

    // Active Rooms & Capacity
    const roomAgg = await Room.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: null,
          total_rooms: { $sum: 1 },
          total_units: { $sum: '$total_inventory' }
        }
      }
    ]);

    const roomMetrics = roomAgg[0] || { total_rooms: 0, total_units: 1 };

    // Current Active Stay Bookings (check_in <= today < check_out)
    const currentOccupied = await Booking.countDocuments({
      check_in_date: { $lte: today },
      check_out_date: { $gt: today },
      booking_status: { $ne: 'cancelled' }
    });

    const totalUnits = roomMetrics.total_units || 1;
    const occupancyRate = Math.min(100, Math.round((currentOccupied / totalUnits) * 100));

    // Recent 8 bookings
    const recentDocs = await Booking.find().sort({ created_at: -1 }).limit(8);
    const recentBookings = await Promise.all(recentDocs.map(async (b) => {
      const r = await Room.findById(b.room_id);
      return {
        ...b.toJSON(),
        room_name: r?.name || 'Reserved Room',
        room_category: r?.category || ''
      };
    }));

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
router.get('/blocked-dates', async (req, res) => {
  try {
    const blockedDocs = await BlockedDate.find().sort({ start_date: 1 });
    const blocked = await Promise.all(blockedDocs.map(async (bd) => {
      const r = await Room.findById(bd.room_id);
      return {
        ...bd.toJSON(),
        room_name: r?.name || 'Unknown Room',
        room_category: r?.category || ''
      };
    }));

    res.json({ success: true, data: blocked });
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/blocked-dates - Block dates for a room
router.post('/blocked-dates', async (req, res) => {
  try {
    const { room_id, start_date, end_date, reason } = req.body;
    if (!room_id || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Room, start date, and end date are required' });
    }

    const id = `blk-${uuidv4()}`;
    const created = await BlockedDate.create({
      _id: id,
      room_id,
      start_date,
      end_date,
      reason: reason || 'Maintenance / Private Hold',
      created_at: new Date().toISOString()
    });

    const r = await Room.findById(room_id);

    res.status(201).json({
      success: true,
      message: 'Room dates blocked successfully',
      data: {
        ...created.toJSON(),
        room_name: r?.name || 'Reserved Room'
      }
    });
  } catch (error) {
    console.error('Error blocking room dates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/blocked-dates/:id - Delete blocked date
router.delete('/blocked-dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BlockedDate.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Blocked date record not found' });
    }

    res.json({ success: true, message: 'Blocked date removed successfully' });
  } catch (error) {
    console.error('Error deleting blocked date:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/settings - Get settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await Setting.findById('general');
    if (!settings) {
      settings = await Setting.create({ _id: 'general' });
    }
    res.json({ success: true, data: settings.toJSON() });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/admin/settings - Update settings
router.put('/settings', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.tax_percentage !== undefined) {
      updateData.tax_percentage = parseFloat(updateData.tax_percentage);
    }

    const updated = await Setting.findOneAndUpdate(
      { _id: 'general' },
      { $set: updateData },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: 'Settings updated successfully', data: updated.toJSON() });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/test-notifications - Send a test email to verify credentials
router.post('/test-notifications', async (req, res) => {
  try {
    const { target_email } = req.body;
    const settings = (await Setting.findById('general')) || {};
    
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
