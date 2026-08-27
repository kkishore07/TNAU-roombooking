import React, { useState, useEffect } from 'react';
import { 
  X, Lock, ShieldCheck, Plus, Edit2, Trash2, CheckCircle2, 
  Clock, MessageSquare, Phone, User, Calendar, Image as ImageIcon, 
  DollarSign, TrendingUp, RefreshCw, AlertCircle, Sparkles, Upload, 
  Settings, CheckSquare, Layers, Ban, Check, Eye
} from 'lucide-react';
import { 
  adminLogin, fetchAdminStats, fetchAdminBookings, 
  updateBookingStatus, deleteBooking, saveRoom, 
  deleteRoom, fetchBlockedDates, addBlockedDate, 
  deleteBlockedDate, fetchSettings, updateSettings, getWhatsAppLink 
} from '../../utils/api';

const DEFAULT_AMENITIES = [
  'High-Speed Wi-Fi', 'Air Conditioning', 'Complimentary Breakfast',
  'Private Plunge Pool', 'Oceanfront View', 'Lush Garden View',
  'Private Balcony', 'Jacuzzi Bath', 'Rainfall Shower',
  '65" OLED Smart TV', 'Espresso Coffee Machine', 'Mini Bar',
  'Work Desk', 'Electronic Safe', '24-Hour Room Service'
];

