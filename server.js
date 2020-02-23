require("dotenv").config();
const express = require("express");
const path = require("path");
const apiRouter = require("./routes/api");

const app = express();

var mongoose = require("mongoose");
var dev_db_url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}?retryWrites=true&w=majority`;
var mongoDB = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/", apiRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get(/.*/, (req, res) =>
    res.sendFile(path.join(__dirname, "public/index.html"))
);

app.listen(5000, () => console.log("Server started on port 5000"));
