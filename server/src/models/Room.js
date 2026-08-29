import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true, default: 'Deluxe' },
  description: { type: String, required: true, default: '' },
  price_per_night: { type: Number, required: true },
  capacity: { type: Number, default: 2 },
  bed_type: { type: String, default: 'King Bed' },
  room_size: { type: String, default: '450 sq ft' },
  amenities: { type: [String], default: [] },
  images: { type: [String], default: [] },
  total_inventory: { type: Number, default: 1 },
  is_active: { type: Boolean, default: true },
  created_at: { type: String, default: () => new Date().toISOString() }
}, {
  // Return `id` field mapped from `_id` for API compatibility
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

const Room = mongoose.model('Room', roomSchema);
export default Room;
