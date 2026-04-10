let nodes = [];
let centerX, centerY;
let globalProgress = 0; 

// 데이터 구성: 거리(d)와 퍼짐 정도(spread) 최적화
const graphData = [
  { name: "Glass", items: [{ n: "Glass bottle", d: 1.07 }, { n: "Window", d: 1.07 }], angle: -130, spread: 35, color: [118, 166, 148, 90] },
  { name: "Paper", items: [{ n: "Box", d: 1.1 }, { n: "Book", d: 1.05 }, { n: "Cardboard", d: 1.03 }, { n: "Newspaper", d: 1.05 }, { n: "Paper towel", d: 1.1 }], angle: -55, spread: 40, color: [140, 139, 136, 140] },
  { name: "Plastic", items: [{ n: "Nail", d: 1.24 }, { n: "Bottle", d: 1.18 }, { n: "Tray", d: 1.15 }, { n: "Polyester", d: 1.15 }, { n: "Plastic bag", d: 1.18 }, { n: "Car bumper", d: 1.24 }], angle: 15, spread: 45, color: [118, 166, 148, 140] },
  { name: "Organic", items: [{ n: "Agriculture", d: 1.10 }, { n: "Landscaping", d: 1.04 }, { n: "Garden", d: 1.0 }, { n: "Brown food waste", d: 1 }, { n: "Soil improver", d: 1.01 }, { n: "Mulch", d: 1.04 }, { n: "Topsoil conditioner", d: 1.10 }], angle: 90, spread: 50, color: [168, 191, 84, 140] },
  { name: "Metal", items: [{ n: "Aluminum can", d: 1.207 }, { n: "Car bumper", d: 1.166 }, { n: "Steel product", d: 1.147 }, { n: "Train track", d: 1.15 }, { n: "Car", d: 1.17 }, { n: "Bicycle frame", d: 1.2 }, { n: "Paperclip", d: 1.258 }], angle: 165, spread: 45, color: [58, 62, 64, 140] }
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2 - 20; 
  textFont("Oxanium");

  let root = new Node(centerX, centerY, "", 0);
  nodes.push(root);

  graphData.forEach(cat => {
    let rad = radians(cat.angle);
    let catDist = height * 0.09; 
    let catX = centerX + cos(rad) * catDist;
    let catY = centerY + sin(rad) * catDist;
    
    let catNode = new Node(catX, catY, cat.name, 1);
    catNode.parent = root;
    catNode.angle = rad; 
    catNode.color = cat.color;
    nodes.push(catNode);

    let startAngle = rad - radians(cat.spread / 2);
    let angleStep = radians(cat.spread) / max(1, cat.items.length - 1);

    cat.items.forEach((item, i) => {
      let itemAngle = startAngle + (angleStep * i);
      let baseDist = height * 0.42; 
      let itemDist = baseDist * item.d; 
      
      let itemX = centerX + cos(itemAngle) * itemDist;
      let itemY = centerY + sin(itemAngle) * itemDist;
      
      let itemNode = new Node(itemX, itemY, item.n, 2);
      itemNode.parent = catNode;
      itemNode.angle = itemAngle;
      itemNode.color = cat.color; 
      nodes.push(itemNode);
    });
  });
}

function draw() {
  background(218, 210, 199);
  
  if (globalProgress < 1.0) {
    globalProgress = lerp(globalProgress, 1.0, 0.05); 
  }

  strokeWeight(1.2);
  noFill();
  
  nodes.forEach(n => {
    if (n.level === 3) return;
    if (n.level === 2 && n.parent) {
      let lineProgress = constrain(map(globalProgress, 0.2, 0.8, 0, 1), 0, 1);
      if (lineProgress <= 0) return;

      let p2 = n.parent.pos; 
      let p1_target = n.pos; 
      let p1 = p5.Vector.lerp(p2, p1_target, lineProgress);
      
      stroke(n.color[0], n.color[1], n.color[2], n.color[3] * lineProgress);
      
      let d = dist(p1_target.x, p1_target.y, p2.x, p2.y);
      let cp1x = p2.x + cos(n.parent.angle) * (d * 0.6);
      let cp1y = p2.y + sin(n.parent.angle) * (d * 0.6);
      let cp2x = p1_target.x - cos(n.parent.angle) * (d * 0.65);
      let cp2y = p1_target.y - sin(n.parent.angle) * (d * 0.65);
      
      bezier(p2.x, p2.y, cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
    }
  });

  nodes.forEach(n => {
    n.update();
    n.display(globalProgress);
  });
}

class Node {
  constructor(x, y, label, level) {
    this.base = createVector(x, y);
    this.pos = createVector(x, y);
    this.label = label;
    this.level = level; 
    this.parent = null;
    this.angle = 0;
    this.color = [60, 60, 60, 255]; 
    // ★ 굵기 애니메이션을 위한 실시간 변수
    this.currentWeight = 300; 
  }

  update() {
    if (this.level === 3) return;
    let mDist = dist(mouseX, mouseY, this.pos.x, this.pos.y);
    if (mDist < 100) {
      let push = p5.Vector.sub(this.pos, createVector(mouseX, mouseY));
      push.setMag(map(mDist, 0, 100, 4, 0));
      this.pos.add(push);
    }
    let home = p5.Vector.sub(this.base, this.pos);
    home.mult(0.12); 
    this.pos.add(home);
  }

  display(prog) {
    if (this.level === 0) return; 
    noStroke();

    // ★ 중앙 단어: 얇게 유지
    if (this.level === 1) {
      let alpha = constrain(map(prog, 0, 0.4, 0, 255), 0, 255);
      if (alpha <= 0) return;
      push();
      translate(this.pos.x, this.pos.y); 
      let textAng = this.angle;
      let isLeft = cos(textAng) < -0.01; 
      if (isLeft) rotate(textAng + PI); else rotate(textAng);
      
      fill(40, alpha); 
      drawingContext.font = "300 15px Oxanium"; 
      if (isLeft) { textAlign(LEFT, CENTER); text(this.label.toUpperCase(), 20, 0); } 
      else { textAlign(RIGHT, CENTER); text(this.label.toUpperCase(), -20, 0); }
      pop();
    } 
    // ★ 세부 아이템 단어
    else if (this.level === 2) {
      let alpha = constrain(map(prog, 0.8, 1.0, 0, 255), 0, 255);
      if (alpha <= 0) return;
      push();
      translate(this.pos.x, this.pos.y); 
      let textAng = this.parent.angle; 
      let isLeft = cos(textAng) < -0.01; 
      if (isLeft) rotate(textAng + PI); else rotate(textAng);
      
      fill(this.color[0], this.color[1], this.color[2], alpha * 0.6);
      ellipse(0, 0, 3, 3); 
      fill(50, alpha); 
      textSize(11); textStyle(NORMAL);
      if (isLeft) { textAlign(RIGHT, CENTER); text(this.label, -7, 0); } 
      else { textAlign(LEFT, CENTER); text(this.label, 7, 0); }
      pop();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2 - 20;
}
