const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const WIN_WIDTH = 500;
const WIN_HEIGHT = 700;
const GRID_SIZE = 50;
const MAX_LANES = 15;
const MAX_RIVER_COUNT = 2;
const MAX_GRASS_COUNT = 1;
const MAX_ROAD_COUNT = 3;
const PRE_GENERATE_LINES = 5;

let x = WIN_WIDTH / 2;
let y = WIN_HEIGHT - GRID_SIZE;
let score = 0;
let cameraY = 0;
let riverCount = 0;
let grassCount = 0;
let roadCount = 0;
let canMove = true;
let gameOver = false;
let currentLog = null;
let gameOverSoundPlayed = false;

const images = {};
const sounds = {};

// Загрузка ресурсов
const loadImage = (src) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
  });
};

const loadResources = async () => {
  images.bg = await loadImage('images/background.png');
  images.crab = await loadImage('images/crab.png');
  images.cars = await Promise.all([
    loadImage('images/car1.png'),
    loadImage('images/car2.png'),
    loadImage('images/car3.png'),
    loadImage('images/car4.png'),
    loadImage('images/car5.png'),
    loadImage('images/car6.png'),
    loadImage('images/car7.png'),
    loadImage('images/car8.png'),
  ]);
  images.grass = await Promise.all([
    loadImage('images/grass1.png'),
    loadImage('images/grass2.png'),
    loadImage('images/grass3.png'),
    loadImage('images/grass4.png'),
    loadImage('images/grass5.png'),
    loadImage('images/grass6.png'),
  ]);
  images.roads = await Promise.all([
    loadImage('images/road1.png'),
    loadImage('images/road2.png'),
  ]);
  images.rivers = await Promise.all([
    loadImage('images/river1.png'),
    loadImage('images/river2.png'),
  ]);
  images.log = await loadImage('images/log.png');
  images.gameOverBg = await loadImage('images/game_over_background.png');

  sounds.bgMusic = new Audio('sounds/background_music.mp3');
  sounds.gameOver = new Audio('sounds/game_over.mp3');
  sounds.bgMusic.volume = 0.01;
  sounds.gameOver.volume = 0.0325;
  sounds.bgMusic.loop = true;
  sounds.bgMusic.play();
};

class Obstacle {
  constructor(x, y, speed, img) {
    this.x = x;
    this.y = y;
    this.speed = speed / 1.5; // Замедление скорости в 2.5 раза
    this.img = speed >= 0 ? flipImage(img) : img;
  }

  move() {
    this.x += this.speed;
    if (this.speed > 0 && this.x > WIN_WIDTH) this.x = -this.img.width;
    if (this.speed < 0 && this.x < -this.img.width) this.x = WIN_WIDTH;
  }

  draw(cameraY) {
    ctx.drawImage(this.img, this.x, this.y - cameraY);
  }

  getRect() {
    return { x: this.x, y: this.y, width: this.img.width, height: GRID_SIZE };
  }
}

class Lane {
  constructor(y, laneType) {
    this.y = y;
    this.type = laneType;
    this.texture = laneType === 'grass' ? randomChoice(images.grass) :
                   laneType === 'road' ? randomChoice(images.roads) :
                   randomChoice(images.rivers);
    this.obstacles = [];
    if (laneType === 'road') {
      const laneSpeed = randomChoice([-3, 3]) / 1.5; // Замедление: ±3 → ±1.2
      const numCars = randomInt(1, 2);
      const minDistance = images.cars[0].width * 2;
      const maxX = WIN_WIDTH - images.cars[0].width;
      for (let i = 0; i < numCars; i++) {
        const carImg = randomChoice(images.cars);
        let obsX = i === 0 ? randomInt(0, maxX) : this.obstacles[i - 1].x + minDistance;
        if (obsX > maxX) obsX = randomInt(0, maxX / 2);
        this.obstacles.push(new Obstacle(obsX, y, laneSpeed, carImg));
      }
    } else if (laneType === 'river') {
      const speed = randomChoice([-2, 2]) / 1.5; // Замедление: ±2 → ±0.8
      for (let i = 0; i < randomInt(2, 4); i++) {
        this.obstacles.push(new Obstacle(randomInt(0, WIN_WIDTH), y, speed, images.log));
      }
    }
  }
}

