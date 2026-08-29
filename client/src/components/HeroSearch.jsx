import React from 'react';
import { Calendar, Clock, Users, Sparkles, ShieldCheck, MessageSquare, CreditCard, ChevronRight, Building2 } from 'lucide-react';
import tnauLogo from '../assets/tnau_logo.png';

export default function HeroSearch({
  checkIn,
  setCheckIn,
  checkInTime = '02:00 PM',
  setCheckInTime,
  checkOut,
  setCheckOut,
  guests,
  setGuests,
  category,
  setCategory,
  onSearch,
  totalAvailableRooms,
  settings
}) {
  const hotelName = settings?.hotel_name || 'TNAU Guest House';
  const tagline = settings?.tagline || 'Comfortable Stay at Tamil Nadu Agricultural University';

  const todayStr = new Date().toISOString().split('T')[0];
  const minCheckOutStr = checkIn ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0] : todayStr;

  const categories = ['All', 'Villa', 'Suite', 'Deluxe'];

  return (
    <section style={{
      position: 'relative',
      background: 'linear-gradient(160deg, #f0f7f2 0%, #e8f4ec 40%, #f5f0e8 100%)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0 0 3rem'
    }}>
      {/* Top accent bar */}
      <div style={{
        height: '4px',
        background: 'linear-gradient(90deg, var(--tnau-green) 0%, var(--tnau-gold) 50%, var(--tnau-green) 100%)'
      }} />

      <div className="container" style={{ paddingTop: '3rem' }}>
        
        {/* Header with Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          textAlign: 'center',
          marginBottom: '2.5rem',
          gap: '1rem'
        }}>
          {/* Large centered logo */}
          <img
            src={tnauLogo}
            alt="TNAU Logo"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'contain',
              borderRadius: '50%',
              border: '3px solid rgba(26, 107, 50, 0.2)',
              padding: '4px',
              background: '#ffffff',
              boxShadow: '0 6px 24px rgba(26, 107, 50, 0.12)'
            }}
          />

          {/* University name */}
          <div>
            <div className="badge badge-emerald" style={{ marginBottom: '0.75rem', padding: '0.35rem 1rem', fontSize: '0.75rem' }}>
              <Sparkles size={13} />
              <span>Online Room Booking Portal</span>
            </div>
            <h1 style={{
              fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--tnau-green)',
              marginBottom: '0.4rem',
              lineHeight: 1.2
            }}>
              {hotelName}
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'var(--tnau-gold-dark)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              marginBottom: '0.5rem'
            }}>
              Tamil Nadu Agricultural University, Coimbatore
            </p>
            <p style={{
              fontSize: 'clamp(0.9rem, 1.5vw, 1rem)',
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: 1.6
            }}>
              {tagline}
            </p>
          </div>
        </div>

        {/* Search & Date Filter Card */}
        <div style={{
          maxWidth: '960px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(26, 107, 50, 0.12)'
        }}>
          
          {/* Category Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.4rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem'
          }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '0.42rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)',
                  background: category === cat ? 'var(--tnau-green)' : '#f1f5f9',
                  color: category === cat ? '#ffffff' : 'var(--text-secondary)',
                  border: category === cat ? 'none' : '1px solid #e2e8f0',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {cat === 'All' ? '🏢 All Room Types' : cat === 'Villa' ? '🏡 Villas' : cat === 'Suite' ? '👑 Suites' : '🛏️ Deluxe'}
              </button>
            ))}
          </div>

          {/* Form Inputs Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end'
          }}>
            
            {/* Check-In Date */}
            <div>
              <label className="form-label">
                <Calendar size={14} color="var(--tnau-green)" />
                <span>Check-in Date</span>
              </label>
              <input
                type="date"
                className="form-input"
                min={todayStr}
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (checkOut && new Date(e.target.value) >= new Date(checkOut)) {
                    const nextDay = new Date(new Date(e.target.value).getTime() + 86400000).toISOString().split('T')[0];
                    setCheckOut(nextDay);
                  }
                }}
                style={{ height: '46px', colorScheme: 'light' }}
              />
            </div>

            {/* Check-In Time */}
            <div>
              <label className="form-label">
                <Clock size={14} color="var(--tnau-green)" />
                <span>Check-in Time</span>
              </label>
              <select
                className="form-select"
                value={checkInTime}
                onChange={(e) => setCheckInTime && setCheckInTime(e.target.value)}
                style={{ height: '46px' }}
              >
                <option value="10:00 AM">10:00 AM (Early)</option>
                <option value="11:00 AM">11:00 AM (Early)</option>
                <option value="12:00 PM">12:00 PM (Noon)</option>
                <option value="01:00 PM">01:00 PM</option>
                <option value="02:00 PM">02:00 PM (Standard)</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="05:00 PM">05:00 PM</option>
                <option value="06:00 PM">06:00 PM</option>
                <option value="07:00 PM">07:00 PM</option>
                <option value="08:00 PM">08:00 PM (Late)</option>
                <option value="09:00 PM">09:00 PM (Late)</option>
                <option value="10:00 PM">10:00 PM or Later</option>
              </select>
            </div>

            {/* Check-Out Date */}
            <div>
              <label className="form-label">
                <Calendar size={14} color="var(--tnau-gold)" />
                <span>Check-out Date</span>
              </label>
              <input
                type="date"
                className="form-input"
                min={minCheckOutStr}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                style={{ height: '46px', colorScheme: 'light' }}
              />
            </div>

            {/* Number of Guests */}
            <div>
              <label className="form-label">
                <Users size={14} color="var(--accent-blue)" />
                <span>Guests</span>
              </label>
              <select
                className="form-select"
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                style={{ height: '46px' }}
              >
                <option value={1}>1 Guest</option>
                <option value={2}>2 Guests</option>
                <option value={3}>3 Guests</option>
                <option value={4}>4 Guests (Family)</option>
                <option value={5}>5+ Guests</option>
              </select>
            </div>

            {/* Search CTA Button */}
            <div>
              <button
                onClick={onSearch}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', height: '46px' }}
              >
                <span>Check Availability</span>
                <ChevronRight size={17} />
              </button>
            </div>

          </div>

          {/* Quick Date Summary Bar */}
          {checkIn && checkOut && (
            <div style={{
              marginTop: '1.1rem',
              padding: '0.7rem 1rem',
              background: 'var(--tnau-green-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(26, 107, 50, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--tnau-green)' }}>
                <Calendar size={15} />
                <span>
                  <strong>{Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))} Night(s)</strong>: {new Date(checkIn).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} (from {checkInTime}) → {new Date(checkOut).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <span className="badge badge-emerald">
                {totalAvailableRooms} Room{totalAvailableRooms !== 1 ? 's' : ''} Available
              </span>
            </div>
          )}

        </div>

        {/* Value Props Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          maxWidth: '960px',
          margin: '2rem auto 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'rgba(26, 107, 50, 0.1)', color: 'var(--tnau-green)', flexShrink: 0 }}>
              <MessageSquare size={17} />
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Email Receipt & WhatsApp Chat</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Official invoice + direct front desk chat</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'rgba(29, 78, 216, 0.08)', color: 'var(--accent-blue)', flexShrink: 0 }}>
              <ShieldCheck size={17} />
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>No Account Required</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Book in under 60 seconds</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.55rem', borderRadius: '10px', background: 'rgba(184, 134, 11, 0.1)', color: 'var(--tnau-gold-dark)', flexShrink: 0 }}>
              <CreditCard size={17} />
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Flexible Payment</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>UPI, Cards & Pay at Desk</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
