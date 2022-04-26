const express = require("express");
const app = express();
const PORT = 3001 || process.env.PORT;
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fileUpload = require("express-fileupload");
const path = require("path")
const nodemailer = require("nodemailer");
const TMClient = require("textmagic-rest-client");
const socketIO = require("socket.io");

const accountTransport = nodemailer.createTransport({
    service: "gmail",
    auth:{
        user: "shopperia.philippines@gmail.com",
        pass: "shopperia187"
    }
})

const connectionMysql = require("./connections/connectionMysql");
const { createBrotliCompress } = require("zlib");
const e = require("express");
const db = mysql.createConnection(connectionMysql);

app.use(bodyParser.urlencoded({extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(fileUpload());
app.use(cors({
    origin: "*",
    credentials: true,
    optionsSuccessStatus: 200
}))

const server = app.listen(PORT, () => {
    console.log(`Port Running: ${PORT}`)
});

const io = socketIO(server, {cors: {
    origin: "*",
    methods: "*",
    allowedHeaders: ["my-custom-header"],
    credentials: true
}});

const jwtverifier = (req, res, next) => {
    const tokenFromUser = req.headers["x-access-token"];
    const tokenFromSeller = req.headers["x-access-tokenseller"];

    if(!tokenFromUser && !tokenFromSeller){
        res.send({status: false, message: "No Token Received!"});
    }
    else{
        if(tokenFromUser && !tokenFromSeller){
            jwt.verify(tokenFromUser, "shopperiaprojectinsia102", (err, decode) => {
                if(err){
                    res.send({status: false, message: "Token Denied!"});
                }
                else{
                    req.userTokenID = decode.id;
                    req.userTokenUserName = decode.userName;
                    req.acc = "buyer";
                    // console.log(decode.userName);
                    // next();
                    db.query("SELECT ver_status_one FROM verification_data WHERE user_id = ?", [decode.userName], (err, result) => {
                        if(err){
                            res.send({status: false, message: "Token Denied!"});
                        }
                        else{
                            if(result.length == 0){
                                res.send({status: false, message: "Token Denied!"});
                            }
                            else{
                                if(result[0].ver_status_one == "unverified"){
                                    res.send({status: false, message: "Token Denied!"});
                                }
                                else{
                                    next();
                                }
                            }
                        }
                    })
                }
            })
        }
        else if(tokenFromSeller && !tokenFromUser){
            jwt.verify(tokenFromSeller, "shopperiaprojectinsia102", (err, decode) => {
                if(err){
                    res.send({status: false, message: "Token Denied!"});
                }
                else{
                    const shopID = decode.userName;
                    db.query("SELECT shopName FROM seller_accounts WHERE shopID = ?", shopID, (err, result) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            req.userTokenID = decode.id;
                            req.userTokenUserName = decode.userName;
                            req.shop
                            req.acc = "seller";
                            req.shopName = result.map((item) => item.shopName).join("");
                            // console.log(result.map((item) => item.shopName));
                            // next();
                            db.query("SELECT ver_status_one FROM verification_data WHERE user_id = ?", [decode.userName], (err, result) => {
                                if(err){
                                    res.send({status: false, message: "Token Denied!"});
                                }
                                else{
                                    if(result.length == 0){
                                        res.send({status: false, message: "Token Denied!"});
                                    }
                                    else{
                                        if(result[0].ver_status_one == "unverified"){
                                            res.send({status: false, message: "Token Denied!"});
                                        }
                                        else{
                                            next();
                                        }
                                    }
                                }
                            })
                        }
                    })
                }
            })
            // console.log(tokenFromSeller);
        }
    }
}

const jwtverifierverification = (req, res, next) => {
    const tokenFromUser = req.headers["x-access-token"];
    const tokenFromSeller = req.headers["x-access-tokenseller"];

    if(!tokenFromUser && !tokenFromSeller){
        res.send({status: false, message: "No Token Received!"});
    }
    else{
        if(tokenFromUser && !tokenFromSeller){
            jwt.verify(tokenFromUser, "shopperiaprojectinsia102", (err, decode) => {
                if(err){
                    res.send({status: false, message: "Token Denied!"});
                }
                else{
                    req.userTokenID = decode.id;
                    req.userTokenUserName = decode.userName;
                    req.acc = "buyer";
                    // console.log(decode.userName);
                    next();
                }
            })
        }
        else if(tokenFromSeller && !tokenFromUser){
            jwt.verify(tokenFromSeller, "shopperiaprojectinsia102", (err, decode) => {
                if(err){
                    res.send({status: false, message: "Token Denied!"});
                }
                else{
                    const shopID = decode.userName;
                    db.query("SELECT shopName FROM seller_accounts WHERE shopID = ?", shopID, (err, result) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            req.userTokenID = decode.id;
                            req.userTokenUserName = decode.userName;
                            req.shop
                            req.acc = "seller";
                            req.shopName = result.map((item) => item.shopName).join("");
                            // console.log(result.map((item) => item.shopName));
                            next();
                        }
                    })
                }
            })
            // console.log(tokenFromSeller);
        }
    }
}

app.get('/loginsession', jwtverifier, (req, res) => {
    res.send({status: true, message: "Logged In!", userName: req.userTokenUserName, acc: req.acc, shopName: req.shopName});
})

app.post('/createPostProduct', jwtverifier, (req, res) => {
    // console.log(req.files.img);
    const prname = req.body.prname;
    const prdesc = req.body.prdesc;
    const prcat = req.body.prcat;
    const prbrand = req.body.prbrand;
    const product_id = req.body.product_id;
    const shopName = req.body.shopname;
    const shopID = req.body.shopID;

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    if(req.files == null){
        res.send({status: false, message: "No Image Selected!"});
        console.log("Empty!");
        // console.log(today_fixed);
    }
    else{
        const file = req.files.img;
        const type = req.files.img.mimetype.split("/")[1];
        const fileName = `${product_id}.${type}`
        const directory = path.join(`${__dirname}`, `/uploads/products/${fileName}`);
        const link = `http://localhost:3001/productsImages/${fileName}`
        file.mv(directory, (err) => {
            if(err){
                console.log(err);
            }
            else{
                db.query("INSERT INTO products_list (prname, prdesc, prcat, prbrand, base_preview, product_id, date_posted, shopname, shopID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [prname, prdesc, prcat, prbrand, link, product_id, today_fixed, shopName, shopID], (err, result) => {
                    if(err){
                        console.log(err);
                    }
                })
            }
        })
        // console.log(path.join(`${__dirname}`, `/uploads/products`));
        // console.log(`${prname}_${makeid(7)}`);
        // console.log(Date.now());
    }
})


app.post('/subproducts', jwtverifier, (req, res) => {
    const files = req.files;
    const numbertypes = req.body.numbertypes;
    const numbersize = req.body.numbersize;
    const product_id = req.body.product_id;
    // console.log(req);
    // console.log(product_id);
    for(var i = 0; i < numbertypes; i++){
        const typeName = req.body[`typename${i}`];
        const fileEach = files[`subImg${i}`];
        const type = fileEach.mimetype.split("/")[1];
        const fileName = `${product_id}_${typeName}_sub_${i}.${type}`
        const directory = path.join(`${__dirname}`, `/uploads/products/${fileName}`);
        const link = `http://localhost:3001/productsImages/${fileName}`
        // console.log(`Product ID: ${product_id} | `+typeName+" | "+ files[`subImg${i}`].name);
        // console.log(directory)
        // console.log(files[`subImg${i}`]);

        fileEach.mv(directory, (err) => {
            if(err){
                console.log(err);
            }
        })

        for(var j = 0; j < numbersize; j++){
            const sizeValue = req.body[`sizeValue_${j}_${i}`];
            const sizeVariety = req.body[`sizeVariety_${j}_${i}`];
            const sizePrice = req.body[`sizePrice_${j}_${i}`];
            const var_id = `${product_id}_${typeName}_${sizeValue}`
            // console.log(`Product ID: ${product_id} | `+typeName+" | "+ files[`subImg${i}`].name+" | "+ `Size: ${sizeValue} | ${sizeVariety} stocks left | Price: ${sizePrice}`);
            // console.log(files[`subImg${i}`]);
            db.query("INSERT INTO products_variety (pr_id, var_id, var_typename, var_size, var_price, var_stocks, var_preview) VALUES (?,?,?,?,?,?,?)", [product_id, var_id, typeName, sizeValue, sizePrice, sizeVariety, link], (err) => {
                if(err){
                    console.log(err);
                }
            })
        }
    }
})