let lanes = [];

function resetGame() {
  x = WIN_WIDTH / 2;
  y = WIN_HEIGHT - GRID_SIZE;
  score = cameraY = riverCount = grassCount = roadCount = 0;
  lanes = [];
  canMove = true;
  gameOver = false;
  currentLog = null;
  gameOverSoundPlayed = false;
  for (let i = 0; i < MAX_LANES; i++) {
    const laneY = WIN_HEIGHT - (i + 1) * GRID_SIZE;
    let laneType = i === 0 ? 'grass' : randomChoice(
      riverCount >= MAX_RIVER_COUNT ? ['grass', 'road'] :
      grassCount >= MAX_GRASS_COUNT ? ['road', 'river'] :
      roadCount >= MAX_ROAD_COUNT ? ['grass', 'river'] :
      ['grass', 'road', 'river']
    );
    if (laneType === 'river') { riverCount++; grassCount = roadCount = 0; }
    else if (laneType === 'grass') { grassCount++; riverCount = roadCount = 0; }
    else if (laneType === 'road') { roadCount++; riverCount = grassCount = 0; }
    lanes.push(new Lane(laneY, laneType));
  }
  sounds.bgMusic.play();
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function flipImage(img) {
  const offscreen = document.createElement('canvas');
  offscreen.width = img.width;
  offscreen.height = img.height;
  const offCtx = offscreen.getContext('2d');
  offCtx.scale(-1, 1);
  offCtx.drawImage(img, -img.width, 0);
  return offscreen;
}

document.addEventListener('keydown', (e) => {
  if (!gameOver && canMove) {
    if (e.key === 'ArrowUp') {
      y -= GRID_SIZE;
      score++;
      canMove = false;
    } else if (e.key === 'ArrowLeft' && x > 0) {
      x -= GRID_SIZE;
      canMove = false;
    } else if (e.key === 'ArrowRight' && x < WIN_WIDTH - GRID_SIZE) {
      x += GRID_SIZE;
      canMove = false;
    }
  }
});

document.addEventListener('keyup', () => canMove = true);

canvas.addEventListener('click', (e) => {
  if (gameOver) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const btnX = WIN_WIDTH / 2 - 150;
    const btnY = WIN_HEIGHT / 2 + 100;
    if (clickX >= btnX && clickX <= btnX + 300 && clickY >= btnY && clickY <= btnY + 100) {
      resetGame();
    }
  }
});

