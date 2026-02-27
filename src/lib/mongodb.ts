import mongoose, { Connection } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// eslint-disable-next-line no-var
var cached: MongooseCache = { conn: null, promise: null };

if (typeof global !== 'undefined' && global.mongoose) {
  cached = global.mongoose;
} else if (typeof global !== 'undefined') {
  global.mongoose = cached;
}

async function dbConnect(): Promise<Connection> {
  if (!MONGODB_URI) {
    // Return a dummy connection for build time, actual error will be thrown at runtime
    console.warn('MONGODB_URI is not set. Please define it in Vercel environment variables.');
    return {} as Connection;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mgr) => {
      return mgr.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
