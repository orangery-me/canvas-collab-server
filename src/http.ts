import express from "express";
import dotenv from "dotenv";
import {
  getDoc,
  saveDoc,
  readBlocks,
  insertBlock,
  updateBlock,
  deleteBlock,
  reorderBlocks,
} from "./yjs-utils.js";

dotenv.config();

const HTTP_PORT = parseInt(process.env.HTTP_PORT ?? "1235", 10);
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? "";

const app = express();
app.use(express.json());

function requireInternalSecret(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!INTERNAL_SECRET) {
    next();
    return;
  }
  const header = req.headers["x-internal-secret"];
  if (header !== INTERNAL_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.use(requireInternalSecret);

// GET /canvas/:id/blocks
app.get("/canvas/:id/blocks", async (req, res) => {
  const canvasId = req.params["id"];
  try {
    const { doc } = await getDoc(canvasId);
    const blocks = readBlocks(doc);
    res.json(blocks);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[GET /canvas/:id/blocks]", err);
    res.status(500).json({ error: msg });
  }
});

// POST /canvas/:id/blocks — insert a new block
// Body: { content: string, type?: string, afterIndex?: number }
app.post("/canvas/:id/blocks", async (req, res) => {
  const canvasId = req.params["id"];
  try {
    const { content, type = "paragraph", afterIndex } = req.body as {
      content: string;
      type?: string;
      afterIndex?: number;
    };
    if (content === undefined || content === null) {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const { doc, isLive } = await getDoc(canvasId);
    insertBlock(doc, content, type, afterIndex);
    if (!isLive) {
      await saveDoc(canvasId, doc);
    }
    const blocks = readBlocks(doc);
    res.json({ ok: true, blocks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[POST /canvas/:id/blocks]", err);
    res.status(500).json({ error: msg });
  }
});

// PATCH /canvas/:id/blocks/:index — update block text
// Body: { content: string }
app.patch("/canvas/:id/blocks/:index", async (req, res) => {
  const canvasId = req.params["id"];
  const blockIndex = parseInt(req.params["index"]!, 10);
  try {
    const { content } = req.body as { content: string };
    if (isNaN(blockIndex)) {
      res.status(400).json({ error: "index must be a number" });
      return;
    }
    const { doc, isLive } = await getDoc(canvasId);
    updateBlock(doc, blockIndex, content ?? "");
    if (!isLive) {
      await saveDoc(canvasId, doc);
    }
    const blocks = readBlocks(doc);
    res.json({ ok: true, blocks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[PATCH /canvas/:id/blocks/:index]", err);
    const status = err instanceof RangeError ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

// DELETE /canvas/:id/blocks/:index
app.delete("/canvas/:id/blocks/:index", async (req, res) => {
  const canvasId = req.params["id"];
  const blockIndex = parseInt(req.params["index"]!, 10);
  try {
    if (isNaN(blockIndex)) {
      res.status(400).json({ error: "index must be a number" });
      return;
    }
    const { doc, isLive } = await getDoc(canvasId);
    deleteBlock(doc, blockIndex);
    if (!isLive) {
      await saveDoc(canvasId, doc);
    }
    const blocks = readBlocks(doc);
    res.json({ ok: true, blocks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[DELETE /canvas/:id/blocks/:index]", err);
    const status = err instanceof RangeError ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

// POST /canvas/:id/blocks/reorder — move block from one index to another
// Body: { fromIndex: number, toIndex: number }
app.post("/canvas/:id/blocks/reorder", async (req, res) => {
  const canvasId = req.params["id"];
  try {
    const { fromIndex, toIndex } = req.body as {
      fromIndex: number;
      toIndex: number;
    };
    if (typeof fromIndex !== "number" || typeof toIndex !== "number") {
      res
        .status(400)
        .json({ error: "fromIndex and toIndex must be numbers" });
      return;
    }
    const { doc, isLive } = await getDoc(canvasId);
    reorderBlocks(doc, fromIndex, toIndex);
    if (!isLive) {
      await saveDoc(canvasId, doc);
    }
    const blocks = readBlocks(doc);
    res.json({ ok: true, blocks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[POST /canvas/:id/blocks/reorder]", err);
    const status = err instanceof RangeError ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Canvas HTTP mutation server running on port ${HTTP_PORT}`);
});

export default app;