async function gameLoop() {
  await loadResources();
  resetGame();

  function update() {
    if (!gameOver) {
      cameraY = Math.min(cameraY, y - WIN_HEIGHT + GRID_SIZE * PRE_GENERATE_LINES);

      if (lanes[0].y - cameraY > -GRID_SIZE) {
        let laneType = randomChoice(
          riverCount >= MAX_RIVER_COUNT ? ['grass', 'road'] :
          grassCount >= MAX_GRASS_COUNT ? ['road', 'river'] :
          roadCount >= MAX_ROAD_COUNT ? ['grass', 'river'] :
          ['grass', 'road', 'river']
        );
        if (laneType === 'river') { riverCount++; grassCount = roadCount = 0; }
        else if (laneType === 'grass') { grassCount++; riverCount = roadCount = 0; }
        else if (laneType === 'road') { roadCount++; riverCount = grassCount = 0; }
        lanes.unshift(new Lane(lanes[0].y - GRID_SIZE, laneType));
        if (lanes.length > MAX_LANES) lanes.pop();
      }

      const crabRect = { x, y: y - cameraY, width: GRID_SIZE, height: GRID_SIZE };

      for (const lane of lanes) {
        if (lane.type === 'road') {
          for (const obs of lane.obstacles) {
            obs.move();
            const obsRect = { x: obs.x, y: lane.y - cameraY, width: obs.img.width, height: GRID_SIZE };
            if (Math.abs(lane.y - y) < GRID_SIZE / 2 && collide(crabRect, obsRect)) {
              gameOver = true;
            }
          }
        } else if (lane.type === 'river') {
          let onLog = false;
          currentLog = null;
          if (Math.abs(lane.y - y) < GRID_SIZE / 2) {
            for (const obs of lane.obstacles) {
              const obsRect = { x: obs.x, y: lane.y - cameraY, width: obs.img.width, height: GRID_SIZE };
              if (collide(crabRect, obsRect)) {
                onLog = true;
                currentLog = obs;
                break;
              }
            }
          }
          for (const obs of lane.obstacles) obs.move();
          if (Math.abs(lane.y - y) < GRID_SIZE / 2 && !onLog) gameOver = true;
          else if (currentLog) x += currentLog.speed;
        } else {
          for (const obs of lane.obstacles) obs.move();
        }
      }
    }

    ctx.clearRect(0, 0, WIN_WIDTH, WIN_HEIGHT);
    ctx.drawImage(images.bg, 0, 0);

    for (const lane of lanes) {
      ctx.drawImage(lane.texture, 0, lane.y - cameraY);
      for (const obs of lane.obstacles) obs.draw(cameraY);
    }

    ctx.drawImage(images.crab, x, y - cameraY);

    // Отрисовка текста с обводкой (Score)
    ctx.font = '30px Poppins';
    ctx.fillStyle = '#000';
    const scoreText = `Score: ${score}`;
    const scoreWidth = ctx.measureText(scoreText).width;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx !== 0 || dy !== 0) ctx.fillText(scoreText, WIN_WIDTH - scoreWidth - 10 + dx, 40 + dy);
      }
    }
    ctx.fillStyle = '#FFB6C1';
    ctx.fillText(scoreText, WIN_WIDTH - scoreWidth - 10, 40);

    if (gameOver) {
      if (!gameOverSoundPlayed) {
        sounds.bgMusic.pause();
        sounds.gameOver.play();
        gameOverSoundPlayed = true;
      }

      ctx.drawImage(images.gameOverBg, 0, 0);

      // "GAME prOVER!" с обводкой
      ctx.font = '50px Poppins';
      ctx.fillStyle = '#8B0000';
      const gameOverText = 'GAME prOVER!';
      const gameOverWidth = ctx.measureText(gameOverText).width;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx !== 0 || dy !== 0) ctx.fillText(gameOverText, WIN_WIDTH / 2 - gameOverWidth / 2 + dx, WIN_HEIGHT / 4 + dy);
        }
      }
      ctx.fillStyle = '#FF0000';
      ctx.fillText(gameOverText, WIN_WIDTH / 2 - gameOverWidth / 2, WIN_HEIGHT / 4);

      // "Score: {score}" с обводкой
      ctx.fillStyle = '#000';
      const finalScoreText = `Score: ${score}`;
      const finalScoreWidth = ctx.measureText(finalScoreText).width;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx !== 0 || dy !== 0) ctx.fillText(finalScoreText, WIN_WIDTH / 2 - finalScoreWidth / 2 + dx, WIN_HEIGHT / 2 + 20 + dy);
        }
      }
      ctx.fillStyle = '#FFF';
      ctx.fillText(finalScoreText, WIN_WIDTH / 2 - finalScoreWidth / 2, WIN_HEIGHT / 2 + 20);

      // Кнопка "Try Again"
      ctx.fillStyle = '#FFB6C1';
      ctx.fillRect(WIN_WIDTH / 2 - 150, WIN_HEIGHT / 2 + 100, 300, 100);
      ctx.strokeStyle = '#FF1493';
      ctx.lineWidth = 2;
      ctx.strokeRect(WIN_WIDTH / 2 - 150, WIN_HEIGHT / 2 + 100, 300, 100);

      ctx.fillStyle = '#FFF';
      const btnText = 'Try Again';
      const btnWidth = ctx.measureText(btnText).width;
      ctx.fillText(btnText, WIN_WIDTH / 2 - btnWidth / 2, WIN_HEIGHT / 2 + 160);
    }

    requestAnimationFrame(update);
  }

  update();
}

function collide(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

gameLoop();