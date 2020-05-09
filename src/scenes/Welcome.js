import Phaser from "phaser";
export default class Welcome extends Phaser.Scene {
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
  create() {
    this.welcome_text = `Welcome, enter your name\n\n`;
    this.text = this.add.text(450, 250, this.welcome_text, {
      color: "#00ff00",
      align: "center",
      fontSize: "20px",
    });
    this.name = "";
  }
  update() {
    /*
    Poll for keyboard keys to display name, and for enter to go to game scene.
    */
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
