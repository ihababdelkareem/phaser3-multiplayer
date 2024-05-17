/*
A sprite-group based class , to manage a bullet store to use for each spaceship
*/
import Phaser from "phaser";
import Bullet from "./Bullet";
export default class Bullets extends Phaser.Physics.Arcade.Group {
  constructor(scene) {
    super(scene.physics.world, scene);
    this.disabled = false;
    this.createMultiple({
      frameQuantity: 2,
      key: "bullet",
      active: false,
      visible: false,
      classType: Bullet,
    });
  }

  fireBullet(x, y, angle, shot_fired) {
    let bullet = this.getFirstDead(false);
    if (bullet) {
      bullet.fire(x, y, angle);
      shot_fired();
    }
  }

  get_all_bullets() {
    return this.children.entries.map((bullet) => {
      return {
        x: bullet.x,
        y: bullet.y,
        angle: bullet.angle,
        active: bullet.active,
        visible: bullet.visible,
      };
    });
  }
}
