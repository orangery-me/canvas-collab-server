import { Binary } from "mongodb";
import { connectMongo } from "../config/mongo.js";

type CanvasDocument = {
  _id: string;
  ydocState?: Binary;
  updatedAt?: Date;
  createdAt?: Date;
};

export async function getCanvas(id: string): Promise<Uint8Array | null> {
  const db = await connectMongo();
  const collection = db.collection<CanvasDocument>("canvas_documents");

  const doc = await collection.findOne({ _id: id });
  if (!doc?.ydocState) return null;

  const bin = doc.ydocState as Binary;
  const buf = bin.buffer; // Node Buffer
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export async function updateCanvas(id: string, state: Uint8Array): Promise<void> {
  const db = await connectMongo();
  const collection = db.collection<CanvasDocument>("canvas_documents");

  await collection.updateOne(
    { _id: id },
    {
      $set: {
        ydocState: new Binary(Buffer.from(state)),
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}
