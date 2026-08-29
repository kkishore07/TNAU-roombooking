import mongoose from 'mongoose';

const blockedDateSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  room_id: { type: String, required: true, ref: 'Room' },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  reason: { type: String, default: 'Maintenance / Private Hold' },
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

blockedDateSchema.index({ room_id: 1, start_date: 1, end_date: 1 });

const BlockedDate = mongoose.model('BlockedDate', blockedDateSchema);
export default BlockedDate;
