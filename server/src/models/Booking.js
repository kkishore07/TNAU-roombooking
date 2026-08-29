import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  booking_code: { type: String, required: true, unique: true },
  room_id: { type: String, required: true, ref: 'Room' },
  customer_name: { type: String, required: true },
  customer_phone: { type: String, required: true },
  customer_email: { type: String, default: '' },
  check_in_date: { type: String, required: true },
  check_in_time: { type: String, default: '02:00 PM' },
  check_out_date: { type: String, required: true },
  num_guests: { type: Number, default: 1 },
  num_nights: { type: Number, default: 1 },
  room_rate: { type: Number, required: true },
  tax_amount: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  payment_status: {
    type: String,
    enum: ['paid', 'pending', 'refunded'],
    default: 'paid'
  },
  payment_method: {
    type: String,
    enum: ['card', 'upi', 'razorpay', 'stripe', 'pay_at_property'],
    default: 'card'
  },
  payment_reference: { type: String, default: '' },
  booking_status: {
    type: String,
    enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled'],
    default: 'confirmed'
  },
  special_requests: { type: String, default: '' },
  // Razorpay-specific fields
  razorpay_order_id: { type: String, default: '' },
  razorpay_payment_id: { type: String, default: '' },
  razorpay_signature: { type: String, default: '' },
  created_at: { type: String, default: () => new Date().toISOString() }
}, {
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for common queries
bookingSchema.index({ room_id: 1, check_in_date: 1, check_out_date: 1 });
bookingSchema.index({ customer_phone: 1 });
bookingSchema.index({ razorpay_order_id: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
