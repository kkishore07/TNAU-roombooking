import React, { useState, useEffect } from 'react';
import {
  X, Check, ShieldCheck, QrCode, Building,
  User, Phone, Mail, MessageSquare, Calendar, ChevronRight,
  ChevronLeft, Copy, CheckCheck, Loader2, Sparkles,
  ExternalLink, Smartphone, BadgeCheck, AlertCircle, Info
} from 'lucide-react';
import { createBooking, processPayment, fetchPaymentConfig } from '../utils/api';

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

  // Payment states: 'upi' | 'pay_at_property'
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiRef, setUpiRef] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payConfig, setPayConfig] = useState(null);

  // Pricing calculation
  const nights    = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  const baseRate  = room.price_per_night * nights;
  const taxPct    = settings?.tax_percentage !== undefined ? settings.tax_percentage : 12;
  const taxAmount = Math.round(baseRate * (taxPct / 100));
  const total     = baseRate + taxAmount;

  const upiId       = payConfig?.upi_id       || settings?.upi_id       || '9786000328@fam';
  const upiMerchant = payConfig?.upi_merchant_name || settings?.hotel_name || 'TNAU Guest House';

  // Dynamic UPI Deep-link for mobile UPI apps
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiMerchant)}&am=${total}&cu=INR&tn=${encodeURIComponent(`TNAU_${room.name.substring(0, 12)}`)}`;
  // QR Code generator
  const qrCodeUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiDeepLink)}&margin=10`;

  useEffect(() => {
    fetchPaymentConfig().then(r => {
      if (r.success) setPayConfig(r.data);
    });
  }, []);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // ── Step 1 Validation & Proceed ──────────────────────────────────────────
  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    if (cleanDigits.length < 10) {
      setError('Please provide a valid 10-digit mobile number for confirmation');
      return;
    }
    setError('');
    setStep(2);
  };

  // ── Final Booking & Payment Processing ────────────────────────────────────
  const handleFinalBookingAndPayment = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Create booking reservation
      const bookingPayload = {
        room_id:          room.id,
        customer_name:    name.trim(),
        customer_phone:   phone.trim(),
        customer_email:   email.trim(),
        check_in_date:    checkIn,
        check_out_date:   checkOut,
        num_guests:       parseInt(guestCount, 10),
        payment_method:   paymentMethod,
        payment_reference: paymentMethod === 'upi' ? (upiRef.trim() || `UPI_${Date.now()}`) : 'PAY_AT_CHECKIN',
        special_requests: specialRequests
      };

      const result = await createBooking(bookingPayload);
      if (!result.success) {
        throw new Error(result.message || 'Failed to confirm booking');
      }

      const booking = result.data.booking;

      // 2. Process / record payment reference
      const paymentRes = await processPayment({
        booking_id:     booking.id,
        amount:         total,
        payment_method: paymentMethod,
        upi_reference:  paymentMethod === 'upi' ? (upiRef.trim() || `UPI_${Date.now()}`) : undefined
      });

      // 3. Attach notifications info to response data if available
      const finalData = {
        ...result.data,
        notifications: paymentRes?.data?.notifications || result.data?.notifications
      };

      // 4. Pass full booking data to success modal
      onBookingSuccess(finalData);

    } catch (err) {
      console.error('Booking submission error:', err);
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
                {step === 1 ? 'Step 1 of 2: Guest Details' : 'Step 2 of 2: Confirm & Pay'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• Zero Convenience Fee</span>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {step === 1 ? 'Guest Information & Stay Review' : 'Payment & Instant Confirmation'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">

          {/* Booking Summary Box */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--tnau-green-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(26, 107, 50, 0.2)',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--tnau-green)', fontSize: '1.05rem' }}>{room.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {checkIn} → {checkOut} · {nights} Night{nights > 1 ? 's' : ''} · {guestCount} Guest{guestCount > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--tnau-green)', fontFamily: 'var(--font-heading)' }}>
                {currencySymbol}{total.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                incl. {taxPct}% tax · No extra fees
              </div>
            </div>
          </div>

          {/* ── STEP 1: Guest Details ─────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleProceedToPayment}>

              <div className="form-group">
                <label className="form-label">
                  <User size={14} color="var(--tnau-green)" />
                  Full Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. K. Ramesh / S. Priya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={14} color="var(--tnau-green)" />
                  WhatsApp / Mobile Number *
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageSquare size={12} color="#25D366" />
                  Instant WhatsApp voucher & SMS confirmation will be sent to this number
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Mail size={14} color="var(--tnau-gold)" />
                  Email Address (for Official PDF/Receipt)
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="your.email@tnau.ac.in or gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Optional — receives automated itemized receipt
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    <User size={14} /> Number of Guests
                  </label>
                  <select
                    className="form-select"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value, 10))}
                  >
                    {[1,2,3,4,5,6].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <MessageSquare size={14} /> Special Requests / Department
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Agronomy Dept / Early check-in"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--accent-rose-light)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-md)', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--accent-rose)' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="modal-footer" style={{ position: 'static', marginTop: '1.5rem', padding: '0', background: 'transparent', border: 'none', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} className="btn btn-outline-gray">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  Continue to Payment
                  <ChevronRight size={17} />
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: Payment (UPI / Pay at Front Desk) ────────────────── */}
          {step === 2 && (
            <div>

              {/* Payment Method Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  Choose Payment Method
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

                  {/* Direct UPI Option */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${paymentMethod === 'upi' ? 'var(--tnau-green)' : 'var(--border-light)'}`,
                    background: paymentMethod === 'upi' ? 'var(--tnau-green-light)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <input
                      type="radio"
                      name="payment"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={() => setPaymentMethod('upi')}
                      style={{ accentColor: 'var(--tnau-green)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <QrCode size={16} color="var(--tnau-green)" />
                        <span>Direct UPI Payment (GPay, PhonePe, Paytm, BHIM)</span>
                        <span style={{ fontSize: '0.68rem', background: 'var(--tnau-green)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '100px', fontWeight: 700 }}>
                          RECOMMENDED · 0% FEE
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Scan QR Code or tap to pay directly from your UPI app with instant booking confirmation
                      </div>
                    </div>
                  </label>

                  {/* Pay at Front Desk / Check-in */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${paymentMethod === 'pay_at_property' ? 'var(--tnau-gold)' : 'var(--border-light)'}`,
                    background: paymentMethod === 'pay_at_property' ? 'var(--tnau-gold-light)' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}>
                    <input
                      type="radio"
                      name="payment"
                      value="pay_at_property"
                      checked={paymentMethod === 'pay_at_property'}
                      onChange={() => setPaymentMethod('pay_at_property')}
                      style={{ accentColor: 'var(--tnau-gold)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Building size={16} color="var(--tnau-gold-dark)" />
                        Pay at Reception / Front Desk
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Reserve room now, pay via cash / card / UPI at the guest house during check-in
                      </div>
                    </div>
                  </label>

                </div>
              </div>

              {/* ── UPI Details Panel ────────────────────────────────────────── */}
              {paymentMethod === 'upi' && (
                <div style={{
                  padding: '1.25rem',
                  background: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    
                    {/* QR Code Container */}
                    <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                      <img
                        src={qrCodeUrl}
                        alt="TNAU UPI QR Code"
                        style={{ width: '150px', height: '150px', display: 'block', borderRadius: '6px' }}
                      />
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontWeight: 600 }}>
                        Scan using any UPI App
                      </div>
                    </div>

                    {/* UPI Info & Direct Action */}
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        TNAU Guest House UPI ID
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', marginBottom: '0.75rem' }}>
                        <code style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: 'var(--tnau-green)',
                          padding: '0.4rem 0.75rem',
                          background: 'var(--tnau-green-light)',
                          borderRadius: '6px',
                          border: '1px solid rgba(26,107,50,0.2)',
                          letterSpacing: '0.02em'
                        }}>
                          {upiId}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="btn btn-sm btn-outline"
                          title="Copy UPI ID"
                          style={{ padding: '0.4rem 0.6rem' }}
                        >
                          {copiedUpi ? (
                            <><CheckCheck size={14} color="var(--tnau-green)" /> Copied</>
                          ) : (
                            <><Copy size={14} /> Copy</>
                          )}
                        </button>
                      </div>

                      {/* Pay via UPI App button (for mobile/tablets) */}
                      <a
                        href={upiDeepLink}
                        className="btn btn-sm"
                        style={{
                          background: 'linear-gradient(135deg, #1a6b32, #0f4a21)',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.45rem 0.9rem',
                          marginBottom: '0.85rem',
                          fontSize: '0.82rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <Smartphone size={14} />
                        <span>Open Installed UPI App to Pay</span>
                        <ExternalLink size={12} />
                      </a>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        Amount to Pay: <strong style={{ color: 'var(--tnau-green)', fontSize: '1rem' }}>{currencySymbol}{total.toLocaleString('en-IN')}</strong>
                      </div>

                      {/* Transaction Reference / UTR Input */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.82rem' }}>
                          UPI Reference / UTR Number (12-digit)
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 423871928374 or last 4 digits"
                          value={upiRef}
                          onChange={(e) => setUpiRef(e.target.value)}
                          style={{ fontSize: '0.875rem' }}
                        />
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Enter the 12-digit UTR from your GPay / PhonePe / Paytm receipt (or click Confirm if paid)
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* ── Pay at Property Details Panel ───────────────────────────── */}
              {paymentMethod === 'pay_at_property' && (
                <div style={{
                  padding: '1.25rem',
                  background: 'var(--tnau-gold-light)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(184,134,11,0.25)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start'
                }}>
                  <Building size={24} color="var(--tnau-gold-dark)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--tnau-gold-dark)', marginBottom: '0.25rem' }}>
                      Pay Upon Arrival at Reception
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Your reservation will be held immediately. You can pay <strong>{currencySymbol}{total.toLocaleString('en-IN')}</strong> via cash, card, or UPI at the TNAU Guest House front desk during check-in.
                    </div>
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  <span>Room Rate ({currencySymbol}{room.price_per_night.toLocaleString('en-IN')} × {nights} night{nights > 1 ? 's' : ''})</span>
                  <span>{currencySymbol}{baseRate.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', color: 'var(--text-secondary)' }}>
                  <span>Tax & GST ({taxPct}%)</span>
                  <span>{currencySymbol}{taxAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--tnau-green)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
                  <span>Total Payable</span>
                  <span>{currencySymbol}{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Automated Notification Info Strip */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', padding: '0.6rem 0.8rem', background: '#f0f7f2', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--tnau-green)', fontWeight: 600 }}>
                  <BadgeCheck size={14} />
                  <span>Instant WhatsApp Voucher</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--tnau-green)', fontWeight: 600 }}>
                  <BadgeCheck size={14} />
                  <span>Email Confirmation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--tnau-green)', fontWeight: 600 }}>
                  <BadgeCheck size={14} />
                  <span>SMS Alert</span>
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.75rem 1rem', background: 'var(--accent-rose-light)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--accent-rose)' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="btn btn-outline-gray"
                  disabled={loading}
                >
                  <ChevronLeft size={17} /> Back
                </button>

                <button
                  type="button"
                  onClick={handleFinalBookingAndPayment}
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ minWidth: '220px' }}
                >
                  {loading ? (
                    <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Confirming…</>
                  ) : paymentMethod === 'upi' ? (
                    <><Check size={17} /> I Have Paid {currencySymbol}{total.toLocaleString('en-IN')}</>
                  ) : (
                    <><Check size={17} /> Confirm Room Reservation</>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
