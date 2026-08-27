import React, { useState } from 'react';
import { X, Users, Bed, Maximize, CheckCircle2, Shield, Clock, Sparkles, AlertCircle, ChevronRight } from 'lucide-react';

export default function RoomDetailsModal({ room, onClose, onBookNow, currencySymbol = '₹', checkIn, checkOut, nights = 1 }) {
  if (!room) return null;

  const images = Array.isArray(room.images) && room.images.length > 0
    ? room.images
    : ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'];

  const [activeImage, setActiveImage] = useState(images[0]);
  const amenities = Array.isArray(room.amenities) ? room.amenities : [];
  const isAvailable = room.is_available !== false;

  const basePrice = room.price_per_night * nights;
  const tax = Math.round(basePrice * 0.12);
  const totalPrice = basePrice + tax;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '820px', padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span className="badge badge-emerald" style={{ marginBottom: '0.35rem' }}>
              {room.category}
            </span>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#ffffff' }}>
              {room.name}
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
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          
          {/* Main Large Photo */}
          <div style={{
            width: '100%',
            height: '340px',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            marginBottom: '0.75rem',
            background: '#000000'
          }}>
            <img 
              src={activeImage} 
              alt={room.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {images.map((img, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  style={{
                    width: '76px',
                    height: '56px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: activeImage === img ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    opacity: activeImage === img ? 1 : 0.65,
                    transition: 'all 0.2s'
                  }}
                >
                  <img src={img} alt={`Thumb ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          {/* Room Specs Highlights */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            padding: '1rem',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Users size={18} color="#34d399" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Guests</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>{room.capacity} Persons</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Bed size={18} color="#60a5fa" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bed Type</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>{room.bed_type || 'King Bed'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Maximize size={18} color="#fbbf24" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room Size</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>{room.room_size || '450 sq ft'}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
              About This Room
            </h4>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {room.description}
            </p>
          </div>

          {/* Full Amenities */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: '#ffffff' }}>
              Amenities & Inclusions
            </h4>
            <div className="amenities-grid">
              {amenities.map((amenity, idx) => (
                <div key={idx} className="amenity-chip">
                  <CheckCircle2 size={14} />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hotel Policies & Timings */}
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            marginBottom: '1rem',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: 600, color: '#93c5fd', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} />
              <span>Check-in / Check-out & Booking Policies</span>
            </div>
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
              <li><strong>Check-in:</strong> From 2:00 PM onwards</li>
              <li><strong>Check-out:</strong> Until 11:00 AM</li>
              <li><strong>Zero Login Required:</strong> Instant confirmation sent directly to your WhatsApp.</li>
              <li><strong>Identification:</strong> Valid government ID is required at check-in.</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer with Live Pricing & Reserve CTA */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {nights} Night(s) Stay • {checkIn ? `${checkIn} to ${checkOut}` : 'Select dates to book'}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>
                {currencySymbol}{Number(totalPrice).toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                (includes {currencySymbol}{tax} taxes)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} className="btn btn-outline btn-sm">
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onBookNow(room);
              }}
              disabled={!isAvailable}
              className="btn btn-primary"
            >
              <span>{isAvailable ? 'Proceed to Book' : 'Fully Booked'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
