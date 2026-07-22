// ============================================================
// Week 6 Side Quest — SAVE THE SPIDERS (REMIX EDITION)
// ============================================================

// ------------------------------------------------------------
// WORLD
// ------------------------------------------------------------
const WORLD_LENGTH = 1500;
const SCROLL_SPEED = 2.0;
let scrollY = 0;

// ------------------------------------------------------------
// PLAYER CONFIGURATION
// ------------------------------------------------------------
const PLAYER_SPEED = 6;
const BULLET_SPEED = 18;
const SHOOT_COOLDOWN = 12;
const INVINCIBLE_FRAMES = 90;

// ------------------------------------------------------------
// ENEMY CONFIGURATION
// ------------------------------------------------------------
const ENEMY_SPAWN_RATE = 70;
const MAX_ENEMIES = 8;
let spawnTimer = 0;

// ------------------------------------------------------------
// DATA & ASSETS
// ------------------------------------------------------------
let obstacleData;
let obstacles = [];
let safeZones = [];
let antCollectibles = [];

// Visual Assets
let bgImage;
let playerSheet;
let enemySheet;
let antImg;
let safeWebImg;
let shieldImg;

// Sound Assets
let music;
let shootSound;
let hitSound;
let winSound;
let eatSound;
let shieldSound;

// Timers
let gameTimer = 0;
let startTime = 0;

// ------------------------------------------------------------
// SPRITE SHEET CONFIGURATIONS
// ------------------------------------------------------------
const PLAYER_SPRITE = {
  frameWidth: 80,
  frameHeight: 64,
  numFrames: 3,
  animSpeed: 0.15,
};

const ENEMY_SPRITE = {
  frameWidth: 64,
  frameHeight: 64,
  numFrames: 4,
  animSpeed: 0.1,
};

// ------------------------------------------------------------
// STATE ENTITIES
// ------------------------------------------------------------
let player = {
  x: 400,
  y: 370,
  r: 22,
  currentFrame: 0,
  direction: { x: 0, y: -1 },
  shootTimer: 0,
  health: 8,
  maxHealth: 8,
  invincible: false,
  invincibleTimer: 0,
  bounceVX: 0,
  bounceVY: 0,
  hasShield: true, // 1 shield use per game
  shieldActive: false, // Active invincibility flag
  shieldTimer: 0, // Duration of active shield
};

let bullets = [];
let enemies = [];

let score = 0;
const STATE_START = "start";
const STATE_PLAY = "play";
const STATE_WIN = "win";
const STATE_OVER = "over";
let gameState = STATE_START;

// ============================================================
// preload()
// ============================================================
function preload() {
  console.log("Preload starting...");

  try {
    obstacleData = loadJSON("data/obstacles.json");
    console.log("✓ Loaded obstacles.json");
  } catch (e) {
    console.error("Failed to load obstacles.json:", e);
    obstacleData = { obstacles: [], safeZones: [], ants: [] };
  }

  // Load root theme assets
  bgImage = loadImage("assets/images/background.jpg");
  playerSheet = loadImage("assets/images/spider.png");
  enemySheet = loadImage("assets/images/enemy-owl.png");

  // New Remix Image Assets
  antImg = loadImage("assets/images/ant.png");
  safeWebImg = loadImage("assets/images/web-safespot.png");
  shieldImg = loadImage("assets/images/shield-icon.png");

  // Audio Assets
  music = loadSound("assets/audio/background-audio.mp3");
  shootSound = loadSound("assets/audio/shoot.mp3");
  hitSound = loadSound("assets/audio/hit.mp3");
  winSound = loadSound("assets/audio/win.mp3");
  eatSound = loadSound("assets/audio/eat.mp3");
  shieldSound = loadSound("assets/audio/shield.mp3");

  console.log("Preload complete!");
}

// ============================================================
// setup()
// ============================================================
function setup() {
  createCanvas(800, 450);

  // Initialize Obstacles
  if (
    obstacleData &&
    obstacleData.obstacles &&
    Array.isArray(obstacleData.obstacles)
  ) {
    for (let i = 0; i < obstacleData.obstacles.length; i++) {
      let o = obstacleData.obstacles[i];
      obstacles.push({
        x: o.x || 200,
        worldY: o.worldY || -300,
        size: o.size || 50,
      });
    }
  }

  // Initialize Safe Zones
  if (
    obstacleData &&
    obstacleData.safeZones &&
    Array.isArray(obstacleData.safeZones)
  ) {
    safeZones = obstacleData.safeZones;
  }

  // Initialize Ants
  if (obstacleData && obstacleData.ants && Array.isArray(obstacleData.ants)) {
    antCollectibles = obstacleData.ants.map((a) => ({
      ...a,
      collected: false,
    }));
  }
}

