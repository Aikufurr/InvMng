const express = require("express");
const fs = require("fs");
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const uuid = require('uuid/v4')
const app = express();
const port = 5001;


app.set('view engine', 'ejs');
app.use('/js', express.static(__dirname + '/views/lib/js'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json())
app.use(express.json())
var router = express.Router();
let proURL = "/inv-mng";
app.use(proURL, router);


router.get('/', (req, res) => {
    console.log("GET /")
    if (req.cookies["token"]) {
        let fjson = JSON.parse(fs.readFileSync(`./data/users/${req.cookies["token"]}/account.json`, `utf8`));
        res.render('pages/index', { user: fjson });
    } else {
        res.redirect(`${proURL}/login`)
    }
});
router.get('/items/:id?', (req, res) => {
    if (req.params.id != null) {
        console.log("GET /items/" + req.params.id)
    } else {
        console.log("GET /items/")
    }
    if (req.cookies["token"]) {
        let items;
        let fjson = JSON.parse(fs.readFileSync(`./data/users/${req.cookies["token"]}/account.json`, `utf8`));
        if (!fs.existsSync(`./data/users/${req.cookies["token"]}/items.json`)) {
            items = {};
        } else {
            items = JSON.parse(fs.readFileSync(`./data/users/${req.cookies["token"]}/items.json`, `utf8`));
        }
        if (req.params.id != null) {
            if (req.params.id === "new") {
                res.render('pages/itemnew', { user: fjson, items: items.items });
            } else {
                res.render('pages/itemview', { user: fjson, items: items.items, index: req.params.id });
            }
        } else {
            res.render('pages/items', { user: fjson, items: items.items });
        }
    } else {
        res.redirect(`${proURL}/login`)
    }
});
router.post('/items/:option', (req, res) => {
    if (req.params.id != null) {
        console.log("POST /items/" + req.params.id)
    } else {
        console.log("POST /items/")
    }
    let items = JSON.parse(fs.readFileSync(`./data/users/${req.cookies["token"]}/items.json`, `utf8`));
    if (req.params.option === "save") {
        items.items[req.body.index] = req.body;
        fs.writeFileSync(`./data/users/${req.cookies["token"]}/items.json`, JSON.stringify(items));
    } else if (req.params.option === "new") {
        items.items[Object.keys(items.items).length] = req.body;
        fs.writeFileSync(`./data/users/${req.cookies["token"]}/items.json`, JSON.stringify(items));
    } else if (req.params.option === "delete") {
        delete items.items[req.body.index]
        fs.writeFileSync(`./data/users/${req.cookies["token"]}/items.json`, JSON.stringify(items));
    }

    res.send({ "output": "success" })

});

router.get('/login', (req, res) => {
    console.log("GET /login")
    if (req.cookies["token"]) {
        return res.redirect(`${proURL}/`)
    } else {
        return res.render('pages/login');
    }
});

router.get('/register', (req, res) => {
    console.log("GET /register")
    if (req.cookies["token"]) {
        res.redirect(`${proURL}/`)
    } else {
        res.render('pages/register');
    }
});

const users = []

router.get('/users', (req, res) => {
    res.json(users)
})


router.post('/register', async(req, res) => {
    console.log("POST /register")
    try {
        const hashedPassword = await bcrypt.hash(req.body.user.psk, 10)
        const user = { id: uuid(), name: req.body.user.name, password: hashedPassword }
        if (!fs.existsSync(`./data/users/${user.id}`)) {
            fs.mkdirSync(`./data/users/${user.id}`);
        }
        fs.writeFileSync(`./data/users/${user.id}/account.json`, JSON.stringify(user));
        res.cookie('token', user.id, {
            maxAge: 5000 * 60 * 1440 /* 5 days */ ,
            httpOnly: true
        })
        res.redirect(`${proURL}/`)
    } catch (err) {
        console.error(err)
        res.status(500).send()
    }
})

router.post('/login', async(req, res) => {
    console.log("POST /login")
        /*
        if (!fs.existsSync(`./data/users/${req.body.user.name}`)) {
            return res.redirect(`${proURL}/login`)
        }*/
    fs.readdir("./data/users/", (err, files) => {
        if (err) {
            return console.log(`Unable to scan directory: ` + err);
        }
        files.forEach((file) => {
            let fjson = JSON.parse(fs.readFileSync(`./data/users/${file}/account.json`, `utf8`));
            if (fjson.name === req.body.user.name) {
                try {
                    if (bcrypt.compare(req.body.user.psk, fjson.password, (err, out) => {
                            if (out) {
                                res.cookie('token', fjson.id, {
                                    maxAge: 5000 * 60 * 1440 /* 5 days */ ,
                                    httpOnly: true
                                })
                                return res.redirect(`${proURL}/`)
                            } else {
                                return res.send('Not Allowed')
                            }
                        }));
                } catch {
                    return res.status(500).send()
                }
            }
        });
    });
})
router.get('/logout', (req, res) => {

    console.log("GET /logout")
    res.clearCookie("token");
    res.redirect(`${proURL}/`)
})

app.listen(port, () => console.log(`Listing on port ${port}`));