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
import tnauLogo from './assets/tnau_logo.png';

export default function App() {
  // Today and Tomorrow strings
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Search filter states
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkInTime, setCheckInTime] = useState('02:00 PM');
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
        checkInTime={checkInTime}
        setCheckInTime={setCheckInTime}
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
      <main ref={roomsSectionRef} style={{ padding: '3.5rem 0 5rem', flex: 1, background: 'var(--bg-main)' }}>
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
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--tnau-green)' }}>
                Available Rooms & Accommodations
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
                <div key={i} className="skeleton" style={{ height: '420px', borderRadius: 'var(--radius-xl)' }} />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--tnau-green)', marginBottom: '0.5rem' }}>
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

      {/* WHY CHOOSE US & FEATURES */}
      <section style={{
        padding: '4.5rem 0',
        background: '#ffffff',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div className="container">
          
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem' }}>
            <div className="badge badge-gold" style={{ marginBottom: '0.6rem' }}>
              <Award size={13} />
              <span>Why Book With Us</span>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--tnau-green)', marginBottom: '0.75rem' }}>
              Simple, Secure & Instant Booking
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Reserve your accommodation at TNAU with ease — no logins, instant email confirmations, and transparent pricing.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem'
          }}>
            
            <div className="info-card">
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(37, 211, 102, 0.1)',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <MessageCircle size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Email Receipts & WhatsApp Chat
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6 }}>
                Receive full booking receipts and itemized invoices directly in your email, with instant WhatsApp chat support.
              </p>
            </div>

            <div className="info-card">
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(26, 107, 50, 0.08)',
                color: 'var(--tnau-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                No Account Needed
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6 }}>
                No passwords to remember. Reserve in under 60 seconds using just your name and phone number.
              </p>
            </div>

            <div className="info-card">
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(184, 134, 11, 0.1)',
                color: 'var(--tnau-gold-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <CreditCard size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Flexible Payment
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6 }}>
                Pay via UPI QR Code, Debit/Credit Cards, or at the front desk upon check-in.
              </p>
            </div>

            <div className="info-card">
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'rgba(29, 78, 216, 0.08)',
                color: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Sparkles size={22} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Best Rate Guaranteed
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6 }}>
                Direct booking gives you the best available tariffs — no commissions or hidden fees.
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
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--tnau-green)' }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            
            <div style={{ padding: '1.4rem', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Do I need an account or login to book a room?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                No account or login is required! Simply select your dates, choose your preferred room, enter your name and WhatsApp number, and complete payment. You will immediately receive your booking confirmation code and voucher.
              </p>
            </div>

            <div style={{ padding: '1.4rem', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                How do I receive my booking confirmation?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                As soon as your booking is finalized, an itemized booking confirmation and invoice are sent directly to your email address. You can also click <strong>"Chat on WhatsApp"</strong> anytime to connect with our front desk.
              </p>
            </div>

            <div style={{ padding: '1.4rem', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                How can I check my booking status later?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Click the <strong>"My Booking"</strong> button in the top navigation bar and enter your phone number or booking reference code to view and download your voucher.
              </p>
            </div>

            <div style={{ padding: '1.4rem', borderRadius: 'var(--radius-md)', background: '#ffffff', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                What are the check-in and check-out times?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                Check-in is from 2:00 PM onwards, and check-out is until 11:00 AM. Early check-in or late check-out is subject to availability — please contact the front desk in advance.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: 'var(--tnau-green)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '3rem 0 1.75rem',
        marginTop: 'auto'
      }}>
        <div className="container">
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem'
          }}>
            
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img
                  src={tnauLogo}
                  alt="TNAU"
                  style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '50%', background: '#fff', padding: '2px' }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                    {settings.hotel_name || 'TNAU Guest House'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    Tamil Nadu Agricultural University
                  </div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {settings.tagline || 'Comfortable accommodation for TNAU guests, researchers, and visitors.'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={`https://api.whatsapp.com/send?phone=${settings.whatsapp_number?.replace(/[^0-9]/g, '') || '919876543210'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-whatsapp btn-sm"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp Us</span>
                </a>
              </div>
            </div>

            {/* Contact details */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
                Contact & Location
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <MapPin size={15} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{settings.address || 'TNAU Campus, Coimbatore - 641003, Tamil Nadu'}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Phone size={15} color="#fbbf24" />
                  <span>{settings.phone || '+91 422 661 1200'}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={15} color="#fbbf24" />
                  <span>{settings.email || 'guesthouse@tnau.ac.in'}</span>
                </li>
              </ul>
            </div>

            {/* Quick Links & Owner Entry */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem' }}>
                Quick Navigation
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <li>
                  <button onClick={handleScrollToRooms} style={{ color: 'rgba(255,255,255,0.75)', transition: 'color 0.2s' }}>
                    → Browse Rooms
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowFindBookingModal(true)} style={{ color: 'rgba(255,255,255,0.75)', transition: 'color 0.2s' }}>
                    → Find My Reservation
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowAdminModal(true)} style={{ color: '#fbbf24', fontWeight: 600, transition: 'color 0.2s' }}>
                    🛡️ Admin Portal
                  </button>
                </li>
              </ul>
            </div>

          </div>

          <div style={{
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.78rem',
            color: 'rgba(255,255,255,0.6)'
          }}>
            <div>
              © {new Date().getFullYear()} {settings.hotel_name || 'TNAU Guest House'} · Tamil Nadu Agricultural University. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <span>Online Room Booking System</span>
              <span>•</span>
              <span>WhatsApp Confirmations</span>
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
          checkInTime={checkInTime}
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
