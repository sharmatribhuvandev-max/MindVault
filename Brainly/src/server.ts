import app from "./app.js";
import { PORT } from "./config.js";
import { connectToDatabase } from "./db.js";

async function startServer(): Promise<void> {
    try {
        await connectToDatabase();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
