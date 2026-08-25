import QRCode from 'qrcode';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'hostel-super-secret-jwt-key-2026';

/**
 * Generate a cryptographically signed QR token string for an approved outpass
 */
export function generateOutPassToken(outpass, student) {
  const payload = {
    outpassId: outpass.id,
    studentId: student.id,
    rollNo: student.roll_no,
    studentName: student.name,
    roomNumber: student.room_number || 'N/A',
    destination: outpass.destination,
    outDate: outpass.out_date,
    inDate: outpass.in_date,
    passType: outpass.pass_type,
    type: 'HOSTEL_OUTPASS'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify an outpass QR token
 */
export function verifyOutPassToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'HOSTEL_OUTPASS') {
      return { valid: false, error: 'Invalid token type' };
    }
    return { valid: true, data: decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Generate QR Code as a Data URL (base64 PNG) for displaying in the frontend
 */
export async function generateQRCodeDataURL(qrString) {
  try {
    const qrDataUrl = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Failed to generate QR Data URL:', err);
    throw err;
  }
}