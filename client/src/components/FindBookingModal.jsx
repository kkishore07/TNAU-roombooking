import React, { useState } from 'react';
import { Search, X, Calendar, Phone, MessageSquare, AlertCircle, ArrowRight, CheckCircle2, Building, User, Clock, FileText } from 'lucide-react';
import { lookupBooking, lookupBookingsByPhone } from '../utils/api';

export default function FindBookingModal({ onClose, settings }) {
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'phone'
  const [bookingCode, setBookingCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResults(null);
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span className="badge badge-emerald" style={{ marginBottom: '0.25rem' }}>
              Guest Portal
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Find & Manage Your Reservation
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
              onClick={() => { setActiveTab('code'); setError(''); }}
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
              onClick={() => { setActiveTab('phone'); setError(''); }}
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

          {/* Error Message */}
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

          {/* Search Results List */}
          {results && results.length > 0 && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Found {results.length} Reservation{results.length > 1 ? 's' : ''}:
              </div>

              {results.map(booking => {
                const whatsappMsg = `Hello ${settings?.hotel_name || 'TNAU Guest House'}, I am inquiring about my booking ${booking.booking_code} for ${booking.room?.name || booking.room_name}.`;
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${settings?.whatsapp_number?.replace(/[^0-9]/g, '') || '919876543210'}&text=${encodeURIComponent(whatsappMsg)}`;

                return (
                  <div
                    key={booking.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-light)',
                      boxShadow: 'var(--shadow-card)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{booking.room?.name || booking.room_name || 'Room Stay'}</span>
                          <span className="badge badge-emerald">{booking.booking_status}</span>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--tnau-green)', fontWeight: 700, marginTop: '0.2rem' }}>
                          Ref: {booking.booking_code} • Guest: {booking.customer_name}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--tnau-green)', fontFamily: 'var(--font-heading)' }}>
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
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
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
