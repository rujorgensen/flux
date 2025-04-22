import { deriveKey } from './shared.utils';

const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Encrypts a JSON object using AES-256-GCM with password-derived key
 * 
 * @param {Object} data - The data to encrypt
 * @param {string} password - The password
 * @returns {Promise<Object>} - Encrypted data (Base64 format)
 */
export async function encrypt(
    data: string,
    password: string,
) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH)); // Random IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH)); // Random Salt
    const key = await deriveKey(password, salt);
    const encoded = new TextEncoder().encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );

    return {
        encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))), // Base64
        iv: btoa(String.fromCharCode(...iv)), // Base64 IV
        salt: btoa(String.fromCharCode(...salt)), // Base64 Salt
    };
}
