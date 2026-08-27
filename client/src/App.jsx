import React, { useState, useEffect, useRef } from 'react';
import { 
  Hotel, Sparkles, ShieldCheck, MessageCircle, 
  CreditCard, CheckCircle2, ChevronRight, Phone, 
  MapPin, Mail, Clock, HelpCircle, Star, Award, 
  Waves, Coffee, Wifi, Compass
} from 'lucide-react';
import Navbar from './components/Navbar';
import HeroSearch from './components/HeroSearch';
import RoomCard from './components/RoomCard';
import RoomDetailsModal from './components/RoomDetailsModal';
import BookingModal from './components/BookingModal';
import BookingSuccessModal from './components/BookingSuccessModal';
import FindBookingModal from './components/FindBookingModal';
import AdminDashboard from './components/admin/AdminDashboard';
import { fetchRooms, fetchSettings } from './utils/api';

export default function App() {
  // Today and Tomorrow strings
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Search filter states
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [guests, setGuests] = useState(2);
  const [category, setCategory] = useState('All');

  // Data states
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    hotel_name: 'Serenity Haven Luxury Villas & Suites',
    tagline: 'Experience Unmatched Serenity & Coastal Luxury',
    address: 'Beachside Road, Palolem, South Goa, India - 403702',
    phone: '+91 98765 43210',
    email: 'bookings@serenityhaven.com',
    whatsapp_number: '+919876543210',
    currency_symbol: '₹',
    currency_code: 'INR',
    tax_percentage: 12.0
  });

  // Modal triggers
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState(null);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [showFindBookingModal, setShowFindBookingModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const roomsSectionRef = useRef(null);

  // Load hotel settings
  const loadSettings = async () => {
    try {
      const res = await fetchSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (e) {
      console.log('Using default settings');
    }
  };

  // Load rooms with current filters
  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetchRooms({
        checkIn,
        checkOut,
        guests,
        category
      });
      if (res.success) {
        setRooms(res.data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadRooms();
  }, [checkIn, checkOut, guests, category]);

  const handleSearch = () => {
    loadRooms();
    if (roomsSectionRef.current) {
      roomsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToRooms = () => {
    if (roomsSectionRef.current) {
      roomsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
  const availableRoomsCount = rooms.filter(r => r.is_available !== false).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      
      {/* Navigation Header */}
      <Navbar
        settings={settings}
        onOpenFindBooking={() => setShowFindBookingModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
        onScrollToRooms={handleScrollToRooms}
      />

      {/* Main Hero & Search Banner */}
      <HeroSearch
        checkIn={checkIn}
        setCheckIn={setCheckIn}
        checkOut={checkOut}
        setCheckOut={setCheckOut}
        guests={guests}
        setGuests={setGuests}
        category={category}
        setCategory={setCategory}
        onSearch={handleSearch}
        totalAvailableRooms={availableRoomsCount}
        settings={settings}
      />

      {/* ROOMS CATALOG SECTION */}
      <main ref={roomsSectionRef} style={{ padding: '4rem 0 5rem', flex: 1 }}>
        <div className="container">
          
          {/* Section Heading & Category Filter Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '2.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div className="badge badge-emerald" style={{ marginBottom: '0.5rem' }}>
                <Sparkles size={13} />
                <span>Our Accommodations</span>
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
                Available Luxury Rooms & Suites
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Showing available rooms for {checkIn} → {checkOut} ({nights} {nights === 1 ? 'Night' : 'Nights'}, {guests} {guests === 1 ? 'Guest' : 'Guests'})
              </p>
            </div>

            {/* Quick Category filter buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['All', 'Villa', 'Suite', 'Deluxe'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: 'var(--radius-full)' }}
                >
                  {cat === 'All' ? 'All Types' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Rooms Grid */}
          {loading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '2rem'
            }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass-panel" style={{ height: '420px', borderRadius: 'var(--radius-xl)', opacity: 0.5, animation: 'pulseGlow 1.5s infinite' }} />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-subtle)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏝️</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                No Rooms Found
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.925rem' }}>
                There are no rooms matching your search criteria for {guests} guests in this category. Try adjusting your dates or guest count.
              </p>
              <button 
                onClick={() => { setCategory('All'); setGuests(2); }} 
                className="btn btn-primary"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '2rem'
            }}>
              {rooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  nights={nights}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  currencySymbol={settings.currency_symbol || '₹'}
                  onSelectRoom={(r) => setSelectedRoomForBooking(r)}
                  onViewDetails={(r) => setSelectedRoomForDetails(r)}
                />
              ))}
            </div>
          )}

        </div>
      </main>

      {/* WHY CHOOSE US & RESORT FEATURES */}
      <section style={{
        padding: '4.5rem 0',
        background: 'linear-gradient(180deg, var(--bg-main) 0%, var(--bg-surface) 100%)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="container">
          
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <div className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
              <Award size={13} />
              <span>The Serenity Guarantee</span>
            </div>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.75rem' }}>
              Why Book Directly With Us?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Experience frictionless luxury booking with instant WhatsApp confirmations and transparent pricing.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.75rem'
          }}>
            
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(37, 211, 102, 0.12)',
                color: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <MessageCircle size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                WhatsApp Direct Confirmations
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Receive full booking receipts, room voucher, and Google Maps directions straight to your WhatsApp mobile number instantly.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Zero Account Friction
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                No passwords to remember. Reserve your room in less than 60 seconds using just your name and mobile phone number.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <CreditCard size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Flexible Payment Modes
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Pay securely via UPI QR Code, Instant Debit/Credit Cards, or opt to pay at check-in upon arrival at the property.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#60a5fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Sparkles size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Best Price Guarantee
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Direct booking ensures the lowest available tariffs with no third-party booking commissions or surprise check-in fees.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section style={{ padding: '4.5rem 0', background: 'var(--bg-main)' }}>
        <div className="container" style={{ maxWidth: '840px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="badge badge-emerald" style={{ marginBottom: '0.5rem' }}>
              <HelpCircle size={13} />
              <span>Questions & Answers</span>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="glass-panel" style={{ padding: '1.4rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                Do I need an account or login to book a room?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                No account or login is required! Simply select your dates, choose your preferred room, enter your name and WhatsApp number, and complete payment. You will immediately receive your booking confirmation code and voucher.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '1.4rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                How do I receive my booking confirmation via WhatsApp?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                As soon as your booking is finalized, a dedicated WhatsApp confirmation link is automatically generated with your complete reservation details, check-in time, and resort directions. You can click <strong>"Open in WhatsApp"</strong> on your phone to open the chat instantly.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '1.4rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                How can I check my booking status later?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Click the <strong>"My Booking"</strong> button in the top navigation bar at any time and enter your phone number or booking reference code (e.g. SH-849201) to view and download your voucher.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '1.4rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                What are the check-in and check-out times?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Check-in is from 2:00 PM onwards, and check-out is until 11:00 AM. Early check-in or late check-out is subject to availability and can be requested via WhatsApp prior to your arrival.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#070a10',
        borderTop: '1px solid var(--border-subtle)',
        padding: '3.5rem 0 2rem',
        marginTop: 'auto'
      }}>
        <div className="container">
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem'
          }}>
            
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981, #065f46)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Hotel size={20} />
                </div>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  {settings.hotel_name || 'Serenity Haven'}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {settings.tagline || 'Experience Unmatched Serenity & Coastal Luxury'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={`https://api.whatsapp.com/send?phone=${settings.whatsapp_number?.replace(/[^0-9]/g, '') || '919876543210'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-sm"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp Concierge</span>
                </a>
              </div>
            </div>

            {/* Contact details */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
                Contact & Location
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <MapPin size={16} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{settings.address || 'Beachside Road, Palolem, South Goa, India'}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={16} color="#60a5fa" />
                  <span>{settings.phone || '+91 98765 43210'}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} color="#fbbf24" />
                  <span>{settings.email || 'bookings@serenityhaven.com'}</span>
                </li>
              </ul>
            </div>

            {/* Quick Links & Owner Entry */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
                Quick Navigation
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <li>
                  <button onClick={handleScrollToRooms} style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                    → Explore Rooms & Suites
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowFindBookingModal(true)} style={{ color: 'var(--text-secondary)', transition: 'color 0.2s' }}>
                    → Find My Reservation
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowAdminModal(true)} style={{ color: '#fbbf24', fontWeight: 600, transition: 'color 0.2s' }}>
                    🛡️ Owner / Admin Management
                  </button>
                </li>
              </ul>
            </div>

          </div>

          <div style={{
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              © {new Date().getFullYear()} {settings.hotel_name || 'Serenity Haven Retreat'}. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span>Instant Guest Booking System</span>
              <span>•</span>
              <span>Direct WhatsApp Confirmations</span>
            </div>
          </div>

        </div>
      </footer>

      {/* MODALS */}
      
      {/* 1. Room Details Modal */}
      {selectedRoomForDetails && (
        <RoomDetailsModal
          room={selectedRoomForDetails}
          onClose={() => setSelectedRoomForDetails(null)}
          onBookNow={(room) => {
            setSelectedRoomForDetails(null);
            setSelectedRoomForBooking(room);
          }}
          currencySymbol={settings.currency_symbol || '₹'}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
        />
      )}

      {/* 2. Guest Booking & Payment Modal (Zero Login) */}
      {selectedRoomForBooking && (
        <BookingModal
          room={selectedRoomForBooking}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          settings={settings}
          currencySymbol={settings.currency_symbol || '₹'}
          onClose={() => setSelectedRoomForBooking(null)}
          onBookingSuccess={(bookingData) => {
            setSelectedRoomForBooking(null);
            setConfirmedBookingData(bookingData);
            loadRooms(); // Refresh availability
          }}
        />
      )}

      {/* 3. Booking Success & WhatsApp Confirmation Modal */}
      {confirmedBookingData && (
        <BookingSuccessModal
          data={confirmedBookingData}
          onClose={() => setConfirmedBookingData(null)}
        />
      )}

      {/* 4. Find My Booking Modal */}
      {showFindBookingModal && (
        <FindBookingModal
          settings={settings}
          onClose={() => setShowFindBookingModal(false)}
        />
      )}

      {/* 5. Owner & Admin Dashboard */}
      {showAdminModal && (
        <AdminDashboard
          initialSettings={settings}
          onClose={() => setShowAdminModal(false)}
          onRoomUpdated={() => {
            loadRooms();
            loadSettings();
          }}
        />
      )}

    </div>
  );
}