app.get('/getProductUser/:product_id', (req, res) => {
    const product_id = req.params.product_id;
    // console.log(product_id);
    db.query("SELECT * FROM productspricesmaxmin WHERE product_id = ?", product_id, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            res.send(result);
        }
    })
})

app.get('/productsImages/:proimg', (req, res) => {
    const img = req.params.proimg;
    const filePath = path.join(`${__dirname}`, `/uploads/products/${img}`);

    // res.sendFile()
    const imgResult = res.sendFile(filePath);
})

app.get('/profileImgs/:profimg', (req, res) => {
    const img = req.params.profimg;
    const filePath = path.join(`${__dirname}`, `/uploads/profiles/${img}`);

    // res.sendFile()
    const imgResult = res.sendFile(filePath);
})

app.get('/getProducts/:shopID', (req, res) => {
    db.query("SELECT * FROM productspricesmaxmin WHERE shopname = ?", req.params.shopID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/searchproducts/:searchquery', (req, res) => {
    const query = req.params.searchquery;
    const queryRes = `%${query.split("_").join(" ")}%`;
    // console.log(queryRes);
    db.query("SELECT * FROM productspricesmaxmin WHERE prname LIKE ? OR shopname LIKE ? ORDER BY overall DESC", [queryRes, queryRes], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            res.send(result);
        }
    })
})

app.get('/allvarieties/:product_id', (req, res) => {
    const product_id = req.params.product_id;
    db.query("SELECT * FROM products_variety WHERE pr_id = ?", product_id, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
            // console.log(result);
        }
    })
})

app.post('/postComment', jwtverifier, (req, res) => {
    // console.log(req.body);

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    const product_id = req.body.product_id;
    const user_id = req.body.user_id;
    const user_comment = req.body.user_comment;
    const user_rating = req.body.user_rating;
    const dateTodayResult = today_fixed;

    db.query("INSERT INTO user_comments (product_id, user_id, user_comment, user_rating, rate_date) VALUES (?,?,?,?,?)", [product_id, user_id, user_comment, user_rating, dateTodayResult], (err) => {
        if(err){
            console.log(err);
        }
        else{
            res.send({status: true, message: "Rating Successfully Posted"});
        }
    })
})

app.get('/getComments/:product_id', (req, res) => {
    const product_id = req.params.product_id;

    db.query("SELECT * FROM user_comments WHERE product_id = ? ORDER BY id DESC", product_id, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.post('/loginUser', (req, res) => {
    const userEmail = req.body.userEmail;
    const userPassword = req.body.userPassword;
    const acctype = req.body.acctype;

    // console.log(userEmail);

    if(acctype == "buyer"){
        db.query("SELECT * FROM user_accounts WHERE email = ? AND password = ?", [userEmail, userPassword], (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                if(result.length == 0){
                    res.send({status: false, message: "Failed to Log In!"});
                }
                else{
                    const userName = result.map(user => user.userName).join("");
                    db.query("SELECT ver_status_one FROM verification_data WHERE user_id = ?", [userName], (err, result2) => {
                        if(err){
                            console.log(err);

                        }
                        else{
                            const token = jwt.sign({userName}, "shopperiaprojectinsia102", {
                                expiresIn: 60 * 60 * 24 * 7
                            })
                            if(result2[0].ver_status_one == "unverified"){
                                res.send({token: token, status: true, verified: false, message: "Verification Process Needed!", userName: userName});
                            }
                            else{
                                res.send({token: token, status: true, verified: true, message: "Logged In Successfully!", userName: userName});
                            }
                        }
                    })
                }
            }
        })
    }
    else if(acctype == "seller"){
        db.query("SELECT * FROM seller_accounts WHERE email = ? AND password = ?", [userEmail, userPassword], (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                if(result.length == 0){
                    res.send({status: false, message: "Failed to Log In!"});
                }
                else{
                    const userName = result.map(user => user.shopID).join("");
                    // console.log(userName)
                    db.query("SELECT ver_status_one FROM verification_data WHERE user_id = ?", [userName], (err, result2) => {
                        if(err){
                            console.log(err);

                        }
                        else{
                            const token = jwt.sign({userName}, "shopperiaprojectinsia102", {
                                expiresIn: 60 * 60 * 24 * 7
                            })
                            if(result2[0].ver_status_one == "unverified"){
                                res.send({tokenseller: token, status: true, verified: false, message: "Verification Process Needed!", userName: userName});
                            }
                            else{
                                res.send({tokenseller: token, status: true, verified: true, message: "Logged In Successfully!", userName: userName});
                            }
                        }
                    })
                }
            }
        })
    }
})

app.get('/usercreds/:userName', jwtverifier, (req, res) => {
    const userName = req.params.userName;

    if(userName != null){
        db.query("SELECT * FROM user_creds WHERE userName = ?", userName, (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                res.send(result);
            }
        })
    }
})

function makeid(length) {
    var result           = '';
    var characters       = '0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

async function make_date(){
    var today = await new Date();
    var dd = await String(today.getDate()).padStart(2, '0');
    var mm = await String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = await today.getFullYear();
    
    var today_fixed = await mm + '/' + dd + '/' + yyyy;

    return await today_fixed;
}

app.post('/prpicChange', jwtverifier, (req, res) => {
    const userName = req.body.userName;
    const file = req.files.prpic;
    const type = req.files.prpic.mimetype.split("/")[1];
    const fileName = `${userName}_prpic_${makeid(9)}.${type}`
    const link = `http://localhost:3001/profileImgs/${fileName}`
    const directory = path.join(`${__dirname}`, `/uploads/profiles/${fileName}`);
    // console.log(req.files.prpic);

    file.mv(directory, (err) => {
        if(err){
            console.log(err);
        }
        else{
            db.query("UPDATE user_accounts SET profile_pic = ? WHERE userName = ?", [link, userName], (err) => {
                if(err){
                    console.log(err);
                }
                else{
                    res.send({status: true, message: "Profile Picture Updated"});
                }
            })
        }
    })
})

app.get('/getAddresses/:userName', jwtverifier, (req, res) => {
    const userName = req.params.userName;
    db.query("SELECT * FROM user_addresses WHERE userName = ?", userName, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/getAddressesView/:userName', jwtverifier, (req, res) => {
    const userName = req.params.userName;
    db.query("SELECT * FROM address_view WHERE userName = ? AND status = 'Default'", userName, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.post('/addAddress', jwtverifier, (req, res) => {
    const userName = req.body.userName;
    const houseBldg_No = req.body.houseBldg_No;
    const street = req.body.street;
    const barangay = req.body.barangay;
    const city_town = req.body.city_town;
    const province = req.body.province;
    const region = req.body.region;
    const postalCode = req.body.postalCode;
    const receiver = req.body.receiver;

    // console.log(receiver);

    const query = (status) => {
        db.query("INSERT INTO user_addresses (userName, houseBldg_No, street, barangay, city_town, province, region, postalCode, status, receiver) VALUES (?,?,?,?,?,?,?,?,?,?)", [userName, houseBldg_No, street, barangay, city_town, province, region, postalCode, status, receiver], (err) => {
            if(err){
                console.log(err);
            }
            else{
                res.send({status: true, message: "Address Successfully Added"});
            }
        })
    }

    db.query("SELECT COUNT(userName) AS total FROM user_addresses WHERE userName = ?", [userName], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            const total = result.map((count) => count.total);
            if(total == 0){
                query("Default");
            }
            else{
                query("Reserved");
            }
        }
    })
})

app.post('/createUser', (req, res) => {

    function makeid(length) {
        var result           = '';
        var characters       = '0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * 
     charactersLength));
       }
       return result;
    }

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    const firstName = req.body.firstName;
    const nameNoSpace = firstName.split(" ").join("");
    const userName = `${nameNoSpace}_${makeid(7)}`
    const middleName = req.body.middleName;
    const lastName = req.body.lastName;
    const age = req.body.age;
    const gender = req.body.gender;
    const email = req.body.email;
    const password = req.body.password;

    const profile_link = `http://localhost:3001/profileImgs/Default_${gender}.jpg`;

    const verification_code_generated = makeid(5);

    // console.log(gender);
    const mailOptions = {
        from: 'shopperia.philippines@gmail.com',
        to: email,
        subject: 'Shopperia Customer Verification',
        text: `You have Successfully Registered in Shopperia as Customer. To activate your account enter the code ${verification_code_generated} in the first Log In.`
    }

    db.query('INSERT INTO user_accounts (firstName, middleName, lastName, email, password, userName, profile_pic, gender) VALUES (?,?,?,?,?,?,?,?)', [firstName, middleName, lastName, email, password, userName, profile_link, gender], (err, result) => {
        if(err){
            res.send({err: err, content: "Unable to Register!", status: false});
            // console.log(err);
        }
        else{
            db.query("INSERT INTO verification_data (ver_status_one, ver_status_two, ver_status_three, user_id) VALUES (?,?,?,?)", ["unverified", "unverified", "unverified", userName], (err) => {
                if(err){
                    console.log(err);
                }
                else{
                    db.query("INSERT INTO verification_codes (code, date_set, user_id) VALUES (?,?,?)", [verification_code_generated, today_fixed, userName], (err) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            res.send({content:"Successfully Registered!" ,status: true});
                            accountTransport.sendMail(mailOptions, (err, info) => {
                                if(err){
                                    console.log(err);
                                }
                            })
                        }
                    })
                }
            })
        }
    })
})

