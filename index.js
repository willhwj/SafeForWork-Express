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

async function updateCategory(categoryChange) {
    console.log("enter updateCategory");
    let db = await connect();
    let filterCriteria = [...categoryChange.occasions, categoryChange.theme, categoryChange.type, categoryChange.length];
    console.log(filterCriteria);
    let results = await db.collection("categories").updateMany(
        {
            // match all category documents impacted by the snippet changed, including theme, type, length and occasion. at least 4 or more documents are matched, because occasion can have multiple values
            "optionName": { $in: filterCriteria }
        },
        {
            $inc: {
                "numSnippets": categoryChange.changeInSnippets,
                "numComments": categoryChange.changeInComments,
                "numCollected": categoryChange.changeInCollections
            }
        }
    );
    console.log(results);
}

// Routes

async function main() {

    // start category collection from clean slate
    app.patch("/categories/reset", async (req, res) => {
        let db = await connect();
        let results = await db.collection("categories").updateMany(
            {},
            {
                $set: {
                    "numSnippets": 0,
                    "numComments": 0,
                    "numCollected": 0
                }
            }
        );
        console.log(results);
        res.json(results)
    })

    // read snippets according to category and option selected
    app.get("/snippets/:category/:option", async (req, res) => {
        let db = await connect();
        console.log("enter search snippets");
        let results = [];
        switch (true) {
            case req.params.category === "all" && req.params.option === "all":
                console.log("search all snippets");
                results = await db.collection("snippets").find().toArray();
                break;
            default:
                results = await db.collection("snippets").find({
                    [req.params.category]: req.params.option
                }).toArray();
        }

        res.json(results)
    })

    // delete snippet
    app.delete("/snippets/delete/:id", async (req, res) => {
        console.log("enter delete snippet");
        console.log(req.body);
        let db = await connect();
        let results = await db.collection("snippets").deleteOne({
            "_id": ObjectId(req.params.id)
        });

        await updateCategory(req.body.categoryChange);

        res.status(200);
        res.send(results);
    })

    // update snippet
    app.patch("/snippets/update/:id", async (req, res) => {
        let db = await connect();
        let currentSnippet = await db.collection("snippets").findOne({
            "_id": ObjectId(req.params.id)
        },
            {
                length: 1,
                occasions: 1,
                type: 1,
                theme: 1
            });
        // track all category options in previous snippet
        let filterForDecrement = [...currentSnippet.occasions, currentSnippet.length, currentSnippet.type, currentSnippet.theme];
        // track all cateogry options in new snippet
        let filterForIncrement = [...req.body.occasions, req.body.length, req.body.type, req.body.theme];

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

        // all category options in new snippet increments by 1, all category options in previous snippet decrement by 1. Net result is that removed options decrement by 1, added options increment by 1
        let results2 = await db.collection("categories").updateMany(
            {
                "optionName": { $in: filterForIncrement }
            },
            {
                $inc: {
                    "numSnippets": 1
                }
            }
        );

        let results3 = await db.collection("categories").updateMany(
            {
                "optionName": { $in: filterForDecrement }
            },
            {
                $inc: {
                    "numSnippets": -1
                }
            }
        );

        console.log(results2, results3);
        res.status(200);
        res.send(results);
    })

    // create snippet
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

        await updateCategory(req.body.categoryChange);

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
    // create comment and return the new comment added
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

        await updateCategory(req.body.categoryChange);

        res.status(200);
        res.send(results);
    })

    // delete comment and return the updated snippet
    app.patch("/snippets/:id/comments/delete/:commentID", async (req, res) => {
        let db = await connect();
        let results = await db.collection("snippets").findOneAndUpdate(
            { "_id": ObjectId(req.params.id) },
            {
                $pull: { comments: { _id: ObjectId(req.params.commentID) } }
            },
            { returnDocument: "after" }
        );

        await updateCategory(req.body.categoryChange);

        res.status(200);
        res.send(results);
    })

    // update comment and return the updated snippet
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