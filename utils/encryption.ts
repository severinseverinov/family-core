import "server-only";
import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.DATA_ENCRYPTION_KEY || "default-key-must-be-32-chars!!"; // .env'den gelir
const IV_LENGTH = 16; // AES için standart

// Anahtarı 32 byte'a tamamla veya kes (Hata almamak için)
const key = crypto
  .createHash("sha256")
  .update(String(ENCRYPTION_KEY))
  .digest("base64")
  .substr(0, 32);

export function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string) {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