app.post('/createSeller', (req, res) => {

    function makeid(length) {
        var result           = '';
        var characters       = '0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * 
     charactersLength));
       }
       return result;
    }

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    const verification_code_generated = makeid(5);

    // console.log(gender);

    const firstName = req.body.firstName;
    const middleName = req.body.middleName;
    const lastName = req.body.lastName;
    const shop = req.body.shopName;
    const email = req.body.email;
    const password = req.body.password;
    const nameNoSpace = shop.split(" ").join("");
    const userName = `${nameNoSpace}_${makeid(7)}`
    const shop_link_img = 'http://localhost:3001/shopImgs/Default_Shop.jpg';

    const mailOptions = {
        from: 'shopperia.philippines@gmail.com',
        to: email,
        subject: 'Shopperia Seller Verification',
        text: `You have Successfully Registered in Shopperia as Seller. To activate your account enter the code ${verification_code_generated} in the first Log In.`
    }

    db.query('INSERT INTO seller_accounts (seller_firstName, seller_middleName, seller_lastName, email, password, shopName, shopID, shop_preview) VALUES (?,?,?,?,?,?,?,?)', [firstName, middleName, lastName, email, password, shop, userName, shop_link_img], (err, result) => {
        if(err){
            res.send({err: err, content: "Unable to Register!", status: false});
        }
        else{
            // res.send({content:"Successfully Registered!" ,status: true});
            db.query("INSERT INTO verification_data (ver_status_one, ver_status_two, ver_status_three, user_id) VALUES (?,?,?,?)", ["unverified", "unverified", "unverified", userName], (err) => {
                if(err){
                    console.log(err);
                }
                else{
                    db.query("INSERT INTO verification_codes (code, date_set, user_id) VALUES (?,?,?)", [verification_code_generated, today_fixed, userName], (err) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            res.send({content:"Successfully Registered!" ,status: true});
                            accountTransport.sendMail(mailOptions, (err, info) => {
                                if(err){
                                    console.log(err);
                                }
                            })
                        }
                    })
                }
            })
        }
    })
})

app.get('/gettypes/:pr_id', (req, res) => {
    const product_id = req.params.pr_id;

    db.query("SELECT var_typename FROM products_variety WHERE pr_id = ? group by var_typename", product_id, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            db.query("SELECT var_size FROM products_variety WHERE pr_id = ? group by var_size", product_id, (err2, result2) => {
                if(err){
                    console.log(err);
                }
                else{
                    // console.log({result, result2});
                    res.send({result, result2})
                }
            })
        }
    })
})

app.get('/getselectedvariety/:product_id/:type/:size', jwtverifier, (req, res) => {
    // console.log(req.params.size);
    const product_id = req.params.product_id;
    const type = req.params.type;
    const size = req.params.size;

    db.query("SELECT * FROM products_variety WHERE pr_id = ? AND var_typename = ? AND var_size = ?", [product_id, type, size], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

const emailForPaid = (user_id, order_id, product_id, email, payment_method, order_total, shopName, date_ordered) => {
    const userName = user_id;
    const orderID = order_id;
    const productID = product_id;
    const emailuser = email;
    const paymentMethod = payment_method;
    const totalPrice = order_total;
    const shopNameOrder = shopName;
    const datePaid = date_ordered;

    const mailOptions = {
        from: 'shopperia.philippines@gmail.com',
        to: emailuser,
        subject: `Receipt for ${orderID}`,
        // text: `Good Day ${userName}! You have Successfully paid you Order: ${orderID} using Payment Method of ${paymentMethod} with the total price of PHP${totalPrice}.`
        html: `<h3>Good Day ${userName}!</h3><br />
        <p>You have Successfully paid your <b>Order: ${orderID}</b> using Payment Method of <b>${paymentMethod}</b> with the total price of <b>PHP ${totalPrice}</b>.</p><br />
        <span><b>Shop Name: ${shopNameOrder}</span></b><br />
        <span><b>Product ID: ${productID}</span></b><br />
        <span><b>Date of Payment: ${datePaid}</b></span>`
    }

    accountTransport.sendMail(mailOptions, (err, info) => {
        if(err){
            console.log(err);
        }
        {
            //dbquery for notifications
        }
    })
    // console.log(emailuser);
}

app.post('/postorder', jwtverifier, (req, res) => {

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    const user_id = req.body.user_id;
    const receiver = req.body.receiver;
    const full_address = req.body.full_address;
    const city_town = req.body.city_town;
    const province = req.body.province;
    const postalCode = req.body.postalCode;
    const product_id = req.body.product_id;
    const var_id = req.body.var_id;
    const variety = req.body.variety;
    const status = req.body.status;
    const date_ordered = today_fixed;
    const date_accomplished = "Not Accomplished";
    const order_id = `${product_id}_${makeid(10)}`;
    const payment_method = req.body.pmethod;
    const order_total = req.body.order_total;
    const payment_status = payment_method != "COD" && payment_method != "none"? "paid" : "not_paid";
    const email = req.body.email;
    const shopName = req.body.shopName;
    const remarks = status == "Cart"? "Saved to Cart" : payment_method != "COD" && payment_method != "none"? "Preparing Order" : "Confirming Order";

    // console.log(req.body);
    if(var_id == "" || var_id == null){
        res.send({status: false , message: "No Product Selected"});
    }
    else{
        if(variety == 0 || variety == null){
            res.send({status: false, message: "No Quantity to Order"});
        }
        else{
            db.query("INSERT INTO user_orders (user_id,receiver,fulladdress,city_town,province,postalCode,product_id,var_id,variety,status,date_ordered,date_accomplished,order_id,order_total,payment_method,payment_status,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [user_id,receiver,full_address,city_town,province,postalCode,product_id,var_id,variety,status,date_ordered,date_accomplished,order_id,order_total,payment_method,payment_status,remarks], (err) => {
                if(err){
                    console.log(err);
                    res.send({status: false, message: "Order / Add to Cart Unsuccessful"});
                }
                else{
                    res.send({status: true, message: status == "Cart"? "Product has been Added to Cart" : "Product has been Successfully Ordered"});
                    if(payment_method != "COD"){
                        emailForPaid(user_id, order_id, product_id, email, payment_method, order_total, shopName, date_ordered);
                        // console.log(true);
                    }
                }
            })
        }
    }
})

app.get('/cartProducts/:user_id/:status', jwtverifier, (req, res) => {
    const user_id = req.params.user_id;
    const status = req.params.status;

    // console.log(`${user_id} | ${status}`);

    db.query("SELECT * FROM cart_view WHERE user_id = ? AND status = ?", [user_id, status], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result)
            // console.log(result);
        }
    })
})

