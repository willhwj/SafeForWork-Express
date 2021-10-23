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

// connect to the Mongo DB
async function connect() {
    const mongo_url = process.env.MONGO_URI;
    let client = await MongoClient.connect(mongo_url, {
        "useUnifiedTopology": true
    })
    let db = client.db("sfw");
    console.log("database connected");
    return db;
}

// Routes

async function main() {

    // read all snippets
    app.get("/snippets", async (req, res) => {
        let db = await connect();
        let snippets = await db.collection("snippets").find().toArray();
        res.json(snippets)
    })

    // delete existing snippet
    app.delete("/snippets/delete/:id", async (req, res) => {
        let db = await connect();
        let results = await db.collection("snippets").deleteOne({
            "_id": ObjectId(req.params.id)
        });
        res.status(200);
        res.send(results);
    })

    // update existing snippet
    app.patch("/snippets/update/:id", async (req, res) => {
        let db = await connect();
        let results = await db.collection("snippets").updateOne({
            "_id": ObjectId(req.params.id)
        },
            {
                $set: {
                    name: req.body.name,
                    content: req.body.content,
                    occasions: [...req.body.occasions],
                    type: req.body.type,
                    theme: req.body.theme,
                    length: req.body.length
                }
            },
            { upsert: true });
        res.status(200);
        res.send(results);
    })

    // create new snippet
    app.post("/snippets/create", async (req, res) => {
        console.log(req.body);
        let db = await connect();
        let results = await db.collection("snippets").insertOne({
            name: req.body.name,
            creator: { ...req.body.creator },
            content: req.body.content,
            occasions: [...req.body.occasions],
            type: req.body.type,
            theme: req.body.theme,
            length: req.body.length
        });
        res.status(200);
        res.send(results);
    })

    // create new comment
    app.patch("/snippets/:id/comments/create", async (req, res) => {
        console.log(req.body);
        let db = await connect();
        let results = await db.collection("snippets").updateOne({
            "_id": ObjectId(req.params.id)
        },
            {
                $push: {
                    comments: {
                        _id: ObjectId(),
                        username: req.body.username,
                        date: Date(),
                        comment: req.body.comment
                    }
                }
            },
            { upsert: true });
        res.status(200);
        res.send(results);
    })

}

main();

// Start Server
app.listen(8888, () => {
    console.log("server has started")
})