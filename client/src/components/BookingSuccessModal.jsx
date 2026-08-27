import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, MessageSquare, Printer, MapPin, 
  Phone, Calendar, Users, Hotel, Download, Share2, Sparkles, X 
} from 'lucide-react';

export default function BookingSuccessModal({ data, onClose }) {
  if (!data) return null;

  const { booking, whatsapp, settings } = data;

  useEffect(() => {
    // Trigger celebratory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '620px', padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #10b981 100%)',
          padding: '2rem 1.75rem',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              color: 'rgba(255, 255, 255, 0.8)',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '50%',
              padding: '0.4rem'
            }}
          >
            <X size={18} />
          </button>

          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#ffffff',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
          }}>
            <CheckCircle2 size={38} />
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.35rem', color: '#ffffff' }}>
            Reservation Confirmed!
          </h2>
          <p style={{ fontSize: '0.925rem', color: '#d1fae5', maxWidth: '420px', margin: '0 auto' }}>
            Thank you, <strong>{booking.customer_name}</strong>. Your luxury stay has been secured.
          </p>

          {/* Reference Badge */}
          <div style={{
            marginTop: '1.25rem',
            display: 'inline-block',
            padding: '0.5rem 1.25rem',
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>Booking Reference: </span>
            <strong style={{ fontSize: '1.1rem', letterSpacing: '0.08em', color: '#ffffff' }}>{booking.booking_code}</strong>
          </div>
        </div>

        {/* WhatsApp Notification CTA Strip */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'rgba(37, 211, 102, 0.12)',
          borderBottom: '1px solid rgba(37, 211, 102, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>WhatsApp Confirmation</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Send voucher directly to {booking.customer_phone}</div>
            </div>
          </div>

          <a
            href={whatsapp?.url || `https://api.whatsapp.com/send?phone=${booking.customer_phone}&text=Booking%20Confirmed%20${booking.booking_code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
          >
            <MessageSquare size={16} />
            <span>Open in WhatsApp</span>
          </a>
        </div>

        {/* Voucher Receipt Body */}
        <div style={{ padding: '1.5rem' }}>
          
          <div style={{
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '1.25rem'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700 }}>Reserved Room</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>{booking.room?.name || 'Luxury Suite'}</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{booking.room?.bed_type || 'King Bed'} • {booking.num_guests} Guests</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-emerald">
                  {booking.payment_status === 'paid' ? 'Paid in Full' : 'Pay at Property'}
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '0.3rem', fontFamily: 'var(--font-heading)' }}>
                  {settings?.currency_symbol || '₹'}{Number(booking.total_amount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Check-in / Out Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CHECK-IN</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{booking.check_in_date}</div>
                <div style={{ fontSize: '0.75rem', color: '#34d399' }}>From 2:00 PM</div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CHECK-OUT</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{booking.check_out_date}</div>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>Until 11:00 AM</div>
              </div>
            </div>

            {/* Hotel Location & Support */}
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="#34d399" />
                <span>{settings?.address || 'Beachside Road, Palolem, South Goa, India'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={14} color="#60a5fa" />
                <span>Support: {settings?.phone || '+91 98765 43210'}</span>
              </div>
            </div>

          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={handlePrint}
              className="btn btn-outline btn-sm"
              title="Print voucher receipt"
            >
              <Printer size={15} />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={onClose}
              className="btn btn-primary"
            >
              <span>Back to Home</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
