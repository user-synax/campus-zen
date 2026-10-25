// TEMPORARY — seeds one verified account into the scratch UI database.
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/campuszen_menu_ui";

const mongoose = (await import("mongoose")).default;
const bcrypt = (await import("bcryptjs")).default;
const { User } = await import("./src/models/User.js");
const { Session } = await import("./src/models/Session.js");

await mongoose.connect(process.env.MONGO_URI);
await mongoose.connection.dropDatabase();
await mongoose.connection.syncIndexes();

await Session.deleteMany({});
await User.deleteMany({ username: "uicheck" });
await User.create({
  fullName: "UI Check",
  username: "uicheck",
  email: "uicheck@example.com",
  passwordHash: await bcrypt.hash("CheckPass123!", 10),
  isEmailVerified: true,
  college: "IIT Delhi",
  course: "Computer Science",
  academicYear: "3rd Year",
  bio: "Seeded for the settings UI check.",
});

console.log("seeded uicheck");
await mongoose.disconnect();
