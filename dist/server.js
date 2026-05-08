import { Server } from "@hocuspocus/server";
import * as Y from "yjs";
import { getCanvas, updateCanvas } from "./datasource/canvas.datasource.js";
function verifyJWT(token) {
    const userId = token && token.length > 0 ? token : "demo-user";
    return {
        id: userId,
        name: "Demo User",
    };
}
export const hocoServer = new Server({
    port: 1234,
    debounce: 1500,
    maxDebounce: 5000,
    async onAuthenticate({ token }) {
        const user = verifyJWT(token);
        if (!user) {
            throw new Error("Unauthorized");
        }
        return {
            userId: user.id,
            name: user.name,
        };
    },
    async onLoadDocument({ documentName }) {
        console.log("Loading:", documentName);
        const ydoc = new Y.Doc();
        try {
            const state = await getCanvas(documentName);
            if (state) {
                Y.applyUpdate(ydoc, state);
            }
            console.log("[onLoadDocument] getCanvas success");
        }
        catch (err) {
            console.error("[onLoadDocument] getCanvas failed:", err);
        }
        return ydoc;
    },
    async onChange({ documentName }) {
        console.log("Changed:", documentName);
    },
    async onStoreDocument({ documentName, document }) {
        const state = Y.encodeStateAsUpdate(document);
        await updateCanvas(documentName, state);
        document.broadcastStateless(JSON.stringify({ type: "canvasSaved" }));
        console.log("[onStoreDocument] canvasSaved broadcasted");
    },
});
async function bootstrap() {
    try {
        await hocoServer.listen();
        console.log("Hocuspocus running on port 1234");
        // Start HTTP mutation server alongside Hocuspocus
        await import("./http.js");
    }
    catch (error) {
        console.error("Error starting server:", error);
        process.exit(1);
    }
}
bootstrap();
