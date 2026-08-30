import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Booking from './src/models/Booking.js';
import Room from './src/models/Room.js';
import Setting from './src/models/Setting.js';
import { sendBookingNotifications } from './src/services/notifications.js';

dotenv.config();

async function resend() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const booking = await Booking.findOne({ booking_code: 'TNAU-573187' });
    if (!booking) {
      console.log('Booking TNAU-573187 not found!');
      return;
    }

    console.log('Found booking:', {
      code: booking.booking_code,
      guest: booking.customer_name,
      email: booking.customer_email,
      phone: booking.customer_phone,
      total: booking.total_amount
    });

    const room = await Room.findById(booking.room_id);
    const settings = (await Setting.findById('general')) || {};

    console.log('Sending notifications via Brevo...');
    const result = await sendBookingNotifications(booking.toJSON(), room, settings);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resend();
