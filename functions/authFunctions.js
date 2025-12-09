import "dotenv/config";
import { google } from "googleapis";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOKENS_FILE = path.join(__dirname, "..", "tokens.json");
export const youtubeOAuth = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
)

export function loadTokens() {
    // 1순위: 환경변수에서 로드 (Railway 배포용)
    if (process.env.YOUTUBE_REFRESH_TOKEN) {
        console.log("✅ Loading tokens from environment variables");
        return {
            youtube: {
                access_token: process.env.YOUTUBE_ACCESS_TOKEN || "",
                refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
            },
            instagram: {
                access_token: process.env.INSTAGRAM_ACCESS_TOKEN || "",
                refresh_token: process.env.INSTAGRAM_REFRESH_TOKEN || ""
            },
            tiktok: {
                access_token: process.env.TIKTOK_ACCESS_TOKEN || "",
                refresh_token: process.env.TIKTOK_REFRESH_TOKEN || ""
            }
        };
    }

    // 2순위: 파일에서 로드 (로컬 개발용)
    if (!fs.existsSync(TOKENS_FILE)) {
        console.log("⚠️  No tokens found (neither env vars nor tokens.json)");
        return {};
    }
    console.log("✅ Loading tokens from tokens.json");
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
}

export function saveTokens(tokens) {
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL) {
        console.log("\n⚠️  Railway 환경에서는 tokens.json 파일이 유지되지 않습니다.");
        console.log("⚠️  다음 토큰을 Railway Variables에 추가하세요:\n");
        if (tokens.youtube) {
            console.log(`YOUTUBE_ACCESS_TOKEN=${tokens.youtube.access_token}`);
            console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.youtube.refresh_token}\n`);
        }
        return true;
    }

    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
    console.log("✅ Tokens saved to tokens.json");
    return true;
}

export async function checkYoutubeAuth(refreshToken) {
    if (!refreshToken || refreshToken === "") return false;

    try {
        youtubeOAuth.setCredentials({ refresh_token: refreshToken });
        const youtube = google.youtube({ version: "v3", auth: youtubeOAuth });
        await youtube.channels.list({ part: "snippet", mine: true });
        return true;
    } catch (error) {
        console.error("Error checking YouTube auth:", error);
        return false;
    }
}

export function getYoutubeAuthURL() {
    return youtubeOAuth.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"],
        prompt: "consent"
    });
}

export async function saveYoutubeTokens(code) {
    try {
        const { tokens } = await youtubeOAuth.getToken(code);
        if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL) {
            console.log("\n⚠️  Railway 환경에서는 tokens.json 파일이 유지되지 않습니다.");
            console.log("⚠️  다음 토큰을 Railway Variables에 추가하세요:");
            console.log(`YOUTUBE_ACCESS_TOKEN=${tokens.access_token}`);
            console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
            return true;
        }
        const allTokens = loadTokens();
        allTokens.youtube = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        }
        saveTokens(allTokens);
        return true;
    } catch (error) {
        console.error("Error saving YouTube tokens:", error);
        return false;
    }
}