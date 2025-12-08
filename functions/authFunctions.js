import "dotenv/config";
import { google } from "googleapis";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TOKENS_FILE = path.join(__dirname,"..","tokens.json");
export const youtubeOAuth = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
)

export function loadTokens(){
    if(!fs.existsSync(TOKENS_FILE)){
        return {};
    }
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
}

export function saveTokens(tokens){
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export function checkYoutubeAuth(refreshToken){
    if(!refreshToken || refreshToken==="") return false;

    try{
        youtubeOAuth.setCredentials({refresh_token:refreshToken});
        const youtube = google.youtube({version:"v3", auth: youtubeOAuth});
        youtube.channels.list({part:"snippet", mine:true});
        return true;
    }catch(error){
        console.error("Error checking YouTube auth:", error);
        return false;
    }
}

export function getYoutubeAuthURL(){
    return youtubeOAuth.generateAuthUrl({
        access_type:"offline",
        scope:["https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.readonly"],
        prompt:"consent"
    });
}

export async function saveYoutubeTokens(code){
    try{
        const {tokens} = await youtubeOAuth.getToken(code);
        const allTokens = loadTokens();
        allTokens.youtube = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
        }
        saveTokens(allTokens);
        return true;
    }catch{
        return false;
    }
}