export default function AdminDashboard({ onClose, onRoomUpdated, initialSettings }) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('hotel_admin_auth') === 'true'
  );
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');

  // Active Tab: 'overview' | 'rooms' | 'bookings' | 'blocked' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [settings, setSettings] = useState(initialSettings || {});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Filters
  const [bookingFilter, setBookingFilter] = useState('all');
  const [bookingSearch, setBookingSearch] = useState('');

  // Room Modal State
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    category: 'Deluxe',
    description: '',
    price_per_night: '',
    capacity: 2,
    bed_type: 'King Bed',
    room_size: '450 sq ft',
    total_inventory: 1,
    amenities: ['High-Speed Wi-Fi', 'Air Conditioning', 'Complimentary Breakfast'],
    image_urls: '',
    image_files: []
  });
  const [customAmenity, setCustomAmenity] = useState('');

  // Blocked Date Modal State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockFormData, setBlockFormData] = useState({
    room_id: '',
    start_date: '',
    end_date: '',
    reason: 'Maintenance & Servicing'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, bookingsRes, roomsRes, blockedRes, settingsRes] = await Promise.all([
        fetchAdminStats(),
        fetchAdminBookings({ status: bookingFilter !== 'all' ? bookingFilter : undefined, search: bookingSearch }),
        fetch('/api/rooms').then(r => r.json()),
        fetchBlockedDates(),
        fetchSettings()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (bookingsRes.success) setBookings(bookingsRes.data);
      if (roomsRes.success) setRooms(roomsRes.data);
      if (blockedRes.success) setBlockedDates(blockedRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to load dashboard data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, bookingFilter, bookingSearch]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await adminLogin(pin);
      if (res.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('hotel_admin_auth', 'true');
      } else {
        setAuthError(res.message || 'Invalid PIN');
      }
    } catch {
      setAuthError('Authentication error. Try PIN: 1234');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('hotel_admin_auth');
  };

  // Status Updater
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const res = await updateBookingStatus(bookingId, { booking_status: newStatus });
      if (res.success) {
        setMsg({ type: 'success', text: `Booking marked as ${newStatus}` });
        loadData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error updating status' });
    }
  };

  // WhatsApp Trigger from Admin Panel
  const handleOpenWhatsApp = (booking) => {
    const rawPhone = (booking.customer_phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    
    const message = `Hello *${booking.customer_name}*,\nThis is ${settings.hotel_name || 'Serenity Haven'}.\nRegarding your booking *${booking.booking_code}* for *${booking.room_name}* (${booking.check_in_date} to ${booking.check_out_date}):\nYour status is: *${booking.booking_status?.toUpperCase()}*.\n\nPlease let us know if you need any assistance prior to your arrival!`;
    
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Save Room (Add / Edit)
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('name', roomFormData.name);
      formData.append('category', roomFormData.category);
      formData.append('description', roomFormData.description);
      formData.append('price_per_night', roomFormData.price_per_night);
      formData.append('capacity', roomFormData.capacity);
      formData.append('bed_type', roomFormData.bed_type);
      formData.append('room_size', roomFormData.room_size);
      formData.append('total_inventory', roomFormData.total_inventory);
      formData.append('amenities', JSON.stringify(roomFormData.amenities));

      if (roomFormData.image_urls) {
        formData.append('image_urls', roomFormData.image_urls);
      }

      if (roomFormData.existing_images) {
        formData.append('existing_images', JSON.stringify(roomFormData.existing_images));
      }

      if (roomFormData.image_files && roomFormData.image_files.length > 0) {
        Array.from(roomFormData.image_files).forEach(file => {
          formData.append('image_files', file);
        });
      }

      const res = await saveRoom(formData, editingRoom?.id);
      if (res.success) {
        setMsg({ type: 'success', text: `Room ${editingRoom ? 'updated' : 'created'} successfully!` });
        setShowRoomModal(false);
        setEditingRoom(null);
        loadData();
        if (onRoomUpdated) onRoomUpdated();
      } else {
        setMsg({ type: 'error', text: res.message || 'Failed to save room' });
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Error saving room' });
    } finally {
      setLoading(false);
    }
  };

  const openEditRoomModal = (room) => {
    setEditingRoom(room);
    setRoomFormData({
      name: room.name,
      category: room.category,
      description: room.description,
      price_per_night: room.price_per_night,
      capacity: room.capacity,
      bed_type: room.bed_type,
      room_size: room.room_size,
      total_inventory: room.total_inventory,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
      existing_images: room.images || [],
      image_urls: '',
      image_files: []
    });
    setShowRoomModal(true);
  };

  const openAddRoomModal = () => {
    setEditingRoom(null);
    setRoomFormData({
      name: '',
      category: 'Deluxe',
      description: '',
      price_per_night: '',
      capacity: 2,
      bed_type: 'King Bed',
      room_size: '450 sq ft',
      total_inventory: 1,
      amenities: ['High-Speed Wi-Fi', 'Air Conditioning', 'Complimentary Breakfast'],
      existing_images: [],
      image_urls: '',
      image_files: []
    });
    setShowRoomModal(true);
  };

  const handleDeleteRoom = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete room "${name}"?`)) return;
    try {
      const res = await deleteRoom(id);
      if (res.success) {
        setMsg({ type: 'success', text: 'Room deleted successfully' });
        loadData();
        if (onRoomUpdated) onRoomUpdated();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error deleting room' });
    }
  };

  // Block Dates
  const handleAddBlockedDate = async (e) => {
    e.preventDefault();
    try {
      const res = await addBlockedDate(blockFormData);
      if (res.success) {
        setMsg({ type: 'success', text: 'Dates blocked successfully!' });
        setShowBlockModal(false);
        loadData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error blocking dates' });
    }
  };

  const handleDeleteBlockedDate = async (id) => {
    try {
      const res = await deleteBlockedDate(id);
      if (res.success) {
        setMsg({ type: 'success', text: 'Blocked date removed' });
        loadData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error deleting blocked date' });
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateSettings(settings);
      if (res.success) {
        setMsg({ type: 'success', text: 'Settings updated successfully!' });
        loadData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error updating settings' });
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = settings.currency_symbol || '₹';

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div 
          className="modal-content" 
          style={{ maxWidth: '420px', textAlign: 'center', padding: '2rem' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Lock size={28} />
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '0.4rem', color: '#ffffff' }}>
            Owner & Admin Portal
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Enter your 4-digit security PIN to access room management, guest bookings, and settings.
          </p>

          {authError && (
            <div style={{
              padding: '0.6rem 0.85rem',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#fb7185',
              fontSize: '0.825rem',
              marginBottom: '1rem'
            }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <input
                type="password"
                maxLength={8}
                className="form-input"
                placeholder="Enter PIN (Default: 1234)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.3em', height: '52px' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                <span>Unlock Portal</span>
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Default test PIN is <strong>1234</strong>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD SCREEN
  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', padding: '1rem' }} onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '1180px', width: '98%', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #065f46)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                {settings.hotel_name || 'Serenity Haven'} Management
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                Owner & Front Desk Portal
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={loadData} className="btn btn-outline btn-sm" title="Refresh data">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Lock
            </button>
            <button onClick={onClose} style={{ padding: '0.4rem', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          padding: '0.5rem 1.5rem',
          background: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto'
        }}>
          {[
            { id: 'overview', label: '📊 Overview & Stats' },
            { id: 'rooms', label: '🛏️ Rooms & Pricing' },
            { id: 'bookings', label: '📋 Bookings & Guests' },
            { id: 'blocked', label: '🚫 Block Dates / Hold' },
            { id: 'settings', label: '⚙️ Hotel Settings & WhatsApp' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                background: activeTab === tab.id ? 'var(--bg-surface)' : 'transparent',
                border: activeTab === tab.id ? '1px solid var(--border-light)' : '1px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Feedback Alert */}
        {msg.text && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem 1rem',
            background: msg.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${msg.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: 'var(--radius-sm)',
            color: msg.type === 'error' ? '#fb7185' : '#34d399',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg({ type: '', text: '' })} style={{ color: 'inherit' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab Contents */}
        <div className="modal-body" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div>
              {/* Top Stats Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                
                <div style={{ padding: '1.25rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Total Revenue</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-heading)' }}>
                    {currencySymbol}{Number(stats.total_revenue || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Paid: {currencySymbol}{Number(stats.paid_revenue || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '1.25rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Total Bookings</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa', fontFamily: 'var(--font-heading)' }}>
                    {stats.total_bookings}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {stats.confirmed_count} Confirmed • {stats.pending_payments} Pending Pay
                  </div>
                </div>

                <div style={{ padding: '1.25rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Today's Arrivals</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-heading)' }}>
                    {stats.today_checkins?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Departures Today: {stats.today_checkouts?.length || 0}
                  </div>
                </div>

                <div style={{ padding: '1.25rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Current Occupancy</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-heading)' }}>
                    {stats.occupancy_rate}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {stats.current_occupied_units} of {stats.total_units} units occupied
                  </div>
                </div>

              </div>

              {/* Today's Check-ins Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="#34d399" />
                  <span>Today's Check-in Arrivals ({stats.today_checkins?.length || 0})</span>
                </h3>

                {stats.today_checkins && stats.today_checkins.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {stats.today_checkins.map(b => (
                      <div key={b.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem',
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff' }}>{b.customer_name} • {b.room_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            📞 {b.customer_phone} • Ref: {b.booking_code} • {b.num_guests} Guests
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenWhatsApp(b)}
                            className="btn btn-whatsapp btn-sm"
                          >
                            <MessageSquare size={14} />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => handleUpdateBookingStatus(b.id, 'checked_in')}
                            className="btn btn-primary btn-sm"
                          >
                            Check In
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No check-ins scheduled for today.
                  </div>
                )}
              </div>

              {/* Recent Bookings Feed */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                    Recent Reservations
                  </h3>
                  <button onClick={() => setActiveTab('bookings')} className="btn btn-outline btn-sm">
                    View All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {stats.recent_bookings?.map(b => (
                    <div key={b.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: '#ffffff' }}>{b.customer_name}</span>
                          <span className="badge badge-emerald">{b.booking_status}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {b.room_name} • {b.check_in_date} to {b.check_out_date} ({b.num_nights} nights)
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#34d399' }}>
                            {currencySymbol}{Number(b.total_amount).toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {b.payment_status}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenWhatsApp(b)}
                          className="btn btn-whatsapp btn-sm"
                          title="WhatsApp Customer"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ROOM MANAGEMENT */}
          {activeTab === 'rooms' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Room Inventory & Rates</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Add new rooms, upload room photos, modify pricing, and update amenities.
                  </p>
                </div>
                <button onClick={openAddRoomModal} className="btn btn-primary">
                  <Plus size={16} />
                  <span>Add New Room</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {rooms.map(room => {
                  const images = Array.isArray(room.images) && room.images.length > 0 ? room.images : ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'];
                  return (
                    <div
                      key={room.id}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-subtle)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ height: '180px', position: 'relative' }}>
                        <img src={images[0]} alt={room.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                          <span className="badge badge-emerald">{room.category}</span>
                        </div>
                        <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.7)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', color: '#fff' }}>
                          📸 {images.length} Photos
                        </div>
                      </div>

                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{room.name}</h4>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                              {currencySymbol}{Number(room.price_per_night).toLocaleString('en-IN')}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/nt</span>
                            </span>
                          </div>
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {room.description}
                          </p>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Capacity: <strong>{room.capacity} Guests</strong> • Units: <strong>{room.total_inventory}</strong> • Bed: {room.bed_type}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <button onClick={() => openEditRoomModal(room)} className="btn btn-secondary btn-sm">
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                          <button onClick={() => handleDeleteRoom(room.id, room.name)} className="btn btn-danger btn-sm">
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BOOKINGS & GUESTS */}
          {activeTab === 'bookings' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Guest Bookings ({bookings.length})</h3>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search name, phone, ref..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    style={{ width: '220px', height: '38px', fontSize: '0.85rem' }}
                  />

                  <select
                    className="form-select"
                    value={bookingFilter}
                    onChange={(e) => setBookingFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '0.85rem', width: '160px' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked_in">Checked In</option>
                    <option value="checked_out">Checked Out</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
                  No reservations found matching your filter criteria.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {bookings.map(booking => (
                    <div
                      key={booking.id}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        padding: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>{booking.customer_name}</span>
                          <span className="badge badge-emerald">{booking.booking_status}</span>
                          <span className="badge badge-slate">{booking.payment_status}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <strong>{booking.room_name}</strong> • Ref: <span style={{ color: '#a7f3d0' }}>{booking.booking_code}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          📅 {booking.check_in_date} → {booking.check_out_date} ({booking.num_nights} nights) • 👥 {booking.num_guests} Guests • 📞 {booking.customer_phone}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-heading)' }}>
                          {currencySymbol}{Number(booking.total_amount).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          via {booking.payment_method?.toUpperCase()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenWhatsApp(booking)}
                          className="btn btn-whatsapp btn-sm"
                          title="Open WhatsApp chat with guest"
                        >
                          <MessageSquare size={14} />
                          <span>WhatsApp</span>
                        </button>

                        <select
                          className="form-select"
                          value={booking.booking_status}
                          onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                          style={{ height: '34px', fontSize: '0.8rem', width: '130px' }}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="checked_in">Checked In</option>
                          <option value="checked_out">Checked Out</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BLOCKED DATES */}
          {activeTab === 'blocked' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Blocked Dates & Maintenance</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Prevent customers from booking specific rooms during maintenance, renovations, or VIP holds.
                  </p>
                </div>
                <button onClick={() => setShowBlockModal(true)} className="btn btn-primary">
                  <Ban size={16} />
                  <span>Block Room Dates</span>
                </button>
              </div>

              {blockedDates.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
                  No active blocked dates. All rooms are available as per regular inventory.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {blockedDates.map(b => (
                    <div key={b.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem 1.25rem',
                      background: 'var(--bg-surface-elevated)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{b.room_name || 'Room'}</div>
                        <div style={{ fontSize: '0.85rem', color: '#fb7185' }}>
                          📅 {b.start_date} to {b.end_date}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Reason: {b.reason}</div>
                      </div>

                      <button onClick={() => handleDeleteBlockedDate(b.id)} className="btn btn-outline btn-sm" style={{ color: '#fb7185' }}>
                        <Trash2 size={14} />
                        <span>Unblock</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} style={{ maxWidth: '780px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.25rem' }}>
                Hotel Profile, WhatsApp & Payment Settings
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Hotel / Resort Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.hotel_name || ''}
                    onChange={(e) => setSettings({ ...settings, hotel_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tagline / Headline</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.tagline || ''}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Property Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Reception Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.phone || ''}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.whatsapp_number || ''}
                    onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Admin Security PIN</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.admin_pin || ''}
                    onChange={(e) => setSettings({ ...settings, admin_pin: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Currency Symbol</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.currency_symbol || '₹'}
                    onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">UPI ID (For QR)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.upi_id || ''}
                    onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tax / GST %</label>
                  <input
                    type="number"
                    className="form-input"
                    value={settings.tax_percentage || 12}
                    onChange={(e) => setSettings({ ...settings, tax_percentage: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp Message Template</label>
                <textarea
                  className="form-textarea"
                  rows="6"
                  value={settings.whatsapp_template || ''}
                  onChange={(e) => setSettings({ ...settings, whatsapp_template: e.target.value })}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tags available: {'{customer_name}'}, {'{booking_code}'}, {'{room_name}'}, {'{check_in_date}'}, {'{check_out_date}'}, {'{num_nights}'}, {'{num_guests}'}, {'{total_amount}'}, {'{currency_symbol}'}, {'{hotel_address}'}, {'{hotel_phone}'}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <span>Save All Settings</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

      {/* ADD / EDIT ROOM MODAL */}
      {showRoomModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowRoomModal(false)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff' }}>
                {editingRoom ? 'Edit Room' : 'Add New Room'}
              </h3>
              <button onClick={() => setShowRoomModal(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Room Title / Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Deluxe Sea-Facing Penthouse"
                  value={roomFormData.name}
                  onChange={(e) => setRoomFormData({ ...roomFormData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={roomFormData.category}
                    onChange={(e) => setRoomFormData({ ...roomFormData, category: e.target.value })}
                  >
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                    <option value="Villa">Villa</option>
                    <option value="Studio">Studio</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Price / Night ({currencySymbol}) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 4500"
                    value={roomFormData.price_per_night}
                    onChange={(e) => setRoomFormData({ ...roomFormData, price_per_night: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Capacity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={roomFormData.capacity}
                    onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Bed Type</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="King Bed"
                    value={roomFormData.bed_type}
                    onChange={(e) => setRoomFormData({ ...roomFormData, bed_type: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Room Size</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="450 sq ft"
                    value={roomFormData.room_size}
                    onChange={(e) => setRoomFormData({ ...roomFormData, room_size: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Inventory Units</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={roomFormData.total_inventory}
                    onChange={(e) => setRoomFormData({ ...roomFormData, total_inventory: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Describe view, ambiance, special luxury highlights..."
                  value={roomFormData.description}
                  onChange={(e) => setRoomFormData({ ...roomFormData, description: e.target.value })}
                />
              </div>

              {/* Photos Upload & URLs */}
              <div className="form-group">
                <label className="form-label">
                  <Upload size={15} color="#34d399" />
                  <span>Upload Room Images (From Computer)</span>
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="form-input"
                  onChange={(e) => setRoomFormData({ ...roomFormData, image_files: e.target.files })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Or Direct Image URLs (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://images.unsplash.com/... (comma separated)"
                  value={roomFormData.image_urls}
                  onChange={(e) => setRoomFormData({ ...roomFormData, image_urls: e.target.value })}
                />
              </div>

              {/* Amenities Checkboxes */}
              <div className="form-group">
                <label className="form-label">Select Amenities</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                  {DEFAULT_AMENITIES.map(amenity => {
                    const checked = roomFormData.amenities?.includes(amenity);
                    return (
                      <label key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoomFormData({ ...roomFormData, amenities: [...roomFormData.amenities, amenity] });
                            } else {
                              setRoomFormData({ ...roomFormData, amenities: roomFormData.amenities.filter(a => a !== amenity) });
                            }
                          }}
                        />
                        <span>{amenity}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowRoomModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <span>{editingRoom ? 'Update Room' : 'Save & Publish Room'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCK DATES MODAL */}
      {showBlockModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowBlockModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Block Room Dates</h3>
              <button onClick={() => setShowBlockModal(false)} style={{ color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBlockedDate} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Select Room</label>
                <select
                  className="form-select"
                  value={blockFormData.room_id}
                  onChange={(e) => setBlockFormData({ ...blockFormData, room_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Room --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.category})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={blockFormData.start_date}
                    onChange={(e) => setBlockFormData({ ...blockFormData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={blockFormData.end_date}
                    onChange={(e) => setBlockFormData({ ...blockFormData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Purpose</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Renovation, Deep cleaning, VIP hold"
                  value={blockFormData.reason}
                  onChange={(e) => setBlockFormData({ ...blockFormData, reason: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowBlockModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Block These Dates</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
