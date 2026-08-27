import React from 'react';
import { Hotel, Search, ShieldCheck, MessageCircle, Phone, CalendarCheck } from 'lucide-react';

export default function Navbar({ onOpenFindBooking, onOpenAdmin, settings, onScrollToRooms }) {
  const hotelName = settings?.hotel_name || 'Serenity Haven';
  const whatsappNumber = (settings?.whatsapp_number || '+919876543210').replace(/[^0-9]/g, '');

  return (
    <header className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #065f46)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
          }}>
            <Hotel size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              {hotelName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Boutique Villas & Suites
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          
          <button 
            onClick={onScrollToRooms}
            className="btn btn-outline btn-sm"
            style={{ display: 'none', md: 'inline-flex' }}
          >
            <Search size={15} />
            <span>Browse Rooms</span>
          </button>

          <button 
            onClick={onOpenFindBooking}
            className="btn btn-secondary btn-sm"
            title="Lookup your reservation"
          >
            <CalendarCheck size={16} color="#34d399" />
            <span className="nav-btn-text">My Booking</span>
          </button>

          <a 
            href={`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=Hello%20${encodeURIComponent(hotelName)},%20I%20have%20an%20inquiry%20regarding%20room%20booking.`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
            title="Chat with Reception"
          >
            <MessageCircle size={16} />
            <span className="nav-btn-text">WhatsApp</span>
          </a>

          <button 
            onClick={onOpenAdmin}
            className="btn btn-outline btn-sm"
            style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.08)' }}
            title="Owner & Manager Login"
          >
            <ShieldCheck size={16} />
            <span className="nav-btn-text">Owner Portal</span>
          </button>

        </div>
      </div>
      <style>{`
        @media (max-width: 680px) {
          .nav-btn-text {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
