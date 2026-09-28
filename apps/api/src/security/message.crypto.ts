import * as crypto from "crypto";

const SECRET = crypto.createHash("sha256")
  .update(process.env.MSG_SECRET || "dev-secret")
  .digest();

const IV_LENGTH = 16;

export class MessageCrypto {
  static encrypt(text: string) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", SECRET, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);

    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  static decrypt(data: string) {
    const [ivHex, encryptedHex] = data.split(":");

    const iv = Buffer.from(ivHex, "hex");
    const encryptedText = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-cbc", SECRET, iv);

    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}