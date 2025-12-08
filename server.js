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

// 환경변수에서 클라이언트 URL 가져오기 (Railway 배포용)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5174";
const PORT = process.env.PORT || 5000;

console.log("🚀 Server starting...");
console.log("📝 Environment check:");
console.log("  - PORT:", PORT);
console.log("  - CLIENT_URL:", CLIENT_URL);
console.log("  - YOUTUBE_CLIENT_ID:", process.env.YOUTUBE_CLIENT_ID ? "✅ Set" : "❌ Missing");
console.log("  - YOUTUBE_REFRESH_TOKEN:", process.env.YOUTUBE_REFRESH_TOKEN ? "✅ Set" : "❌ Missing");

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

// 필수 디렉토리 생성
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

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
})

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});