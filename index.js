// Set up Express
const express = require('express');
const cors = require('cors');
const mongodb = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const MongoClient = mongodb.MongoClient;
const dotenv = require('dotenv');
dotenv.config();
const {connect, validate, updateCategory} = require("./utilfunctions");

let app = express();
app.use(express.json());
app.use(cors());

// Routes

async function main() {

    // start category collection from clean slate. for admin use
    app.patch("/categories/reset", async (req, res) => {
        try {
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
        }
        catch (error) {
            res.status(500).send("Server encountered internal error. Express route for patch categories/reset")
        }
    })

    // search categories by category name and option name selected by user
    app.get("/categories/:category/:option", (req, res, next) => validate(req, res, next), async (req, res) => {
        console.log("enter categories routing. req.params are ", req.params);
        try {
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
        }
        catch (error) {
            res.status(500).send("Server encountered internal error. Express route for get /categories/:category/:option")
        }
    })

    // read snippets according to category and option selected
    app.get("/snippets/:category/:option", (req, res, next) => validate(req, res, next), async (req, res) => {
        try {
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
        } catch (error) {
            res.status(500).send("Server encountered internal error. Express route for get /snippets/:category/:option")
        }
    })

    // delete snippet
    app.delete("/snippets/delete/:id", (req, res, next) => validate(req, res, next), async (req, res) => {
        console.log("enter delete snippet");
        console.log(req.body);
        try {
            let db = await connect();
            let results = await db.collection("snippets").deleteOne({
                "_id": ObjectId(req.params.id)
            });

            await updateCategory(req.body.categoryChange);

            res.status(200);
            res.send(results);
        } catch (error) {
            res.status(500).send("Server encountered internal error. Express route for get /snippets/delete/:id")
        }
    })

    // update snippet
    app.patch("/snippets/update/:id", (req, res, next) => validate(req, res, next), async (req, res) => {
        try {
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

            // update the matched snippet document with new snippet
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

            // update category collection
            // all category options in new snippet increments by 1 and tracked by results2, all category options in previous snippet decrement by 1 and are tracked by results3. Net result is that removed options decrement by 1, added options increment by 1

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
        } catch (error) {
            res.status(500).send("Server encountered internal error. Express route for patch /snippets/update/:id")
        }
    })

    // create snippet
    app.post("/snippets/create", (req, res, next) => validate(req, res, next), async (req, res) => {
        try {
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
        }
        catch (error) {
            res.status(500).send("Server encountered internal error. Express route for post /snippets/create")
        }
    })

    // create comment and return the new comment added
    // use mongodb findOneAndUpdate, it returns updated documented
    app.patch("/snippets/:id/comments/create", (req, res, next) => validate(req, res, next), async (req, res) => {
        try {
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
        } catch (error) {
            res.status(500).send("Server encountered internal error. Express route for patch /snippets/:id/comments/create")
        }
    })

    // delete comment and return the updated snippet
    app.patch("/snippets/:id/comments/delete/:commentID", (req, res, next) => validate(req, res, next), async (req, res) => {
        try {
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
        } catch (error) {
            res.status(500).send("Server encountered internal error. Express route for patch /snippets/:id/comments/delete/:commentID")
        }
    })

    // update comment and return the updated snippet
    app.patch("/snippets/:id/comments/update/:commentID", (req, res, next) => validate(req, res, next), async (req, res) => {
        try {
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
        } catch (error) {
            res.status(500).send("Server encountered internal error. Express route for patch /snippets/:id/comments/delete/:commentID")
        }
    })
}

main();

// Start Server
app.listen(8888, () => {
    console.log("server has started")
})