import * as crypto from "crypto";

export class E2EEService {

  static generateKeyPair() {
    return crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
  }

  static encrypt(publicKey: string, message: string) {
    return crypto.publicEncrypt(publicKey, Buffer.from(message)).toString("base64");
  }

  static decrypt(privateKey: string, encrypted: string) {
    return crypto.privateDecrypt(
      privateKey,
      Buffer.from(encrypted, "base64")
    ).toString();
  }
}