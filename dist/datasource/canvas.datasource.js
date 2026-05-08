import { Binary } from "mongodb";
import { connectMongo } from "../config/mongo.js";
export async function getCanvas(id) {
    const db = await connectMongo();
    const collection = db.collection("canvas_documents");
    const doc = await collection.findOne({ _id: id });
    if (!doc?.ydocState)
        return null;
    const bin = doc.ydocState;
    const buf = bin.buffer; // Node Buffer
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
export async function updateCanvas(id, state) {
    const db = await connectMongo();
    const collection = db.collection("canvas_documents");
    await collection.updateOne({ _id: id }, {
        $set: {
            ydocState: new Binary(Buffer.from(state)),
            updatedAt: new Date(),
        },
        $setOnInsert: {
            createdAt: new Date(),
        },
    }, { upsert: true });
}
