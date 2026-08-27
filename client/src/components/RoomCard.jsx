import React, { useState } from 'react';
import { Users, Bed, Maximize, Check, ChevronLeft, ChevronRight, Sparkles, Shield, Wifi, Coffee, Tv, Waves } from 'lucide-react';

export default function RoomCard({ room, onSelectRoom, onViewDetails, currencySymbol = '₹', nights = 1, checkIn, checkOut }) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const images = Array.isArray(room.images) && room.images.length > 0 
    ? room.images 
    : ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'];

  const amenities = Array.isArray(room.amenities) ? room.amenities : [];
  const isAvailable = room.is_available !== false;
  const availableCount = room.available_inventory ?? room.total_inventory;

  const handlePrevImg = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImg = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const calculateTotal = () => {
    const base = room.price_per_night * nights;
    const tax = Math.round(base * 0.12);
    return base + tax;
  };

  return (
    <div 
      style={{
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1), 0 4px 12px rgba(26,107,50,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      {/* Image Gallery Container */}
      <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden', background: '#f1f5f9' }}>
        <img 
          src={images[currentImgIndex]} 
          alt={room.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease'
          }}
        />

        {/* Category Badge & Availability Tag */}
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem', zIndex: 3 }}>
          <span className="badge badge-emerald">
            {room.category}
          </span>
          {isAvailable ? (
            availableCount <= 2 ? (
              <span className="badge badge-gold">
                ⚠️ Only {availableCount} Left
              </span>
            ) : (
              <span className="badge badge-emerald" style={{ background: 'rgba(6, 95, 70, 0.85)', color: '#a7f3d0' }}>
                ✓ Available
              </span>
            )
          ) : (
            <span className="badge badge-rose">
              ✕ Fully Booked
            </span>
          )}
        </div>

        {/* Image navigation arrows if multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevImg}
              style={{
                position: 'absolute',
                top: '50%',
                left: '0.75rem',
                transform: 'translateY(-50%)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.65)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 4,
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
              title="Previous photo"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextImg}
              style={{
                position: 'absolute',
                top: '50%',
                right: '0.75rem',
                transform: 'translateY(-50%)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.65)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 4,
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
              title="Next photo"
            >
              <ChevronRight size={18} />
            </button>
            
            {/* Dots */}
            <div style={{
              position: 'absolute',
              bottom: '0.75rem',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '0.35rem',
              zIndex: 3
            }}>
              {images.map((_, idx) => (
                <div 
                  key={idx}
                  style={{
                    width: idx === currentImgIndex ? '16px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: idx === currentImgIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Room Content */}
      <div style={{ padding: '1.4rem 1.4rem 1.6rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        
        <div>
          {/* Key Specs Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Users size={14} color="var(--tnau-green)" />
              <span>Up to {room.capacity} Guests</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Bed size={14} color="#60a5fa" />
              <span>{room.bed_type || 'King Bed'}</span>
            </div>
            {room.room_size && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Maximize size={14} color="#fbbf24" />
                <span>{room.room_size}</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
            {room.name}
          </h3>

          {/* Description snippet */}
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: '1rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {room.description}
          </p>

          {/* Key Amenities Preview */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.4rem' }}>
            {amenities.slice(0, 4).map((amenity, idx) => (
              <span 
                key={idx} 
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.6rem',
                  background: 'var(--tnau-green-light)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--tnau-green-dark)',
                  border: '1px solid rgba(26, 107, 50, 0.15)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Check size={12} color="var(--tnau-green)" />
                {amenity}
              </span>
            ))}
            {amenities.length > 4 && (
              <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--text-muted)' }}>
                +{amenities.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA footer */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--tnau-green)', fontFamily: 'var(--font-heading)' }}>
                {currencySymbol}{Number(room.price_per_night).toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ night</span>
            </div>
            {nights > 1 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                Total: {currencySymbol}{calculateTotal().toLocaleString('en-IN')} ({nights} nights incl. tax)
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onViewDetails(room)}
              className="btn btn-secondary btn-sm"
              title="View room details & all photos"
            >
              Details
            </button>
            <button
              onClick={() => onSelectRoom(room)}
              disabled={!isAvailable}
              className={`btn btn-sm ${isAvailable ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                opacity: isAvailable ? 1 : 0.5,
                cursor: isAvailable ? 'pointer' : 'not-allowed'
              }}
            >
              {isAvailable ? 'Book Room' : 'Sold Out'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
