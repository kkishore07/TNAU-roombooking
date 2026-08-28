const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

async function handleResponse(res) {
  try {
    const data = await res.json();
    return data;
  } catch (err) {
    if (!res.ok) {
      return { success: false, message: `Server error: ${res.status} ${res.statusText}` };
    }
    return { success: false, message: 'Invalid response from server' };
  }
}

export async function fetchRooms(params = {}) {
  const query = new URLSearchParams();
  if (params.checkIn) query.append('checkIn', params.checkIn);
  if (params.checkOut) query.append('checkOut', params.checkOut);
  if (params.guests) query.append('guests', params.guests);
  if (params.category && params.category !== 'All') query.append('category', params.category);

  const res = await fetch(`${API_BASE}/rooms?${query.toString()}`);
  return handleResponse(res);
}

export async function fetchRoomDetails(id) {
  const res = await fetch(`${API_BASE}/rooms/${id}`);
  return handleResponse(res);
}

export async function createBooking(bookingData) {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  return handleResponse(res);
}

export async function lookupBooking(identifier) {
  const res = await fetch(`${API_BASE}/bookings/${identifier}`);
  return handleResponse(res);
}

export async function lookupBookingsByPhone(phone) {
  const res = await fetch(`${API_BASE}/bookings/search/by-phone?phone=${encodeURIComponent(phone)}`);
  return handleResponse(res);
}

export async function cancelBooking(identifier, options = {}) {
  const res = await fetch(`${API_BASE}/bookings/${identifier}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  return handleResponse(res);
}

export async function processPayment(paymentData) {
  const res = await fetch(`${API_BASE}/payments/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData)
  });
  return handleResponse(res);
}

// Create a Razorpay order on the server — returns order_id + key_id
export async function createRazorpayOrder(orderData) {
  const res = await fetch(`${API_BASE}/payments/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  return handleResponse(res);
}

// Verify Razorpay payment signature after successful checkout
export async function verifyRazorpayPayment(verifyData) {
  const res = await fetch(`${API_BASE}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(verifyData)
  });
  return handleResponse(res);
}

export async function fetchPaymentConfig() {
  const res = await fetch(`${API_BASE}/payments/config`);
  return handleResponse(res);
}

export async function getWhatsAppLink(bookingId) {
  const res = await fetch(`${API_BASE}/whatsapp/booking-link/${bookingId}`);
  return handleResponse(res);
}

// Admin APIs
export async function adminLogin(pin) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  return handleResponse(res);
}

export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/admin/stats`);
  return handleResponse(res);
}

export async function fetchAdminBookings(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.payment_status) query.append('payment_status', params.payment_status);
  if (params.search) query.append('search', params.search);

  const res = await fetch(`${API_BASE}/bookings?${query.toString()}`);
  return handleResponse(res);
}

export async function updateBookingStatus(id, updateData) {
  const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  return handleResponse(res);
}

export async function deleteBooking(id) {
  const res = await fetch(`${API_BASE}/bookings/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function saveRoom(formData, id = null) {
  const url = id ? `${API_BASE}/rooms/${id}` : `${API_BASE}/rooms`;
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    body: formData // multipart/form-data
  });
  return handleResponse(res);
}

export async function deleteRoom(id) {
  const res = await fetch(`${API_BASE}/rooms/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function fetchBlockedDates() {
  const res = await fetch(`${API_BASE}/admin/blocked-dates`);
  return handleResponse(res);
}

export async function addBlockedDate(data) {
  const res = await fetch(`${API_BASE}/admin/blocked-dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function deleteBlockedDate(id) {
  const res = await fetch(`${API_BASE}/admin/blocked-dates/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/admin/settings`);
  return handleResponse(res);
}

export async function updateSettings(settingsData) {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settingsData)
  });
  return handleResponse(res);
}
