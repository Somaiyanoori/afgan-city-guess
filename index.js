const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = 3001;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

let userScore = 0;
let citites = [];
let hintRegion = undefined;
let hintDistrict = "";

pool.query("SELECT * FROM districts", (error, result) => {
  if (error) {
    console.error("Error while fetching cities", error);
  } else {
    citites = result.rows;
  }
});

app.get("/", (req, res) => {
  if (citites.length > 0) {
    let randomDistrict;

    if (hintRegion) {
      randomDistrict = hintDistrict;
    } else {
      const randomIndex = Math.floor(Math.random() * citites.length);
      randomDistrict = citites[randomIndex].district;
    }
    res.render("index", { randomDistrict, userScore, hintRegion });
  } else {
    res.send("شهری یافت نشد");
  }
});

app.post("/check", (req, res) => {
  const action = req.body.action;
  const userInput = req.body.cityInput;
  const district = req.body.district;
  if (action === "check") {
    pool.query(
      "SELECT province FROM districts where district = $1",
      [district],
      (err, result) => {
        if (err) {
          console.error("Something went wrong during executing query", err);
          res.status(500).send("خطا×!");
        } else {
          if (result.rows.length > 0) {
            const province = result.rows[0].province;
            hintRegion = undefined;
            if (userInput === province) {
              userScore++;
              res.redirect("/");
            } else {
              userScore--;
              if (userScore < 0) {
                res.redirect("/gameover");
              } else {
                res.redirect("/");
              }
            }
          }
        }
      }
    );
  } else if (action === "hint") {
    pool.query(
      "SELECT region FROM districts where district = $1",
      [district],
      (error, result) => {
        if (error) {
          console.error("Something went wrong during executing query", error);
          res.status(500).send("خطا×!");
        } else {
          if (result.rows.length > 0) {
            hintRegion = result.rows[0].region;
            hintDistrict = district;
            res.redirect("/");
          } else {
            res.send("Region not found");
          }
        }
      }
    );
  }
});

app.get("/gameover", (req, res) => {
  res.render("gameover");
});

app.post("/reset", (req, res) => {
  userScore = 0;
  hintRegion = undefined;
  res.redirect("/");
});
app.listen(PORT, () => {
  console.log("Server started!");
});
