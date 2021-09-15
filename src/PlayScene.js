import Phaser from "phaser";

class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
  }

  create() {
    this.isGameRunning = false;
    this.respawnTime = 0;
    this.gameSpeed = 10;
    this.score = 0;

    const { height, width } = this.game.config;

    //사운드
    this.jumpSound = this.sound.add("jump", { volume: 0.2 });
    this.hitSound = this.sound.add("hit", { volume: 0.2 });
    this.reachSound = this.sound.add("reach", { volume: 0.2 });

    //game 시작 점프
    this.startTrigger = this.physics.add
      .sprite(0, 10)
      .setOrigin(0, 1)
      .setImmovable();

    //background
    this.ground = this.add
      .tileSprite(0, height, 88, 26, "ground")
      .setOrigin(0, 1);

    //dino
    this.dino = this.physics.add
      .sprite(0, height, "dino-idle")
      .setCollideWorldBounds(true)
      .setGravityY(5000)
      .setBodySize(44, 92)
      .setDepth(1)
      .setOrigin(0, 1);

    //score
    this.scoreText = this.add
      .text(width, 0, "00000", {
        fill: "#535353",
        font: "900 35px Courier",
        resolution: 5,
      })
      .setOrigin(1, 0)
      .setAlpha(0);

    //high scoer
    this.highScoreText = this.add
      .text(width, 0, "00000", {
        fill: "#535353",
        font: "900 35px Courier",
        resolution: 5,
      })
      .setOrigin(1, 0)
      .setAlpha(0);

    //게임 오버시 뜨는 창
    this.gameOverScreen = this.add
      .container(width / 2, height / 2 - 50)
      .setAlpha(0);
    this.gameOverText = this.add.image(0, 0, "game-over");
    this.restart = this.add.image(0, 80, "restart").setInteractive();
    this.gameOverScreen.add([this.gameOverText, this.restart]);

    //게임에 나오는 구름
    this.environment = this.add.group();
    this.environment.addMultiple([
      this.add.image(width / 2, 170, "cloud"),
      this.add.image(width - 88, 80, "cloud"),
      this.add.image(width / 1.3, 180, "cloud"),
    ]);
    this.environment.setAlpha(0);

    this.obsticles = this.physics.add.group();

    this.initAnims();
    this.initColliders();
    this.initStartTrigger();
    this.createControll();
    this.handleScore();
  }

  //장애물에 부딪혔을 때
  initColliders() {
    this.physics.add.collider(
      this.dino,
      this.obsticles,
      () => {
        this.highScoreText.x = this.scoreText.x - this.scoreText.width - 20;

        //최고기록
        const highScore = this.highScoreText.text.substr(
          this.highScoreText.text.length - 5
        );
        const newScore =
          Number(this.scoreText.text) > Number(highScore)
            ? this.scoreText.text
            : highScore;

        this.highScoreText.setText("최고기록" + newScore);
        this.highScoreText.setAlpha(1);

        this.physics.pause();
        this.isGameRunning = false;
        this.anims.pauseAll();
        this.dino.setTexture("dino-hurt");
        this.respawnTime = 0;
        this.gameSpeed = 10;
        this.gameOverScreen.setAlpha(1);
        this.score = 0;
        this.hitSound.play();
      },
      null,
      this
    );
  }

  //game 시작 점프
  initStartTrigger() {
    const { width, height } = this.game.config;
    this.physics.add.overlap(
      this.startTrigger,
      this.dino,
      () => {
        if (this.startTrigger.y === 10) {
          this.startTrigger.body.reset(0, height);
          return;
        }

        this.startTrigger.disableBody(true, true);

        // 스페이스바 누르면 땅이 길어지고 점수판이 나오며 게임이 시작
        const startEvent = this.time.addEvent({
          delay: 1000 / 60,
          loop: true,
          callbackScope: this,
          callback: () => {
            this.dino.setVelocityX(60);
            this.dino.play("dino-run", 1);

            if (this.ground.width < width) {
              this.ground.width += 17 * 2;
            }

            if (this.ground.width >= 1000) {
              this.ground.width = width;
              this.isGameRunning = true;
              this.dino.setVelocityX(0);
              this.scoreText.setAlpha(1);
              this.environment.setAlpha(1);
              startEvent.remove();
            }
          },
        });
      },
      null,
      this
    );
  }

  // dino가 뛰는 Animation
  initAnims() {
    this.anims.create({
      key: "dino-run",
      frames: this.anims.generateFrameNumbers("dino", {
        start: 2,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "dino-down-anim",
      frames: this.anims.generateFrameNumbers("dino-down", {
        start: 0,
        end: 1,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "enemy-dino-fly",
      frames: this.anims.generateFrameNumbers("enemy-bird", {
        start: 0,
        end: 1,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  //점수 오르기
  handleScore() {
    this.time.addEvent({
      delay: 1000 / 10,
      loop: true,
      callbackScope: this,
      callback: () => {
        if (!this.isGameRunning) {
          return;
        }

        this.score++;
        this.gameSpeed += 0.001;

        if (this.score % 100 === 0) {
          this.reachSound.play();
          this.tweens.add({
            targets: this.scoreText,
            duration: 100,
            repeat: 3,
            alpha: 0,
            yoyo: true,
          });
        }

        const score = Array.from(String(this.score), Number);
        for (let i = 0; i < 5 - String(this.score).length; i++) {
          score.unshift(0);
        }
        this.scoreText.setText(score.join(""));
      },
    });
  }

  //각족 컨트롤
  createControll() {
    //게임 재시작 클릭 이벤트
    this.restart.on("pointerdown", () => {
      this.dino.setVelocityY(0);
      this.dino.body.height = 92;
      this.dino.body.offset.y = 0;
      this.physics.resume();
      this.obsticles.clear(true, true);
      this.isGameRunning = true;
      this.gameOverScreen.setAlpha(0);
      this.anims.resumeAll();
    });

    //Space 누를시 점프
    this.input.keyboard.on("keydown_SPACE", () => {
      if (!this.dino.body.onFloor() || this.dino.body.velocity.x > 0) {
        return;
      }
      this.dino.body.height = 92;
      this.dino.body.offset.y = 0;
      this.dino.setVelocityY(-1600);
      this.jumpSound.play();
      this.dino.setTexture("dino", 0);
    });

    //Down키 누를시 수그리기
    this.input.keyboard.on("keydown_DOWN", () => {
      if (!this.dino.body.onFloor() || !this.isGameRunning) {
        return;
      }

      this.dino.body.height = 58;
      this.dino.body.offset.y = 34;
    });

    //Down키 놓았을때 원상복귀
    this.input.keyboard.on("keyup_DOWN", () => {
      this.dino.body.height = 92;
      this.dino.body.offset.y = 0;
    });
  }

  //장애물 만들기
  placeObsticle() {
    const { width, height } = this.game.config;
    const obsticleNum = Math.floor(Math.random() * 7) + 1;
    const distance = Phaser.Math.Between(600, 900);
    let obsticle;

    if (obsticleNum > 6) {
      const enemyHeight = [20, 50];
      obsticle = this.obsticles.create(
        width + distance,
        height - enemyHeight[Math.floor(Math.random() * 2)],
        "enemy-bird"
      );
      obsticle.play("enemy-dino-fly", 1);
      obsticle.body.height = obsticle.body.height / 1.5;
    } else {
      obsticle = this.obsticles.create(
        width + distance,
        height,
        `obsticle-${obsticleNum}`
      );
      obsticle.body.offset.y = +10;
    }

    obsticle.setOrigin(0, 1).setImmovable();
  }

  //60fps 게임진행에 따라 변경 사항
  update(time, delta) {
    if (!this.isGameRunning) {
      return;
    }

    //background가 게임스피드에 맞춰 움직임
    this.ground.tilePositionX += this.gameSpeed;

    Phaser.Actions.IncX(this.obsticles.getChildren(), -this.gameSpeed); // 장애물
    Phaser.Actions.IncX(this.environment.getChildren(), -1.5); // 구름

    this.respawnTime += delta * this.gameSpeed * 0.1; // 장애물 나오는 시간 조정

    if (this.respawnTime >= 1500) {
      this.placeObsticle();
      this.respawnTime = 0;
    }

    //지나간 장애물 없애기
    this.obsticles.getChildren().forEach((obsticle) => {
      if (obsticle.getBounds().right < 0) {
        obsticle.destroy();
      }
    });

    //구름이 걔속 나오도록 하는것
    this.environment.getChildren().forEach((env) => {
      if (env.getBounds().right < 0) {
        env.x = this.game.config.width + 30;
      }
    });

    if (this.dino.body.deltaAbsY() > 0) {
      this.dino.anims.stop();
      this.dino.setTexture("dino", 0);
    } else {
      this.dino.body.height <= 58
        ? this.dino.play("dino-down-anim", true) // dino 수그리기 모션
        : this.dino.play("dino-run", true); // dino 뛰는 모션
    }
  }
}

export default PlayScene;
