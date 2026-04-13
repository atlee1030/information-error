let vocabulary = [
  "Fake News", "Distortion", "Bias", "Frame", "Agitation", "Media", "Public Opinion", "Anonymous", "Noise", "Stimulus",
  "Recycling 27%", "Disposal 73%", "Plastic 9.1%", "Infinite Loop", "Greenwashing", "Landfill", "Incineration", "Downcycling", "Sorting", "Mixed Waste", "Statistics Canada",
  "Algorithm", "Echo Chamber", "Filter Bubble", "Post-Truth", "Clickbait",
  "Verification", "Polarization", "Microplastic", "Carbon Footprint", "Circular Economy",
  "Zero Waste", "Sustainability", "90.9% Unrecycled", "Digital Trace", "Systemic Error"
];

let words = [];
const INITIAL_WORD_COUNT = 56;
const MAX_WORDS = 90;
const MAX_SHARED_WORDS = 28;
const CONNECT_DIST = 260;
const SHARED_WORD_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const SHARED_WORD_DECAY_MS = 7 * 24 * 60 * 60 * 1000;

let isShrinking = false;
let shrinkTimer = 0;
const sharedWordMap = new Map();

function normalizeIssueTerm(term) {
  return term.trim().replace(/\s+/g, " ").toLowerCase();
}

function sharedTextSize(count) {
  const responsiveScale = map(constrain(min(width, height), 480, 1600), 480, 1600, 0.82, 1.1);
  const weighted = 17 + (Math.log2(max(1, count)) * 4.2);
  return constrain(weighted * responsiveScale, 17, 38);
}

function getIssueActivityScale(updatedAt) {
  if (!updatedAt) return 1;

  const lastUpdated = new Date(updatedAt).getTime();
  if (!Number.isFinite(lastUpdated)) return 1;

  const elapsed = Date.now() - lastUpdated;
  if (elapsed <= SHARED_WORD_GRACE_MS) return 1;
  if (elapsed >= SHARED_WORD_GRACE_MS + SHARED_WORD_DECAY_MS) return 0;

  return 1 - ((elapsed - SHARED_WORD_GRACE_MS) / SHARED_WORD_DECAY_MS);
}

function wordSpacingRadius(word) {
  return word.isShared ? map(word.getDisplaySize(), 17, 38, 64, 128, true) : 44;
}

function pruneWords() {
  while (sharedWordMap.size > MAX_SHARED_WORDS) {
    let removable = null;
    sharedWordMap.forEach((word, key) => {
      if (!removable || word.count < removable.word.count) {
        removable = { key, word };
      }
    });
    if (!removable) break;
    words = words.filter((word) => word !== removable.word);
    sharedWordMap.delete(removable.key);
  }

  while (words.length > MAX_WORDS) {
    const firstNonSharedIndex = words.findIndex((word) => !word.isShared);
    if (firstNonSharedIndex >= 0) {
      words.splice(firstNonSharedIndex, 1);
      continue;
    }

    const removableKey = sharedWordMap.keys().next().value;
    if (!removableKey) break;
    const removableWord = sharedWordMap.get(removableKey);
    words = words.filter((word) => word !== removableWord);
    sharedWordMap.delete(removableKey);
  }
}

function syncSharedIssue(issue, options = {}) {
  const key = issue.normalized_term || normalizeIssueTerm(issue.term || "");
  if (!key) return null;

  const existing = sharedWordMap.get(key);
  if (existing) {
    existing.str = issue.term;
    existing.count = issue.count || existing.count || 1;
    existing.updatedAt = issue.updated_at || existing.updatedAt || new Date().toISOString();
    existing.bump();
    return existing;
  }

  const spawnAtCenter = options.spawnAtCenter === true;
  const x = spawnAtCenter ? width / 2 : random(width * 0.28, width * 0.72);
  const y = spawnAtCenter ? height / 2 : random(height * 0.24, height * 0.78);
  const freshWord = new Information(x, y, {
    str: issue.term,
    count: issue.count || 1,
    isShared: true,
    updatedAt: issue.updated_at || new Date().toISOString()
  });

  if (spawnAtCenter) {
    freshWord.vel = p5.Vector.random2D().mult(random(2, 5));
  }

  words.push(freshWord);
  sharedWordMap.set(key, freshWord);
  pruneWords();
  return freshWord;
}