// ============================================================
// draw()
// ============================================================
function draw() {
  background(15, 15, 25);

  if (gameState === STATE_START) {
    drawStartScreen();
  } else if (gameState === STATE_PLAY) {
    gameTimer = floor((millis() - startTime) / 1000);

    scrollWorld();
    drawBackground();
    drawSafeZones();
    drawObstacles();
    updateAndDrawAnts();
    handleInput();
    applyBounce();
    updateBullets();
    updateEnemies();
    spawnEnemies();
    checkBulletEnemyCollisions();
    checkEnemyPlayerCollision();
    checkObstaclePlayerCollision();
    updateInvincibility();
    checkLevelComplete();
    drawEnemies();
    drawBullets();
    drawPlayer();
    drawHUD();
  } else if (gameState === STATE_WIN) {
    drawWinScreen();
  } else if (gameState === STATE_OVER) {
    drawGameOver();
  }
}

function drawStartScreen() {
  background(20, 20, 35);
  fill(150, 100, 220);
  textAlign(CENTER, CENTER);
  textSize(36);
  text("SAVE THE SPIDERS FROM THE OWLS", width / 2, height / 2 - 40);

  fill(255);
  textSize(18);
  text(
    "Click Anywhere on Canvas to Start Playing!",
    width / 2,
    height / 2 + 10,
  );

  fill(140);
  textSize(13);
  textFont("monospace");
  text(
    "WASD / Arrows to Move • Spacebar to Shoot\nPress [E] or [Shift] for Web Shield",
    width / 2,
    height / 2 + 65,
  );
}

function mousePressed() {
  if (gameState === STATE_START) {
    gameState = STATE_PLAY;
    startTime = millis();
    if (music && typeof music.loop === "function") {
      try {
        userStartAudio();
        music.loop();
        music.setVolume(0.3);
      } catch (e) {
        console.log("Audio Context initialized cleanly.");
      }
    }
  }
}

function scrollWorld() {
  if (scrollY < WORLD_LENGTH) {
    scrollY += SCROLL_SPEED;
  }
}

function drawBackground() {
  if (bgImage && bgImage.width > 1) {
    let bgScale = 3;
    let scaledWidth = width * bgScale;
    let scaledHeight = height * bgScale;
    let bgY = (-scrollY * 0.5) % scaledHeight;
    if (bgY > 0) bgY -= scaledHeight;

    image(bgImage, 0, bgY, scaledWidth, scaledHeight);
    image(bgImage, 0, bgY + scaledHeight, scaledWidth, scaledHeight);
  }
  noStroke();
}

function drawSafeZones() {
  for (let zone of safeZones) {
    let screenY = zone.worldY + scrollY;
    if (screenY < -zone.radius || screenY > height + zone.radius) continue;

    push();
    imageMode(CENTER);
    if (safeWebImg && safeWebImg.width > 1) {
      tint(255, 255, 255, 220);
      image(safeWebImg, zone.x, screenY, zone.radius * 2, zone.radius * 2);
      noTint();
    } else {
      fill(255, 255, 255, 160);
      stroke(255, 255, 255, 220);
      strokeWeight(2);
      circle(zone.x, screenY, zone.radius * 2);
      noStroke();
      fill(255, 255, 255, 80);
      circle(zone.x, screenY, zone.radius * 1.4);
    }
    pop();
  }
}

function isPlayerInSafeZone() {
  for (let zone of safeZones) {
    let screenY = zone.worldY + scrollY;
    let d = dist(player.x, player.y, zone.x, screenY);
    if (d < zone.radius) {
      return true;
    }
  }
  return false;
}

