import Phaser from "phaser";
import Coin from "../assets/coin.svg";
import Spaceship from "../assets/spaceship.svg";
import BulletIcon from "../assets/bullet.svg";
import Bullets from "./Bullets";
import Explosion from "../assets/explosion.png";
import ExplosionSound from "../assets/exp.m4a";
import ShotSound from "../assets/shot.mp3";
import CoinSound from "../assets/coin_collect.wav";
import Constants from "../constants";
import io from "socket.io-client";
class PlayGame extends Phaser.Scene {
  init(name) {
    // Server endpoints (dev and prod)
    if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
      this.ENDPOINT = "192.168.1.107:5000";
    } else {
      this.ENDPOINT = "https://phaser3-game-react.herokuapp.com";
    }
    console.log(this.ENDPOINT);
    this.name = name;
    this.keys = this.input.keyboard.createCursorKeys();
    this.space = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    this.score = 0;
    this.others = {}; //to store other players
    this.x = Phaser.Math.Between(50, Constants.WIDTH - 50); // random initial x,y coordinates
    this.y = Phaser.Math.Between(50, Constants.HEIGHT - 50);
  }
  preload() {
    //the sprites we need
    this.load.spritesheet("boom", Explosion, {
      frameWidth: 64,
      frameHeight: 64,
      endFrame: 23,
    });
    this.load.image("coin", Coin);
    this.load.image("ship", Spaceship);
    this.load.image("bullet", BulletIcon);
    this.load.audio("explosion", ExplosionSound);
    this.load.audio("shot", ShotSound);
    this.load.audio("coin", CoinSound);
  }
  create() {
    var config = {
      key: "explode",
      frames: this.anims.generateFrameNumbers("boom", {
        start: 0,
        end: 23,
        first: 23,
      }),
      frameRate: 20,
    };

    this.explosion_sound = this.sound.add("explosion");
    this.shot_sound = this.sound.add("shot");
    this.coin_sound = this.sound.add("coin");

    this.anims.create(config);
    this.ship = this.get_new_spaceship(
      this.x,
      this.y,
      this.score,
      this.name,
      0
    ); //Client's spaceship.
    this.socket = io(this.ENDPOINT); //connect to server.
    this.bullets = new Bullets(this);

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
        const angle = this.others[key].angle;
        const bullets = this.others[key].bullets;
        this.others[key].ship = this.get_new_spaceship(
          x,
          y,
          score,
          name,
          angle
        );
        this.others[key].bullets = this.get_enemy_bullets(bullets, key);
        this.others[key].score = score;
        this.others[key].name = name;
        this.check_for_winner(score);
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
      const angle = params.angle;
      const bullets = params.bullets;
      /*
      Either it's a new client, or an existing one with new info.
      */
      if (!(other_id in this.others)) {
        var ship = this.get_new_spaceship(other_x, other_y, score, name, angle);
        var others_bullets = this.get_enemy_bullets(bullets, other_id);
        this.others[other_id] = {
          x: other_x,
          y: other_y,
          ship: ship,
          bullets: others_bullets,
          score: score,
          name: name,
        };
      } else {
        this.others[other_id].ship.cont.x = other_x;
        this.others[other_id].ship.cont.y = other_y;
        this.others[other_id].ship.score_text.setText(`${name}: ${score}`);
        this.others[other_id].ship.ship.setAngle(angle);
        this.update_enemy_bullets(other_id, bullets);
        this.others[other_id].score = score;
        this.others[other_id].name = name;
      }
      this.check_for_winner(score);
    });

    /*
    Listen for changes in the coordinates of the coin.
    */
    this.socket.on("coin_changed", (params, callback) => {
      this.coin_sound.play();
      this.coin.x = params.coin.x;
      this.coin.y = params.coin.y;
    });

    this.socket.on("other_collision", (params, callback) => {
      const other_id = params.bullet_user_id;
      const bullet_index = params.bullet_index;
      const exploded_user_id = params.exploded_user_id;
      if (other_id === this.socket.id) {
        this.bullets.children.entries[bullet_index].set_bullet(false);
      }
      this.animate_explosion(exploded_user_id);
    });

    this.socket.on("other_shot", (p, c) => this.shot_sound.play());
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
    const ship = this.ship.ship;
    const inc = 7;
    var keys_down = "";
    if (this.keys.down.isDown && cont.active) {
      cont.y += inc;
      keys_down += "d";
    }
    if (this.keys.up.isDown && cont.active) {
      cont.y -= inc;
      keys_down += "u";
    }
    if (this.keys.right.isDown && cont.active) {
      cont.x += inc;
      keys_down += "r";
    }
    if (this.keys.left.isDown && cont.active) {
      cont.x -= inc;
      keys_down += "l";
    }
    const keys_angle = {
      u: 0,
      d: 180,
      l: 270,
      r: 90,
      ur: 45,
      ul: -45,
      dr: 135,
      dl: 225,
    };
    if (keys_down in keys_angle) {
      ship.setAngle(keys_angle[keys_down]);
    }
    if (Phaser.Input.Keyboard.JustDown(this.space)) {
      this.bullets.fireBullet(
        this.ship.cont.x,
        this.ship.cont.y - 5,
        this.ship.ship.angle,
        () => {
          this.socket.emit("shot");
          this.shot_sound.play();
        }
      );
    }
    this.emit_coordinates();
  }

  /*
  Get a new game object consisting of:
  spaceship sprite, name and score.
  */
  get_new_spaceship = (x, y, score, name, angle) => {
    var score_text = this.add.text(-30, 25, `${name}: ${score}`, {
      color: "#00ff00",
      align: "center",
      fontSize: "13px",
    });
    var ship = this.add.sprite(0, 0, "ship");
    ship.setAngle(angle);
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
      angle: this.ship.ship.angle,
      bullets: this.bullets.get_all_bullets(this.socket.id),
    });
  };

  /*
  Create coin object , and initiate a collider between the coin
  and the clients ship.
  */
  get_coin = (x, y) => {
    var coin = this.add.sprite(x, y, "coin");
    this.physics.add.existing(coin, false);
    this.physics.add.collider(coin, this.ship.ship, this.fire, null, this);
    return coin;
  };

  /*
  When a player overlaps with the coin,
  the others are notified of its new position
  by this callback.
  */
  fire = (coin) => {
    this.coin_sound.play();
    coin.x = Phaser.Math.Between(20, Constants.WIDTH - 20);
    coin.y = Phaser.Math.Between(20, Constants.HEIGHT - 20);
    this.score += 5;
    this.ship.score_text.setText(`${this.name}: ${this.score}`);
    this.socket.emit("update_coin", {
      x: coin.x,
      y: coin.y,
    });
    this.check_for_winner(this.score);
  };

  get_enemy_bullets = (bullets, id) => {
    var enemy_bullets = new Bullets(this);
    for (let i = 0; i < bullets.length; i++) {
      enemy_bullets.children.entries[i].setAngle(bullets[i].angle);
      enemy_bullets.children.entries[i].setActive(bullets[i].active);
      enemy_bullets.children.entries[i].setVisible(bullets[i].visible);
      enemy_bullets.children.entries[i].x = bullets[i].x;
      enemy_bullets.children.entries[i].y = bullets[i].y;
      this.physics.add.collider(
        enemy_bullets.children.entries[i],
        this.ship.ship,
        (bullet) => {
          if (!bullet.disabled) {
            this.emmit_collision(id, i);
            this.animate_explosion("0");
            bullet.disabled = true;
          } else {
            setTimeout(() => {
              bullet.disabled = false;
            }, 100);
          }
        },
        null,
        this
      );
    }
    return enemy_bullets;
  };

  update_enemy_bullets = (id, bullets) => {
    var bullet_sprites = this.others[id].bullets;
    for (var i = 0; i < bullets.length; i++) {
      bullet_sprites.children.entries[i].x = bullets[i].x;
      bullet_sprites.children.entries[i].y = bullets[i].y;
      bullet_sprites.children.entries[i].setAngle(bullets[i].angle);
      bullet_sprites.children.entries[i].setActive(bullets[i].active);
      bullet_sprites.children.entries[i].setVisible(bullets[i].visible);
    }
  };

  emmit_collision = (bullet_user_id, bullet_index) => {
    this.socket.emit("collision", { bullet_user_id, bullet_index });
  };

  animate_explosion = (id) => {
    var ship;
    if (id === "0") {
      ship = this.ship.cont;
      ship.setActive(false);
      this.score = Math.max(0, this.score - 2);
      this.ship.score_text.setText(`${this.name}: ${this.score}`);
      setTimeout(() => {
        ship.setActive(true);
      }, 2000);
    } else {
      ship = this.others[id].ship.cont;
    }
    var boom = this.add.sprite(ship.x, ship.y, "boom");
    boom.anims.play("explode");
    this.explosion_sound.play();
  };

  check_for_winner = (score) => {
    if (score >= 100) {
      let players = [{ name: this.name, score: this.score }];
      for (let other in this.others) {
        players.push({
          name: this.others[other].name,
          score: this.others[other].score,
        });
      }
      players = players.sort((a, b) => b.score - a.score);
      setTimeout(() => this.socket.disconnect(), 20);
      this.scene.start("winner", players);
    }
  };
}

export default PlayGame;
