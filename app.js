const express = require("express");
const mysql = require("mysql");
const session = require("express-session");
const methodOverride = require("method-override");
const store = require("store");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "airlineReservationDB",
});

const app = express();

app.set("view engine", "ejs");
const oneDay = 1000 * 60 * 60 * 24;
app.use(
  session({
    key: "This is the session key",
    secret: "This is just s a demo",
    cookie: { maxAge: oneDay },
    resave: true,
    saveUninitialized: true,
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));

// Login and Register

app.get("/", (req, res) => {
  if (!req.session.loggedin && !store.get("userID")) res.redirect("/login");
  else {
    let id = store.get("userID");
    db.query(
      "SELECT isadmin FROM accounts WHERE id = ?",
      [id],
      (err, result) => {
        if (result.length > 0) {
          console.log(result);
          if (result[0].isadmin == 1) {
            res.render("home", { isadmin: true });
          } else res.render("home", { isadmin: false });
        }
      }
    );
  }
});

//for search flights
app.get("/search", (req, res) => {
  db.query("SELECT * FROM flights", (err, result) => {
    if (err) throw err;
    else {
      let s = [];
      let d = [];
      result.map((element) => {
        s.push(element.source);
        d.push(element.destination);
      });
      let us = [...new Set(s)];
      let ud = [...new Set(d)];
      res.render("search", { source: us, destination: ud, id: null });
    }
  });
});

app.post("/search", (req, res) => {
  const source = req.body.source;
  const destination = req.body.destination;
  const date = req.body.depDate;
  // console.log(source, destination, date)

  db.query("SELECT * FROM flights", (err, result) => {
    if (err) throw err;
    else {
      let s = [];
      let d = [];
      result.map((element) => {
        s.push(element.source);
        d.push(element.destination);
      });
      let us = [...new Set(s)];
      let ud = [...new Set(d)];

      db.query(
        "SELECT id, source, destination, seatsAvailable, DATE_FORMAT(DATE(depdate),'%Y-%m-%d') as date, TIME(depdate) as time FROM flights WHERE source = ? AND destination = ? AND depdate >= ?",
        [source, destination, date],
        (err, result) => {
          let dates = [];
          let times = [];
          let Rsource = null;
          let Rdest = null;
          let seats = [];
          let ids = [];
          if (result.length > 0) {
            result.map((element) => {
              ids.push(element.id);
              times.push(element.time);
              Rsource = source;
              Rdest = destination;
              seats.push(element.seatsAvailable);
              dates.push(element.date);
            });
          }
          // console.log(ids)
          res.render("search", {
            source: us,
            destination: ud,
            id: ids,
            time: times,
            date: dates,
            xRsource: Rsource,
            xRdest: Rdest,
            seat: seats,
          });
        }
      );
    }
  });
});

app.get("/book/:id", (req, res) => {
  console.log(req.params.id);
  db.query(
    "SELECT seatsAvailable FROM flights WHERE id = ?",
    [req.params.id],
    (err, result) => {
      console.log(result);
      if (result && result[0].seatsAvailable > 0) {
        res.render("book", { id: req.params.id, status: 1 });
      } else {
        res.render("book", { id: req.params.id, status: 0 });
      }
    }
  );
});

app.post("/book/:id", (req, res) => {
  let id = req.params.id;
  let firstname = req.body.firstname;
  let lastname = req.body.lastname;
  let age = req.body.age;
  console.log(id, firstname, lastname, age, req.session.userId);
  if (req.session.userId || store.get("userID") != null) {
    db.query(
      "INSERT INTO tickets values (null, ?, ?, ?, ?, ?)",
      [firstname, lastname, age, id, store.get("userID")],
      (err, result) => {
        if (!err) {
          db.query("SELECT LAST_INSERT_ID() as lid", (err, result) => {
            console.log(result);
            if (!err) {
              let lid = result[0].lid;
              db.query(
                "UPDATE flights SET seatsAvailable = seatsAvailable - 1 WHERE id = ? ",
                [id],
                (err, result) => {
                  if (!err) {
                    res.render("successpage", { id: id, lastid: lid });
                  } else {
                    res.redirect(`/book/${id}`);
                  }
                }
              );
            } else {
              res.redirect(`/book/${id}`);
            }
          });
        } else {
          res.redirect(`/book/${id}`);
        }
      }
    );
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  if (req.session.loggedin || store.get("userID") != null) res.redirect("/");
  else res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  console.log(username, password);
  if (username && password) {
    db.query(
      "SELECT * FROM accounts WHERE username = ? AND password = ?",
      [username, password],
      (err, result, fields) => {
        if (result.length > 0) {
          console.log(result);
          req.session.loggedin = true;
          req.session.userId = result[0].id;
          req.session.username = username;
          store.set("userID", result[0].id);
          if (result[0].isadmin == 1) store.set("isadmin", true);
          else store.set("isadmin", false);
          res.redirect("/");
        } else {
          res.render("login", { error: "Incorrect Username and/or Password!" });
        }
      }
    );
  }
});

app.get("/register", (req, res) => {
  // console.log(store.get('userID'))
  if (req.session.loggedin || store.get("userID") != null) res.redirect("/");
  else res.render("register", { error: null });
});

app.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  if (username && password) {
    db.query(
      "INSERT INTO accounts values (null, ?, ?, false)",
      [username, password],
      (err, results, fields) => {
        if (err) res.render("register", { error: "Registration Failed" });
        else res.redirect("/login");
      }
    );
  }
});

// app.get("/logout", (req, res) => {
// 	store.set("userID", null);
// 	if(store.get("userID") == null)
// 		res.redirect("/login")
// 	else
// 		res.redirect("/login")

// })

// app.post("/logout", (req, res) => {
// 	store.clearAll();
// 	res.redirect("/")
// 	res.end()
// })

// admin Pages

app.get("/admin/addflights", (req, res) => {
  if (store.get("isadmin") === true) res.render("adminAdd", {status: 2});
  else res.redirect("/");
});

app.get("/admin/viewflights", (req, res) => {
	db.query("SELECT * FROM flights", (err, result) => {
		if (store.get("isadmin") === true) res.render("adminFlights", {flights: result});
		else res.redirect("/");	
	})

})

app.post("/admin/addflights", (req, res) => {
	let source = req.body.source
	let destination = req.body.destination
	let date = req.body.depdate
	let seatsAvailable = req.body.seatsAvailable
	console.log(source, destination, date, seatsAvailable)
	db.query("INSERT INTO flights VALUES (null, ?, ?, ?, ?)", [source, destination, date, seatsAvailable], (err, results) => {
		if(!err){
			res.render("adminAdd", {status: 0})
		} else {
			res.render("adminAdd", {status: 1})
		}
	})
})

app.get("/admin/removeflights/:id", (req, res) => {
	let id = req.params.id
	db.query("DELETE FROM tickets WHERE flight = ? ", [id], (err, result) => {
		if(!err){
			db.query("DELETE FROM flights WHERE id = ? ", [id], (err,result) => {
				if(!err)
					res.redirect("/admin/viewflights")
			})
		} else {
			res.redirect("/admin/viewflights")
		}
	})
})

app.listen(3000);
