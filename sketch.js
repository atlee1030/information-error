let vocabulary = [
  "Fake News", "Distortion", "Bias", "Frame", "Agitation", "Media", "Public Opinion", "Anonymous", "Noise", "Stimulus",
  "Recycling 27%", "Disposal 73%", "Plastic 9.1%", "Infinite Loop", "Greenwashing", "Landfill", "Incineration", "Downcycling", "Sorting", "Mixed Waste", "Statistics Canada",
  "Algorithm", "Echo Chamber", "Filter Bubble", "Post-Truth", "Clickbait", 
  "Verification", "Polarization", "Microplastic", "Carbon Footprint", "Circular Economy", 
  "Zero Waste", "Sustainability", "90.9% Unrecycled", "Digital Trace", "Systemic Error"
];

let words = [];
const INITIAL_WORD_COUNT = 70; // 시작 시 단어 수
const MAX_WORDS = 80;          // 화면에 유지될 최대 단어 수 (이 수치를 넘으면 삭제)
const CONNECT_DIST = 260; 

let isShrinking = false; 
let shrinkTimer = 0; 

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Oxanium"); 
  textSize(17);
  textAlign(CENTER, CENTER);
  
  // 초기 단어들 생성
  for (let i = 0; i < INITIAL_WORD_COUNT; i++) {
    words.push(new Information(width / 2, height / 2));
  }
}

// 사용자가 새로운 단어를 입력할 때 호출되는 함수
function addWordToSketch(newWord) {
  // 1. 새로운 단어 객체 생성
  let freshWord = new Information(width / 2, height / 2);
  freshWord.str = newWord;
  // 생성 시 사방으로 튀어나가는 초기 속도 부여
  freshWord.vel = p5.Vector.random2D().mult(random(2, 5));
  words.push(freshWord);
  
  // 2. ★ 과부하 방지: 최대 개수(80개)를 초과하면 가장 오래된 단어(배열의 첫 번째) 삭제
  if (words.length > MAX_WORDS) {
    words.shift();
  }
}

function draw() {
  background(225, 225, 222); 

  if (isShrinking) shrinkTimer += 0.015; 

  // 네트워크 선 그리기
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      let d = dist(words[i].pos.x, words[i].pos.y, words[j].pos.x, words[j].pos.y);
      if (d < CONNECT_DIST) {
        let opacity = isShrinking ? map(shrinkTimer, 0, 0.5, 100, 0) : map(d, 0, CONNECT_DIST, 140, 0); 
        stroke(120, 120, 120, max(0, opacity)); 
        strokeWeight(1);
        line(words[i].pos.x, words[i].pos.y, words[j].pos.x, words[j].pos.y);
      }
    }
  }

  for (let word of words) {
    if (isShrinking) {
      word.shrink(shrinkTimer); 
    } else {
      word.applyBehaviors(words); 
    }
    word.update();
    word.display();
  }
}

function startTransition(url) {
  if (isShrinking) return;
  isShrinking = true;
  shrinkTimer = 0;
  setTimeout(() => {
    window.location.href = url;
  }, 1200);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class Information {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0); 
    this.acc = createVector(0, 0);
    this.str = random(vocabulary);
    this.maxSpeed = 3.5; 
    this.noiseOffset = random(1000);
    this.alpha = 255; 
  }

  shrink(t) {
    let center = createVector(width / 2, height / 2);
    let dir = p5.Vector.sub(center, this.pos);
    let timeFactor = pow(t, 3); 
    let forceMag = timeFactor * 45; 
    dir.setMag(forceMag); 
    this.acc.add(dir);
    this.maxSpeed = 25; 
    this.alpha = map(t, 0.2, 0.8, 255, 0);
  }

  applyBehaviors(allWords) {
    // 1. 자유 유영 (원본 유지)
    let n = noise(this.noiseOffset + frameCount * 0.004);
    let flow = p5.Vector.fromAngle(n * TWO_PI * 2);
    flow.x *= 3.0; 
    flow.mult(0.25); 
    this.acc.add(flow);

    let center = createVector(width / 2, height / 2);
    let target = p5.Vector.sub(center, this.pos);
    let d = target.mag();
    
    // 2. 고무줄 탄성 (원본 유지)
    let elasticTarget = target.copy();
    elasticTarget.x *= 0.45; 
    elasticTarget.y *= 1.0; 
    let strength = map(d, 0, width / 2, 0.02, 0.8); 
    if (d > width * 0.4) {
      strength = map(d, width * 0.4, width * 0.5, 0.5, 3.5); 
    }
    elasticTarget.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(elasticTarget, this.vel);
    steer.limit(strength); 
    this.acc.add(steer);

    // 3. 단어끼리 밀어내기 (원본 유지)
    for (let other of allWords) {
      let dOther = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (dOther > 0 && dOther < 85) { 
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(dOther);
        diff.mult(0.8); 
        this.acc.add(diff);
      }
    }

    // 4. 마우스 회피 (원본 유지)
    if (dist(this.pos.x, this.pos.y, mouseX, mouseY) < 240) {
      let repulsion = p5.Vector.sub(this.pos, createVector(mouseX, mouseY));
      repulsion.setMag(this.maxSpeed * 2.2);
      let mSteer = p5.Vector.sub(repulsion, this.vel);
      mSteer.limit(0.8); 
      this.acc.add(mSteer);
    }

    // ★ 5. 부드러운 직사각형 방어막 (쿠션 로직 포함)
    if (!isShrinking) {
      let boxW = 260; 
      let boxH = 90;  
      let buffer = 40; 
      
      if (this.pos.x > center.x - (boxW + buffer) && this.pos.x < center.x + (boxW + buffer) &&
          this.pos.y > center.y - (boxH + buffer) && this.pos.y < center.y + (boxH + buffer)) {
        
        let push = p5.Vector.sub(this.pos, center);
        
        let distInside = 1.0; 
        if (abs(push.x) > boxW || abs(push.y) > boxH) distInside = 0.5; 

        push.setMag(this.maxSpeed * 4.0);
        let pushSteer = p5.Vector.sub(push, this.vel);
        pushSteer.limit(distInside); 
        this.acc.add(pushSteer);
      }
    }
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    let friction = isShrinking ? 0.94 : 0.985;
    this.vel.mult(friction); 

    if (!isShrinking) {
      this.pos.y = constrain(this.pos.y, 180, height - 40);
      this.pos.x = constrain(this.pos.x, 20, width - 20);
    }
  }

  display() {
    noStroke();
    fill(0, max(0, this.alpha)); 
    text(this.str, this.pos.x, this.pos.y);
  }
}
