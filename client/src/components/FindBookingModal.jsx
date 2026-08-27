import React, { useState } from 'react';
import { X, Search, CalendarCheck, Phone, AlertCircle, MessageSquare, Printer, CheckCircle, Clock } from 'lucide-react';
import { lookupBooking, lookupBookingsByPhone } from '../utils/api';

export default function FindBookingModal({ onClose, settings }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setError('Please enter your mobile phone number or booking reference code');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      // Check if user entered a booking reference code (starts with SH- or letters) or phone number
      const isBookingCode = searchTerm.trim().toUpperCase().startsWith('SH-') || searchTerm.trim().length === 9;

      if (isBookingCode) {
        const res = await lookupBooking(searchTerm.trim());
        if (res.success && res.data?.booking) {
          setResults([res.data.booking]);
        } else {
          setError('No booking found matching this reference code.');
        }
      } else {
        const res = await lookupBookingsByPhone(searchTerm.trim());
        if (res.success && res.data && res.data.length > 0) {
          setResults(res.data);
        } else {
          setError('No bookings found for this phone number. Please check the number and try again.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Error searching reservation. Please try again.');
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
              <CalendarCheck size={16} />
              <span>Guest Self-Service</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>
              Find Your Reservation
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
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            No password or login needed. Enter the mobile phone number you booked with, or your <strong>SH-XXXXXX</strong> reference code.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 9876543210 or SH-582914"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Search size={16} />
              <span>{loading ? 'Searching...' : 'Find'}</span>
            </button>
          </form>

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

          {/* Search Results */}
          {results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Found {results.length} reservation(s):
              </div>

              {results.map((booking) => {
                const rawPhone = (booking.customer_phone || '').replace(/[^0-9]/g, '');
                const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                const whatsappMsg = `Hello ${settings?.hotel_name || 'Serenity Haven'}, I am inquiring about my booking ${booking.booking_code} for ${booking.customer_name}.`;
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${settings?.whatsapp_number?.replace(/[^0-9]/g, '') || '919876543210'}&text=${encodeURIComponent(whatsappMsg)}`;

                return (
                  <div
                    key={booking.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{booking.room?.name || booking.room_name || 'Room Stay'}</span>
                          <span className="badge badge-emerald">{booking.booking_status}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                          Ref: {booking.booking_code} • Guest: {booking.customer_name}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>
                          {settings?.currency_symbol || '₹'}{Number(booking.total_amount).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {booking.payment_status?.toUpperCase()} via {booking.payment_method?.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Check-in: </span>
                        <strong style={{ color: '#ffffff' }}>{booking.check_in_date}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Check-out: </span>
                        <strong style={{ color: '#ffffff' }}>{booking.check_out_date}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Guests: </span>
                        <strong style={{ color: '#ffffff' }}>{booking.num_guests} Person(s)</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Nights: </span>
                        <strong style={{ color: '#ffffff' }}>{booking.num_nights} Night(s)</strong>
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
                        <span>Chat via WhatsApp</span>
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