app.get('/shopImgs/:profimg', (req, res) => {
    const img = req.params.profimg;
    const filePath = path.join(`${__dirname}`, `/uploads/seller_profiles/${img}`);

    // res.sendFile()
    const imgResult = res.sendFile(filePath);
})

app.get('/adminImgs/:profimg', (req, res) => {
    const img = req.params.profimg;
    const filePath = path.join(`${__dirname}`, `/uploads/admin_profiles/${img}`);

    // res.sendFile()
    const imgResult = res.sendFile(filePath);
})

app.get('/searchshop/:shopname', (req, res) => {
    const shopname = req.params.shopname;
    const shopnamequery = `%${shopname.split("_").join(" ")}%`
    db.query("SELECT * FROM seller_prev WHERE shopName LIKE ?", shopnamequery, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/getsellerinfo/:sellerID', jwtverifier, (req, res) => {
    const sellerID = req.params.sellerID;

    db.query("SELECT * FROM seller_prev WHERE shopID = ?", sellerID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
            // console.log(sellerID);
        }
    })
})

app.post('/updateshopico', jwtverifier, (req, res) => {
    const uplfile = req.files.ico;
    const shopID = req.body.shopID;
    const type = req.files.ico.mimetype.split("/")[1];
    const fileNewName = `${shopID}_icon_${makeid(10)}.${type}`
    const directory = path.join(`${__dirname}`, `/uploads/seller_profiles/${fileNewName}`);
    const newLink = `http://localhost:3001/shopImgs/${fileNewName}`

    // console.log(directory);
    uplfile.mv(directory, (err) => {
        if(err){
            console.log(err);
        }
        else{
            db.query("UPDATE seller_accounts SET shop_preview = ? WHERE shopID = ?", [newLink, shopID], (err) => {
                if(err){
                    console.log(err);
                }
            })
        }
    })
})

app.get('/ordersfetch/:shopID/:status/:remarks', jwtverifier, (req, res) => {
    const shopID = req.params.shopID;
    const status = req.params.status;
    const remarks = req.params.remarks;

    // console.log(req.params.shopID);

    if(status == "Pending"){
        if(remarks == "For Ship Out"){
            db.query("SELECT * FROM cart_view WHERE shopname = ? AND status = ? AND remarks = ? OR remarks = ?", [shopID, status, remarks, "On Pick Up"], (err, result) => {
                if(err){
                    console.log(err);
                }
                else{
                    res.send(result)
                    // console.log(result);
                }
            })
        }
        else{
            db.query("SELECT * FROM cart_view WHERE shopname = ? AND status = ? AND remarks = ?", [shopID, status, remarks], (err, result) => {
                if(err){
                    console.log(err);
                }
                else{
                    res.send(result)
                    // console.log(result);
                }
            })
        }
    }
    else{
        db.query("SELECT * FROM cart_view WHERE shopname = ? AND status = ?", [shopID, status], (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                res.send(result)
                // console.log(result);
            }
        })
    }
})

app.post('/updateOrderStatus', jwtverifier, (req, res) => {
    const order_id = req.body.order_id;
    const status = req.body.status;
    const remarks = req.body.remarks;

    // console.log(order_id);

    db.query("UPDATE user_orders SET status = ?, remarks = ? WHERE order_id = ? ", [status, remarks, order_id], (err) => {
        if(err){
            console.log(err);
        }
    })
})

app.get('/getShopPreview/:shopID', (req, res) => {
    const shopID = req.params.shopID;
    db.query("SELECT * FROM seller_prev WHERE shopID = ?", shopID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            //{shop_preview: "", shopName: "", shopID: "", shopEmail: ""}
            // console.log(result[0]);
            db.query("SELECT products_list.shopname, avg(overall) as shop_rating FROM product_overalls, products_list WHERE product_overalls.product_id IN (SELECT product_id FROM products_list WHERE shopID = ?);", shopID, (err2, result2) => {
                if(err2){
                    console.log(err2);
                }
                else{
                    res.send({shop_preview: result[0].shop_preview, shopName: result[0].shopName, shopID: result[0].shopID, shopEmail: result[0].email,  fullAddress: result[0].fullAddress, shopRating: result2[0].shop_rating, contactNumber: result[0].contactNumber})
                }
            })
        }
    })
})

app.get('/messages/:username', jwtverifier, (req, res) => {
    const username = req.params.username;

    db.query("SELECT * FROM messages_table WHERE id IN (SELECT MAX(id) FROM messages_table WHERE conversation_id IN (SELECT conversation_id FROM messages_table WHERE messages_table.from = ? OR messages_table.to = ? GROUP BY conversation_id) GROUP BY conversation_id) ORDER BY id DESC", [username, username], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/messagesInbox/:username/:othername', jwtverifier, (req, res) => {
    const username = req.params.username;
    const othername = req.params.othername;

    db.query("SELECT * FROM messages_table WHERE messages_table.from = ? AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to = ? Order by id", [othername, username, username, othername], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            res.send(result);
        }
    })
})

app.post('/sendMessage', jwtverifier, (req, res) => {

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    const message_content = req.body.message_content;
    const from = req.body.from;
    const to = req.body.to;

    function sendPrompt(conversation_id){
        db.query("INSERT INTO messages_table (conversation_id, message_content, date_sent, messages_table.from, messages_table.to) VALUES (?,?,?,?,?)", [conversation_id, message_content, today_fixed, from, to], (err) => {
            if(err){
                console.log(err);
            }
            else{
                res.send({status: true});
            }
        })
    }

    db.query("SELECT conversation_id FROM messages_table WHERE messages_table.from = ? AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to = ? Order by id", [to, from, from, to], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            if(result.length == 0){
                // console.log(true);
                const conversation_id_null = `chat_id_${makeid(15)}`;
                sendPrompt(conversation_id_null);
            }
            else{
                const conversation_id_defined = result[0].conversation_id;
                sendPrompt(conversation_id_defined);
                // console.log(false);
            }
        }
    })
})

app.post('/verifyUser', jwtverifierverification, (req, res) => {
    const userName = req.body.userName;
    const userToken = req.body.usertoken;
    const userCode = req.body.userCode;

    // console.log(userCode);
    db.query("SELECT code FROM verification_codes WHERE user_id = ?", [userName], (err, result) => {
        if(err){
            console.log(err);
            res.send({status: false, message: "Cannot Verify Account"});
        }
        else{
            // console.log(result[0].code);
            if(result[0].code == userCode){
                // console.log(true);
                db.query("UPDATE verification_data SET ver_status_one = 'verified' WHERE user_id = ?", userName, (err) => {
                    if(err){
                        console.log(err);
                        res.send({status: false, message: "Cannot Verify Account"});
                    }
                    else{
                        res.send({status: true, message: "Account Verified"});
                    }
                })
            }
            else{
                // console.log(false);
                res.send({status: false, message: "Invalid Code"});
            }
        }
    })
})

