import * as BMath from './bMath.js';
import * as Phys from './basePhysics.js';
import * as Load from './load.js';

const PIXEL_LETTERS = {
    'A': [
        [, 1],
        [1, , 1],
        [1, , 1],
        [1, 1, 1],
        [1, , 1]
    ],
    'B': [
        [1, 1],
        [1, , 1],
        [1, 1, 1],
        [1, , 1],
        [1, 1]
    ],
    'C': [
        [1, 1, 1],
        [1],
        [1],
        [1],
        [1, 1, 1]
    ],
    'D': [
        [1, 1],
        [1, , 1],
        [1, , 1],
        [1, , 1],
        [1, 1]
    ],
    'E': [
        [1, 1, 1],
        [1],
        [1, 1, 1],
        [1],
        [1, 1, 1]
    ],
    'F': [
        [1, 1, 1],
        [1],
        [1, 1],
        [1],
        [1]
    ],
    'G': [
        [, 1, 1],
        [1],
        [1, , 1, 1],
        [1, , , 1],
        [, 1, 1]
    ],
    'H': [
        [1, , 1],
        [1, , 1],
        [1, 1, 1],
        [1, , 1],
        [1, , 1]
    ],
    'I': [
        [1, 1, 1],
        [, 1],
        [, 1],
        [, 1],
        [1, 1, 1]
    ],
    'J': [
        [1, 1, 1],
        [, , 1],
        [, , 1],
        [1, , 1],
        [1, 1, 1]
    ],
    'K': [
        [1, , , 1],
        [1, , 1],
        [1, 1],
        [1, , 1],
        [1, , , 1]
    ],
    'L': [
        [1],
        [1],
        [1],
        [1],
        [1, 1, 1]
    ],
    'M': [
        [1, 1, 1, 1, 1],
        [1, , 1, , 1],
        [1, , 1, , 1],
        [1, , , , 1],
        [1, , , , 1]
    ],
    'N': [
        [1, , , 1],
        [1, 1, , 1],
        [1, , 1, 1],
        [1, , , 1],
        [1, , , 1]
    ],
    'O': [
        [1, 1, 1],
        [1, , 1],
        [1, , 1],
        [1, , 1],
        [1, 1, 1]
    ],
    'P': [
        [1, 1, 1],
        [1, , 1],
        [1, 1, 1],
        [1],
        [1]
    ],
    'Q': [
        [0, 1, 1],
        [1, , , 1],
        [1, , , 1],
        [1, , 1, 1],
        [1, 1, 1, 1]
    ],
    'R': [
        [1, 1],
        [1, , 1],
        [1, , 1],
        [1, 1],
        [1, , 1]
    ],
    'S': [
        [, 1, 1],
        [1],
        [1, 1, 1],
        [, , 1],
        [1, 1, ]
    ],
    'T': [
        [1, 1, 1],
        [, 1],
        [, 1],
        [, 1],
        [, 1]
    ],
    'U': [
        [1, , 1],
        [1, , 1],
        [1, , 1],
        [1, , 1],
        [1, 1, 1]
    ],
    'V': [
        [1, , , , 1],
        [1, , , , 1],
        [, 1, , 1],
        [, 1, , 1],
        [, , 1]
    ],
    'W': [
        [1, , , , 1],
        [1, , , , 1],
        [1, , , , 1],
        [1, , 1, , 1],
        [1, 1, 1, 1, 1]
    ],
    'X': [
        [1, , 1],
        [1, , 1],
        [, 1, ],
        [1, , 1],
        [1, , 1]
    ],
    'Y': [
        [1, , 1],
        [1, , 1],
        [, 1],
        [, 1],
        [, 1]
    ],
    'Z': [
        [1, 1, 1, 1, 1],
        [, , , 1],
        [, , 1],
        [, 1],
        [1, 1, 1, 1, 1]
    ],
    '0': [
        [1, 1, 1],
        [1, , 1],
        [1, , 1],
        [1, , 1],
        [1, 1, 1]
    ],
    '1': [
        [,1],
        [1, 1],
        [, 1],
        [, 1],
        [1, 1,1]
    ],
    '2': [
        [, 1, ],
        [1, , 1],
        [, , 1],
        [, 1, ],
        [1, 1, 1]
    ],
    '3': [
        [1, 1, 1],
        [, , 1],
        [1, 1, 1],
        [, , 1],
        [1, 1, 1]
    ],
    '4': [
        [1, , 1],
        [1, , 1],
        [1, 1, 1],
        [, , 1],
        [, , 1]
    ],
    '5': [
        [1, 1, 1],
        [1, , ],
        [1, 1, ],
        [, , 1],
        [1, 1, ]
    ],
    '6': [
        [1, 1, 1],
        [1, , ],
        [1, 1, 1],
        [1, , 1],
        [1, 1, 1]
    ],
    '7': [
        [1, 1, 1],
        [, , 1],
        [, , 1],
        [, , 1],
        [, , 1]
    ],
    '8': [
        [1, 1, 1],
        [1, , 1],
        [1, 1, 1],
        [1, , 1],
        [1, 1, 1]
    ],
    '9': [
        [1, 1, 1],
        [1, , 1],
        [1, 1, 1],
        [, , 1],
        [1, 1, 1]
    ],
    ' ': [
        [, ,],
        [, ,],
        [, ,],
        [, ,],
        [, ,]
    ],
    ':': [
        [, ,],
        [1, ,],
        [, ,],
        [1, ,],
        [, ,]
    ],
    '.': [
        [, ,],
        [, ,],
        [, ,],
        [, ,],
        [1, ,]
    ],
    '!': [
        [, 1,],
        [, 1,],
        [, 1,],
        [, ,],
        [, 1,]
    ], '-': [
        [, ,],
        [, ,],
        [1, 1,1],
        [, ,],
        [, ,]
    ],
    '(': [
        [,1,],
        [1, ,],
        [1, ,],
        [1, ,],
        [, 1,]
    ],
    ')': [
        [,1,],
        [, ,1],
        [, ,1],
        [, ,1],
        [, 1,]
    ],
    '+': [
        [,,],
        [, 1,],
        [1, 1,1],
        [, 1,],
        [, ,]
    ],
    '/': [
        [,,1],
        [,,1],
        [, 1,],
        [, 1,],
        [1, ,],
        [1, ,]
    ],
    '<': [
        [,,1],
        [,1,],
        [1, ,],
        [, 1,],
        [, ,1],
        [, ,]
    ],
    '>': [
        [1,,],
        [,1,],
        [,,1],
        [,1,],
        [1,,],
        [,,]
    ],
};
const TILE_SIZE = 8;
const MAX_CAMERA_SPEED = 16;
const CAMERA_DELAY = TILE_SIZE*3;

