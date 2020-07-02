// clsl v1.0.0
// Michael Peters

const express = require("express");
const cors = require("cors");
const path = require("path");
const bp = require("body-parser");
const db = require("better-sqlite3")("./data/data.sqlite3");
const NodeCache = require("node-cache");
const { v4: uuidv4 } = require("uuid");
const shortid = require("shortid");
const bcrypt = require("bcrypt");

// port the app is currently serving to
const app_port = 6981;
const saltRounds = 10;

const app = express();
app.set("view engine", "ejs");

const linkCache = new NodeCache();

// for better-sqlite3
db.prepare(
  "CREATE TABLE IF NOT EXISTS accounts (id TEXT, username TEXT, hash TEXT, apikey TEXT)"
).run();

// setup data structure
const user_data = {
  username: "",
  hash: "default",
  id: "",
  apikey: "",
};

//////////////////////////////////

function createID(username, password) {
  user_data.username = username;
  bcrypt.hash(password, saltRounds, function (err, hash) {
    user_data.hash = hash;
    user_data.id = uuidv4();
    user_data.apikey = shortid.generate();
    sendToCache(user_data);
    sendToDatabase(user_data);
    console.log(
      `ID (${user_data.id}) created for: ${user_data.username} with hash ${user_data.hash} and apikey ${user_data.apikey}`
    );
    sendToDatabase;
  });
}

function sendToDatabase(data) {
  console.log(`Sending to Database: ${data.id}\n`);
  var stmt = db.prepare(
    `INSERT INTO accounts ("id", "username", "hash", "apikey") VALUES ('${data.id}', '${data.username}', '${data.hash}', '${data.apikey}')`
  );
  stmt.run();
}

function sendToCache(data) {
  console.log(`Sending to Cache: ${data.id}`);
  // cache key is data.id, object is data, ttl is 10k
  linkCache.set(data.id, data, 10000);
}

// function getFromCache(id) {
//   console.log("Found Result!");
//   var result = linkCache.get(id);
//   return result;
// }

// function checkCache(id) {
//   console.log(`Checking cache for ID: ${id}`);
//   return linkCache.has(id);
// }

// function getFromDatabase(id) {
//   var result = undefined;
//   console.log(`Checking database for ID: ${id}`);
//   var stmt = db.prepare(`SELECT * FROM 'links' WHERE id='${id}'`);
//   result = stmt.get();
//   if (result != undefined) {
//     console.log("Found Result!");
//     return result;
//   } else {
//     console.log("Result Not Found");
//     return false;
//   }
// }

// function checkDatabase(id) {
//   console.log(`Checking database for ID: ${id}`);
//   return true;
// }

// function either returns an object or a false value
// function recieveRequest(id) {
//   if (checkCache(id)) {
//     // if key exists in the cache
//     var cacheResult = getFromCache(id);
//     return cacheResult;
//   } else {
//     var dbResult = getFromDatabase(id);
//     return dbResult; // could return false
//   }
// }

//////////////////////////////////

app.use(cors());
app.use(
  bp.urlencoded({
    extended: true,
  })
);

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/dashboard", function (req, res) {
  res.render("dashboard");
});

app.get("/css/bootstrap.css", function (req, res) {
  res.sendFile(path.join(__dirname + "/../css/bootstrap.css"));
});

// When form is clicked it posts to the endpoint below
// then it redirects itself to the original page
app.post("/users/log", (req, res) => {
  const pass = req.body.password;
  const use = req.body.username;
  console.log(use);
});

app.post("/users/signup", (req, res) => {
  const pass = req.body.password;
  const use = req.body.username;
  createID(use, pass);
});

// app.get("/:passed_shortid", function (req, res) {
//   console.log(`Endpoint accessed: /${req.params.passed_shortid}`);

//   var id = req.params.passed_shortid;

//   var result = recieveRequest(id);
//   if (result != false) {
//     console.log(`Redirecting to: ${result.url}\n`);
//     res.redirect(result.url);
//   } else {
//     console.log("Returning a 404");
//     res.status(404).render("404");
//   }
// });

const app_server = app.listen(app_port, () =>
  console.log(`clsl server app listening on port ${app_port}!\n`)
);

module.exports = app_server;
