// function to connect to the Mongo DB
// async function connect() {
//     console.log("enter connect function");
//     const mongo_url = process.env.MONGO_URI;
//     console.log(mongo_url);
//     let client = await MongoClient.connect(mongo_url, {
//         "useUnifiedTopology": true
//     });
//     console.log(client);
//     let db = client.db("sfw");
//     console.log(db);
//     console.log("database connected");
//     return db;
// }


// function to validate API requests with parameters or body. No API requests include query strings.
const validate=(req, res, next)=> {
    console.log("enter validate function");
    console.log(req.params);
    console.log(req.body);
    // res.send("not a test");
    let valid = true;
    if (Object.keys(req.params).length){
        console.log("enter params evaluation", Object.keys(req.params));
        for (let keyName of Object.keys(req.params)){
            switch (keyName) {
                case "category":
                    ["all", "theme", "type", "occasion", "length"].includes(req.params.category)? null : valid = false;
                    break;
                case "option":
                    ["all", "kindness", "hardwork", "life", "joke", "quote", "story", "1", "2", "3", "4", "networking", "speech", "presentation", "chat"].includes(req.params.option)? null : valid = false;
                    break;
                case "id":
                    console.log(valid);    
                    req.params.id.length===24 && req.params.id.match(/[a-z0-9]+/)? null: valid = false;
                    break;
                default:
                    console.log("invalid params entered. validate()");
                    valid = false;
            }
        }
        console.log("after params evaluation, valid is ", valid);
    }
    if (Object.keys(req.body).length){
        console.log("enter body evaluation", Object.keys(req.body));
        for (let keyName of Object.keys(req.body)){
            switch (keyName) {
                case "categoryChange": 
                    req.body.categoryChange.changeInSnippets <2 && 
                    req.body.categoryChange.changeInSnippets >-2 &&
                    req.body.categoryChange.changeInComments <100 &&
                    req.body.categoryChange.changeInComments >-100 &&
                    req.body.categoryChange.changeInCollections <100 &&
                    req.body.categoryChange.changeInCollections >-100 &&
                    ["kindness", "hardwork", "life"].includes(req.body.categoryChange.theme) &&
                    ["1", "2", "3", "4"].includes(req.body.categoryChange.length) &&
                    ["joke", "quote", "story"].includes(req.body.categoryChange.type) ? null : valid = false;
                    console.log("body - categoryChange", valid);
                    break;
                case "name":
                    req.body.name.match(/[$&+,:;=?@#|<>\.\-\^\*()%!]/) || req.body.name.length > 100? valid = false : null;
                    console.log("body - name", valid);
                    break;
                case "content":
                    req.body.content.length > 5000? valid = false : null;
                    console.log("body - content", valid);
                    break;
                case "occasions":
                    for (let eachOccasion of req.body.occasions) {
                        ["networking", "speech", "presentation", "chat"].includes(eachOccasion) ? null : valid = false;
                        // if (!valid) {
                        //     break;
                        // }
                    }
                    break;
                case "creator":
                    console.log(valid); 
                    console.log(req.body.creator.username);      
                    req.body.creator.username.match(/^[a-zA-Z\d][\w\d]+@[\w\d]+[.][a-zA-Z\d]+/)? null : valid = false;
                    console.log("body - creator", valid);
                    break;
                case "length":
                    ["1", "2", "3", "4"].includes(req.body.length) ? null : valid = false;
                    console.log("body - length", valid);
                    break;
                case "type":
                    ["joke", "quote", "story"].includes(req.body.type) ? null : valid = false;
                    console.log("body - type", valid);
                    break;
                case "theme":
                    ["kindness", "hardwork", "life"].includes(req.body.theme) ? null : valid = false;
                    console.log("body - theme", valid);
                    break;
                default:
                    console.log ("req body contains keys which are not validated by validate()");
            }
        }
    }

    console.log(valid);
    if(valid){
        next()
    } else {
        res.status(400).send("Bad Request. Invalid parameters or request body in API")
    }
}

// function to update category collection when a snippet or comment is changed
// async function updateCategory(categoryChange) {
//     console.log("enter updateCategory");
//     let db = await connect();
//     let filterCriteria = [...categoryChange.occasions, categoryChange.theme, categoryChange.type, categoryChange.length];
//     console.log(filterCriteria);
//     let results = await db.collection("categories").updateMany(
//         {
//             // match all category documents impacted by the snippet changed, including theme, type, length and occasion. at least 4 or more documents are matched, because occasion can have multiple values
//             "optionName": { $in: filterCriteria }
//         },
//         {
//             $inc: {
//                 "numSnippets": categoryChange.changeInSnippets,
//                 "numComments": categoryChange.changeInComments,
//                 "numCollected": categoryChange.changeInCollections
//             }
//         }
//     );
//     console.log(results);
// }

module.exports ={validate};