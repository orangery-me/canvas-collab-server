import * as Y from "yjs";
import { getCanvas, updateCanvas } from "./datasource/canvas.datasource.js";
import { hocoServer } from "./server.js";
// Supported TipTap block node names
const SUPPORTED_TYPES = new Set([
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "blockquote",
    "codeBlock",
    "horizontalRule",
]);
/**
 * Get the live Y.Doc from Hocuspocus in-memory store,
 * or load a fresh one from Mongo if no active session exists.
 * Returns { doc, isLive } — caller should persist manually if !isLive.
 */
export async function getDoc(canvasId) {
    const hocus = hocoServer.hocuspocus;
    const liveDoc = hocus?.documents?.get(canvasId);
    if (liveDoc) {
        return { doc: liveDoc, isLive: true };
    }
    // No active session — load from Mongo
    const doc = new Y.Doc();
    const state = await getCanvas(canvasId);
    if (state) {
        Y.applyUpdate(doc, state);
    }
    return { doc, isLive: false };
}
/**
 * Persist a Y.Doc back to Mongo (only needed when the doc is not live).
 */
export async function saveDoc(canvasId, doc) {
    const state = Y.encodeStateAsUpdate(doc);
    await updateCanvas(canvasId, state);
}
/**
 * Read all top-level blocks from the TipTap `default` fragment.
 */
export function readBlocks(doc) {
    const fragment = doc.getXmlFragment("default");
    const blocks = [];
    for (let i = 0; i < fragment.length; i++) {
        const child = fragment.get(i);
        if (child instanceof Y.XmlElement) {
            blocks.push({
                index: i,
                type: child.nodeName,
                text: extractText(child),
            });
        }
        else if (child instanceof Y.XmlText) {
            blocks.push({
                index: i,
                type: "text",
                text: child.toString(),
            });
        }
    }
    return blocks;
}
/**
 * Recursively extract plain text from a Y.XmlElement.
 */
function extractText(el) {
    let text = "";
    for (let i = 0; i < el.length; i++) {
        const child = el.get(i);
        if (child instanceof Y.XmlText) {
            text += child.toString();
        }
        else if (child instanceof Y.XmlElement) {
            text += extractText(child);
        }
    }
    return text;
}
/**
 * Insert a new block into the fragment after `afterIndex`.
 * If afterIndex is undefined or -1, prepend; if >= fragment.length, append.
 */
export function insertBlock(doc, content, type, afterIndex) {
    const fragment = doc.getXmlFragment("default");
    const nodeType = SUPPORTED_TYPES.has(type) ? type : "paragraph";
    const el = new Y.XmlElement(nodeType);
    const textNode = new Y.XmlText();
    textNode.insert(0, content);
    el.insert(0, [textNode]);
    const insertAt = afterIndex === undefined || afterIndex < 0
        ? 0
        : Math.min(afterIndex + 1, fragment.length);
    fragment.insert(insertAt, [el]);
}
/**
 * Update the text content of the block at `blockIndex`.
 */
export function updateBlock(doc, blockIndex, content) {
    const fragment = doc.getXmlFragment("default");
    if (blockIndex < 0 || blockIndex >= fragment.length) {
        throw new RangeError(`blockIndex ${blockIndex} out of range (0..${fragment.length - 1})`);
    }
    const child = fragment.get(blockIndex);
    if (!(child instanceof Y.XmlElement)) {
        throw new TypeError(`Block at index ${blockIndex} is not an XmlElement`);
    }
    if (child.length > 0) {
        child.delete(0, child.length);
    }
    const textNode = new Y.XmlText();
    textNode.insert(0, content);
    child.insert(0, [textNode]);
}
/**
 * Delete the block at `blockIndex`.
 */
export function deleteBlock(doc, blockIndex) {
    const fragment = doc.getXmlFragment("default");
    if (blockIndex < 0 || blockIndex >= fragment.length) {
        throw new RangeError(`blockIndex ${blockIndex} out of range (0..${fragment.length - 1})`);
    }
    fragment.delete(blockIndex, 1);
}
/**
 * Move the block at `fromIndex` to `toIndex`.
 */
export function reorderBlocks(doc, fromIndex, toIndex) {
    const fragment = doc.getXmlFragment("default");
    const len = fragment.length;
    if (fromIndex < 0 || fromIndex >= len) {
        throw new RangeError(`fromIndex ${fromIndex} out of range`);
    }
    if (toIndex < 0 || toIndex >= len) {
        throw new RangeError(`toIndex ${toIndex} out of range`);
    }
    if (fromIndex === toIndex)
        return;
    const source = fragment.get(fromIndex);
    if (!(source instanceof Y.XmlElement)) {
        throw new TypeError(`Block at fromIndex ${fromIndex} is not an XmlElement`);
    }
    const nodeType = source.nodeName;
    const cloned = new Y.XmlElement(nodeType);
    const textContent = extractText(source);
    const textNode = new Y.XmlText();
    textNode.insert(0, textContent);
    cloned.insert(0, [textNode]);
    fragment.delete(fromIndex, 1);
    const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex;
    fragment.insert(adjustedTo, [cloned]);
}
