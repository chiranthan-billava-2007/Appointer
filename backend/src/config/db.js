import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("[Database Error] FATAL: MONGODB_URI environment variable is missing.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] FATAL: Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
};
