const express = require("express");
const app = express();
const PORT = 3001 || process.env.PORT;
const mysql = require("mysql");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fileUpload = require("express-fileupload");
const path = require("path")

const connectionMysql = require("./connections/connectionMysql");
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
    db.query("SELECT * FROM productspricesmaxmin WHERE prname LIKE ? OR shopname LIKE ?", [queryRes, queryRes], (err, result) => {
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
                    const token = jwt.sign({userName}, "shopperiaprojectinsia102", {
                        expiresIn: 60 * 60 * 24 * 7
                    })
                    res.send({token: token, status: true, message: "Logged In Successfully!", userName: userName});
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
                    const token = jwt.sign({userName}, "shopperiaprojectinsia102", {
                        expiresIn: 60 * 60 * 24 * 7
                    })
                    res.send({tokenseller: token, status: true, message: "Logged In Successfully!", userName: userName});
                    // console.log(userName)
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

    // console.log(gender);

    db.query('INSERT INTO user_accounts (firstName, middleName, lastName, email, password, userName, profile_pic, gender) VALUES (?,?,?,?,?,?,?,?)', [firstName, middleName, lastName, email, password, userName, profile_link, gender], (err, result) => {
        if(err){
            res.send({err: err, content: "Unable to Register!", status: false});
            // console.log(err);
        }
        else{
            res.send({content:"Successfully Registered!" ,status: true});
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

    const firstName = req.body.firstName;
    const middleName = req.body.middleName;
    const lastName = req.body.lastName;
    const shop = req.body.shopName;
    const email = req.body.email;
    const password = req.body.password;
    const nameNoSpace = shop.split(" ").join("");
    const userName = `${nameNoSpace}_${makeid(7)}`
    const shop_link_img = 'http://localhost:3001/shopImgs/Default_Shop.jpg';

    db.query('INSERT INTO seller_accounts (seller_firstName, seller_middleName, seller_lastName, email, password, shopName, shopID, shop_preview) VALUES (?,?,?,?,?,?,?,?)', [firstName, middleName, lastName, email, password, shop, userName, shop_link_img], (err, result) => {
        if(err){
            res.send({err: err, content: "Unable to Register!", status: false});
        }
        else{
            res.send({content:"Successfully Registered!" ,status: true});
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

app.post('/postorder', jwtverifier, (req, res) => {

    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    
    var today_fixed = mm + '/' + dd + '/' + yyyy;

    const user_id = req.body.user_id;
    const receiver = req.body.receiver;
    const full_address = req.body.full_address;
    const province = req.body.province;
    const postalCode = req.body.postalCode;
    const product_id = req.body.product_id;
    const var_id = req.body.var_id;
    const variety = req.body.variety;
    const status = req.body.status;
    const date_ordered = today_fixed;
    const date_accomplished = "Not Accomplished";
    const order_id = `${product_id}_${makeid(10)}`;
    const order_total = req.body.order_total;

    // console.log(req.body);
    if(var_id == "" || var_id == null){
        res.send({status: false , message: "No Product Selected"});
    }
    else{
        if(variety == 0 || variety == null){
            res.send({status: false, message: "No Quantity to Order"});
        }
        else{
            db.query("INSERT INTO user_orders (user_id,receiver,fulladdress,province,postalCode,product_id,var_id,variety,status,date_ordered,date_accomplished,order_id,order_total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [user_id,receiver,full_address,province,postalCode,product_id,var_id,variety,status,date_ordered,date_accomplished,order_id,order_total], (err) => {
                if(err){
                    console.log(err);
                    res.send({status: false, message: "Order / Add to Cart Unsuccessful"});
                }
                else{
                    res.send({status: true, message: status == "Cart"? "Product has been Added to Cart" : "Product has been Successfully Ordered"});
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

app.get('/ordersfetch/:shopID/:status', jwtverifier, (req, res) => {
    const shopID = req.params.shopID;
    const status = req.params.status;

    // console.log(req.params.shopID);

    db.query("SELECT * FROM cart_view WHERE shopname = ? AND status = ?", [shopID, status], (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            res.send(result)
            // console.log(result);
        }
    })
})

app.post('/updateOrderStatus', jwtverifier, (req, res) => {
    const order_id = req.body.order_id;
    const status = req.body.status;

    // console.log(order_id);

    db.query("UPDATE user_orders SET status = ? WHERE order_id = ? ", [status, order_id], (err) => {
        if(err){
            console.log(err);
        }
    })
})

app.get('/getShopPreview/:shopID', (req, res) => {
    const shopID = req.params.shopID;
    db.query("SELECT * FROM seller_accounts WHERE shopID = ?", shopID, (err, result) => {
        if(err){
            console.log(err);
        }
        else{
            //{shop_preview: "", shopName: "", shopID: "", shopEmail: ""}
            // console.log(result[0]);
            res.send({shop_preview: result[0].shop_preview, shopName: result[0].shopName, shopID: result[0].shopID, shopEmail: result[0].email})
        }
    })
})

app.listen(PORT, () => {
    console.log(`Port Running: ${PORT}`)
});