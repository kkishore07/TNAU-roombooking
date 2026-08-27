import React, { useState } from 'react';
import { 
  X, Check, ShieldCheck, CreditCard, QrCode, Building, 
  User, Phone, Mail, MessageSquare, Calendar, ChevronRight, 
  ChevronLeft, Sparkles, AlertCircle, Copy, CheckCheck, Loader2
} from 'lucide-react';
import { createBooking, processPayment } from '../utils/api';

export default function BookingModal({
  room,
  checkIn,
  checkOut,
  guests,
  onClose,
  onBookingSuccess,
  settings,
  currencySymbol = '₹'
}) {
  const [step, setStep] = useState(1); // 1: Guest Details, 2: Payment
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guestCount, setGuestCount] = useState(guests || 1);
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'upi', 'pay_at_property'
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('884');
  const [upiRef, setUpiRef] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate pricing
  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  const baseRate = room.price_per_night * nights;
  const taxAmount = Math.round(baseRate * ((settings?.tax_percentage || 12) / 100));
  const totalAmount = baseRate + taxAmount;

  const upiId = settings?.upi_id || 'azurehorizon@okhdfcbank';
  const upiMerchant = settings?.upi_merchant_name || 'Serenity Haven Retreat';
  
  // Dynamic UPI URL for QR Code
  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiMerchant)}&am=${totalAmount}&cu=INR&tn=RoomBooking_${room.name.substring(0, 10)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeepLink)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 8) {
      setError('Please provide a valid WhatsApp mobile number so we can send your confirmation');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleFinalBookingAndPayment = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Create booking in system
      const bookingPayload = {
        room_id: room.id,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim(),
        check_in_date: checkIn,
        check_out_date: checkOut,
        num_guests: parseInt(guestCount, 10),
        payment_method: paymentMethod,
        payment_reference: paymentMethod === 'upi' ? (upiRef || `UPI-TXN-${Date.now()}`) : `CARD-TXN-${Date.now()}`,
        special_requests: specialRequests
      };

      const result = await createBooking(bookingPayload);
      if (!result.success) {
        throw new Error(result.message || 'Failed to confirm booking');
      }

      // 2. Process / verify payment if not pay_at_property
      if (paymentMethod !== 'pay_at_property') {
        await processPayment({
          booking_id: result.data.booking.id,
          amount: totalAmount,
          payment_method: paymentMethod,
          upi_reference: upiRef
        });
      }

      // 3. Hand off to Success Modal
      onBookingSuccess(result.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error processing reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '680px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-emerald">
                {step === 1 ? 'Step 1 of 2: Guest Details' : 'Step 2 of 2: Secure Payment'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• Zero Account Required</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>
              {step === 1 ? 'Guest Information & Stay Review' : 'Complete Room Reservation'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: '50%',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          
          {/* Booking Summary Box */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>{room.name}</div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', marginTop: '0.2rem' }}>
                <span>📅 {checkIn} to {checkOut} ({nights} {nights === 1 ? 'Night' : 'Nights'})</span>
                <span>👥 {guestCount} Guest(s)</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Amount</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-heading)' }}>
                {currencySymbol}{totalAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#fb7185',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Guest Information */}
          {step === 1 && (
            <form onSubmit={handleProceedToPayment}>
              
              <div className="form-group">
                <label className="form-label">
                  <User size={15} color="#34d399" />
                  <span>Full Name (Primary Guest) *</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Johnathan Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={15} color="#25D366" />
                  <span>WhatsApp Mobile Number * (For Instant Confirmation)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  💬 We will send your official booking voucher and check-in directions directly to this WhatsApp number.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Mail size={15} color="#60a5fa" />
                  <span>Email Address (Optional)</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. guest@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    <span>Number of Guests</span>
                  </label>
                  <select
                    className="form-select"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                  >
                    {Array.from({ length: room.capacity || 4 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Expected Arrival Time</span>
                  </label>
                  <select className="form-select">
                    <option>Standard (2:00 PM - 6:00 PM)</option>
                    <option>Late Check-in (After 6:00 PM)</option>
                    <option>Early Check-in (Subject to availability)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <MessageSquare size={15} color="#fbbf24" />
                  <span>Special Requests / Notes</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="e.g. Quiet room, extra pillow, anniversary decor..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                />
              </div>

              {/* Price Breakdown Preview */}
              <div style={{
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                marginTop: '1.25rem',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  <span>{currencySymbol}{Number(room.price_per_night).toLocaleString('en-IN')} × {nights} {nights === 1 ? 'Night' : 'Nights'}</span>
                  <span>{currencySymbol}{baseRate.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  <span>Estimated Taxes & Resort Fees ({settings?.tax_percentage || 12}%)</span>
                  <span>{currencySymbol}{taxAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: '#ffffff'
                }}>
                  <span>Total Due</span>
                  <span style={{ color: '#34d399' }}>{currencySymbol}{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={onClose} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Continue to Payment</span>
                  <ChevronRight size={16} />
                </button>
              </div>

            </form>
          )}

          {/* STEP 2: Payment Options */}
          {step === 2 && (
            <div>
              
              {/* Payment Method Selector Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  style={{
                    padding: '0.85rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: paymentMethod === 'card' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface-elevated)',
                    border: paymentMethod === 'card' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    color: paymentMethod === 'card' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <CreditCard size={20} color={paymentMethod === 'card' ? '#34d399' : 'currentColor'} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>Card / Instant</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  style={{
                    padding: '0.85rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: paymentMethod === 'upi' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface-elevated)',
                    border: paymentMethod === 'upi' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    color: paymentMethod === 'upi' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <QrCode size={20} color={paymentMethod === 'upi' ? '#34d399' : 'currentColor'} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>UPI / QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('pay_at_property')}
                  style={{
                    padding: '0.85rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: paymentMethod === 'pay_at_property' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface-elevated)',
                    border: paymentMethod === 'pay_at_property' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    color: paymentMethod === 'pay_at_property' ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Building size={20} color={paymentMethod === 'pay_at_property' ? '#34d399' : 'currentColor'} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>Pay at Check-in</span>
                </button>
              </div>

              {/* CARD PAYMENT TAB */}
              {paymentMethod === 'card' && (
                <div style={{
                  padding: '1.25rem',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>Credit / Debit Card</div>
                    <div className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>256-Bit Encrypted</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Card Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Expiry (MM/YY)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV</label>
                      <input
                        type="password"
                        className="form-input"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ℹ️ Test Mode active: Simulated instant authorization & immediate reservation locking.
                  </div>
                </div>
              )}

              {/* UPI QR PAYMENT TAB */}
              {paymentMethod === 'upi' && (
                <div style={{
                  padding: '1.25rem',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.3rem' }}>
                    Scan QR with Google Pay, PhonePe, Paytm or Any UPI App
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Amount to pay: <strong>{currencySymbol}{totalAmount.toLocaleString('en-IN')}</strong>
                  </div>

                  {/* QR Code Container */}
                  <div style={{
                    width: '180px',
                    height: '180px',
                    margin: '0 auto 1rem',
                    background: '#ffffff',
                    padding: '10px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                  }}>
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  {/* UPI ID with copy button */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 1rem',
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-light)',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>UPI ID:</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#34d399' }}>{upiId}</span>
                    <button
                      onClick={handleCopyUpi}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }}
                    >
                      {copiedUpi ? <CheckCheck size={12} color="#34d399" /> : <Copy size={12} />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="form-group" style={{ maxWidth: '340px', margin: '0 auto', textAlign: 'left' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>UPI Reference / UTR Number (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 423987123901"
                      value={upiRef}
                      onChange={(e) => setUpiRef(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* PAY AT PROPERTY TAB */}
              {paymentMethod === 'pay_at_property' && (
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    color: '#fbbf24'
                  }}>
                    <Building size={24} />
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                    Pay Upon Check-in at Front Desk
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                    Your room will be reserved immediately. You can settle the bill of <strong>{currencySymbol}{totalAmount.toLocaleString('en-IN')}</strong> at reception using Cash, Card, or UPI upon arrival.
                  </p>
                </div>
              )}

              {/* Final Actions */}
              <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="btn btn-outline"
                  disabled={loading}
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalBookingAndPayment}
                  disabled={loading}
                  className="btn btn-primary btn-lg"
                  style={{ minWidth: '220px' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      <span>Confirming Stay...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>
                        {paymentMethod === 'pay_at_property' ? 'Confirm Reservation' : `Pay ${currencySymbol}${totalAmount.toLocaleString('en-IN')}`}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
