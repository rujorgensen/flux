const ALGORITHM = { name: "AES-GCM", length: 256 };
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a cryptographic key from a password using PBKDF2.
 */
export async function deriveKey(
    password: string,
    salt: any,
) {
    const passwordBuffer = new TextEncoder().encode(password);
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        keyMaterial,
        ALGORITHM,
        true,
        ["encrypt", "decrypt"]
    );
}
