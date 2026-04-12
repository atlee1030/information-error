(() => {
  const mount = document.getElementById("usage-graph-canvas");
  if (!mount || typeof window.p5 === "undefined") return;

  const graphData = [
    { name: "Glass", items: [{ n: "Glass bottle", d: 1.07 }, { n: "Window", d: 1.07 }], angle: -130, spread: 35, color: [118, 166, 148, 90] },
    { name: "Paper", items: [{ n: "Box", d: 1.1 }, { n: "Book", d: 1.05 }, { n: "Cardboard", d: 1.03 }, { n: "Newspaper", d: 1.05 }, { n: "Paper towel", d: 1.1 }], angle: -55, spread: 40, color: [140, 139, 136, 140] },
    { name: "Plastic", items: [{ n: "Nail", d: 1.24 }, { n: "Bottle", d: 1.18 }, { n: "Tray", d: 1.15 }, { n: "Polyester", d: 1.15 }, { n: "Plastic bag", d: 1.18 }, { n: "Car bumper", d: 1.24 }], angle: 15, spread: 45, color: [118, 166, 148, 140] },
    { name: "Organic", items: [{ n: "Agriculture", d: 1.1 }, { n: "Landscaping", d: 1.04 }, { n: "Garden", d: 1.0 }, { n: "Brown food waste", d: 1.0 }, { n: "Soil improver", d: 1.01 }, { n: "Mulch", d: 1.04 }, { n: "Topsoil conditioner", d: 1.1 }], angle: 90, spread: 50, color: [168, 191, 84, 140], offsetX: -6 },
    { name: "Metal", items: [{ n: "Aluminum can", d: 1.207 }, { n: "Car bumper", d: 1.166 }, { n: "Steel product", d: 1.147 }, { n: "Train track", d: 1.15 }, { n: "Car", d: 1.17 }, { n: "Bicycle frame", d: 1.2 }, { n: "Paperclip", d: 1.258 }], angle: 165, spread: 45, color: [19, 61, 71, 140] }
  ];

  new window.p5((p) => {
    let nodes = [];
    let centerX = 0;
    let centerY = 0;
    let globalProgress = 0;
    const GRAPH_SHIFT_X = Number(mount.dataset.graphShiftX || 0);
    const GRAPH_SHIFT_Y = Number(mount.dataset.graphShiftY || -24);
    const DESIGN_WIDTH = Number(mount.dataset.designWidth || 1400);
    const DESIGN_HEIGHT = Number(mount.dataset.designHeight || 900);
    const VISUAL_SCALE = Number(mount.dataset.visualScale || 0.88);
    const GRAPH_SCALE_MAX = Number(mount.dataset.graphScaleMax || 1.0);
    const TEXT_SCALE_MIN = Number(mount.dataset.textScaleMin || 0.68);
    const TEXT_SCALE_MAX = Number(mount.dataset.textScaleMax || 1.04);
    const CENTER_TEXT_SCALE_MIN = Number(mount.dataset.centerTextScaleMin || 0.52);
    const CENTER_TEXT_SCALE_MAX = Number(mount.dataset.centerTextScaleMax || 1.02);
    const CATEGORY_TEXT_BASE = Number(mount.dataset.categoryTextSize || 13.2);
    const CATEGORY_LABEL_OFFSET = Number(mount.dataset.categoryLabelOffset || 18);
    const ITEM_TEXT_BASE = Number(mount.dataset.itemTextSize || 11.6);
    const ITEM_LABEL_OFFSET = Number(mount.dataset.itemLabelOffset || 6.5);
    const RESPONSIVE_BREAKPOINT = Number(mount.dataset.responsiveBreakpoint || 1180);
    const RESPONSIVE_MIN_FACTOR = Number(mount.dataset.responsiveMinFactor || 0.88);
    const CENTER_SPREAD_BREAKPOINT = Number(mount.dataset.centerSpreadBreakpoint || 1180);
    const CENTER_SPREAD_MAX = Number(mount.dataset.centerSpreadMax || 1.18);
    let graphScale = 1;
    let graphTextScale = 1;
    let centerTextScale = 1;
    let centerSpreadScale = 1;
    let frameOffsetX = 0;
    let frameOffsetY = 0;
    const graphWrap = mount.parentElement;
    let pointerX = -9999;
    let pointerY = -9999;
    let pointerActive = false;

    function updatePointerPosition(clientX, clientY) {
      const rect = mount.getBoundingClientRect();
      pointerX = clientX - rect.left;
      pointerY = clientY - rect.top;
      pointerActive = true;
    }

    function clearPointerPosition() {
      pointerX = -9999;
      pointerY = -9999;
      pointerActive = false;
    }

    mount.addEventListener("pointerenter", (event) => {
      updatePointerPosition(event.clientX, event.clientY);
    });

    mount.addEventListener("pointermove", (event) => {
      updatePointerPosition(event.clientX, event.clientY);
    });

    mount.addEventListener("pointerleave", () => {
      clearPointerPosition();
    });

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
        const hoverRadius = 100 * graphScale;
        const hoverX = pointerActive ? pointerX : p.mouseX;
        const hoverY = pointerActive ? pointerY : p.mouseY;
        const mDist = p.dist(hoverX, hoverY, this.pos.x, this.pos.y);
        if (mDist < hoverRadius) {
          const push = p5.Vector.sub(this.pos, p.createVector(hoverX, hoverY));
          push.setMag(p.map(mDist, 0, hoverRadius, 4 * graphScale, 0));
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
          const categoryTextSize = CATEGORY_TEXT_BASE * centerTextScale;
          p.textSize(categoryTextSize);
          p.textStyle(p.NORMAL);
          if (isLeft) {
            p.textAlign(p.LEFT, p.CENTER);
            p.text(this.label.toUpperCase(), CATEGORY_LABEL_OFFSET * centerTextScale, 0);
          } else {
            p.textAlign(p.RIGHT, p.CENTER);
            p.text(this.label.toUpperCase(), -CATEGORY_LABEL_OFFSET * centerTextScale, 0);
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
          p.ellipse(0, 0, 3 * graphScale, 3 * graphScale);
          p.fill(50, alpha);
          p.textSize(ITEM_TEXT_BASE * graphTextScale);
          p.textStyle(p.NORMAL);
          if (isLeft) {
            p.textAlign(p.RIGHT, p.CENTER);
            p.text(this.label, -ITEM_LABEL_OFFSET * graphTextScale, 0);
          } else {
            p.textAlign(p.LEFT, p.CENTER);
            p.text(this.label, ITEM_LABEL_OFFSET * graphTextScale, 0);
          }
          p.pop();
        }
      }
    }

    function rebuildLayout() {
      nodes = [];
      const baseResponsiveScale = Math.min(p.width / DESIGN_WIDTH, p.height / DESIGN_HEIGHT);
      const widthResponsiveFactor = p.width < RESPONSIVE_BREAKPOINT
        ? p.map(p.width, 900, RESPONSIVE_BREAKPOINT, RESPONSIVE_MIN_FACTOR, 1, true)
        : 1;
      centerSpreadScale = p.width < CENTER_SPREAD_BREAKPOINT
        ? p.map(p.width, 900, CENTER_SPREAD_BREAKPOINT, CENTER_SPREAD_MAX, 1, true)
        : 1;

      graphScale = Math.min(
        (baseResponsiveScale * VISUAL_SCALE * widthResponsiveFactor),
        GRAPH_SCALE_MAX
      );
      graphTextScale = p.constrain(graphScale / VISUAL_SCALE, TEXT_SCALE_MIN, TEXT_SCALE_MAX);
      centerTextScale = p.constrain(graphScale / VISUAL_SCALE, CENTER_TEXT_SCALE_MIN, CENTER_TEXT_SCALE_MAX);
      frameOffsetX = (p.width - (DESIGN_WIDTH * graphScale)) * 0.5;
      frameOffsetY = (p.height - (DESIGN_HEIGHT * graphScale)) * 0.5;
      if (graphWrap) {
        graphWrap.style.setProperty("--graph-ui-scale", graphTextScale.toFixed(4));
      }

      centerX = frameOffsetX + (DESIGN_WIDTH * 0.5 * graphScale) + (GRAPH_SHIFT_X * graphScale);
      centerY = frameOffsetY + (DESIGN_HEIGHT * 0.52 * graphScale) + (GRAPH_SHIFT_Y * graphScale);
      globalProgress = 0;

      const root = new Node(centerX, centerY, "", 0);
      nodes.push(root);

      const baseDist = DESIGN_HEIGHT * 0.43 * graphScale;

      graphData.forEach((category) => {
        const rad = p.radians(category.angle);
        const catDist = DESIGN_HEIGHT * 0.095 * graphScale * centerSpreadScale;
        const branchOffsetX = (category.offsetX || 0) * graphScale;
        const catX = centerX + p.cos(rad) * catDist + branchOffsetX;
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
          const itemX = centerX + p.cos(itemAngle) * itemDist + branchOffsetX;
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

      p.strokeWeight(Math.max(0.9, 1.2 * graphScale));
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