const IMAGES = {
    "BOOSTER_IMG": "Booster.png",
    "WALL_TILESET": "Classic Tiles.png",
    "ICE_TILESET": "Ice.png",
    "SPIKE_TILESET": "CrystalSpikes.png",
    "PLAYER": "Player.png",
    "BG": "Background.png",
};

let ANIMS = {
    "EYEBOX": "Eyebox.json",
    "MUSHROOM": "Mushroom.json",
};

let animTime = 0;

const toggleFullscreen = (event) => {
   const fullScreen = document.fullscreenElement;
   if(fullScreen) {
        document.exitFullscreen();
        document.getElementById("start").style.display = "block";
   } else {
        document.documentElement.requestFullscreen();
        document.getElementById("start").style.display = "none";
   }
};
let CTX = null;
let CANVAS = null;
const CANVAS_SIZE = [320,180];

async function init() {
    setupCanvas();
    for(const animId of Object.keys(ANIMS)) {
        const fileName = ANIMS[animId];
        let animData = await Load.loadJsonFile(fileName, Load.ANIM_FILE_PATH);
        const meta = animData.meta;
        const frameTags = meta["frameTags"];
        if(frameTags.length > 0) {
            let newAnimData = {};
            frameTags.forEach(tag => {
                newAnimData[tag["name"].toUpperCase()] = new AnimationData(animData["frames"], meta["image"], tag["from"], tag["to"], tag["direction"]);
            });
            animData = newAnimData;
        } else {
            animData = new AnimationData(animData["frames"], meta["image"]);
        }
        ANIMS[animId] = animData;
    }
}

class Sprite {
    constructor({
        img = null,
        direction: direction = BMath.VectorUp,
        w=16, h=16,
        offset=BMath.VectorZero,
        flip = false
    }) {
        this.offsetRect = new BMath.Rectangle(offset.x, offset.y, (!this.img || w) ? w : this.img.width, (!this.img || h) ? h : this.img.height);
        this.setImg(img);
        this.options = {
            direction: direction,
            sx: this.offsetRect.getX(), sy: this.offsetRect.getY(),
            w: this.offsetRect.width, h: this.offsetRect.height,
        };
    }

    setImg(img) {this.img = img;}

    draw(x, y, options=this.options, flip=false) {
        drawImage(x, y, this.img, options, flip);
    }
}