function updateAndDrawAnts() {
  for (let ant of antCollectibles) {
    if (ant.collected) continue;

    let screenY = ant.worldY + scrollY;
    if (screenY < -30 || screenY > height + 30) continue;

    push();
    noStroke();
    let glowSize = 40 + sin(frameCount * 0.15) * 6;
    fill(255, 220, 120, 120);
    ellipse(ant.x, screenY, glowSize);
    fill(255, 255, 180, 200);
    ellipse(ant.x, screenY, glowSize * 0.65);

    imageMode(CENTER);
    if (antImg && antImg.width > 1) {
      tint(255, 255, 255, 255);
      image(antImg, ant.x, screenY, 30, 30);
      noTint();
    } else {
      fill(255, 200, 80);
      circle(ant.x, screenY, 16);
    }
    pop();

    let d = dist(player.x, player.y, ant.x, screenY);
    if (d < player.r + 15) {
      ant.collected = true;
      player.health = min(player.maxHealth, player.health + 2);
      if (eatSound) eatSound.play();
    }
  }
}

function drawObstacles() {
  for (let i = 0; i < obstacles.length; i++) {
    let o = obstacles[i];
    let screenY = o.worldY + scrollY;

    if (screenY < -o.size || screenY > height + o.size) continue;

    let x = o.x - o.size / 2;
    let y = screenY - o.size / 2;
    let s = o.size;

    push();
    let glow = map(sin(frameCount * 0.04 + i), -1, 1, 30, 85);
    noStroke();
    fill(100, 90, 80, glow);
    rect(x - 6, y - 6, s + 12, s + 12, 6);

    fill(140, 130, 120);
    rect(x, y, s, s, 4);

    fill(110, 100, 90);
    circle(x + s * 0.3, y + s * 0.3, s * 0.25);
    circle(x + s * 0.7, y + s * 0.4, s * 0.2);
    circle(x + s * 0.5, y + s * 0.7, s * 0.22);

    stroke(80, 70, 60);
    strokeWeight(1.5);
    line(x + s * 0.2, y + s * 0.5, x + s * 0.8, y + s * 0.5);
    noStroke();
    pop();
  }
}

function checkObstaclePlayerCollision() {
  if (player.invincible || player.shieldActive) return;

  for (let i = 0; i < obstacles.length; i++) {
    let o = obstacles[i];
    let screenY = o.worldY + scrollY;

    if (screenY < -o.size || screenY > height + o.size) continue;

    let closestX = constrain(player.x, o.x - o.size / 2, o.x + o.size / 2);
    let closestY = constrain(
      player.y,
      screenY - o.size / 2,
      screenY + o.size / 2,
    );
    let d = dist(player.x, player.y, closestX, closestY);

    if (d < player.r) {
      player.health -= 2;
      player.invincible = true;
      player.invincibleTimer = INVINCIBLE_FRAMES;
      if (hitSound) hitSound.play();

      let dx = player.x - o.x;
      let dy = player.y - screenY;
      let len = dist(0, 0, dx, dy);
      if (len > 0) {
        player.bounceVX = (dx / len) * 8;
        player.bounceVY = (dy / len) * 8;
      }

      if (player.health <= 0) {
        gameState = STATE_OVER;
        if (music) music.stop();
      }
      break;
    }
  }
}

function applyBounce() {
  if (abs(player.bounceVX) > 0.1 || abs(player.bounceVY) > 0.1) {
    player.x += player.bounceVX;
    player.y += player.bounceVY;
    player.bounceVX *= 0.75;
    player.bounceVY *= 0.75;

    player.x = constrain(player.x, player.r, width - player.r);
    player.y = constrain(player.y, 70 + player.r, height - player.r);
  }
}

function handleInput() {
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) {
    player.y -= PLAYER_SPEED;
    player.direction = { x: 0, y: -1 };
  }
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) {
    player.y += PLAYER_SPEED;
    player.direction = { x: 0, y: 1 };
  }
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) {
    player.x -= PLAYER_SPEED;
    player.direction = { x: -1, y: 0 };
  }
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) {
    player.x += PLAYER_SPEED;
    player.direction = { x: 1, y: 0 };
  }

  player.x = constrain(player.x, player.r, width - player.r);
  player.y = constrain(player.y, 70 + player.r, height - player.r);

  if (player.shootTimer > 0) player.shootTimer--;

  if (keyIsDown(32) && player.shootTimer === 0) {
    bullets.push({
      x: player.x + player.direction.x * (player.r + 4),
      y: player.y + player.direction.y * (player.r + 4),
      vx: player.direction.x * BULLET_SPEED,
      vy: player.direction.y * BULLET_SPEED,
    });
    player.shootTimer = SHOOT_COOLDOWN;
    if (shootSound) shootSound.play();
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].x += bullets[i].vx;
    bullets[i].y += bullets[i].vy;

    if (
      bullets[i].x < 0 ||
      bullets[i].x > width ||
      bullets[i].y < 0 ||
      bullets[i].y > height
    ) {
      bullets.splice(i, 1);
    }
  }
}

