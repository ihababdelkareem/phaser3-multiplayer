import Phaser from "phaser";
import Coin from "../assets/coin.svg";
import Spaceship from "../assets/spaceship.svg";
import io from "socket.io-client";
class PlayGame extends Phaser.Scene {
  init(name) {
    // Server endpoints (dev and prod)
    if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
      this.ENDPOINT = "localhost:5000";
    } else {
      this.ENDPOINT = "https://phaser3-game-react.herokuapp.com";
    }
    console.log(this.ENDPOINT);
    this.name = name;
    this.keys = this.input.keyboard.createCursorKeys();
    this.score = 0;
    this.others = {}; //to store other players
    this.x = Phaser.Math.Between(50, 750); // random initial x,y coordinates
    this.y = Phaser.Math.Between(50, 550);
  }
  preload() {
    //the sprites we need
    this.load.image("coin", Coin);
    this.load.image("ship", Spaceship);
  }
  create() {
    this.ship = this.get_new_spaceship(this.x, this.y, this.score, this.name); //Client's spaceship.
    this.socket = io(this.ENDPOINT); //connect to server.

    /*
    This is recieved once for each new user, the user gets their id,
    and a map of all other user objects.
    */
    this.socket.on("to_new_user", (params, callback) => {
      this.id = params.id;
      this.others = params.others;
      /*
      Render the spaceships of all other users, and coin object.
      */
      for (const key of Object.keys(this.others)) {
        const x = this.others[key].x;
        const y = this.others[key].y;
        const score = this.others[key].score;
        const name = this.others[key].name;
        this.others[key].ship = this.get_new_spaceship(x, y, score, name);
      }
      this.coin = this.get_coin(params.coin.x, params.coin.y);
      /*
      Update server with coordinates.
      */
      this.emit_coordinates();
    });

    /*
    Listen to server for updates on other users.
    */
    this.socket.on("to_others", (params, callback) => {
      const other_id = params.id;
      const other_x = params.x;
      const other_y = params.y;
      const score = params.score;
      const name = params.name;
      /*
      Either it's a new client, or an existing one with new info.
      */
      if (!(other_id in this.others)) {
        var ship = this.get_new_spaceship(other_x, other_y, score, name);
        this.others[other_id] = { x: other_x, y: other_y, ship: ship };
      } else {
        this.others[other_id].ship.cont.x = other_x;
        this.others[other_id].ship.cont.y = other_y;
        this.others[other_id].ship.score_text.setText(`${name}: ${score}`);
      }
    });

    /*
    Listen for changes in the coordinates of the coin.
    */
    this.socket.on("coin_changed", (params, callback) => {
      this.coin.x = params.coin.x;
      this.coin.y = params.coin.y;
    });

    /*
    Listen for disconnections of others.
    */
    this.socket.on("user_disconnected", (params, callback) => {
      this.others[params.id].ship.score_text.destroy();
      this.others[params.id].ship.ship.destroy();
      this.others[params.id].ship.cont.destroy();
      delete this.others[params.id];
    });
  }

  /*
  Poll for arrow keys to move the spaceship.
  */
  update() {
    const cont = this.ship.cont;
    if (this.keys.down.isDown) {
      cont.y += 10;
      this.emit_coordinates();
    }
    if (this.keys.up.isDown) {
      cont.y -= 10;
      this.emit_coordinates();
    }
    if (this.keys.right.isDown) {
      cont.x += 10;
      this.emit_coordinates();
    }
    if (this.keys.left.isDown) {
      cont.x -= 10;
      this.emit_coordinates();
    }
  }

  /*
  Get a new game object consisting of:
  spaceship sprite, name and score.
  */
  get_new_spaceship = (x, y, score, name) => {
    var score_text = this.add.text(-30, 25, `${name}: ${score}`, {
      color: "#00ff00",
      align: "center",
      fontSize: "13px",
    });
    var ship = this.add.sprite(0, 0, "ship");
    var cont = this.add.container(x, y, [ship, score_text]);
    cont.setSize(45, 45);
    this.physics.add.existing(cont, false);
    this.physics.add.existing(ship, false);
    cont.body.setCollideWorldBounds(true);
    return { score_text, ship, cont };
  };

  /*
  Upon movement, inform the server of new coordinates.
  */
  emit_coordinates = () => {
    this.socket.emit("update_coordinates", {
      x: this.ship.cont.x,
      y: this.ship.cont.y,
      score: this.score,
      name: this.name,
    });
  };

  /*
  Create coin object , and initiate a collider between the coin
  and the clients ship.
  */
  get_coin = (x, y) => {
    var coin = this.add.sprite(x, y, "coin");
    this.physics.add.existing(coin, false);
    this.physics.add.collider(coin, this.ship.cont, this.fire, null, this);
    return coin;
  };

  /*
  When a player overlaps with the coin,
  the others are notified of its new position
  by this callback.
  */
  fire = (coin) => {
    coin.x = Phaser.Math.Between(20, 780);
    coin.y = Phaser.Math.Between(20, 580);
    this.score += 5;
    this.ship.score_text.setText(`${this.name}: ${this.score}`);
    this.socket.emit("update_coin", {
      x: coin.x,
      y: coin.y,
    });
  };
}

export default PlayGame;
