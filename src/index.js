import ReactDOM from "react-dom";
import "./index.css";
import Phaser from "phaser";
import PlayGame from "./scenes/PlayGame";
import Welcome from "./scenes/Welcome";
import Winner from "./scenes/Winner";
import Constants from "./constants";
export const config = {
  type: Phaser.AUTO,
  width: Constants.WIDTH,
  height: Constants.HEIGHT,
  physics: { default: "arcade" },
  backgroundColor: "#202830",
};

const game = new Phaser.Game(config);
game.scene.add("playgame", PlayGame);
game.scene.add("welcome", Welcome);
game.scene.add("winner", Winner);
game.scene.start("welcome");

ReactDOM.render(null, document.getElementById("root"));