function spawnEnemies() {
  if (enemies.length >= MAX_ENEMIES) return;

  spawnTimer++;
  if (spawnTimer < ENEMY_SPAWN_RATE) return;
  spawnTimer = 0;

  let progress = scrollY / WORLD_LENGTH;
  let speed = 0.8 + progress * 1.0;

  enemies.push({
    x: random(30, width - 30),
    y: -25,
    r: 35,
    speed: speed,
    currentFrame: 0,
  });
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    let dx = player.x - e.x;
    let dy = player.y - e.y;
    let d = dist(e.x, e.y, player.x, player.y);

    if (d > 0) {
      e.x += (dx / d) * e.speed;
      e.y += (dy / d) * e.speed;
    }

    e.y += SCROLL_SPEED;

    if (e.y > height + 30) {
      enemies.splice(i, 1);
    }
  }
}

function checkBulletEnemyCollisions() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      let d = dist(bullets[i].x, bullets[i].y, enemies[j].x, enemies[j].y);
      if (d < enemies[j].r + 8) {
        bullets.splice(i, 1);
        enemies.splice(j, 1);
        score++;
        break;
      }
    }
  }
}

function checkEnemyPlayerCollision() {
  // Safe zone or shield protects player from owl damage
  if (player.invincible || player.shieldActive || isPlayerInSafeZone()) return;

  for (let i = 0; i < enemies.length; i++) {
    let d = dist(player.x, player.y, enemies[i].x, enemies[i].y);
    if (d < player.r + enemies[i].r - 6) {
      player.health -= 2;
      player.invincible = true;
      player.invincibleTimer = INVINCIBLE_FRAMES;
      if (hitSound) hitSound.play();

      if (player.health <= 0) {
        gameState = STATE_OVER;
        if (music) music.stop();
      }
      break;
    }
  }
}

function updateInvincibility() {
  if (player.invincible) {
    player.invincibleTimer--;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
    }
  }

  if (player.shieldActive) {
    player.shieldTimer--;
    if (player.shieldTimer <= 0) {
      player.shieldActive = false;
    }
  }
}

function checkLevelComplete() {
  if (scrollY >= WORLD_LENGTH) {
    gameState = STATE_WIN;
    if (winSound) winSound.play();
    if (music) music.stop();
  }
}

function drawBullets() {
  for (let i = 0; i < bullets.length; i++) {
    let b = bullets[i];
    push();
    stroke(200, 200, 200, 180);
    strokeWeight(1.5);
    noFill();
    ellipse(b.x, b.y, 10);
    line(b.x - 5, b.y - 5, b.x + 5, b.y + 5);
    line(b.x - 5, b.y + 5, b.x + 5, b.y - 5);
    pop();
  }
}

function drawEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    let e = enemies[i];

    if (enemySheet && enemySheet.width > 1) {
      e.currentFrame =
        (e.currentFrame + ENEMY_SPRITE.animSpeed) % ENEMY_SPRITE.numFrames;
      let frameX = floor(e.currentFrame) * ENEMY_SPRITE.frameWidth;

      push();
      imageMode(CENTER);
      image(
        enemySheet,
        e.x,
        e.y,
        e.r * 2.5,
        e.r * 2.5,
        frameX,
        0,
        ENEMY_SPRITE.frameWidth,
        ENEMY_SPRITE.frameHeight,
      );
      pop();
    } else {
      fill(255, 100, 100);
      ellipse(e.x, e.y, e.r * 2);
    }
  }
}

