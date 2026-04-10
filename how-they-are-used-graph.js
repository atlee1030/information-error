(() => {
  const mount = document.getElementById("usage-graph-canvas");
  if (!mount || typeof window.p5 === "undefined") return;

  const graphData = [
    { name: "Glass", items: [{ n: "Glass bottle", d: 1.07 }, { n: "Window", d: 1.07 }], angle: -130, spread: 35, color: [118, 166, 148, 90] },
    { name: "Paper", items: [{ n: "Box", d: 1.1 }, { n: "Book", d: 1.05 }, { n: "Cardboard", d: 1.03 }, { n: "Newspaper", d: 1.05 }, { n: "Paper towel", d: 1.1 }], angle: -55, spread: 40, color: [140, 139, 136, 140] },
    { name: "Plastic", items: [{ n: "Nail", d: 1.24 }, { n: "Bottle", d: 1.18 }, { n: "Tray", d: 1.15 }, { n: "Polyester", d: 1.15 }, { n: "Plastic bag", d: 1.18 }, { n: "Car bumper", d: 1.24 }], angle: 15, spread: 45, color: [118, 166, 148, 140] },
    { name: "Organic", items: [{ n: "Agriculture", d: 1.1 }, { n: "Landscaping", d: 1.04 }, { n: "Garden", d: 1.0 }, { n: "Brown food waste", d: 1.0 }, { n: "Soil improver", d: 1.01 }, { n: "Mulch", d: 1.04 }, { n: "Topsoil conditioner", d: 1.1 }], angle: 90, spread: 50, color: [168, 191, 84, 140] },
    { name: "Metal", items: [{ n: "Aluminum can", d: 1.207 }, { n: "Car bumper", d: 1.166 }, { n: "Steel product", d: 1.147 }, { n: "Train track", d: 1.15 }, { n: "Car", d: 1.17 }, { n: "Bicycle frame", d: 1.2 }, { n: "Paperclip", d: 1.258 }], angle: 165, spread: 45, color: [19, 61, 71, 140] }
  ];

  new window.p5((p) => {
    let nodes = [];
    let centerX = 0;
    let centerY = 0;
    let globalProgress = 0;
    const GRAPH_SHIFT_Y = -24;

    class Node {
      constructor(x, y, label, level) {
        this.base = p.createVector(x, y);
        this.pos = p.createVector(x, y);
        this.label = label;
        this.level = level;
        this.parent = null;
        this.angle = 0;
        this.color = [60, 60, 60, 255];
      }

      update() {
        if (this.level === 0) return;
        const mDist = p.dist(p.mouseX, p.mouseY, this.pos.x, this.pos.y);
        if (mDist < 100) {
          const push = p5.Vector.sub(this.pos, p.createVector(p.mouseX, p.mouseY));
          push.setMag(p.map(mDist, 0, 100, 4, 0));
          this.pos.add(push);
        }
        const home = p5.Vector.sub(this.base, this.pos);
        home.mult(0.12);
        this.pos.add(home);
      }

      display(progress) {
        if (this.level === 0) return;

        p.noStroke();
        if (this.level === 1) {
          const alpha = p.constrain(p.map(progress, 0, 0.4, 0, 255), 0, 255);
          if (alpha <= 0) return;

          p.push();
          p.translate(this.pos.x, this.pos.y);
          const textAng = this.angle;
          const isLeft = p.cos(textAng) < -0.01;
          p.rotate(isLeft ? textAng + p.PI : textAng);

          p.fill(40, alpha);
          p.drawingContext.font = "300 15px Oxanium";
          if (isLeft) {
            p.textAlign(p.LEFT, p.CENTER);
            p.text(this.label.toUpperCase(), 20, 0);
          } else {
            p.textAlign(p.RIGHT, p.CENTER);
            p.text(this.label.toUpperCase(), -20, 0);
          }
          p.pop();
          return;
        }

        if (this.level === 2) {
          const alpha = p.constrain(p.map(progress, 0.8, 1.0, 0, 255), 0, 255);
          if (alpha <= 0) return;

          p.push();
          p.translate(this.pos.x, this.pos.y);
          const textAng = this.parent.angle;
          const isLeft = p.cos(textAng) < -0.01;
          p.rotate(isLeft ? textAng + p.PI : textAng);

          p.fill(this.color[0], this.color[1], this.color[2], alpha * 0.6);
          p.ellipse(0, 0, 3, 3);
          p.fill(50, alpha);
          p.textSize(11);
          p.textStyle(p.NORMAL);
          if (isLeft) {
            p.textAlign(p.RIGHT, p.CENTER);
            p.text(this.label, -7, 0);
          } else {
            p.textAlign(p.LEFT, p.CENTER);
            p.text(this.label, 7, 0);
          }
          p.pop();
        }
      }
    }

    function rebuildLayout() {
      nodes = [];
      centerX = p.width * 0.47;
      centerY = (p.height * 0.5) + GRAPH_SHIFT_Y;
      globalProgress = 0;

      const root = new Node(centerX, centerY, "", 0);
      nodes.push(root);

      const baseDist = Math.min(p.height * 0.42, p.width * 0.38);

      graphData.forEach((category) => {
        const rad = p.radians(category.angle);
        const catDist = p.height * 0.09;
        const catX = centerX + p.cos(rad) * catDist;
        const catY = centerY + p.sin(rad) * catDist;

        const catNode = new Node(catX, catY, category.name, 1);
        catNode.parent = root;
        catNode.angle = rad;
        catNode.color = category.color;
        nodes.push(catNode);

        const startAngle = rad - p.radians(category.spread / 2);
        const angleStep = p.radians(category.spread) / p.max(1, category.items.length - 1);

        category.items.forEach((item, i) => {
          const itemAngle = startAngle + (angleStep * i);
          const itemDist = baseDist * item.d;
          const itemX = centerX + p.cos(itemAngle) * itemDist;
          const itemY = centerY + p.sin(itemAngle) * itemDist;

          const itemNode = new Node(itemX, itemY, item.n, 2);
          itemNode.parent = catNode;
          itemNode.angle = itemAngle;
          itemNode.color = category.color;
          nodes.push(itemNode);
        });
      });
    }

    p.setup = () => {
      const rect = mount.getBoundingClientRect();
      p.createCanvas(Math.max(10, rect.width), Math.max(10, rect.height)).parent(mount);
      p.textFont("oxanium");
      rebuildLayout();
    };

    p.draw = () => {
      p.clear();

      if (globalProgress < 1) {
        globalProgress = p.lerp(globalProgress, 1, 0.05);
      }

      p.strokeWeight(1.2);
      p.noFill();

      nodes.forEach((node) => {
        if (node.level !== 2 || !node.parent) return;

        const lineProgress = p.constrain(p.map(globalProgress, 0.2, 0.8, 0, 1), 0, 1);
        if (lineProgress <= 0) return;

        const from = node.parent.pos;
        const toTarget = node.pos;
        const to = p5.Vector.lerp(from, toTarget, lineProgress);

        p.stroke(node.color[0], node.color[1], node.color[2], node.color[3] * lineProgress);

        const d = p.dist(toTarget.x, toTarget.y, from.x, from.y);
        const cp1x = from.x + p.cos(node.parent.angle) * (d * 0.6);
        const cp1y = from.y + p.sin(node.parent.angle) * (d * 0.6);
        const cp2x = toTarget.x - p.cos(node.parent.angle) * (d * 0.65);
        const cp2y = toTarget.y - p.sin(node.parent.angle) * (d * 0.65);

        p.bezier(from.x, from.y, cp1x, cp1y, cp2x, cp2y, to.x, to.y);
      });

      nodes.forEach((node) => {
        node.update();
        node.display(globalProgress);
      });
    };

    p.windowResized = () => {
      const rect = mount.getBoundingClientRect();
      p.resizeCanvas(Math.max(10, rect.width), Math.max(10, rect.height));
      rebuildLayout();
    };
  });
})();