app.post('/verifySeller', jwtverifierverification, (req, res) => {
    const userName = req.body.shopID;
    const userToken = req.body.sellertoken;
    const userCode = req.body.userCode;

    // console.log(userCode);
    db.query("SELECT code FROM verification_codes WHERE user_id = ?", [userName], (err, result) => {
        if(err){
            console.log(err);
            res.send({status: false, message: "Cannot Verify Account"});
        }
        else{
            // console.log(result[0].code);
            if(result[0].code == userCode){
                // console.log(true);
                db.query("UPDATE verification_data SET ver_status_one = 'verified' WHERE user_id = ?", userName, (err) => {
                    if(err){
                        console.log(err);
                        res.send({status: false, message: "Cannot Verify Account"});
                    }
                    else{
                        res.send({status: true, message: "Account Verified"});
                    }
                })
            }
            else{
                // console.log(false);
                res.send({status: false, message: "Invalid Code"});
            }
        }
    })
})

app.post('/addpaymentaccount', jwtverifier, (req, res) => {
    const userName = req.body.userName;
    const account_name = req.body.account_name;
    const account_email = req.body.account_email;
    const account_address = req.body.account_address;
    const account_time_added = req.body.account_time_added;
    const accountType = req.body.accountType;

    // console.log(req.body);

    const insertData = () => {
        db.query("INSERT INTO payment_accounts (userName, account_name, account_email, account_address, account_time_added, account_type) VALUES (?,?,?,?,?,?)", [userName,account_name,account_email,account_address,account_time_added,accountType], (err) => {
            if(err){
                console.log(err);
                res.send({status: false, message: "Cannot Add Account!"});
            }
            else{
                res.send({status: true, message: "Account Added!"});
            }
        })
    }

    db.query("SELECT account_email, account_type FROM payment_accounts WHERE account_email = ? AND account_type = ?", [account_email, accountType], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            if(result.length > 0){
                if(result[0].account_email != account_email && result[0].account_type != account_type){
                    insertData();
                }
                else{
                    res.send({status: false, message: "Account ALready Added!"});
                }
            }
            else{
                insertData();
            }
        }
    })
})

app.get('/paymentaccountslist/:userName', jwtverifier, (req, res) => {
    const userName = req.params.userName;

    db.query("SELECT userName, account_name, account_email, account_address, account_time_added, account_type FROM payment_accounts WHERE userName = ?", userName, (err, result) => {
        if(err){
            console.log(err)
        }
        else{
            res.send(result);
        }
    })
})

app.get('/usercredsvalidation/:userName', jwtverifier, (req, res) => {
    const userName = req.params.userName;

    db.query("SELECT (SELECT COUNT(id) FROM user_addresses WHERE userName = ?) as total_addresses, (SELECT COUNT(id) FROM contact_details WHERE userName = ?) as total_contacts", [userName, userName], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            if(result.length > 0){
                // console.log(true);
                if(result[0].total_addresses <= 0){
                    // console.log("false address");
                    res.send({status: false, message: "You have no Saved Address"});
                }
                else if(result[0].total_contacts <= 0){
                    // console.log("false contacts");
                    res.send({status: false, message: "You have no Saved Contact"});
                }
                else if(result[0].total_contacts <= 0 && result[0].total_addresses <= 0){
                    // console.log("both false");
                    res.send({status: false, message: "You have No Saved Address and Contact"});
                }
                else if(result[0].total_contacts > 0 && result[0].total_addresses > 0){
                    // console.log("Eligible!");
                    res.send({status: true});
                }
            }
            else{
                console.log(false);
            }
        }
    })
})

app.get('/getemailcustomer/:userName', jwtverifier, (req, res) => {
    const userName = req.params.userName;

    db.query("SELECT email FROM user_accounts WHERE userName = ?", userName, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            res.send(result[0].email);
        }
    })
})

app.post('/confirmshopaddress', jwtverifier, (req, res) => {
    const shopID = req.body.shopID;
    const houseno = req.body.houseno;
    const street = req.body.street;
    const barangay = req.body.barangay;
    const city_town = req.body.city_town;
    const province = req.body.province;
    const region = req.body.region;
    const postalCode = req.body.postalCode;

    db.query("INSERT INTO shop_addresses (shopID,houseNo,street,barangay,city_town,province,region,postalCode) VALUES (?,?,?,?,?,?,?,?)", [shopID,houseno,street,barangay,city_town,province,region,postalCode], (err) => {
        if(err){
            console.log(err);
        }
        else{
            res.send({status: true});
        }
    })
})

app.get('/shopaddressget/:shopID', jwtverifier, (req, res) => {
    const shopID = req.params.shopID;

    db.query("SELECT * FROM shop_addresses WHERE shopID = ?", shopID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            if(result.length == 1){
                const houseno = result[0].houseNo;
                const street = result[0].street;
                const barangay = result[0].barangay;
                const city_town = result[0].city_town;
                const province = result[0].province;
                const region = result[0].region;
                const postalCode = result[0].postalCode;
                res.send(`${houseno}, ${street}, ${barangay}, ${city_town}, ${province}, ${region}, ${postalCode}`);
            }
        }
    })
})

app.post('/sendSMSseller', jwtverifier, (req, res) => {
    const shopID = req.body.shopID;
    const conumber = req.body.conumber;

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    db.query("INSERT INTO shop_contactnumbers (shopID,contactNumber,date_added) VALUES (?,?,?)", [shopID, conumber, today_fixed], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send({status: true, message: "Contact Number Added!"});
        }
    })
})

app.get('/getshopcontactnumber/:shopID', jwtverifier, (req, res) => {
    const shopID = req.params.shopID;

    db.query("SELECT * FROM shop_contactnumbers WHERE shopID = ?", shopID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result[0]);
        }
    })
})

app.get('/verificationTwoStatus/:shopID', jwtverifier, (req, res) => {
    const shopID = req.params.shopID;

    db.query("SELECT * FROM verification_data WHERE user_id = ?", shopID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
            // console.log(shopID);
        }
    })
})

app.post('/loginadmin', (req, res) => {
    const employeeID = req.body.employeeID;
    const password = req.body.password;

    db.query("SELECT employeeID, fullName FROM admin_accounts WHERE employeeID = ? AND password = ?", [employeeID, password], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            if(result.length == 0){
                res.send({status: false, message: "Wrong Credentials"});
            }
            else{
                if(result[0].employeeID == employeeID){
                    const token = jwt.sign({employeeID}, "shopperiaprojectinsia102", {
                        expiresIn: 60 * 60 * 24 * 7
                    })
                    res.send({status: true, employeeID: employeeID, fullName: result[0].fullName, token: token, message: "Logged In!"})
                }
                else{
                    res.send({status: false, message: "Unable to Log In!"});
                }
            }
        }
    })
})

const jwtadminverifier = (req, res, next) => {
    const token = req.headers["x-access-token"];
    if(token){
        jwt.verify(token, "shopperiaprojectinsia102", (err, decode) => {
            if(err){
                res.send({status: false});
                // console.log("1");
            }
            else{
                // console.log(decode);
                // console.log("1");
                const employeeID = decode.employeeID;
                req.employeeIDresult = decode.employeeID;
                db.query("SELECT employeeID, fullName FROM admin_accounts WHERE employeeID = ?", [employeeID], (err, result) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        // console.log(result);
                        if(result.length == 0){
                            res.send({status: false, message: "Wrong Credentials"});
                            // console.log(result);
                        }
                        else{
                            if(result[0].employeeID == employeeID){
                                req.fullNameresult = result[0].fullName;
                                next()
                            }
                            else{
                                res.send({status: false, message: "Unable to Log In!"});
                            }
                        }
                    }
                })
            }
        })
    }
    else{
        res.send({status: false});
    }
}

app.get('/adminData/:adminID', jwtadminverifier, (req, res) => {
    const adminID =  req.params.adminID;

    db.query("SELECT * FROM admin_accounts WHERE employeeID = ?", adminID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/messagesAdmin/:username', jwtadminverifier, (req, res) => {
    const username = req.params.username;

    db.query("SELECT * FROM messages_table WHERE id IN (SELECT MAX(id) FROM messages_table WHERE conversation_id IN (SELECT conversation_id FROM messages_table WHERE messages_table.from = ? OR messages_table.to = ? GROUP BY conversation_id) GROUP BY conversation_id) ORDER BY id DESC", [username, username], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/messagesInboxAdmin/:username/:othername', jwtadminverifier, (req, res) => {
    const username = req.params.username;
    const othername = req.params.othername;

    db.query("SELECT * FROM messages_table WHERE messages_table.from = ? AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to = ? Order by id", [othername, username, username, othername], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            res.send(result);
        }
    })
})

