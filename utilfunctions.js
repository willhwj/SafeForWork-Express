// validate API requests
const validate=(req, res, next)=> {
    res.send("test")
    // let valid = true;
    // if (Object.keys(req.params).length){
    //     for (let key in req.params){
    //         switch (key) {
    //             case "category":
    //                 ["all", "theme", "type", "occasion", "length"].includes(req.params.category)? null : valid = false;
    //                 break;
    //             case "option":
    //                 ["all", "kindness", "hardwork", "life", "joke", "quote", "story", "1", "2", "3", "4", "networking", "speech", "presentation", "chat"].includes(req.params.option)? null : valid = false;
    //                 break;
    //             case "id":
    //                 req.params.id.length===24 && req.params.id.match(/ [a-z0-9]+/)? null: valid = false;
    //                 break;
    //             default:
    //                 console.log("invalid params entered. validate()");
    //                 valid = false;
    //         }
    //     }
    // }
    // if (Object.keys(req.body).length){
    //     for (let key in req.body){
    //         switch (key) {
    //             case "categoryChange":
    //                 break;
    //             case "occasions":
    //                 ["networking", "speech", "presentation", "chat"].includes(req.body.occasions[0]) ? null : valid = false;
    //                 break;
    //             case "length":
    //                 ["1", "2", "3", "4"].includes(req.body.length) ? null : valid = false;
    //                 break;
    //             case "type":
    //                 ["joke", "quote", "story"].includes(req.body.type) ? null : valid = false;
    //                 break;
    //             case "theme":
    //                 ["kindness", "hardwork", "life"].includes(req.body.theme) ? null : valid = false;
    //                 break;
    //             default:
    //                 console.log ("invalid body entered. validate()");
    //                 valid = false
    //         }
    //     }
    // }

    // if(valid){
    //     next()
    // } else {
    //     res.status(400).send("Bad Request. Invalid parameters or request body in API")
    // }
}

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

// function to update category collection when a snippet or comment is changed
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

module.exports ={ validate}