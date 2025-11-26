export const CryptoUtils = {
  deriveKey: async (password: string, salt: string) => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  encrypt: async (data: any, password: string) => {
    try {
      const salt = "ollama-secure-salt";
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await CryptoUtils.deriveKey(password, salt);
      const encodedData = new TextEncoder().encode(JSON.stringify(data));

      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedData
      );

      const ivArray = Array.from(iv);
      const encryptedArray = Array.from(new Uint8Array(encrypted));
      return JSON.stringify({ iv: ivArray, data: encryptedArray });
    } catch (e) {
      console.error("Encryption failed", e);
      return null;
    }
  },

  decrypt: async (encryptedPkg: any, password: string) => {
    try {
      const { iv, data } = JSON.parse(encryptedPkg);
      const salt = "ollama-secure-salt";
      const key = await CryptoUtils.deriveKey(password, salt);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        new Uint8Array(data)
      );

      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
      console.error("Decryption failed", e);
      return null;
    }
  }
};