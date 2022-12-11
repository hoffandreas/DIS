const express = require('express');
const session = require("express-session");
const app = express();
const path = require('path');
const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3').verbose();
const server = require("http").createServer(app);
var crypto = require('crypto');
const db = new sqlite3.Database('./User.sqlite3');

app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'))

app.use(
    session({
        secret: "Keep it secret",
        name: "uniqueSessionID",
        saveUninitialized: false,
    })
);


// socket IO ting
var io = require("socket.io")(server, {
  /* Handling CORS: https://socket.io/docs/v3/handling-cors/ for ngrok.io */
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


//Hashing av passord//

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS brukere (brukerId INTEGER PRIMARY KEY, brukernavn TEXT NOT NULL, password NOT NULL)');
});


// Tilføjer user til db
const addUserToDatabase = (brukernavn, password) => {
  db.run(
    'INSERT INTO brukere (brukernavn, password) VALUES (?, ?)', 
    [brukernavn, password], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}

const getUserByUsername = (brukernavn) => {
  // Smart måde at konvertere fra callback til promise:
  return new Promise((resolve, reject) => {  
    db.all(
      'SELECT * FROM brukere WHERE brukernavn=(?)',
      [brukernavn], 
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
  const user = await getUserByUsername(req.body.brukernavn);

  if(user.length === 0) {
    console.log('no user found');
    return res.redirect("/");
  }



  // Hint: Her skal vi tjekke om brugeren findes i databasen og om passwordet er korrekt
  if (user[0].password === hashPassword(req.body.password)) {
      req.session.loggedIn = true;
      req.session.brukernavn = req.body.brukernavn;
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
  const user = await getUserByUsername(req.body.brukernavn)
  if (user.length > 0) {
    return res.send('Username already exists');
  }

  // Opgave 2
  // Brug funktionen hashPassword til at kryptere passwords (husk både at hash ved signup og login!)
  addUserToDatabase(req.body.brukernavn, hashPassword(req.body.password));
  res.redirect('login.html');
})  


server.listen(process.env.port || 3000);
console.log('Running at Port 3000');