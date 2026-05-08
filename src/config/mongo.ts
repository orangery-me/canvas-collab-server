import type { Db } from "mongodb";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB ?? "canvas_collab";

export const client = new MongoClient(uri);

let dbPromise: Promise<Db> | null = null;

export async function connectMongo(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = client.connect().then(() => {
      console.log("MongoDB connected");
      return client.db(dbName);
    });
  }
  return dbPromise;
}