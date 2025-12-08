import express from "express";
import multer from "multer";
import { processVideo, uploadToYoutube } from "../functions/videoFunctions.js";
import path from "path";
import fs from "fs";

const upload = multer({ dest: "uploads/" })

export default function uploadRouter(io) {
    const router = express.Router();

    router.post("/", upload.single("video"), async (req, res) => {
        const { day } = req.body
        const platforms = JSON.parse(req.body.platforms);
        const videoFile = req.file;
        const socketid = req.headers['x-socket-id'];

        const emit = (code, message, data = {}) => {
            if (socketid) {
                io.to(socketid).emit('upload-progress', {
                    status: {
                        code,
                        message
                    },
                    ...data
                })
            }
        }

        try {
            emit("video-processing-start", "영상 업로드 시작...", { progress: 10 });
            const processedPath = await processVideo(videoFile.path, day, (progress) => {
                emit('video-processing-progress', `영상 처리 중...${Math.round(progress)}%`, {
                    progress: 10 + progress * 0.4
                })
            })
            const fileName = path.basename(processedPath);
            const previewUrl = `http://localhost:5000/upload/preview/${fileName}`;
            emit("video-processing-finished", '영상 처리 완료!', { progress: 50 });

            let currentProgress = 50;
            const uploadResults = [];

            if (platforms.youtube) {
                emit("upload-youtube-start", "YouTube 업로드 시작...", { progress: currentProgress })
                try {
                    await uploadToYoutube(processedPath, `Day ${day} done`, (progress) => {
                        emit("upload-youtube-progress", `YouTube 업로드 중...${progress}%`, {
                            progress: currentProgress + (progress * 0.15),
                        })
                    })
                    uploadResults.push({
                        platform: "youtube",
                        status: "finished"
                    })
                    currentProgress += 15;
                    emit("upload-youtube-finished", "YouTube 업로드 완료!", {
                        progress: currentProgress
                    })
                } catch {
                    uploadResults.push({
                        platform: "youtube",
                        status: "skipped"
                    })
                    currentProgress += 15;
                    emit("upload-youtube-skipped", "YouTube 업로드 스킵됨", {
                        progress: currentProgress
                    })
                }
            } else {
                uploadResults.push({
                    platform: "youtube",
                    status: "skipped"
                });
                currentProgress += 15;
                emit("upload-youtube-skipped", "YouTube 업로드 스킵됨.", {
                    progress: currentProgress
                })
            }

            if (platforms.instagram) {
                //to be implemented
            } else {
                uploadResults.push({
                    platform: "instagram",
                    status: "skipped"
                })
                currentProgress += 15;
                emit("upload-instagram-skipped", "Instagram 업로드 스킵됨.", {
                    progress: currentProgress
                })
            }

            if (platforms.tiktok) {
                //to be implemented
            } else {
                uploadResults.push({
                    platform: "tiktok",
                    status: "skipped"
                })
                currentProgress += 15;
                emit("upload-tiktok-skipped", "TikTok 업로드 스킵됨.", {
                    progress: currentProgress
                })
            }

            emit("completed", "모든 업로드 완료!", {
                progress: 100,
                results: uploadResults
            })


            res.status(200).json({
                uploadResults,
                previewUrl
            })

            fs.unlinkSync(videoFile.path);

            setTimeout(() => {
                if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
            }, 10 * 60 * 1000);

        } catch (err) {
            emit("error", `업로드 실패: ${err.message || ""}`, {
                progress: 100
            })
            throw err
        }
    })

    router.get("/preview/:fileName", (req, res) => {
        const filePath = path.join("processed", req.params.fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.sendFile(path.resolve(filePath));
    })

    return router;
}