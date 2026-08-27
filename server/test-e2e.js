async function runTests() {
  console.log('🧪 Starting End-to-End Test Suite for Room Booking Application...\n');
  const BASE_URL = 'http://localhost:5000';

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('1. Testing Backend Health API:');
    const healthRes = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
    assert(healthRes.status === 'online', 'Health status is online');

    // 2. Fetch Rooms with Date Range
    console.log('\n2. Testing Rooms Availability Query:');
    const roomsRes = await fetch(`${BASE_URL}/api/rooms?checkIn=2026-09-01&checkOut=2026-09-04&guests=2`).then(r => r.json());
    assert(roomsRes.success && roomsRes.data.length >= 4, `Found ${roomsRes.data?.length} available room types`);
    const testRoom = roomsRes.data[0];
    assert(testRoom.is_available === true, `Room "${testRoom.name}" is marked available`);

    // 3. Customer Zero-Login Booking Creation
    console.log('\n3. Testing Zero-Login Customer Booking:');
    const bookingPayload = {
      room_id: testRoom.id,
      customer_name: 'Vikram Sharma',
      customer_phone: '+91 98765 43210',
      customer_email: 'vikram@example.com',
      check_in_date: '2026-09-01',
      check_out_date: '2026-09-04',
      num_guests: 2,
      payment_method: 'card',
      special_requests: 'High floor, quiet corner room'
    };

    const createRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload)
    }).then(r => r.json());

    assert(createRes.success === true, 'Booking created successfully without login');
    const booking = createRes.data?.booking;
    assert(booking?.booking_code?.startsWith('SH-'), `Generated booking code: ${booking?.booking_code}`);
    assert(booking?.num_nights === 3, 'Calculated 3 nights accurately');
    assert(booking?.total_amount > 0, `Total calculated amount: ₹${booking?.total_amount}`);

    // 4. WhatsApp Confirmation Message & Link
    console.log('\n4. Testing WhatsApp Message Generator:');
    const whatsapp = createRes.data?.whatsapp;
    assert(whatsapp?.url?.startsWith('https://api.whatsapp.com/send?phone=919876543210'), 'Generated clean WhatsApp direct URL');
    assert(whatsapp?.message?.includes('Vikram Sharma'), 'WhatsApp message includes customer name');
    assert(whatsapp?.message?.includes(booking.booking_code), 'WhatsApp message includes booking reference code');

    // 5. Payment Processing & Verification
    console.log('\n5. Testing Payment Service:');
    const payRes = await fetch(`${BASE_URL}/api/payments/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: booking.id,
        amount: booking.total_amount,
        payment_method: 'card'
      })
    }).then(r => r.json());

    assert(payRes.success === true && payRes.data?.status === 'paid', `Payment processed with TXN ID: ${payRes.data?.transaction_id}`);

    // 6. Guest Self-Service Lookup (By Phone & Booking Code)
    console.log('\n6. Testing "My Booking" Lookup Portal:');
    const lookupPhoneRes = await fetch(`${BASE_URL}/api/bookings/search/by-phone?phone=9876543210`).then(r => r.json());
    assert(lookupPhoneRes.success && lookupPhoneRes.data.length >= 1, `Retrieved ${lookupPhoneRes.data?.length} booking(s) by customer phone`);

    const lookupCodeRes = await fetch(`${BASE_URL}/api/bookings/${booking.booking_code}`).then(r => r.json());
    assert(lookupCodeRes.success && lookupCodeRes.data?.booking?.customer_name === 'Vikram Sharma', 'Retrieved exact voucher by booking code');

    // 7. Admin PIN Authentication & Stats
    console.log('\n7. Testing Owner / Admin Authentication & Stats:');
    const failAuth = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '0000' })
    }).then(r => r.json());
    assert(failAuth.success === false, 'Invalid PIN rejected correctly');

    const passAuth = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234' })
    }).then(r => r.json());
    assert(passAuth.success === true && passAuth.data?.role === 'owner', 'Valid PIN 1234 authorized');

    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`).then(r => r.json());
    assert(statsRes.success && statsRes.data?.total_bookings >= 1, `Admin stats shows total bookings: ${statsRes.data?.total_bookings}, Total Revenue: ₹${statsRes.data?.total_revenue}`);

    // 8. Owner Adding a New Luxury Room
    console.log('\n8. Testing Owner Adding a New Room:');
    const newRoomPayload = {
      name: 'Sunset Cliffside Villa with Private Hot Tub',
      category: 'Villa',
      description: 'Exclusive cliffside haven with dramatic sunset views and private outdoor heated jacuzzi.',
      price_per_night: 9999,
      capacity: 4,
      bed_type: 'King Bed',
      room_size: '1,400 sq ft',
      total_inventory: 2,
      amenities: ['Private Jacuzzi', 'Ocean View', 'Complimentary Breakfast', 'High-Speed Wi-Fi'],
      image_urls: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80'
    };

    const addRoomRes = await fetch(`${BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRoomPayload)
    }).then(r => r.json());

    assert(addRoomRes.success === true, `Owner added room: "${addRoomRes.data?.name}"`);

    // 9. Owner Blocking Room Dates for Maintenance
    console.log('\n9. Testing Owner Room Date Blocking:');
    const blockRes = await fetch(`${BASE_URL}/api/admin/blocked-dates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: testRoom.id,
        start_date: '2026-10-10',
        end_date: '2026-10-15',
        reason: 'Annual Teak Polish & AC Servicing'
      })
    }).then(r => r.json());

    assert(blockRes.success === true, 'Owner blocked maintenance dates successfully');

    // 10. Owner Updating Booking Status
    console.log('\n10. Testing Owner Booking Status Update:');
    const statusUpdateRes = await fetch(`${BASE_URL}/api/bookings/${booking.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_status: 'checked_in' })
    }).then(r => r.json());

    assert(statusUpdateRes.success === true && statusUpdateRes.data?.booking_status === 'checked_in', 'Owner marked guest as checked_in');

    console.log(`\n========================================`);
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Fatal test error:', err);
  }
}

runTests();
