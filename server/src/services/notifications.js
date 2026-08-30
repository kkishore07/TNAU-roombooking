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
                <td style="padding:8px 6px;font-size:14px;color:#111827;font-weight:600;">${booking.check_in_date} <span style="color:#1a6b32;">(from ${booking.check_in_time || '2:00 PM'})</span></td>
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

// ─── Brevo HTTPS API Email Sender ───────────────────────────────────────────

async function sendViaBrevo({ toEmail, toName, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'tnaurooms@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'TNAU GuestHouse';

  if (!apiKey) return false;

  try {
    const res = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject,
        htmlContent
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    console.error(`📧 Brevo API error for ${toEmail}:`, err.response?.data?.message || err.message);
    return false;
  }
}

// ─── Send Email Confirmation ──────────────────────────────────────────────────

export async function sendEmailConfirmation(booking, room, settings) {
  try {
    const customerEmail = booking.customer_email?.trim();
    const customerName = booking.customer_name || 'Guest';
    const hotelName = settings?.hotel_name || 'Guest House';
    const html = buildEmailHTML(booking, room, settings);
    const subject = `✅ Booking Confirmed – ${booking.booking_code} | ${hotelName}`;
    let customerSent = false;

    // 1. Send to CUSTOMER
    if (customerEmail && customerEmail.includes('@')) {
      // Try Brevo first (HTTP API, cloud-safe, 300 free/day)
      const brevoSent = await sendViaBrevo({
        toEmail: customerEmail,
        toName: customerName,
        subject,
        htmlContent: html
      });

      if (brevoSent) {
        console.log(`📧 Customer email delivered via Brevo API: ${customerEmail}`);
        customerSent = true;
      } else {
        // Fallback: Gmail SMTP
        const transporter = createTransporter();
        if (transporter) {
          try {
            await transporter.sendMail({
              from: `"${hotelName}" <${process.env.GMAIL_USER}>`,
              to: customerEmail,
              subject,
              html,
              text: `Booking Confirmed!\n\nDear ${booking.customer_name},\nYour booking ${booking.booking_code} is confirmed.\nCheck-in: ${booking.check_in_date}\nCheck-out: ${booking.check_out_date}\nTotal: ${settings?.currency_symbol || '₹'}${booking.total_amount}\n\nThank you, ${hotelName}`
            });
            console.log(`📧 Customer email delivered via Gmail SMTP: ${customerEmail}`);
            customerSent = true;
          } catch (smtpErr) {
            console.error('📧 Gmail SMTP fallback error (customer):', smtpErr.message);
          }
        }
      }
    } else {
      console.log('📧 Email: No valid customer email provided — skipping customer copy');
    }

    // 2. Send admin notification copy
    const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'tnaurooms@gmail.com';
    if (adminEmail) {
      const adminSubject = `📥 New Booking: ${booking.booking_code} — ${booking.customer_name}`;
      const adminHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;">
        <h2 style="color:#1a6b32;">📥 New Booking Received</h2>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;">
          <tr><td style="color:#6b7280;width:40%;padding:8px 12px;">Booking Code</td><td style="font-weight:700;color:#111;padding:8px 12px;">${booking.booking_code}</td></tr>
          <tr style="background:#f9fafb"><td style="color:#6b7280;padding:8px 12px;">Guest Name</td><td style="font-weight:700;color:#111;padding:8px 12px;">${booking.customer_name}</td></tr>
          <tr><td style="color:#6b7280;padding:8px 12px;">Phone</td><td style="font-weight:700;color:#111;padding:8px 12px;">${booking.customer_phone}</td></tr>
          <tr style="background:#f9fafb"><td style="color:#6b7280;padding:8px 12px;">Guest Email</td><td style="padding:8px 12px;">${booking.customer_email || 'Not provided'}</td></tr>
          <tr><td style="color:#6b7280;padding:8px 12px;">Room</td><td style="padding:8px 12px;">${room?.name || 'Reserved Room'}</td></tr>
          <tr style="background:#f9fafb"><td style="color:#6b7280;padding:8px 12px;">Check-in</td><td style="padding:8px 12px;">${booking.check_in_date} <strong style="color:#1a6b32;">(from ${booking.check_in_time || '02:00 PM'})</strong></td></tr>
          <tr><td style="color:#6b7280;padding:8px 12px;">Check-out</td><td style="padding:8px 12px;">${booking.check_out_date}</td></tr>
          <tr style="background:#f9fafb"><td style="color:#6b7280;padding:8px 12px;">Nights</td><td style="padding:8px 12px;">${booking.num_nights} Night(s)</td></tr>
          <tr><td style="color:#6b7280;padding:8px 12px;">Total Amount</td><td style="font-weight:800;font-size:1.2em;color:#1a6b32;padding:8px 12px;">${settings?.currency_symbol || '₹'}${Number(booking.total_amount).toLocaleString('en-IN')}</td></tr>
          <tr style="background:#f9fafb"><td style="color:#6b7280;padding:8px 12px;">Payment</td><td style="padding:8px 12px;">${(booking.payment_status || 'paid').toUpperCase()} via ${(booking.payment_method || 'online').toUpperCase()}</td></tr>
        </table>
      </div>`;

      // Try Brevo first for Admin notification
      const adminBrevoSent = await sendViaBrevo({
        toEmail: adminEmail,
        toName: 'TNAU Admin',
        subject: adminSubject,
        htmlContent: adminHtml
      });

      if (adminBrevoSent) {
        console.log(`📧 Admin notification delivered via Brevo API: ${adminEmail}`);
      } else {
        // Fallback 1: Gmail SMTP
        const transporter = createTransporter();
        if (transporter) {
          try {
            await transporter.sendMail({
              from: `"${hotelName} Booking System" <${process.env.GMAIL_USER}>`,
              to: adminEmail,
              subject: adminSubject,
              html: adminHtml
            });
            console.log(`📧 Admin notification sent via Gmail SMTP: ${adminEmail}`);
          } catch (smtpAdminErr) {
            console.error('📧 Gmail SMTP error (admin copy):', smtpAdminErr.message);
          }
        }

        // Fallback 2: Resend API
        const resendApiKey = process.env.RESEND_API_KEY?.trim();
        if (resendApiKey) {
          try {
            await axios.post(
              'https://api.resend.com/emails',
              { from: 'TNAU Booking System <onboarding@resend.dev>', to: [adminEmail], subject: adminSubject, html: adminHtml },
              { headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' }, timeout: 8000 }
            );
            console.log(`📧 Admin notification sent via Resend: ${adminEmail}`);
          } catch (resendErr) {
            // Silently handled
          }
        }
      }
    }

    return {
      sent: customerSent,
      to: customerEmail || adminEmail,
      provider: customerSent ? 'brevo_or_smtp' : 'admin_only'
    };
  } catch (err) {
    console.error('📧 Email send error:', err.message);
    return { sent: false, reason: err.message };
  }
}

// ─── Send Booking Notifications ───────────────────────────────────────────────

export async function sendBookingNotifications(booking, room, settings) {
  const emailResult = await sendEmailConfirmation(booking, room, settings);
  return {
    email: emailResult
  };
}

