import express from "express";
import axios from "axios";
import { createClient, } from "redis";

const app = express();
app.use(express.json());

const client = createClient();
client.on('error', (err) => console.log('Redis Client Error', err));

const EXP_TIME = 60 * 5;
//redis as cache
app.get("/photos", async (req, res) => {
    const albumId = req.query.albumId;
    const flush = req.query.flush;

    //clear flush
    if(flush === "true") {
        await client.flushAll();
    }


    const photos = await client.get(`photos-${albumId}`);
    if (photos != null) {
        console.log("Hit cache");
        return res.json(JSON.parse(photos));
    } else {
        const { data } = await axios.get("https://jsonplaceholder.typicode.com/photos", {
            params: { albumId }
        })

        client.setEx(`photos-${albumId}`, EXP_TIME, JSON.stringify(data))
        console.log("Miss cache");
        res.json(data);
    }




})


//redis as pub-sub queue
app.post("/submit", async (req, res) => {
    const problemId = req.body.problemId;
    const code = req.body.code;
    const language = req.body.language;

    try {
        await client.lPush("problems", JSON.stringify({ code, language, problemId }));
        res.status(200).send("Submission received and stored.");
    } catch (error) {
        console.error("Redis error:", error);
        res.status(500).send("Failed to store submission.");
    }
});

async function startServer() {
    try {
        await client.connect();
        console.log("Connected to Redis");

        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
}

startServer();