app.get('/verifysessionadmin', jwtadminverifier, (req, res) => {
    res.send({status: true, employeeID: req.employeeIDresult, fullName: req.fullNameresult});
})

app.get('/chatSupportMessage/:userID', jwtverifier, (req, res) => {
    const userID = req.params.userID;

    db.query("SELECT conversation_id FROM messages_table WHERE messages_table.from IN (SELECT employeeID FROM admin_accounts WHERE status = 'enabled') AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to IN (SELECT employeeID FROM admin_accounts WHERE status = 'enabled'`) Order by id LIMIT 1", [userID, userID], (err, resut) => {
        if(err){
            console.log(err);
        }
        else{
            console.log(result)
        }
    })
})

app.get('/chatSupportMessageList/:userID', jwtverifier, (req, res) => {
    const userID = req.params.userID;

    const selectorMethod = (count) => {
        const randomizer = Math.random() * (count - 1 + 1);
        const randomizerFinal = Math.floor(randomizer + 1);
        // console.log(randomizerFinal);

        db.query("SELECT employeeID, status FROM admin_accounts WHERE id = ?", randomizerFinal, (err, result) => {
            if(err){
                console.log(err);
            }
            else{
                // console.log(result);
                if(result.length == 0){
                    selectorMethod(count);
                }
                else{
                    if(result[0].status == 'disabled'){
                        selectorMethod(count)
                    }
                    else{
                        // console.log(result[0].employeeID);
                        res.send(result);
                    }
                }
            }
        })
    }

    db.query("SELECT conversation_id FROM messages_table WHERE messages_table.from IN (SELECT employeeID FROM admin_accounts WHERE status = 'enabled') AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to IN (SELECT employeeID FROM admin_accounts WHERE status = 'enabled') Order by id LIMIT 1", [userID, userID], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result)
            if(result.length != 0){
                // console.log(result);

                db.query("SELECT messages_table.from, messages_table.to FROM messages_table WHERE conversation_id = ? LIMIT 1", result[0].conversation_id, (err, result) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        // console.log(result[0].from == userID? result[0].to : result[0].from);
                        // console.log([{employeeID: result[0].from == userID? result[0].to : result[0].from}])
                        res.send([{employeeID: result[0].from == userID? result[0].to : result[0].from}]);
                    }
                })

                // db.query("SELECT employeeID FROM admin_accounts WHERE id = ? AND status = 'enabled'", )
            }
            else{
                // console.log(false);
                db.query("SELECT COUNT(employeeID) AS totalav FROM admin_accounts", (err, result2) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        // console.log(result2[0].totalav);
                        selectorMethod(result2[0].totalav);
                    }
                })
            }
        }
    })
})

app.get('/messagesInboxAdmin/:username/:othername', jwtadminverifier, (req, res) => {
    const username = req.params.username;
    const othername = req.params.othername;

    db.query("SELECT * FROM messages_table WHERE messages_table.from = ? AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to = ? Order by id", [othername, username, username, othername], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            res.send(result);
        }
    })
})

app.post('/sendMessageAdmin', jwtadminverifier, (req, res) => {

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    const message_content = req.body.message_content;
    const from = req.body.from;
    const to = req.body.to;

    function sendPrompt(conversation_id){
        db.query("INSERT INTO messages_table (conversation_id, message_content, date_sent, messages_table.from, messages_table.to) VALUES (?,?,?,?,?)", [conversation_id, message_content, today_fixed, from, to], (err) => {
            if(err){
                console.log(err);
            }
            else{
                res.send({status: true});
            }
        })
    }

    db.query("SELECT conversation_id FROM messages_table WHERE messages_table.from = ? AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to = ? Order by id", [to, from, from, to], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            if(result.length == 0){
                // console.log(true);
                const conversation_id_null = `chat_id_${makeid(15)}`;
                sendPrompt(conversation_id_null);
            }
            else{
                const conversation_id_defined = result[0].conversation_id;
                sendPrompt(conversation_id_defined);
                // console.log(false);
            }
        }
    })
})

app.get('/userOrdersData/:orderID', jwtadminverifier, (req, res) => {
    const orderID = req.params.orderID;

    db.query("SELECT * FROM user_orders WHERE order_id = ?", orderID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result[0]);
            // res.send(result[0]);
            if(result.length != 0){
                const orderIDres = result[0].order_id;
                db.query("SELECT * FROM cart_view WHERE order_id = ?", orderIDres, (err2, result2) => {
                    if(err2){
                        console.log(err2);
                    }
                    else{
                        const shopID = result2[0].shopID;
                        db.query("SELECT seller_accounts.email, seller_accounts.shopName, seller_accounts.shopID, seller_accounts.shop_preview, concat(seller_accounts.seller_lastName,', ', seller_accounts.seller_firstName,', ',seller_accounts.seller_middleName) AS fullName, concat(shop_addresses.houseNo, ', ',shop_addresses.street,', ',shop_addresses.barangay,', ',shop_addresses.city_town,', ',shop_addresses.province,', ',shop_addresses.region,', ',shop_addresses.postalCode) AS fullAddress, shop_contactnumbers.contactNumber FROM seller_accounts, shop_addresses, shop_contactnumbers WHERE seller_accounts.shopID = ? AND shop_addresses.shopID = ? AND shop_contactnumbers.shopID = ?" ,[shopID, shopID, shopID], (err3, result3) => {
                            if(err3){
                                console.log(err3);
                            }
                            else{
                                // console.log(shopID)
                                res.send({results: {result_one: result[0], result_two: result2[0], result_three: result3[0]}})
                            }
                        })
                    }
                })
            }
            else{
                console.log(false);
            }
        }
    })
})

