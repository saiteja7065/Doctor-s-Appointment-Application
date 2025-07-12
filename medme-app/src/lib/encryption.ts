import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16,  // 128 bits
  tagLength: 16, // 128 bits
  saltLength: 32, // 256 bits
};

// Get encryption key from environment or generate one
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('ENCRYPTION_KEY not set in environment variables. Using default key for development.');
    // In production, this should be a proper 256-bit key
    return crypto.scryptSync('medme-default-key', 'salt', ENCRYPTION_CONFIG.keyLength);
  }
  
  // If key is hex-encoded
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // If key is base64-encoded
  if (key.length === 44) {
    return Buffer.from(key, 'base64');
  }
  
  // Derive key from string
  return crypto.scryptSync(key, 'medme-salt', ENCRYPTION_CONFIG.keyLength);
}

/**
 * Encrypt sensitive data
 */
export function encryptData(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
    const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, key);
    cipher.setAAD(Buffer.from('medme-aad')); // Additional authenticated data
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv + tag + encrypted data
    const combined = Buffer.concat([
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = combined.slice(0, ENCRYPTION_CONFIG.ivLength);
    const tag = combined.slice(ENCRYPTION_CONFIG.ivLength, ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength);
    const encrypted = combined.slice(ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength);
    
    const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('medme-aad'));
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(ENCRYPTION_CONFIG.saltLength).toString('hex');
  const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512');
  return `${actualSalt}:${hash.toString('hex')}`;
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hashedData: string): boolean {
  try {
    const [salt, hash] = hashedData.split(':');
    const newHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
    return hash === newHash.toString('hex');
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt PII (Personally Identifiable Information)
 */
export function encryptPII(data: any): any {
  if (typeof data === 'string') {
    return encryptData(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => encryptPII(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const encrypted: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Fields that should be encrypted
      const sensitiveFields = [
        'email',
        'phone',
        'address',
        'ssn',
        'dateOfBirth',
        'medicalHistory',
        'allergies',
        'medications',
        'emergencyContact',
        'insuranceInfo'
      ];
      
      if (sensitiveFields.includes(key) && typeof value === 'string') {
        encrypted[key] = encryptData(value);
      } else if (typeof value === 'object') {
        encrypted[key] = encryptPII(value);
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }
  
  return data;
}

/**
 * Decrypt PII (Personally Identifiable Information)
 */
export function decryptPII(data: any): any {
  if (typeof data === 'string') {
    try {
      return decryptData(data);
    } catch {
      // If decryption fails, return original data (might not be encrypted)
      return data;
    }
  }
  
  if (Array.isArray(data)) {
    return data.map(item => decryptPII(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const decrypted: any = {};
    for (const [key, value] of Object.entries(data)) {
      const sensitiveFields = [
        'email',
        'phone',
        'address',
        'ssn',
        'dateOfBirth',
        'medicalHistory',
        'allergies',
        'medications',
        'emergencyContact',
        'insuranceInfo'
      ];
      
      if (sensitiveFields.includes(key) && typeof value === 'string') {
        try {
          decrypted[key] = decryptData(value);
        } catch {
          decrypted[key] = value; // Not encrypted or decryption failed
        }
      } else if (typeof value === 'object') {
        decrypted[key] = decryptPII(value);
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }
  
  return data;
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data === 'string') {
    return '[REDACTED]';
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const sensitiveFields = [
        'password',
        'email',
        'phone',
        'address',
        'ssn',
        'dateOfBirth',
        'medicalHistory',
        'allergies',
        'medications',
        'emergencyContact',
        'insuranceInfo',
        'token',
        'apiKey',
        'secret'
      ];
      
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Generate encryption key for environment
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength).toString('hex');
}

/**
 * Validate data integrity using HMAC
 */
export function signData(data: string): string {
  const key = getEncryptionKey();
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Verify data integrity using HMAC
 */
export function verifySignature(data: string, signature: string): boolean {
  const expectedSignature = signData(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Export types for TypeScript
export interface EncryptedData {
  data: string;
  signature: string;
  timestamp: number;
}

/**
 * Encrypt data with signature and timestamp
 */
export function encryptWithSignature(plaintext: string): EncryptedData {
  const encrypted = encryptData(plaintext);
  const signature = signData(encrypted);
  const timestamp = Date.now();
  
  return {
    data: encrypted,
    signature,
    timestamp
  };
}

/**
 * Decrypt data and verify signature
 */
export function decryptWithVerification(encryptedData: EncryptedData): string {
  // Verify signature
  if (!verifySignature(encryptedData.data, encryptedData.signature)) {
    throw new Error('Data integrity check failed');
  }
  
  // Check if data is too old (optional)
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  if (Date.now() - encryptedData.timestamp > maxAge) {
    console.warn('Encrypted data is older than maximum age');
  }
  
  return decryptData(encryptedData.data);
}
