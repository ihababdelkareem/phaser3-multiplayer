import Phaser from "phaser";
import Constants from "../constants";
export default class Welcome extends Phaser.Scene {

    /*
    Register allowed keys
    */
  init() {
    var alpha = "abcdefghijklmnopqrstuvwxyz".split("").join(",");
    this.keys = this.input.keyboard.addKeys(alpha);
    this.backspace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.BACKSPACE
    );
    this.enter = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
  }


    /*
    Render text
    */
  create() {
    this.welcome_text = `Welcome, enter your name\n\n`;
    this.text = this.add.text(Constants.WIDTH/2, Constants.HEIGHT/2, this.welcome_text, {
      color: "#00ff00",
      align: "center",
      fontSize: "30px",
    });
    this.text.setOrigin(0.5);
    this.name = "";
  }

    /*
    Poll for keyboard keys to display name, and for enter to go to game scene.
    */
  update() {
    for (const key of Object.keys(this.keys)) {
      if (Phaser.Input.Keyboard.JustDown(this.keys[key])) {
        if (this.name.length < 15) {
          this.name += key;
        }
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.backspace)) {
      this.name = this.name.substring(0, this.name.length - 1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.enter)) {
      this.scene.start("playgame", this.name);
    }
    this.text.setText(this.welcome_text + this.name);
  }
}