app.get('/incomingorders/:branch', jwtadminverifier, (req, res) => {
    const branch = req.params.branch;

    db.query("SELECT * FROM cart_view WHERE remarks = ?  AND shopAddress = ? OR remarks = ?", ["For Ship Out", branch, `Transferring to ${branch}`], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/ordersToDeliver/:branch', jwtadminverifier, (req, res) => {
    const branch = req.params.branch;

    db.query("SELECT * FROM cart_view WHERE remarks = ?  AND shopAddress = ? OR remarks = ?", [`On Pick Up`, branch, `In Warehouse ${branch}`], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/availriders/:adminBranch', jwtadminverifier, (req, res) => {
    const adminBranch = req.params.adminBranch;
    db.query("SELECT * FROM rider_accounts WHERE acc_status = 'enabled' AND status = 'online' AND branch = ?", [adminBranch], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/selectBranches', jwtadminverifier, (req, res) => {
    db.query("SELECT branch FROM admin_accounts GROUP BY branch", (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.post('/assignRider', jwtadminverifier, (req, res) => {
    const order_id = req.body.order_id;
    const rider_id = req.body.rider_id;

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    db.query("INSERT INTO rider_assign (order_id, rider_id, order_status, date_made) VALUES (?,?,?,?)", [order_id, rider_id, "On Pick Up", today_fixed], (err, result) => {
        if(err){
            console.log(err);
        }else{
            // res.send({status: true, message: "Order has been set to Pick Up"});
            db.query("UPDATE user_orders SET remarks = ? WHERE order_id = ?", ["On Pick Up", order_id], (err2, result2) => {
                if(err2){
                    console.log(err2);
                }else{
                    res.send({status: true, message: "Order has been set to Pick Up"});
                }
            })
        }
    })

    // console.log(req.body);
})

app.post('/deliveryRider', jwtadminverifier, (req, res) => {
    const order_id = req.body.order_id;
    const rider_id = req.body.rider_id;

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    db.query("INSERT INTO rider_assign (order_id, rider_id, order_status, date_made) VALUES (?,?,?,?)", [order_id, rider_id, "On Delivery", today_fixed], (err, result) => {
        if(err){
            console.log(err);
        }else{
            // res.send({status: true, message: "Order has been set to Pick Up"});
            db.query("UPDATE user_orders SET status = ?, remarks = ? WHERE order_id = ?", ["OnDelivery", "Out for Delivery", order_id], (err2, result2) => {
                if(err2){
                    console.log(err2);
                }else{
                    res.send({status: true, message: "Order is out for Delivery"});
                }
            })
        }
    })
})

app.post('/transferBranch', jwtadminverifier, (req, res) => {
    const order_id = req.body.order_id;
    const branch = req.body.branch;

    db.query("UPDATE user_orders SET status = ?, remarks = ? WHERE order_id = ?", ["OnDelivery", `Transferring to ${branch}`, order_id], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send({status: true, message: "Order has been set to transfer"});
        }
    })
})

app.post('/confirmTransfer', jwtadminverifier, (req, res) => {
    const order_id = req.body.order_id;
    const branch = req.body.branch;

    db.query("UPDATE user_orders SET remarks = ? WHERE order_id = ?", [`In Warehouse ${branch}`, order_id], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send({status: true, message: "Order Received"});
        }
    })
})

app.get('/tranferringList/:branch', jwtadminverifier, (req, res) => {
    const branch = req.params.branch;

    db.query("SELECT * FROM cart_view WHERE remarks LIKE ? AND shopAddress = ?", ["Transferring to%", branch], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/outfordelivery/:branch', jwtadminverifier, (req, res) => {
    const branch = req.params.branch;

    db.query("SELECT * FROM cart_view WHERE remarks = ? AND city_town = ?", ["Out for Delivery", branch], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/shipInUnassigned/:branch', jwtadminverifier, (req, res) => {
    const branch = req.params.branch;

    db.query("SELECT * FROM cart_view WHERE remarks = ? AND shopAddress = ? OR remarks = ?", ["For Ship Out", branch, `Transferring to ${branch}`], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/shipInAssigned/:branch', jwtadminverifier, (req, res) => {
    const branch = req.params.branch;

    db.query("SELECT * FROM rider_assign_view WHERE order_status = ? AND branch = ?", ["On Pick Up", branch], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/shipOutUnassigned/:branch', jwtadminverifier, (req, res) => {
    const branch = req.params.branch;

    db.query("SELECT * FROM cart_view WHERE remarks = ?", [`In Warehouse ${branch}`], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/shipOutAssigned/:branch', jwtadminverifier, (req, res) => {
    const branch = req.params.branch;

    db.query("SELECT * FROM rider_assign_view WHERE remarks = ? AND branch = ?", ["Out for Delivery", branch], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

const jwtriderverification = (req, res, next) => {
    const token = req.headers["x-access-token"];

    jwt.verify(token, "shopperiaprojectinsia102", (err, decode) => {
        if(err){
            res.send({status: false, message: "Token Denied"});
        }
        else{
            const riderID = decode.userName.join("");
            db.query("SELECT * FROM rider_accounts WHERE rider_id = ?", riderID, (err2, result2) => {
                if(err2){
                    console.log(err2);
                }
                else{
                    if(result2.length > 0){
                        req.riderID = decode.userName.join("");
                        req.branch = result2[0].branch;
                        next();
                    }
                }
            })
        }
    })
}

app.get('/loginriderverifier', jwtriderverification, (req, res) => {
    res.send({status: true, riderID: req.riderID, branch: req.branch});
})

app.post('/loginRider', (req, res) => {
    const email = req.body.email;
    const password =  req.body.password;

    // console.log(req.body);

    db.query("SELECT * FROM rider_accounts WHERE email = ? AND password = ?", [email, password], (err, result) => {
        if(err){
            res.send({statue: true, message: "Unable to Log In"});
            console.log(err);
        }
        else{
            if(result.length > 0){
                const userName = result.map((id) => id.rider_id);
                const token = jwt.sign({userName}, "shopperiaprojectinsia102", {
                    expiresIn: 60 * 60 * 24 * 7
                })
                res.send({status: true, token: token, message: "Successfully Logged In", riderID: userName.join(""), branch: result[0].branch});
            }
            else{
                res.send({status: false, message: "Wrong Account Informations"});
            }
        }
    })
})

app.get('/toRetrieve/:rider_id', jwtriderverification, (req, res) => {
    const rider_id = req.params.rider_id;

    db.query("SELECT * FROM rider_assign_view WHERE rider_id = ? AND order_status = 'On Pick Up'", [rider_id], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/toDeliver/:rider_id', jwtriderverification, (req, res) => {
    const rider_id = req.params.rider_id;

    db.query("SELECT * FROM rider_assign_view WHERE rider_id = ? AND order_status = 'On Delivery'", [rider_id], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.post('/retrieveConfirm', jwtriderverification, (req, res) => {
    const rider_id = req.body.rider_id;
    const branch = req.body.branch;
    const order_id = req.body.order_id;

    db.query("UPDATE rider_assign SET order_status = 'Retrieved' WHERE order_id = ? AND rider_id = ? AND order_status = ?", [order_id, rider_id, "On Pick Up"], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            db.query("UPDATE user_orders SET status = 'OnDelivery', remarks = ? WHERE order_id = ?", [`In Warehouse ${branch}`, order_id], (err2, result2) => {
                if(err2){
                    console.log(err2);
                }
                else{
                    res.send({status: true, message: `${order_id} has been Retrieved!`});
                }
            })
        }
    })

    // console.log(req.body);
})

const emailForDeliver = (user_id, order_id, product_id, email, payment_method, order_total, shopName, date_delivered, date_ordered) => {
    const userName = user_id;
    const orderID = order_id;
    const productID = product_id;
    const emailuser = email;
    const paymentMethod = payment_method;
    const totalPrice = order_total;
    const shopNameOrder = shopName;
    const datePaid = date_ordered;

    const htmlMessageCOD = `<h3>Good Day ${userName}!</h3><br />
    <p>Your Order has been Successfully Delivered and you have Successfully Paid your <b>Order: ${orderID}</b> using Payment Method of <b>${paymentMethod}</b> with the total price of <b>PHP ${totalPrice}</b>.</p><br />
    <span><b>Shop Name: ${shopNameOrder}</span></b><br />
    <span><b>Product ID: ${productID}</span></b><br />
    <span><b>Date of Payment: ${date_delivered}</b></span><br />
    <span><b>Date Delivered: ${date_delivered}</b></span>`

    const htmlMessagePaid = `<h3>Good Day ${userName}!</h3><br />
    <p>Your Order has been Successfully Delivered <b>Order: ${orderID}</b> and noticeably were already paid using Payment Method of <b>${paymentMethod}</b> with the total price of <b>PHP ${totalPrice}</b>.</p><br />
    <span><b>Shop Name: ${shopNameOrder}</span></b><br />
    <span><b>Product ID: ${productID}</span></b><br />
    <span><b>Date of Payment: ${datePaid}</b></span><br />
    <span><b>Date Delivered: ${date_delivered}</b></span>`

    const mailOptions = {
        from: 'shopperia.philippines@gmail.com',
        to: emailuser,
        subject: `Receipt for ${orderID}`,
        // text: `Good Day ${userName}! You have Successfully paid you Order: ${orderID} using Payment Method of ${paymentMethod} with the total price of PHP${totalPrice}.`
        html: paymentMethod == "COD"? htmlMessageCOD : htmlMessagePaid
    }

    accountTransport.sendMail(mailOptions, (err, info) => {
        if(err){
            console.log(err);
        }
        {
            //dbquery for notifications
        }
    })
    // console.log(emailuser);
}

app.post('/deliverConfirm', jwtriderverification, (req, res) => {
    const rider_id = req.body.rider_id;
    const branch = req.body.branch;
    const order_id = req.body.order_id;

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    db.query("UPDATE rider_assign SET order_status = 'Delivered' WHERE order_id = ? AND rider_id = ? AND order_status = ?", [order_id, rider_id, "On Delivery"], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            db.query("UPDATE user_orders SET status = 'Received', remarks = ?, date_accomplished = ? WHERE order_id = ?", [`Order Successfully Delivered`, today_fixed, order_id], (err2, result2) => {
                if(err2){
                    console.log(err2);
                }
                else{
                    res.send({status: true, message: `${order_id} has been Successfully Delivered!`});
                    db.query("SELECT * FROM cart_view WHERE order_id = ?", order_id, (err3, result3) => {
                        if(err3){
                            console.log(err3);
                        }
                        else{
                            db.query("SELECT email FROM user_accounts WHERE userName = ?", result3[0].user_id, (err4, result4) => {
                                if(err4){
                                    console.log(err4);
                                }
                                else{
                                    emailForDeliver(result3[0].user_id, result3[0].order_id, result3[0].product_id, result4[0].email, result3[0].payment_method, result3[0].order_total, result3[0].shopname, today_fixed, result3[0].date_ordered);
                                }
                            })
                        }
                    })
                }
            })
        }
    })

    // console.log(req.body);
})

app.get('/getRiderInfo/:order_id', jwtverifier, (req, res) => {
    const order_id = req.params.order_id;

    db.query("SELECT * FROM rider_assign_view WHERE order_id = ?", [order_id], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result[0]);
        }
    })
})

app.get('/messagesRider/:username', jwtriderverification, (req, res) => {
    const username = req.params.username;

    db.query("SELECT * FROM messages_table WHERE id IN (SELECT MAX(id) FROM messages_table WHERE conversation_id IN (SELECT conversation_id FROM messages_table WHERE messages_table.from = ? OR messages_table.to = ? GROUP BY conversation_id) GROUP BY conversation_id) ORDER BY id DESC", [username, username], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/messagesRiderInbox/:username/:othername', jwtriderverification, (req, res) => {
    const username = req.params.username;
    const othername = req.params.othername;

    db.query("SELECT * FROM messages_table WHERE messages_table.from = ? AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to = ? Order by id", [othername, username, username, othername], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            res.send(result);
        }
    })
})

app.post('/sendMessageRider', jwtriderverification, (req, res) => {

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    const message_content = req.body.message_content;
    const from = req.body.from;
    const to = req.body.to;

    function sendPrompt(conversation_id){
        db.query("INSERT INTO messages_table (conversation_id, message_content, date_sent, messages_table.from, messages_table.to) VALUES (?,?,?,?,?)", [conversation_id, message_content, today_fixed, from, to], (err) => {
            if(err){
                console.log(err);
            }
            else{
                res.send({status: true});
            }
        })
    }

    db.query("SELECT conversation_id FROM messages_table WHERE messages_table.from = ? AND messages_table.to = ? OR messages_table.from = ? AND messages_table.to = ? Order by id", [to, from, from, to], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            if(result.length == 0){
                // console.log(true);
                const conversation_id_null = `chat_id_${makeid(15)}`;
                sendPrompt(conversation_id_null);
            }
            else{
                const conversation_id_defined = result[0].conversation_id;
                sendPrompt(conversation_id_defined);
                // console.log(false);
            }
        }
    })
})

app.get('/conchatRider/:order_id', jwtverifier, (req, res) => {
    const order_id = req.params.order_id;

    db.query("SELECT rider_id FROM rider_assign WHERE order_id = ?", [order_id], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result[0]);
            res.send(result[0]);
        }
    })
})

app.get('/retrievedHistory/:rider_id', jwtriderverification, (req, res) => {
    const rider_id = req.params.rider_id;

    db.query("SELECT * FROM rider_assign_view WHERE rider_id = ? AND order_status = ?", [rider_id, "Retrieved"], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.get('/getviewOrderDetails/:order_id', jwtverifier, (req, res) => {
    const order_id = req.params.order_id;

    db.query("SELECT * FROM cart_view WHERE order_id = ?", order_id, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            if(result.length != 0){
                // console.log({...result[0]});
                if(result[0].remarks == "Out for Delivery"){
                    db.query("SELECT * FROM rider_assign_view WHERE order_id = ?", order_id, (err2, result2) => {
                        if(err2){
                            console.log(err2);
                        }
                        else{
                            res.send([{...result[0], ...result2[0]}]);
                        }
                    })
                }
                else{
                    res.send([{...result[0]}]);
                }
            }
        }
    })
})

app.post('/setdefaultadd', jwtverifier, (req, res) => {
    const id = req.body.id;
    const status = req.body.status;

    db.query("UPDATE user_addresses SET status = 'Reserved'", (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            db.query("UPDATE user_addresses SET status = 'Default' WHERE id = ?", id, (err2, result2) => {
                if(err2){
                    console.log(err2);
                }
                else{
                    res.send({status: true, message: "Default Address Changed"});
                }
            })
        }
    })
})

app.post('/setdefaultcon', jwtverifier, (req, res) => {
    const id = req.body.id;
    const status = req.body.status;

    db.query("UPDATE contact_details SET status = 'Reserved'", (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            db.query("UPDATE contact_details SET status = 'Default' WHERE id = ?", id, (err2, result2) => {
                if(err2){
                    console.log(err2);
                }
                else{
                    res.send({status: true, message: "Default Contact Changed"});
                }
            })
        }
    })
})

app.get('/getsavedcontacts/:userName', jwtverifier, (req, res) => {
    const userName = req.params.userName;

    db.query("SELECT * FROM contact_details WHERE userName = ?", userName, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.post('/postSavedAddress', jwtverifier, (req, res) => {
    const userName = req.body.userName;
    const conumber = req.body.connumber;
    const email = req.body.email;

    function queryContact(status){
        db.query("INSERT INTO contact_details (userName, contact_number, email, status) VALUES (?,?,?,?)", [userName, conumber, email, status], (err2, result2) => {
            if(err2){
                console.log(err2);
            }
            else{
                res.send({status: true, message: "Contact has been Saved"});
            }
        })
    }

    db.query("SELECT COUNT(id) as id FROM contact_details WHERE userName = ?", userName, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result[0].id);
            if(result[0].id == 0){
                queryContact("Default");
            }
            else{
                queryContact("Reserved");
            }
        }
    })
})

app.get('/getShopCatBrand/:shopID', (req, res) => {
    const shopID = req.params.shopID;

    db.query("SELECT prcat FROM shopperia_db.products_list WHERE shopID = ? GROUP BY prcat", shopID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            db.query("SELECT prbrand FROM shopperia_db.products_list WHERE shopID = ? GROUP BY prbrand", shopID, (err2, result2) => {
                if(err2){
                    console.log(err2);
                }
                else{
                    res.send({result: result, result2: result2});
                }
            })
        }
    })
})

app.get('/productsShop/:shopID', (req, res) => {
    const shopID = req.params.shopID
    // console.log(queryRes);
    db.query("SELECT * FROM productspricesmaxmin WHERE shopID = ? ORDER BY overall DESC", shopID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            // console.log(result);
            res.send(result);
        }
    })
})

app.get('/getSellerLists/:admin_branch', jwtadminverifier, (req, res) => {
    const admin_branch = req.params.admin_branch;

    // console.log(admin_branch)

    db.query("SELECT * FROM seller_prev WHERE shopID IN (SELECT shopID FROM shop_addresses WHERE city_town = ?)", admin_branch, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result);
        }
    })
})

app.post('/verificationSellerProcess', jwtadminverifier, (req, res) => {
    const shopID = req.body.shopID;
    const data = req.body.data;

    db.query("UPDATE verification_data SET ver_status_two = ? WHERE user_id = ?", [data, shopID], (err, resuly) => {
        if(err){
            console.log(err);
        }
        else{
            res.send({status: true, message: "Seller Verification has been set!"});
        }
    })
})

//SOCKET IO SECTION


io.on("connection", socket => {
    // console.log(socket.id);

    socket.on("connected", riderID => {
        // console.log(riderID);
    })

})


//SOCKET IO SECTION