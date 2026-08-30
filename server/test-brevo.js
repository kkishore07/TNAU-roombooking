import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const apiKey = process.env.BREVO_API_KEY?.trim();
const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'tnaurooms@gmail.com';
const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'TNAU GuestHouse';

console.log('Testing Brevo API Key:', apiKey?.substring(0, 15) + '...');
console.log('Sender:', `"${senderName}" <${senderEmail}>`);

async function testBrevo() {
  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: 'tnaurooms@gmail.com', name: 'TNAU Admin' }],
        subject: '✅ Brevo Email Test - TNAU Room Booking System',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1a6b32;">🎉 Brevo Email Integration Working!</h2>
            <p>This is a test notification confirming that Brevo HTTPS API is connected and sending emails successfully.</p>
            <p>Both customer booking confirmations and admin booking alerts will now be sent reliably without cloud port restrictions.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <small style="color: #888;">Sent from TNAU Room Booking System</small>
          </div>
        `
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ SUCCESS! Brevo Response:', response.status, JSON.stringify(response.data));
  } catch (error) {
    console.error('❌ FAILED Brevo Error:', error.response?.status, JSON.stringify(error.response?.data) || error.message);
  }
}

testBrevo();