function drawImage(x, y, img, options, flip=false) {
    if(options) {
        /*const rad = BMath.vToRad(options["direction"]);
        let uberOffset = BMath.Vector({x: 0, y: 0});

        switch (options["direction"]) {
            case BMath.VectorUp:
                break;
            case BMath.VectorLeft:
                uberOffset.y = img.height;
                break;
            case BMath.VectorRight:
                uberOffset.x = img.width;
                break;
            case BMath.VectorDown:
                uberOffset.x = img.width;
                uberOffset.y = img.height;
                break;
            default:
                break;
        }*/
        // drawRotated(x+cameraOffset.x+uberOffset.x, y+cameraOffset.y+uberOffset.y, 0, img, options.sx, options.sy, options.w, options.h);
        drawRotated(x+cameraOffset.x, y+cameraOffset.y, 0, img, options.sx, options.sy, options.w, options.h, flip);
    } else {
        CTX.drawImage(img, x+cameraOffset.x, y+cameraOffset.y);
    }
}

function drawBG() {
    let w = 320;
    let h = 180;
    CTX.drawImage(IMAGES.BG,0,0,w,h,0,0,w,h);
}

class AnimationData extends Sprite {
    constructor(frameData, spriteSheetFileName, from, to, direction=BMath.VectorUp, playDirection="forward") {
        from = from || 0;
        to = to || Object.keys(frameData).length;
        const frameNames = Object.keys(frameData).filter((frame, ind) => {
            return ind >= from && ind <= to;
        });
        const animationFrames = frameNames.map(fname => new AnimationFrame(frameData[fname]));
        super(animationFrames[0].options);
        const i = new Image();
        i.src = "images/" + spriteSheetFileName;
        this.setImg(i);
        this.animationFrames = animationFrames;
        this.direction = direction;
        this.maxFrame = to-from;
        // this.loop = playDirection === "loop";
    }

    frameDuration(frame) {
        return this.animationFrames[frame].options.duration;
    }

    draw(x, y, frame, direction)  {
        const op = this.animationFrames[frame].options;
        op.direction = direction;
        super.draw(x, y, op);
    }
}

class AnimationPlayer {
    constructor(animationData, loop=false, direction) {
        this.aData = animationData;
        this.loop = loop;
        this.curFrame = 0;
        this.playing = false;
        this.direction = direction;
        this.elapsed = 0;
    }

    draw(x, y) {
        this.aData.draw(x,y, this.curFrame, this.direction);
    }

    update() {
        if(this.playing) {
            this.elapsed += Phys.timeDelta;
            const duration = this.aData.frameDuration(this.curFrame);
            if(this.elapsed > duration) {
                this.elapsed -= duration;
                this.curFrame += 1;
                if(this.loop) {
                    this.curFrame = this.curFrame%this.aData.maxFrame;
                } else {
                    if(this.curFrame >= this.aData.maxFrame) {
                        this.playing = false;
                        this.curFrame = 0;
                    }
                }
            }
        }
    }

    play() {
        this.playing = true;
    }
}

class AnimationFrame {
    constructor(data) {
        const rectData = data["frame"];
        this.options = {
            w:rectData["w"], h:rectData["h"],
            sx:rectData["x"], sy:rectData["y"],
            duration: data["duration"],
        };
    }
}

function fullScreen() {CANVAS.requestFullscreen();}
function setupCanvas() {
    // const dpr = (window.devicePixelRatio || 1) / CANVAS_SCALAR;
    // Get the device pixel ratio, falling back to 1.
    // Get the size of the canvas in CSS pixels.
    // const rect = canvas.getBoundingClientRect();
    // Give the canvas pixel dimensions of their CSS
    // size * the device pixel ratio.
    // canvas.width = rect.width * dpr;
    // canvas.height = rect.height * dpr;
    Object.keys(IMAGES).forEach(id => {
        const imgObj = new Image();
        imgObj.src = "./images/" + IMAGES[id];
        IMAGES[id] = imgObj;
    });
    CANVAS = document.createElement("canvas");
    CANVAS.width = 320;
    CANVAS.height = 180;
    CANVAS.style.width = screen.width + "px";
    CANVAS.style.height = screen.height + "px";
    document.body.insertBefore(CANVAS, document.body.childNodes[0]);
    const ctx = CANVAS.getContext('2d');
    fullScreen();
    CTX = ctx;
}
let cameraOffset = BMath.Vector({x:0, y:0});
let fCameraOffset = BMath.Vector({x:0, y:0});
let prevCameraD2X = 0;
let cameraSize = BMath.Vector({x:CANVAS_SIZE[0],y:CANVAS_SIZE[1]});

const applyCameraSmooth = (val) => {
    if (Math.abs(val) < 0.1) val = 0;
    let sub = val * 0.15;
    if (Math.abs(sub) > CAMERA_DELAY) sub = val * 0.2;
    if (Math.abs(sub) > MAX_CAMERA_SPEED) sub = Math.sign(sub) * MAX_CAMERA_SPEED;
    return sub;
};

