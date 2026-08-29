import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  _id: { type: String, default: 'general' },
  hotel_name: { type: String, default: 'TNAU Guest House' },
  tagline: { type: String, default: 'Tamil Nadu Agricultural University Guest House & VIP Residency' },
  address: { type: String, default: 'TNAU Campus, Lawley Road, Coimbatore, Tamil Nadu - 641003' },
  phone: { type: String, default: '+91 97860 00328' },
  email: { type: String, default: 'guesthouse@tnau.ac.in' },
  whatsapp_number: { type: String, default: '9786000328' },
  currency_symbol: { type: String, default: '₹' },
  currency_code: { type: String, default: 'INR' },
  tax_percentage: { type: Number, default: 12.0 },
  admin_pin: { type: String, default: '1234' },
  upi_id: { type: String, default: '9786000328@fam' },
  upi_merchant_name: { type: String, default: 'TNAU Guest House' },
  whatsapp_template: { type: String, default: '' },
  razorpay_enabled: { type: Boolean, default: true }
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

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
