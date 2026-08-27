import React from 'react';
import { Calendar, Users, Sparkles, ShieldCheck, MessageSquare, CreditCard, ChevronRight } from 'lucide-react';

export default function HeroSearch({
  checkIn,
  setCheckIn,
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
  const hotelName = settings?.hotel_name || 'Serenity Haven';
  const tagline = settings?.tagline || 'Experience Unmatched Serenity & Coastal Luxury';

  // Get tomorrow's date string for default check-out min
  const todayStr = new Date().toISOString().split('T')[0];
  const minCheckOutStr = checkIn ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0] : todayStr;

  const categories = ['All', 'Villa', 'Suite', 'Deluxe'];

  return (
    <section style={{
      position: 'relative',
      padding: '4.5rem 0 3.5rem',
      background: 'radial-gradient(ellipse at 50% 10%, rgba(16, 185, 129, 0.12) 0%, rgba(11, 15, 23, 0.95) 75%), url("https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1920&q=80")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      {/* Dark Overlay Tint */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(11, 15, 23, 0.85) 0%, rgba(11, 15, 23, 0.95) 100%)',
        zIndex: 1
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        
        {/* Top Badges */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div className="badge badge-emerald" style={{ padding: '0.45rem 1rem', fontSize: '0.825rem' }}>
            <Sparkles size={14} />
            <span>Direct Booking Benefits • Free WhatsApp Confirmation • No Account Needed</span>
          </div>
        </div>

        {/* Main Headings */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 2.5rem' }}>
          <h1 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
            background: 'linear-gradient(180deg, #ffffff 40%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {tagline}
          </h1>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: 'var(--text-secondary)',
            maxWidth: '650px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Select your travel dates below to check live availability, view authentic room photographs, and reserve securely with instant booking receipts.
          </p>
        </div>

        {/* Search & Date Filter Card */}
        <div className="glass-panel" style={{
          maxWidth: '980px',
          margin: '0 auto',
          padding: '1.75rem',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}>
          
          {/* Category Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem'
          }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)',
                  background: category === cat ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: category === cat ? '#ffffff' : 'var(--text-secondary)',
                  border: category === cat ? 'none' : '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat === 'All' ? '✨ All Room Types' : cat === 'Villa' ? '🏡 Private Villas' : cat === 'Suite' ? '👑 Luxury Suites' : '🛏️ Deluxe Rooms'}
              </button>
            ))}
          </div>

          {/* Form Inputs Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end'
          }}>
            
            {/* Check-In Date */}
            <div>
              <label className="form-label">
                <Calendar size={15} color="#34d399" />
                <span>Check-in Date</span>
              </label>
              <input
                type="date"
                className="form-input"
                min={todayStr}
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  // Ensure checkOut is at least 1 day after checkIn
                  if (checkOut && new Date(e.target.value) >= new Date(checkOut)) {
                    const nextDay = new Date(new Date(e.target.value).getTime() + 86400000).toISOString().split('T')[0];
                    setCheckOut(nextDay);
                  }
                }}
                style={{ height: '48px', colorScheme: 'dark' }}
              />
            </div>

            {/* Check-Out Date */}
            <div>
              <label className="form-label">
                <Calendar size={15} color="#fbbf24" />
                <span>Check-out Date</span>
              </label>
              <input
                type="date"
                className="form-input"
                min={minCheckOutStr}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                style={{ height: '48px', colorScheme: 'dark' }}
              />
            </div>

            {/* Number of Guests */}
            <div>
              <label className="form-label">
                <Users size={15} color="#60a5fa" />
                <span>Guests</span>
              </label>
              <select
                className="form-select"
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                style={{ height: '48px' }}
              >
                <option value={1}>1 Guest</option>
                <option value={2}>2 Guests (Couple / Friends)</option>
                <option value={3}>3 Guests</option>
                <option value={4}>4 Guests (Family / Group)</option>
                <option value={5}>5+ Guests</option>
              </select>
            </div>

            {/* Search CTA Button */}
            <div>
              <button
                onClick={onSearch}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', height: '48px' }}
              >
                <span>Check Availability</span>
                <ChevronRight size={18} />
              </button>
            </div>

          </div>

          {/* Quick Date Summary Bar */}
          {checkIn && checkOut && (
            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem 1rem',
              background: 'rgba(16, 185, 129, 0.08)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
                <Calendar size={16} />
                <span>
                  <strong>{Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))} Night(s) Stay</strong>: {new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → {new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <span className="badge badge-emerald">
                {totalAvailableRooms} Room Types Available
              </span>
            </div>
          )}

        </div>

        {/* Value Props Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          maxWidth: '980px',
          margin: '2.5rem auto 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', color: '#34d399' }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>WhatsApp Booking Alert</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Receive vouchers directly on chat</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', color: '#60a5fa' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>Zero Account Needed</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quick 60-second guest checkout</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'var(--bg-surface-elevated)', color: '#fbbf24' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>Secure Payment Options</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>UPI QR, Cards & Pay at Desk</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