function centerCamera(pos, minBound, maxBound) {
    let newCenterX = -pos.x+CANVAS_SIZE[0]/2;
    let newCenterY = -pos.y+CANVAS_SIZE[1]/2;
    if(newCenterX > -minBound.x) newCenterX = -minBound.x;
    else if(-(newCenterX-CANVAS_SIZE[0]) > maxBound.x) newCenterX = -(maxBound.x-CANVAS_SIZE[0]);

    if(pos.y - CANVAS_SIZE[1]/2 < minBound.y) newCenterY = -minBound.y;
    else if(-newCenterY+CANVAS_SIZE[1] > maxBound.y) newCenterY = -maxBound.y+CANVAS_SIZE[1];

    let d2x = fCameraOffset.x - newCenterX;
    let d2y = fCameraOffset.y - newCenterY;
    fCameraOffset.x -= applyCameraSmooth(d2x);
    fCameraOffset.y -= applyCameraSmooth(d2y);
    cameraOffset.x = Math.round(fCameraOffset.x);
    cameraOffset.y = Math.round(fCameraOffset.y);
    prevCameraD2X = d2x;
}

function drawRectOnCanvas(rect, color = "#29ADFF", notCameraOffset) {
    CTX.fillStyle = color;
    const p = notCameraOffset ? rect.pos : rect.pos.addPoint(cameraOffset);
    CTX.fillRect(p.x, p.y, rect.width, rect.height);
}

/**
 * A linear interpolator for hexadecimal colors
 * @param {String} a
 * @param {String} b
 * @param {Number} amount
 * @example
 * // returns #7F7F7F
 * lerpColor('#000000', '#ffffff', 0.5)
 * @returns {String}
 */
function colorLerp(a, b, amount) {
    let ah = +a.substring(0,7).replace('#', '0x'),
    ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
    bh = +b.substring(0,7).replace('#', '0x'),
    br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
    rr = ar + amount * (br - ar),
    rg = ag + amount * (bg - ag),
    rb = ab + amount * (bb - ab);

    let aa = parseInt(a.substring(7), 16);
    let ba = parseInt(b.substring(7), 16);
    let ra = aa + Math.floor((ba-aa)*amount);
    ra = ra.toString(16);
    ra = (ra.length === 1 ? "0" : "") + ra;

    return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1) + ra;
}

function writeText(txt, size, pos, color, spacing, notCameraOffset) {
    let needed = [];
    txt = txt.toUpperCase(); // because I only did uppercase letters
    for (let i = 0; i < txt.length; i++) {
        const letter = PIXEL_LETTERS[txt.charAt(i)];
        if (letter) { // because there's letters I didn't do
            needed.push(letter);
        }
    }
    spacing = spacing ? spacing : 0;
    CTX.fillStyle = color ? color : 'black';
    let currX = pos.x;
    // size = Math.round((CANVAS_SCALAR*-0.5+3)*size);
    for (let i = 0; i < needed.length; i++) {
        const letter = needed[i];
        let currY = pos.y;
        let addX = 0;
        for (let y = 0; y < letter.length; y++) {
            let row = letter[y];
            for (let x = 0; x < row.length; x++) {
                if (row[x]) {
                    const writeX = currX + x * size + (notCameraOffset ? 0 : cameraOffset.x);
                    const writeY = currY+ (notCameraOffset ? 0 : cameraOffset.y);
                    CTX.fillRect(writeX, writeY, size, size);
                }
            }
            addX = Math.max(addX, row.length * size);
            currY += size;
        }
        currX += size + addX+spacing;
    }
}

function drawEllipseOnCanvas(x, y, rad, color, notCameraOffset) {
    CTX.fillStyle = color ? color : "#ffffff";
    CTX.beginPath();
    let p = BMath.Vector({x:x, y:y});
    if(!notCameraOffset) p.incrPoint(cameraOffset);
    CTX.ellipse(p.x, p.y, rad, rad, 0, 0, Math.PI*2, true);
    CTX.fill();
}

function drawRotated(x, y, rad, image, sx, sy, w, h, flip=false){
    CTX.save();
    CTX.translate(x,y);
    CTX.rotate(rad);

    if (flip) {
        CTX.scale(-1, 1); // Set scale to flip the image
        CTX.translate(-w, 0);
    }

    CTX.drawImage(image,sx,sy,w,h,0,0,w,h);
    // CTX.drawImage(image,0,0,w,h,0,0,w,h);
    // console.log(image);
    // CTX.drawImage(image, 0, 0);
    CTX.restore();
}

function clearCanvas() {CANVAS.width = CANVAS.width;}

function update() {
    animTime = (animTime+Phys.timeDelta)%1000;
}

export {
    CANVAS, CTX, CANVAS_SIZE, update,
    TILE_SIZE, animTime,
    IMAGES, drawImage, clearCanvas, fullScreen,
    cameraOffset, cameraSize, centerCamera,
    drawRectOnCanvas, drawEllipseOnCanvas, colorLerp,
    Sprite, init, ANIMS, AnimationPlayer,
    writeText, drawBG,
}