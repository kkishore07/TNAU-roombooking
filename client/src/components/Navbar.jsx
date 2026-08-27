import React from 'react';
import { Search, ShieldCheck, MessageCircle, CalendarCheck } from 'lucide-react';
import tnauLogo from '../assets/tnau_logo.png';

export default function Navbar({ onOpenFindBooking, onOpenAdmin, settings, onScrollToRooms }) {
  const hotelName = settings?.hotel_name || 'TNAU Guest House';
  const whatsappNumber = (settings?.whatsapp_number || '+919876543210').replace(/[^0-9]/g, '');

  return (
    <header className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          {/* TNAU Logo */}
          <img
            src={tnauLogo}
            alt="TNAU Logo"
            style={{
              width: '52px',
              height: '52px',
              objectFit: 'contain',
              borderRadius: '50%',
              border: '2px solid rgba(26, 107, 50, 0.2)',
              padding: '2px',
              background: '#ffffff'
            }}
          />
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.05rem',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              color: 'var(--tnau-green)',
              lineHeight: 1.2
            }}>
              {hotelName}
            </div>
            <div style={{
              fontSize: '0.68rem',
              color: 'var(--tnau-gold)',
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase'
            }}>
              Tamil Nadu Agricultural University
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          
          <button 
            onClick={onScrollToRooms}
            className="btn btn-outline-gray btn-sm"
            style={{ display: 'inline-flex' }}
          >
            <Search size={15} />
            <span className="nav-btn-text">Browse Rooms</span>
          </button>

          <button 
            onClick={onOpenFindBooking}
            className="btn btn-secondary btn-sm"
            title="Lookup your reservation"
          >
            <CalendarCheck size={15} color="var(--tnau-green)" />
            <span className="nav-btn-text">My Booking</span>
          </button>

          <a 
            href={`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=Hello%20${encodeURIComponent(hotelName)},%20I%20have%20an%20inquiry%20regarding%20room%20booking.`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
            title="Chat with Reception"
          >
            <MessageCircle size={15} />
            <span className="nav-btn-text">WhatsApp</span>
          </a>

          <button 
            onClick={onOpenAdmin}
            className="btn btn-sm"
            style={{
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid rgba(184, 134, 11, 0.4)',
              color: 'var(--tnau-gold-dark)',
              background: 'rgba(184, 134, 11, 0.07)',
              fontWeight: 600
            }}
            title="Owner & Manager Login"
          >
            <ShieldCheck size={15} />
            <span className="nav-btn-text">Admin</span>
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
