import Phaser from "phaser";
export default class Winner extends Phaser.Scene {
  init(players) {
    this.players = players;
    this.enter = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
  }
  create() {
    this.winner_text = `Winner is ${this.players[0].name}\n\nScoreboard:\n--------------------\n`;
    for (let p in this.players) {
      this.winner_text += `${this.players[p].name}: ${this.players[p].score}\n`;
    }
    this.winner_text += "\n\nPress Enter to play again";
    this.text = this.add.text(450, 50, this.winner_text, {
      color: "#00ff00",
      align: "center",
      fontSize: "20px",
    });
  }
  update() {
    if (this.enter.isDown) {
      this.scene.start("playgame");
    }
    /*
    Poll for keyboard keys to display name, and for enter to go to game scene.
    */
  }
}
