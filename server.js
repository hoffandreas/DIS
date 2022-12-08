const express = require('express');
const session = require("express-session");
const app = express();
const path = require('path');
const router = express.Router();
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose();
var crypto = require('crypto');

/////////////
/////////////
/////////////
///////////// Lage fetch metode her får å oppnå kravet om asynkron programmering
/////////////
/////////////

app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'))

// Sqlite ting

const db = new sqlite3.Database('./User.sqlite3');

db.serialize(function() {
  //console.log('creating databases if they do not exist');
  db.run('create table if not exists users (userId integer primary key, username text not null, password text not null)');
});


// Tilføjer user til db
const addUserToDatabase = (username, password) => {
  db.run(
    'insert into users (username, password) values (?, ?)', 
    [username, password], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}

const getUserByUsername = (userName) => {
  // Smart måde at konvertere fra callback til promise:
  return new Promise((resolve, reject) => {  
    db.all(
      'select * from users where userName=(?)',
      [userName], 
      (err, rows) => {
        if (err) {
          console.error(err);
          return reject(err);
        }
        return resolve(rows);
      }
    );
  })
}


const hashPassword = (password) => {
  const md5sum = crypto.createHash('md5');
  const salt = 'Some salt for the hash';
  return md5sum.update(password + salt).digest('hex');
}


app.use(express.static(__dirname + '/public'))

app.use(
    session({
        secret: "Keep it secret",
        name: "uniqueSessionID",
        saveUninitialized: false,
    })
);


app.get("/", (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect("main.html");
    } else {
        return res.sendFile("/signup.html", { root: path.join(__dirname, "public") });
    }
});


// Et dashboard som kun brugere med 'loggedIn' = true i session kan se
app.get("main.html", (req, res) => {
  if (req.session.loggedIn) {
    // Her generere vi en html side med et brugernavn på (Tjek handlebars.js hvis du vil lave fancy html på server siden)
    //res.setHeader("Content-Type", "text/html");
    //res.write("Welcome " + req.session.username + " to your dashboard");
    //res.write('<a href="/logout">Logout</a>')
    //return res.end();
  } else {
    return res.redirect("/login");
  }
});



app.post("/login", bodyParser.urlencoded(), async (req, res) => {
  
  
  // Opgave 1
  // Programmer så at brugeren kan logge ind med sit brugernavn og password

  // Henter vi brugeren ud fra databasen
  const user = await getUserByUsername(req.body.username);

  if(user.length === 0) {
    console.log('no user found');
    return res.redirect("/");
  }



  // Hint: Her skal vi tjekke om brugeren findes i databasen og om passwordet er korrekt
  if (user[0].password === hashPassword(req.body.password)) {
      req.session.loggedIn = true;
      req.session.username = req.body.username;
      console.log(req.session);
      res.redirect("main.html");
  } else {
      // Sender en error 401 (unauthorized) til klienten
      return  res.sendStatus(401);
  }
});

/*
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {});
  return res.send("Thank you! Visit again");
});*/


app.get("/", (req, res) => { /////////////////
  if (req.session.loggedIn) {
      return res.redirect("/main.html");
  } else {
      return res.sendFile("/signup.html", { root: path.join(__dirname, "public") });
  }
});

app.post("/signup", bodyParser.urlencoded(), async (req, res) => {
  const user = await getUserByUsername(req.body.username)
  if (user.length > 0) {
    return res.send('Username already exists');
  }

  // Opgave 2
  // Brug funktionen hashPassword til at kryptere passwords (husk både at hash ved signup og login!)
  addUserToDatabase(req.body.username, hashPassword(req.body.password));
  res.redirect('login.html');
})  
  

//add the router
app.use('/', router);
app.listen(process.env.port || 3000);
console.log('Running at Port 3000');

