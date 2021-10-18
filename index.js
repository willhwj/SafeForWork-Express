// Set up Express
const express = require('express');
const cors = require('cors');
const mongodb = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const MongoClient = mongodb.MongoClient;
const dotenv = require('dotenv');
dotenv.config();

let app = express();
app.use(express.json());
app.use(cors());

// connet to the Mongo DB
async function connect(){
    const mongo_url = process.env.MONGO_URI;
    let client = await MongoClient.connect(mongo_url, {
        "useUnifiedTopology": true
    })
    let db = client.db("sfw");
    console.log("database connected");
    return db;
}

// Routes

async function main(){
    // let db = await connect();

    app.get("/snippets", async(req, res)=> {
        let snippets= await db.collection("snippets").find().toArray();
        res.json(snippets)
    })

}

main();

// Start Server
app.listen(8888, ()=>{
    console.log("server has started")
})