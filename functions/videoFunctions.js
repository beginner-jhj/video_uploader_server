import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { loadTokens, youtubeOAuth } from "./authFunctions.js";
import { google } from "googleapis";


function getVidioDuration(videoPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metaData) => {
            if (err) reject(err);
            else resolve(metaData.format.duration);
        })
    })
}

export async function processVideo(inputPath, dayNumber, onProgress) {
    return new Promise(async (resolve, reject) => {
        const outputPath = path.join("processed", `${Date.now()}.mp4`);

        if (!fs.existsSync("processed")) {
            fs.mkdirSync("processed", { recursive: true });
        }

        const originalDuration = await getVidioDuration(inputPath);
        const speed = originalDuration > 15 ? Math.round(originalDuration / 15) : 1;
        const subtitleDuration = Math.max(3.5, originalDuration * speed * 0.1);
        const centerY = 'h/2-text_h/2';
        const topY = 50;
        const holdTime = speed * 0.3;
        const moveTime = 1;

        const videoFilters = [
            `drawtext=text='Day ${dayNumber}':` +
            `fontsize=240:` +
            `fontcolor=white:` +
            `x=(w-text_w)/2::` +
            `y='if(lt(t,${holdTime}), ${centerY}, if(lt(t,${holdTime + moveTime}), ${centerY}-(t-${holdTime})*(${centerY}-${topY})/${moveTime}, ${topY}))':` +
            `shadowcolor=black@0.7:` +
            `shadowx=3:` +
            `shadowy=3:` +
            `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:` +
            `enable='lt(t,${subtitleDuration})'`,
            `setpts=PTS/${speed}`
        ];

        ffmpeg(inputPath)
            .videoFilters(videoFilters)
            .audioFilters(`atempo=${speed}`)
            .outputOptions([
                '-c:v libx264',
                '-preset fast',
                '-crf 23',
                '-c:a aac',
                '-b:a 128k'
            ])
            .output(outputPath)
            .on('progress', (progress) => {
                if (onProgress) {
                    onProgress(Math.min(progress.percent || 0, 99));
                }
            })
            .on('end', () => {
                if (onProgress) onProgress(100);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .run();
    })
}

function generateThumbnail(videoPath) {
    return new Promise((resolve, reject) => {
        const thumbnailPath = path.join("processed", `thumb_${Date.now()}.jpg`);

        ffmpeg(videoPath)
            .screenshots({
                timestamps: ['00:00:01'],
                filename: path.basename(thumbnailPath),
                folder: 'processed',
                size: '1280x720'
            })
            .on('end', () => resolve(thumbnailPath))
            .on('error', (err) => reject(err));
    });
}


export async function uploadToYoutube(videoPath, title, onProgress) {
    const tokens = loadTokens();
    const youtubeRefreshToken = tokens.youtube.refresh_token;

    if (!youtubeRefreshToken) throw new Error("YouTube 인증 필요");

    youtubeOAuth.setCredentials({ refresh_token: youtubeRefreshToken });

    const youtube = google.youtube({ version: "v3", auth: youtubeOAuth });
    const fileSize = fs.statSync(videoPath).size;

    try {
        const response = await youtube.videos.insert({
            part: ["snippet", "status"],
            requestBody: {
                snippet: {
                    title: `${title} #pickingluck`,
                    categoryId: 22
                },
                status: {
                    privacyStatus: "public",
                    selfDeclaredMadeForKids: false
                }
            },
            media: {
                body: fs.createReadStream(videoPath)
            }
        }, {
            onUploadProgress: (evt) => {
                const progress = (evt.bytesRead / fileSize) * 90;
                if (onProgress) {
                    onProgress(Math.round(progress))
                }
            }
        })

        const videoId = response.data.id;

        try {
            if (onProgress) onProgress(92);
            const thumbnailPath = await generateThumbnail(videoPath);

            if (onProgress) onProgress(95);
            await youtube.thumbnails.set({
                videoId: videoId,
                media: {
                    body: fs.createReadStream(thumbnailPath)
                }
            });

            fs.unlinkSync(thumbnailPath);
            if (onProgress) onProgress(100);
        } catch (thumbError) {
            console.error("썸네일 업로드 실패 (영상은 성공):", thumbError);
            if (onProgress) onProgress(100);
        }

        return {
            videoId: response.data.id,
            url: `https://youtube.com/shorts/${response.data.id}`
        }
    } catch (error) {
        throw error;
    }
}