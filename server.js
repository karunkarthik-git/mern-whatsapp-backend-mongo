//importing
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "pusher";
import cors from "cors";
import { hello } from "./module.js";
//app config
const app = express();

const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: "1075385",
  key: "52a265f594e050c24a5e",
  secret: "secret from pusher",
  cluster: "ap2",
  encrypted: true,
});

let val = hello();

//middleware
app.use(express.json());
app.use(cors());

//DB config

mongoose.connect(val, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once("open", () => {
  console.log("DB Connected");

  const msgCollection = db.collection("messagecontents");
  const changeStream = msgCollection.watch();

  changeStream.on("change", (change) => {
    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Error triggering Pusher");
    }
  });
});

//api routes
app.get("/", (req, res) => res.status(200).send("Hello world"));

app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(`New message created: \n ${data}`);
    }
  });
});

//listener
app.listen(port, () => console.log(`Listening on localhost: ${port}`));
