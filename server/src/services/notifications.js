/**
 * notifications.js
 * Automated booking confirmation notifications:
 *   - Email  → Nodemailer + Gmail SMTP (free)
 *   - SMS    → Fast2SMS API (free tier, India)
 *
 * Both are optional — if env vars are missing the function logs a warning
 * and returns gracefully without crashing the booking flow.
 */

import nodemailer from 'nodemailer';
import axios from 'axios';

// ─── Email Transport ─────────────────────────────────────────────────────────

function createTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!user || !pass || user.includes('your_email')) {
    return null; // Not configured
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000
  });
}

// ─── HTML Email Template ─────────────────────────────────────────────────────

function buildEmailHTML(booking, room, settings) {
  const hotelName  = settings?.hotel_name  || 'Guest House';
  const hotelPhone = settings?.phone       || '';
  const hotelAddr  = settings?.address     || '';
  const currency   = settings?.currency_symbol || '₹';
  const roomName   = room?.name   || booking.room_name  || 'Reserved Room';
  const roomCat    = room?.category || booking.room_category || '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Booking Confirmation – ${booking.booking_code}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a6b32,#0f4a21);padding:36px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">✅</div>
            <h1 style="color:#ffffff;font-size:26px;font-weight:800;margin:0 0 6px;">Booking Confirmed!</h1>
            <p style="color:#a7f3d0;font-size:15px;margin:0;">Thank you for your reservation, <strong style="color:#ffffff;">${booking.customer_name}</strong>.</p>
            <div style="margin-top:20px;display:inline-block;background:rgba(0,0,0,0.3);padding:10px 24px;border-radius:100px;border:1px solid rgba(255,255,255,0.2);">
              <span style="color:#a7f3d0;font-size:13px;">Booking Reference: </span>
              <strong style="color:#ffffff;font-size:20px;letter-spacing:2px;">${booking.booking_code}</strong>
            </div>
          </td>
        </tr>

        <!-- Hotel Name -->
        <tr>
          <td style="background:#f0f7f2;padding:16px 32px;text-align:center;border-bottom:1px solid #d1fae5;">
            <p style="margin:0;font-size:15px;color:#1a6b32;font-weight:600;">${hotelName}</p>
            ${hotelAddr ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${hotelAddr}</p>` : ''}
          </td>
        </tr>

        <!-- Booking Details -->
        <tr>
          <td style="padding:28px 32px;">
            <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 18px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">📋 Reservation Details</h2>
            
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#6b7280;width:45%;">Room</td>
                <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${roomName} ${roomCat ? `(${roomCat})` : ''}</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px 6px;font-size:14px;color:#6b7280;">Check-in</td>
                <td style="padding:8px 6px;font-size:14px;color:#111827;font-weight:600;">${booking.check_in_date} <span style="color:#1a6b32;">(from 2:00 PM)</span></td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#6b7280;">Check-out</td>
                <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${booking.check_out_date} <span style="color:#b8860b;">(until 11:00 AM)</span></td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px 6px;font-size:14px;color:#6b7280;">Duration</td>
                <td style="padding:8px 6px;font-size:14px;color:#111827;font-weight:600;">${booking.num_nights} Night(s)</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:14px;color:#6b7280;">Guests</td>
                <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${booking.num_guests} Guest(s)</td>
              </tr>
              <tr style="background:#f9fafb;">
                <td style="padding:8px 6px;font-size:14px;color:#6b7280;">Payment Method</td>
                <td style="padding:8px 6px;font-size:14px;color:#111827;font-weight:600;">${(booking.payment_method || 'Online').toUpperCase()}</td>
              </tr>
            </table>

            <!-- Total Amount -->
            <div style="margin-top:20px;padding:16px 20px;background:#f0f7f2;border-radius:8px;border-left:4px solid #1a6b32;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:15px;color:#1a6b32;font-weight:600;">Total Amount Paid</span>
              <strong style="font-size:22px;color:#1a6b32;">${currency}${Number(booking.total_amount).toLocaleString('en-IN')}</strong>
            </div>

            <!-- Payment Badge -->
            <div style="margin-top:12px;text-align:center;">
              <span style="display:inline-block;padding:6px 16px;background:${booking.payment_status === 'paid' ? '#d1fae5' : '#fef3c7'};color:${booking.payment_status === 'paid' ? '#065f46' : '#92400e'};border-radius:100px;font-size:13px;font-weight:700;">
                ${booking.payment_status === 'paid' ? '✓ PAID IN FULL' : '⏳ PAY AT PROPERTY'}
              </span>
            </div>
          </td>
        </tr>

        <!-- Contact & Support -->
        ${hotelPhone ? `
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="padding:14px 18px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#6b7280;">📞 Front Desk / Support: <a href="tel:${hotelPhone}" style="color:#1a6b32;font-weight:600;">${hotelPhone}</a></p>
            </div>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="background:#1a6b32;padding:20px 32px;text-align:center;">
            <p style="color:#a7f3d0;font-size:13px;margin:0;">© ${new Date().getFullYear()} ${hotelName}. All rights reserved.</p>
            <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:6px 0 0;">This is an automated confirmation email. Please do not reply.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

// ─── Send Email Confirmation ──────────────────────────────────────────────────

export async function sendEmailConfirmation(booking, room, settings) {
  try {
    const customerEmail = booking.customer_email?.trim();
    if (!customerEmail || !customerEmail.includes('@')) {
      console.log('📧 Email: No valid customer email provided');
      return { sent: false, reason: 'no_email' };
    }

    const hotelName = settings?.hotel_name || 'Guest House';
    const html = buildEmailHTML(booking, room, settings);

    // 1. Check if RESEND_API_KEY is configured (HTTPS Port 443 - 100% reliable, no SMTP port block)
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'TNAU Guest House <onboarding@resend.dev>';
        const res = await axios.post(
          'https://api.resend.com/emails',
          {
            from: fromEmail,
            to: [customerEmail],
            subject: `✅ Booking Confirmed – ${booking.booking_code} | ${hotelName}`,
            html
          },
          {
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );
        if (res.status === 200 || res.status === 201) {
          console.log(`📧 Email sent via Resend API to ${customerEmail}`);
          return { sent: true, to: customerEmail, provider: 'resend' };
        }
      } catch (resendErr) {
        console.error('📧 Resend API error:', resendErr.response?.data || resendErr.message);
      }
    }

    // 2. Fallback to Gmail SMTP (Nodemailer)
    const transporter = createTransporter();
    if (!transporter) {
      console.log('📧 Email: Not configured (set GMAIL_USER + GMAIL_APP_PASSWORD in .env)');
      return { sent: false, reason: 'not_configured' };
    }

    await transporter.sendMail({
      from: `"${hotelName}" <${process.env.GMAIL_USER}>`,
      to: customerEmail,
      subject: `✅ Booking Confirmed – ${booking.booking_code} | ${hotelName}`,
      html,
      text: `Booking Confirmed!\n\nDear ${booking.customer_name},\nYour booking ${booking.booking_code} is confirmed.\nCheck-in: ${booking.check_in_date}\nCheck-out: ${booking.check_out_date}\nTotal: ${settings?.currency_symbol || '₹'}${booking.total_amount}\n\nThank you, ${hotelName}`
    });

    console.log(`📧 Email sent via Gmail SMTP to ${customerEmail} for booking ${booking.booking_code}`);
    return { sent: true, to: customerEmail, provider: 'gmail_smtp' };
  } catch (err) {
    console.error('📧 Email send error:', err.message);
    return { sent: false, reason: err.message };
  }
}

// ─── Send SMS Confirmation (Fast2SMS) ────────────────────────────────────────

export async function sendSMSConfirmation(booking, settings) {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY?.trim();
    if (!apiKey) {
      console.log('📱 SMS: Not configured (set FAST2SMS_API_KEY in .env)');
      return { sent: false, reason: 'not_configured' };
    }

    // Strip to 10-digit Indian mobile number
    const raw = (booking.customer_phone || '').replace(/[^0-9]/g, '');
    const mobile = raw.length === 12 && raw.startsWith('91') ? raw.slice(2)
                 : raw.length === 10 ? raw
                 : null;

    if (!mobile) {
      console.log('📱 SMS: Could not parse mobile number:', booking.customer_phone);
      return { sent: false, reason: 'invalid_number' };
    }

    const hotelName = settings?.hotel_name || 'Guest House';
    const message = `Booking Confirmed! Ref: ${booking.booking_code}. Room: ${booking.room_name || 'Reserved Room'}. Check-in: ${booking.check_in_date}. Amt: ${settings?.currency_symbol || '\u20B9'}${booking.total_amount}. ${hotelName}`;

    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        message,
        language: 'english',
        numbers: mobile
      },
      {
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    if (response.data?.return === true) {
      console.log(`📱 SMS sent to ${mobile} for booking ${booking.booking_code}`);
      return { sent: true, to: mobile };
    } else {
      console.warn('📱 SMS: Fast2SMS response:', response.data);
      return { sent: false, reason: response.data?.message || JSON.stringify(response.data) };
    }
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    console.error('📱 SMS send error:', errorMsg);
    return { sent: false, reason: errorMsg };
  }
}

// ─── Send All Notifications ───────────────────────────────────────────────────

export async function sendBookingNotifications(booking, room, settings) {
  const [emailResult, smsResult] = await Promise.allSettled([
    sendEmailConfirmation(booking, room, settings),
    sendSMSConfirmation(booking, settings)
  ]);

  return {
    email: emailResult.status === 'fulfilled' ? emailResult.value : { sent: false, reason: emailResult.reason },
    sms:   smsResult.status   === 'fulfilled' ? smsResult.value   : { sent: false, reason: smsResult.reason }
  };
}
