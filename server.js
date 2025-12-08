import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import authRouter from "./routes/authRouter.js";
import uploadRouter from "./routes/uploadRouter.js";

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5174";
const PORT = process.env.PORT || 5000;

const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        credentials: true
    }
})

app.use(cors({
    origin: CLIENT_URL,
    credentials: true
}));
app.use(express.json());

const dirs = ["uploads", "processed"];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

app.use("/auth", authRouter);
app.use("/upload", uploadRouter(io))

io.on("connection", (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });

})

app.get("/", (req, res) => {
    res.send("Server is running");
})

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});