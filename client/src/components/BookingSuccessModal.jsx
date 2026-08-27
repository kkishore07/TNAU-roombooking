import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2, Printer, MapPin,
  Phone, Mail, Calendar, Users, X,
  BadgeCheck, Sparkles, Building2
} from 'lucide-react';

export default function BookingSuccessModal({ data, onClose }) {
  if (!data) return null;

  const { booking, settings, notifications } = data;
  const currency = settings?.currency_symbol || '₹';

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.55 },
      colors: ['#1a6b32', '#b8860b', '#ffffff', '#a7f3d0']
    });
  }, []);

  const handlePrint = () => window.print();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '580px', padding: 0, overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header Banner ───────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a6b32 0%, #0f4a21 60%, #1a6b32 100%)',
          padding: '2rem 1.75rem',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', padding: '0.4rem' }}
          >
            <X size={18} />
          </button>

          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ffffff', color: '#1a6b32', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <CheckCircle2 size={38} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.35rem', color: '#ffffff' }}>
            Reservation Confirmed! 🎉
          </h2>
          <p style={{ fontSize: '0.925rem', color: '#a7f3d0', maxWidth: '420px', margin: '0 auto' }}>
            Thank you, <strong style={{ color: '#ffffff' }}>{booking.customer_name}</strong>. Your stay at TNAU Guest House is secured.
          </p>

          {/* Booking code badge */}
          <div style={{ marginTop: '1.25rem', display: 'inline-block', padding: '0.5rem 1.5rem', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>Booking Reference: </span>
            <strong style={{ fontSize: '1.15rem', letterSpacing: '0.1em', color: '#ffffff' }}>{booking.booking_code}</strong>
          </div>
        </div>

        {/* ── Automated Dispatch Confirmation Strip ─────────────────────── */}
        <div style={{
          padding: '0.85rem 1.5rem',
          background: '#f0f7f2',
          borderBottom: '1px solid rgba(26,107,50,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BadgeCheck size={16} color="var(--tnau-green)" />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--tnau-green)' }}>
              Confirmation sent to {booking.customer_email || booking.customer_phone}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', background: 'var(--tnau-green)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '100px', fontWeight: 600 }}>
            AUTO-DISPATCHED
          </span>
        </div>

        {/* ── Voucher Receipt Body ──────────────────────────────────────── */}
        <div style={{ padding: '1.25rem 1.5rem' }}>

          <div style={{ background: '#f8f9fa', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '1.25rem' }}>

            {/* Room + Amount */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--tnau-green)', fontWeight: 700, letterSpacing: '0.04em' }}>Reserved Room</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{booking.room?.name || 'Reserved Room'}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{booking.room?.bed_type || ''} • {booking.num_guests} Guest{booking.num_guests > 1 ? 's' : ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${booking.payment_status === 'paid' ? 'badge-emerald' : 'badge-gold'}`}>
                  {booking.payment_status === 'paid' ? '✓ Paid' : 'Pay at Property'}
                </span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--tnau-green)', marginTop: '0.3rem', fontFamily: 'var(--font-heading)' }}>
                  {currency}{Number(booking.total_amount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Check-in / Check-out */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Check-in</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{booking.check_in_date}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--tnau-green)', fontWeight: 600 }}>From 2:00 PM</div>
              </div>
              <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Check-out</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{booking.check_out_date}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--tnau-gold-dark)', fontWeight: 600 }}>Until 11:00 AM</div>
              </div>
            </div>

            {/* Hotel Contact & Details */}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                <MapPin size={13} color="var(--tnau-green)" style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{settings?.address || 'TNAU Campus, Lawley Road, Coimbatore, Tamil Nadu - 641003'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={13} color="var(--accent-blue)" />
                <span>Reception Support: {settings?.phone || '+91 97860 00328'}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={handlePrint} className="btn btn-outline-gray btn-sm">
              <Printer size={14} />
              <span>Print Official Receipt</span>
            </button>
            <button onClick={onClose} className="btn btn-primary">
              Done
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
