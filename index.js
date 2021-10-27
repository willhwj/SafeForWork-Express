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

async function updateCategory(req) {
    console.log("enter updateCategory");
    let db = await connect();
    let filterCriteria = [...req.body.occasion, req.body.theme, req.body.type, req.body.length];
    console.log(filterCriteria);
    let results = await db.collection("categories").updateMany(
        {
            // match all category documents impacted by the snippet changed, including theme, type, length and occasion. at least 4 or more documents are matched, because occasion can have multiple values
            "optionName": { $in: filterCriteria }
        },
        {
            $inc: {
                "numSnippets": req.body.changeInSnippets,
                "numComments": req.body.changeInComments,
                "numCollected": req.body.changeInCollections
            }
        }
    );
    console.log(results);
}

// Routes

async function main() {

    // count snippets, comments and collectedBy based on theme, type, occasion or length
    // app.get("/snippets/count", async (req, res)=> {

    // })

    // update category collection when a snippet is deleted
    // app.patch("/categories/update/snippetDeleted", async (req, res) => {
    //     let db = await connect();
    //     let filterCriteria =[...req.body.occasion, req.body.theme, req.body.type, req.body.length];
    //     let results = await db.collection("categories").updateMany(
    //         {
    //             // match all category documents impacted by the snippet changed, including theme, type, length and occasion. at least 4 or more documents are matched, because occasion can have multiple values
    //             "optionName": {$in: filterCriteria}
    //         },
    //         {
    //             $inc: {
    //                 "numSnippets": req.body.changeInSnippets, 
    //                 "numComments": req.body.changeInComments, 
    //                 "numCollected": req.body.changeInCollections
    //             }
    //         }
    //     );
    //     console.log(results);
    //     res.json(results)
    // })

    // read all snippets
    app.get("/snippets", async (req, res) => {
        let db = await connect();
        let results = await db.collection("snippets").find().toArray();
        res.json(results)
    })

    // delete existing snippet
    app.delete("/snippets/delete/:id", async (req, res) => {
        let db = await connect();
        let results = await db.collection("snippets").deleteOne({
            "_id": ObjectId(req.params.id)
        });

        await updateCategory(req);

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
        let db = await connect();
        let results = await db.collection("snippets").insertOne({
            name: req.body.name,
            creator: { ...req.body.creator },
            content: req.body.content,
            occasions: [...req.body.occasions],
            type: req.body.type,
            theme: req.body.theme,
            length: req.body.length,
            comments: [],
            collectedBy: []
        });
        res.status(200);
        res.send(results);
    })

    // method 1: use mongodb updateOne. however, it does not return the updated document
    // create new comment
    // app.patch("/snippets/:id/comments/create", async (req, res) => {
    //     console.log(req.body);
    //     let db = await connect();
    //     let results = await db.collection("snippets").updateOne({
    //         "_id": ObjectId(req.params.id)
    //     },
    //         {
    //             $push: {
    //                 comments: {
    //                     _id: ObjectId(),
    //                     username: req.body.username,
    //                     date: Date(),
    //                     comment: req.body.comment
    //                 }
    //             }
    //         },
    //         { upsert: true });
    //     res.status(200);
    //     res.send(results);
    // })

    // method 2: use mongodb findOneAndUpdate, it returns updated documented
    // create new comment and return the new comment added
    app.patch("/snippets/:id/comments/create", async (req, res) => {
        let db = await connect();
        let results = await db.collection("snippets").findOneAndUpdate(
            { "_id": ObjectId(req.params.id) },
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
            {
                projection: {
                    _id: 0,
                    name: 0,
                    content: 0,
                    occasions: 0,
                    type: 0,
                    creator: 0,
                    collectedBy: 0,
                    theme: 0,
                    length: 0,
                    comments: { $slice: -1 }
                },
                returnDocument: "after"
            });
        res.status(200);
        res.send(results);
    })

    // delete existing comment and return the updated snippet
    app.patch("/snippets/:id/comments/delete/:commentID", async (req, res) => {
        let db = await connect();
        let results = await db.collection("snippets").findOneAndUpdate(
            { "_id": ObjectId(req.params.id) },
            {
                $pull: { comments: { _id: ObjectId(req.params.commentID) } }
            },
            { returnDocument: "after" }
        );
        res.status(200);
        res.send(results);
    })

    // update existing comment and return the updated snippet
    app.patch("/snippets/:id/comments/update/:commentID", async (req, res) => {
        console.log(req.body);
        let db = await connect();
        let results = await db.collection("snippets").findOneAndUpdate(
            { "_id": ObjectId(req.params.id) },
            {
                $set: {
                    "comments.$[elem].comment": req.body.comment,
                    "comments.$[elem].date": Date()
                }
            },
            {
                arrayFilters: [{ "elem._id": { $eq: ObjectId(req.params.commentID) } }],
                // for future reference, to project just the updated comment from the comments array
                // projection: {
                //     comments: { $elemMatch: { _id: ObjectId(req.params.commentID) } }
                // },
                returnDocument: "after"
            });
        res.status(200);
        res.send(results);
    })

    // read categories
    app.get("/categories/:category/:option", async (req, res) => {
        console.log("enter categories routing. req.params are ", req.params);
        let db = await connect();
        let results = [];
        if (req.params.category === "all") {
            results = await db.collection("categories").find().toArray();
        } else {
            req.params.option === "all" ?
                results = await db.collection("categories").find({ "category": req.params.category }).toArray() :
                results = await db.collection("categories").find({
                    "category": req.params.category,
                    "optionName": req.params.option
                }).toArray();
        }

        console.log(results);
        res.json(results)
    })
}

main();

// Start Server
app.listen(8888, () => {
    console.log("server has started")
})