import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const key = process.env.RESEND_API_KEY?.trim();
console.log('Testing Resend API key:', key?.substring(0, 12) + '...');

try {
  const res = await axios.post(
    'https://api.resend.com/emails',
    {
      from: 'TNAU Guest House <onboarding@resend.dev>',
      to: ['kanwalkishore24@gmail.com'],
      subject: 'Test Email - TNAU Booking System is Working!',
      html: '<h2 style="color:#1a6b32">Booking System Email Test</h2><p>This test email confirms that Resend API email delivery is now working correctly for TNAU Room Booking System.</p><p>Future booking confirmation emails will be delivered to this address.</p>'
    },
    {
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );
  console.log('SUCCESS! Resend API Response:', res.status, JSON.stringify(res.data));
} catch (err) {
  console.error('FAILED:', err.response?.status, JSON.stringify(err.response?.data) || err.message);
}