async function hydrateSharedIssues() {
  if (!window.socialIssuesStore) return;
  const issues = await window.socialIssuesStore.listIssues(MAX_SHARED_WORDS);
  issues.forEach((issue) => {
    syncSharedIssue(issue, { spawnAtCenter: true });
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Oxanium");
  textAlign(CENTER, CENTER);

  for (let i = 0; i < INITIAL_WORD_COUNT; i++) {
    words.push(new Information(width / 2, height / 2));
  }

  hydrateSharedIssues();
}

async function addWordToSketch(newWord) {
  const cleaned = newWord.trim().replace(/\s+/g, " ");
  if (!cleaned) return;

  let savedIssue = {
    term: cleaned,
    normalized_term: normalizeIssueTerm(cleaned),
    count: 1
  };

  if (window.socialIssuesStore) {
    const result = await window.socialIssuesStore.submitIssue(cleaned);
    if (result) savedIssue = result;
  }

  syncSharedIssue(savedIssue, { spawnAtCenter: true });
}

function draw() {
  background(225, 225, 222);

  if (isShrinking) shrinkTimer += 0.015;

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
  constructor(x, y, options = {}) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.str = options.str || random(vocabulary);
    this.count = options.count || 1;
    this.isShared = Boolean(options.isShared);
    this.updatedAt = options.updatedAt || null;
    this.maxSpeed = 3.5;
    this.noiseOffset = random(1000);
    this.alpha = 255;
    this.highlightFrames = this.isShared ? 90 : 0;
  }

  bump() {
    this.highlightFrames = 90;
    this.updatedAt = new Date().toISOString();
  }

  getDisplaySize() {
    if (!this.isShared) return 17;

    const boostedSize = sharedTextSize(this.count);
    const activityScale = getIssueActivityScale(this.updatedAt);
    return lerp(17, boostedSize, activityScale);
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
    let n = noise(this.noiseOffset + frameCount * 0.004);
    let flow = p5.Vector.fromAngle(n * TWO_PI * 2);
    flow.x *= 3.0;
    flow.mult(0.25);
    this.acc.add(flow);

    let center = createVector(width / 2, height / 2);
    let target = p5.Vector.sub(center, this.pos);
    let d = target.mag();

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

    for (let other of allWords) {
      if (other === this) continue;
      let dOther = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      const personalSpace = wordSpacingRadius(this) + wordSpacingRadius(other);
      if (dOther > 0 && dOther < personalSpace) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize();
        diff.div(max(dOther, 1));
        diff.mult(this.isShared || other.isShared ? 1.4 : 0.8);
        this.acc.add(diff);
      }
    }

    if (dist(this.pos.x, this.pos.y, mouseX, mouseY) < 240) {
      let repulsion = p5.Vector.sub(this.pos, createVector(mouseX, mouseY));
      repulsion.setMag(this.maxSpeed * 2.2);
      let mSteer = p5.Vector.sub(repulsion, this.vel);
      mSteer.limit(0.8);
      this.acc.add(mSteer);
    }

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

    this.highlightFrames = max(0, this.highlightFrames - 1);

    if (!isShrinking) {
      this.pos.y = constrain(this.pos.y, 180, height - 40);
      this.pos.x = constrain(this.pos.x, 20, width - 20);
    }
  }

  display() {
    noStroke();
    const size = this.getDisplaySize();
    textSize(size);
    fill(0, max(0, this.alpha));
    if (this.isShared && this.highlightFrames > 0) {
      fill(0, 0, 0, max(180, this.alpha));
    }
    text(this.str, this.pos.x, this.pos.y);
  }
}
