import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import authRouter from "./routes/authRouter.js";
import uploadRouter from "./routes/uploadRouter.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5174",
        credentials: true
    }
})
const PORT = 5000;

app.use(cors({
    origin: "http://localhost:5174",
    credentials: true
}));
app.use(express.json());

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