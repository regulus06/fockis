require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

(async () => {
  const email = "elinceregulus355@gmail.com";
  const newPassword = "Fockis!2026#Secure9";

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const db = mongoose.connection.db;
  const users = db.collection("users");

  const hash = await bcrypt.hash(newPassword, 12);

  const result = await users.updateOne(
    { email: email.toLowerCase().trim() },
    {
      $set: {
        password: hash,
        mustChangePassword: false,
        passwordResetByAdmin: false,
        passwordChangedAt: new Date(),
      },
    }
  );

  console.log("Matched users:", result.matchedCount);
  console.log("Updated users:", result.modifiedCount);

  await mongoose.disconnect();
})();
