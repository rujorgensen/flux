import { deriveKey } from './shared.utils';

interface IEncryptedData {
    encrypted: string;
    iv: string;
    salt: string;
}

/**
 * Decrypts an AES-256-GCM encrypted JSON object using a password
 * @param {IEncryptedData} encryptedData - The encrypted data object
 * @param {string} password - The password
 * @returns {Promise<Object>} - Decrypted JSON object
 */
export async function decrypt(
    encryptedData: IEncryptedData,
    password: string,
) {
    const {
        encrypted,
        iv,
        salt,
    } = encryptedData;

    // Convert Base64 to Uint8Array
    const ivBytes = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
    const saltBytes = new Uint8Array(atob(salt).split('').map(c => c.charCodeAt(0)));
    const encryptedBytes = new Uint8Array(atob(encrypted).split("").map(c => c.charCodeAt(0)));

    const key = await deriveKey(password, saltBytes);

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        key,
        encryptedBytes
    );

    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}