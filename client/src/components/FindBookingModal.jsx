import React, { useState } from 'react';
import {
  Search, X, Calendar, Phone, MessageSquare, AlertCircle,
  CheckCircle2, Building, User, Clock, FileText, Ban, Loader2, AlertTriangle
} from 'lucide-react';
import { lookupBooking, lookupBookingsByPhone, cancelBooking } from '../utils/api';

export default function FindBookingModal({ onClose, settings }) {
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'phone'
  const [bookingCode, setBookingCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [results, setResults] = useState(null);

  // Cancellation State
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Change in Travel Plans');
  const [customReason, setCustomReason] = useState('');
  const [cancellingInProgress, setCancellingInProgress] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setResults(null);
    setCancellingBookingId(null);
    setLoading(true);

    try {
      if (activeTab === 'code') {
        if (!bookingCode.trim()) {
          setError('Please enter your 8-character Booking Code (e.g. SH-849204)');
          setLoading(false);
          return;
        }
        const res = await lookupBooking(bookingCode.trim());
        if (res.success && res.data?.booking) {
          setResults([res.data.booking]);
        } else {
          setError('No booking found matching that reference code. Please double check.');
        }
      } else {
        if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 8) {
          setError('Please enter a valid mobile number');
          setLoading(false);
          return;
        }
        const res = await lookupBookingsByPhone(phone.trim());
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setResults(res.data);
        } else {
          setError('No reservations found associated with that phone number.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error communicating with booking server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async (booking) => {
    setCancellingInProgress(true);
    setError('');
    setSuccessMsg('');

    try {
      const reasonText = cancelReason === 'Other' ? (customReason.trim() || 'Other') : cancelReason;
      const res = await cancelBooking(booking.id || booking.booking_code, {
        reason: reasonText,
        phone: booking.customer_phone
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to cancel reservation');
      }

      // Update state locally
      setResults(prev => prev.map(b => b.id === booking.id ? { ...b, booking_status: 'cancelled' } : b));
      setCancellingBookingId(null);
      setSuccessMsg(`Reservation ${booking.booking_code} has been cancelled. Your room has been released.`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error cancelling booking. Please contact front desk.');
    } finally {
      setCancellingInProgress(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '660px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span className="badge badge-emerald" style={{ marginBottom: '0.25rem' }}>
              Guest Self-Service Portal
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Find, Manage & Cancel Reservation
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
          
          {/* Tab Selector */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'var(--bg-surface-elevated)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem'
          }}>
            <button
              onClick={() => { setActiveTab('code'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === 'code' ? '#ffffff' : 'var(--text-secondary)',
                background: activeTab === 'code' ? 'var(--tnau-green)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              Search by Booking Code
            </button>
            <button
              onClick={() => { setActiveTab('phone'); setError(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === 'phone' ? '#ffffff' : 'var(--text-secondary)',
                background: activeTab === 'phone' ? 'var(--tnau-green)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              Search by Mobile Phone
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSearch}>
            {activeTab === 'code' ? (
              <div className="form-group">
                <label className="form-label">Booking Reference Code</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. SH-849204"
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                    style={{ letterSpacing: '0.05em', fontWeight: 600 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <Search size={16} />
                    <span>Search</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Customer Mobile / WhatsApp Number</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <Search size={16} />
                    <span>Lookup</span>
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Feedback Messages */}
          {error && (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.85rem 1rem',
              background: 'var(--accent-rose-light)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: 'var(--radius-md)',
              margin: '1rem 0',
              fontSize: '0.85rem',
              color: 'var(--accent-rose)'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.85rem 1rem',
              background: 'var(--tnau-green-light)',
              border: '1px solid rgba(26, 107, 50, 0.2)',
              borderRadius: 'var(--radius-md)',
              margin: '1rem 0',
              fontSize: '0.85rem',
              color: 'var(--tnau-green)'
            }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Search Results List */}
          {results && results.length > 0 && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Found {results.length} Reservation{results.length > 1 ? 's' : ''}:
              </div>

              {results.map(booking => {
                const isCancelled = booking.booking_status === 'cancelled';
                const isCheckedOut = booking.booking_status === 'checked_out';
                const canCancel = !isCancelled && !isCheckedOut;
                const isPromptingCancel = cancellingBookingId === booking.id;

                const whatsappMsg = `Hello ${settings?.hotel_name || 'TNAU Guest House'}, I am inquiring about my booking ${booking.booking_code} for ${booking.room?.name || booking.room_name}.`;
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${settings?.whatsapp_number?.replace(/[^0-9]/g, '') || '919876543210'}&text=${encodeURIComponent(whatsappMsg)}`;

                return (
                  <div
                    key={booking.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${isCancelled ? 'rgba(220,38,38,0.2)' : 'var(--border-light)'}`,
                      boxShadow: 'var(--shadow-card)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      opacity: isCancelled ? 0.85 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {booking.room?.name || booking.room_name || 'Room Stay'}
                          </span>
                          <span className={`badge ${isCancelled ? 'badge-rose' : isCheckedOut ? 'badge-gold' : 'badge-emerald'}`}>
                            {booking.booking_status?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: isCancelled ? 'var(--accent-rose)' : 'var(--tnau-green)', fontWeight: 700, marginTop: '0.2rem' }}>
                          Ref: {booking.booking_code} • Guest: {booking.customer_name}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isCancelled ? 'var(--text-muted)' : 'var(--tnau-green)', fontFamily: 'var(--font-heading)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                          {settings?.currency_symbol || '₹'}{Number(booking.total_amount).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {booking.payment_status?.toUpperCase()} via {booking.payment_method?.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.85rem', background: '#f8f9fa', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Check-in: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{booking.check_in_date}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Check-out: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{booking.check_out_date}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Guests: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{booking.num_guests} Person(s)</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Nights: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{booking.num_nights} Night(s)</strong>
                      </div>
                    </div>

                    {/* Cancellation Confirmation Prompt */}
                    {isPromptingCancel && (
                      <div style={{
                        padding: '1rem',
                        background: '#fff1f2',
                        border: '1px solid rgba(220,38,38,0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '0.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b91c1c', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          <AlertTriangle size={16} />
                          <span>Confirm Booking Cancellation</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: '0 0 0.75rem', lineHeight: 1.4 }}>
                          Are you sure you want to cancel booking <strong>{booking.booking_code}</strong>? The room inventory will be instantly released.
                        </p>

                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                          <label className="form-label" style={{ fontSize: '0.78rem' }}>Reason for cancellation</label>
                          <select
                            className="form-select"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                          >
                            <option value="Change in Travel Plans">Change in Travel Plans</option>
                            <option value="Personal Emergency">Personal Emergency</option>
                            <option value="Booked by Mistake / Date Modification">Booked by Mistake / Date Modification</option>
                            <option value="Found Alternate Accommodation">Found Alternate Accommodation</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {cancelReason === 'Other' && (
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Please specify reason"
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}
                          />
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setCancellingBookingId(null)}
                            className="btn btn-sm btn-outline-gray"
                            disabled={cancellingInProgress}
                          >
                            Keep My Booking
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmCancel(booking)}
                            className="btn btn-sm btn-danger"
                            disabled={cancellingInProgress}
                          >
                            {cancellingInProgress ? (
                              <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Cancelling…</>
                            ) : (
                              <><Ban size={13} /> Yes, Cancel Booking</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!isPromptingCancel && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <div>
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingBookingId(booking.id);
                                setError('');
                                setSuccessMsg('');
                              }}
                              className="btn btn-sm btn-outline-danger"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <Ban size={14} />
                              <span>Cancel Reservation</span>
                            </button>
                          )}
                          {isCancelled && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                              ✕ Reservation Cancelled
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-whatsapp btn-sm"
                          >
                            <MessageSquare size={14} />
                            <span>Chat With Desk</span>
                          </a>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

