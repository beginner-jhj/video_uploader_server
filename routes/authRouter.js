import express from 'express';
import { loadTokens, saveYoutubeTokens, checkYoutubeAuth, getYoutubeAuthURL } from '../functions/authFunctions.js';

const authRouter = express.Router();

authRouter.get("/check", (req, res) => { 
    try{
    const tokens = loadTokens();
    const platforms = {
        youtube:{
            name:"youtube",
            isAuthenticated: false
        },
        instagram:{
            name:"instagram",
            isAuthenticated: true // To be implemented
        },
        tiktok:{
            name:"tiktok",
            isAuthenticated:true // To be implemented
        }
    };

    const youtubeAuth = checkYoutubeAuth(tokens.youtube?.refresh_token);
    platforms.youtube.isAuthenticated = youtubeAuth;

    res.status(200).json({platform: Object.values(platforms)});

    }catch(error){
        console.error(error);
        throw error;
    }
})

authRouter.get("/youtube",(req,res)=>{
    const authURL = getYoutubeAuthURL();
    res.redirect(authURL);
})

authRouter.get("/youtube/callback", async (req,res)=>{
    const { code } = req.query;
    const success = await saveYoutubeTokens(code);

    if(success){
        res.status(200).redirect("http://localhost:5174/authenticate?platform=youtube");
    }else{
        throw new Error("Failed to save YouTube tokens");
    }
})


export default authRouter;