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
var moment = require("moment");

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
  console.log(`Sending to Cache: ${data.username}`);
  // cache key is data.id, object is data, ttl is 10k
  linkCache.set(data.username, data, 10000);
}

function getFromCache(username) {
  console.log("Found Result!");
  var result = linkCache.get(username);
  return result;
}

function checkCache(username) {
  console.log(`Checking cache for username: ${username}`);
  return linkCache.has(username);
}

function getFromDatabase(username) {
  console.log(`Checking database for username: ${username}`);
  var stmt = db.prepare(
    `SELECT * FROM 'accounts' WHERE username='${username}'`
  );
  result = stmt.get();
  if (result != undefined) {
    console.log("Found Result!");
    return result;
  } else {
    console.log("Result Not Found");
    return false;
  }
}

function getFromDatabaseID(id) {
  console.log(`Checking database for id: ${id}`);
  var stmt = db.prepare(`SELECT * FROM 'accounts' WHERE id='${id}'`);
  result = stmt.get();
  if (result != undefined) {
    console.log("Found Result!");
    return result;
  } else {
    console.log("Result Not Found");
    return false;
  }
}

function getFromDatabaseAPI(apikey) {
  console.log(`Checking database for id: ${apikey}`);
  var stmt = db.prepare(`SELECT * FROM 'accounts' WHERE apikey='${apikey}'`);
  result = stmt.get();
  if (result != undefined) {
    console.log("Found Result!");
    return result;
  } else {
    console.log("Result Not Found");
    return false;
  }
}

function checkDatabase(username) {
  console.log(`Checking database for username: ${username}`);
  var stmt = db.prepare(
    `SELECT * FROM 'accounts' WHERE username='${username}'`
  );
  result = stmt.get();
  if (result != undefined) {
    console.log("Found Result!");
    return true;
  } else {
    console.log("Result Not Found");
    return false;
  }
}

function checkUsername(username) {
  console.log(`Checking for username: ${username}`);
  if (checkCache(username)) {
    return true;
  } else if (checkDatabase(username)) {
    return true;
  } else {
    return false;
  }
}

function validatePass(username, password, object) {
  console.log(object);
  bcrypt.compare(password, object.hash, function (err, result) {
    console.log(result);
    return result;
  });
}

app.use(cors());
app.use(
  bp.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

function renderSignup(res, bool) {
  if (bool == true) {
    res.render("signup", {
      passworderror: true,
    });
  } else {
    res.render("signup", {
      passworderror: false,
    });
  }
}

function renderLogin(res, bool) {
  if (bool == true) {
    res.render("login", {
      passworderror: true,
    });
  } else {
    res.render("login", {
      passworderror: false,
    });
  }
}

function renderDash(res, val) {
  const obj = getFromDatabaseID(val);
  const username = obj.username;
  const hash = obj.hash;
  const id = obj.id;
  const apikey = obj.apikey;

  res.render("dashboard", { use: username, hash: hash, id: id, api: apikey });
}

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/signup", function (req, res) {
  const bool = req.query.e;
  console.log(Boolean(bool));
  renderSignup(res, Boolean(bool));
});

app.get("/login", function (req, res) {
  const bool = req.query.e;
  renderLogin(res, Boolean(bool));
});

app.get("/dashboard", function (req, res) {
  const id = req.query.id;
  renderDash(res, id);
});

app.get("/api/v1/:apikey", function (req, res) {
  const key = req.params.apikey;
  const result = getFromDatabaseAPI(key);
  if (result != false) {
    res.status(200).json({
      valid: true,
      apikey: key,
      time: moment().toISOString(),
    });
  } else {
    res.status(200).json({
      valid: false,
      apikey: key,
      time: moment().toISOString(),
    });
  }
});

// When form is clicked it posts to the endpoint below
// then it redirects itself to the original page
app.post("/users/log", (req, res) => {
  const pass = req.body.password;
  const use = req.body.username;
  if (checkCache(use) != true) {
    if (checkDatabase(use) != true) {
      res.redirect("/login?e=true");
    } else {
      const obj = getFromDatabase(use);
      console.log(validatePass(use, pass, obj));
      if (validatePass(use, pass, obj) != false) {
        let url = "/dashboard?id=" + obj.id;
        res.redirect(url);
      } else {
        res.redirect("/login?e=true");
      }
    }
  } else {
    const obj = getFromCache(use);
    console.log(validatePass(use, pass, obj));
    if (validatePass(use, pass, obj) != false) {
      let url = "/dashboard?id=" + obj.id;
      res.redirect(url);
    } else {
      res.redirect("/login?e=true");
    }
  }
});

app.post("/users/signup", (req, res) => {
  const pass = req.body.password;
  const use = req.body.username;
  if (checkUsername(use)) {
    res.redirect("/signup?e=true");
  } else {
    createID(use, pass);
    res.redirect("/login");
  }
});

const app_server = app.listen(app_port, () =>
  console.log(`clsl server app listening on port ${app_port}!\n`)
);

module.exports = app_server;