function drawPlayer() {
  if (player.invincible && floor(player.invincibleTimer / 6) % 2 === 0) return;

  if (playerSheet && playerSheet.width > 1) {
    player.currentFrame =
      (player.currentFrame + PLAYER_SPRITE.animSpeed) % PLAYER_SPRITE.numFrames;
    let frameX = floor(player.currentFrame) * PLAYER_SPRITE.frameWidth;

    let frameY = 0;
    if (player.direction.y < 0)
      frameY = 3; // Up
    else if (player.direction.y > 0)
      frameY = 0; // Down
    else if (player.direction.x < 0)
      frameY = 1; // Left
    else if (player.direction.x > 0) frameY = 2; // Right

    let spriteY = frameY * PLAYER_SPRITE.frameHeight;

    push();
    imageMode(CENTER);
    image(
      playerSheet,
      player.x,
      player.y,
      player.r * 2.5,
      player.r * 2.5,
      frameX,
      spriteY,
      PLAYER_SPRITE.frameWidth,
      PLAYER_SPRITE.frameHeight,
    );
    pop();
  } else {
    fill(100, 230, 210);
    ellipse(player.x, player.y, player.r * 2);
  }

  // Draw glowing Shield Bubble when active
  if (player.shieldActive) {
    push();
    noFill();
    stroke(100, 220, 255, 200);
    strokeWeight(3);
    circle(player.x, player.y, player.r * 3);
    pop();
  }
}

function drawHUD() {
  noStroke();
  fill(180);
  textSize(12);
  textAlign(LEFT);
  textFont("monospace");
  text("Move: WASD/Arrows | Shoot: Space | Shield: E/Shift", 16, 20);

  // Timer & Shield HUD
  fill(255);
  textSize(14);
  text("Time: " + gameTimer + "s", 16, 42);
  text(
    "Shield [E]: " +
      (player.hasShield ? "READY" : player.shieldActive ? "ACTIVE" : "USED"),
    16,
    60,
  );

  if (isPlayerInSafeZone()) {
    fill(100, 255, 150);
    text("• SAFE IN WEB ZONE", 16, 78);
  }

  fill(255);
  textSize(16);
  textAlign(RIGHT);
  text("Spiders Saved: " + score, width - 16, 28);

  let barW = 160;
  let barH = 14;
  let barX = width - barW - 16;
  let barY = 40;
  let fillW = map(player.health, 0, player.maxHealth, 0, barW);

  fill(40);
  rect(barX, barY, barW, barH, 4);

  let healthColour = lerpColor(
    color(200, 50, 50),
    color(50, 180, 90),
    player.health / player.maxHealth,
  );
  fill(healthColour);
  rect(barX, barY, fillW, barH, 4);

  let progBarX = width - 6;
  let progBarH = height - 40;
  let progBarY = 20;
  let progFill = map(scrollY, 0, WORLD_LENGTH, 0, progBarH);

  fill(40);
  rect(progBarX, progBarY, 4, progBarH, 2);
  fill(150, 100, 220);
  rect(progBarX, progBarY + progFill, 4, progBarH - progFill, 2);
}

function drawWinScreen() {
  background(10, 25, 15);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(44);
  text("You Made It To Safety!", width / 2, height / 2 - 40);
  fill(180);
  textSize(16);
  text(
    "Final Score: " + score + " | Time: " + gameTimer + "s",
    width / 2,
    height / 2 + 10,
  );
  textSize(14);
  fill(100);
  text("Press R to save more spiders", width / 2, height / 2 + 55);
}

function drawGameOver() {
  background(25, 10, 10);
  fill(220, 60, 60);
  textAlign(CENTER, CENTER);
  textSize(44);
  text("The Owls Won", width / 2, height / 2 - 40);
  fill(180);
  textSize(16);
  text(
    "Score: " + score + " | Time Survived: " + gameTimer + "s",
    width / 2,
    height / 2 + 10,
  );
  textSize(14);
  fill(100);
  text("Press R to retry", width / 2, height / 2 + 55);
}

function keyPressed() {
  // Web Shield Activation
  if (
    gameState === STATE_PLAY &&
    (key === "e" || key === "E" || keyCode === SHIFT)
  ) {
    if (player.hasShield && !player.shieldActive) {
      player.hasShield = false;
      player.shieldActive = true;
      player.shieldTimer = 180; // 3 seconds at 60 FPS
      if (shieldSound) shieldSound.play();
    }
  }

  // Restart Logic
  if (
    (key === "r" || key === "R") &&
    gameState !== STATE_PLAY &&
    gameState !== STATE_START
  ) {
    gameState = STATE_PLAY;
    score = 0;
    scrollY = 0;
    spawnTimer = 0;
    gameTimer = 0;
    startTime = millis();
    bullets = [];
    enemies = [];
    player.x = 400;
    player.y = 370;
    player.health = player.maxHealth;
    player.invincible = false;
    player.hasShield = true;
    player.shieldActive = false;

    // Reset Ants
    for (let ant of antCollectibles) {
      ant.collected = false;
    }

    if (music) music.loop();
  }
}
