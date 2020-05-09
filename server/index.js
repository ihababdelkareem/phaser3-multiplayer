var { Constants } = require("./constants");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const io = socketio(server);
app.use(cors());
app.use(express.static("build"));
const getRndInteger = (min, max) =>
  Math.floor(Math.random() * (max - min)) + min;
var numberOfConnectedUsers = 0;
var coin = { x: getRndInteger(50, Constants.WIDTH), y: getRndInteger(50, 550) };
var all_users = {}; //store user info, maps socket_id -> user object.
io.on("connect", (socket) => {
  numberOfConnectedUsers++;
  /*
  Give each new user an ID , coin position, and info on
  the remaining users.
  */
  socket.emit("to_new_user", {
    id: socket.id,
    coin: coin,
    others: all_users,
  });

  /*
  When a user updates their info, broadcast their 
  new location to the others.
  */
  socket.on("update_coordinates", (params, callback) => {
    const x = params.x;
    const y = params.y;
    const score = params.score;
    const name = params.name;
    const angle = params.angle;
    const bullets = params.bullets;
    all_users[socket.id] = { x, y, score, name, bullets, angle };
    socket.broadcast.emit("to_others", {
      id: socket.id,
      score: score,
      x: x,
      y: y,
      name: name,
      bullets: bullets,
      angle: angle,
    });
  });

  socket.on("shot", (p, c) => socket.broadcast.emit("other_shot"));

  /*
  When a user collects the coin, let the others
  know of its new position.
  */
  socket.on("update_coin", (params, callback) => {
    coin = { x: params.x, y: params.y };
    socket.broadcast.emit("coin_changed", {
      coin,
    });
  });

  socket.on("collision", (params, callback) => {
    socket.broadcast.emit("other_collision", {
      bullet_user_id: params.bullet_user_id,
      bullet_index: params.bullet_index,
      exploded_user_id: socket.id,
    });
  });

  /*
  When a user disconnects, remove them from server memory,
  and broadcast their disconnection to the others.
  */
  socket.on("disconnect", () => {
    numberOfConnectedUsers--;
    socket.broadcast.emit("user_disconnected", {
      id: socket.id,
    });
    delete all_users[socket.id];
  });
});
app.get("/", (req, res) => res.send(""));
server.listen(process.env.PORT || 5000, () =>
  console.log(`Server has started.`)
);
