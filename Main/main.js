/*
  &&%%%%%#, #&&%%%%@&/ /&%.    @&( ,&&&%%%%%#       *&&&@&%%%#  ///////////// .&&&&&@@&%  &&&&&@@&%,
 &&(        #&%,***&%/ /&%.    &&( *@&/,,,,,           (&&#     //#########// .&&(,,,,,   &&#,,,,,.
 @&(        #&@###%&%/ /&%.    &&( ,&&%######          (&&#     //#########//  ,@&&&&&&%   @&&&&&&%,
 &&(        %&#   .@&/  .#&&(&&%.  ,&%*                (&@%     //#########//        #@%        *@%,
  %%&&&%%%, #&#   .%%/     /%/     .#&&&%%%%#          (%%(     ///////////// .%%%&&&%%#  %%%&&&%%%,

  Super Cave Toss source code by Alex Yang
  Development started 4/5/2021.
  Physics code lightly influenced by Maddy Thorson's article at https://maddythorson.medium.com/celeste-and-towerfall-physics-d24bd2ae0fc5.
  Level editor: Ogmo 3 (created by Maddy Thorson)
*/

/*
* Story ideas:
* - Prologue
*     - Play as a human who falls down a large mineshaft
* - Act 1
*     - Mine inhabited by a bunch of mining robots
*     - Humans left for unknown reason, abandoning the robots
*     - Robots built without arms -> can't throw boxes
*     - But they can teleport
*     - Meet the robot in the first chapter, they teleport around and stuff
* - Second chapter:
*     - Sticky block levels. Play through abt half the chapter.
*     - find an exit ticket with robot. Ticket is only good for one spot.
*     - Robot fight: you have to throw the sticky at the robot and touch him in order to kill him to proceed.
*     - Robot attacks by calling down drills to crush the player?
*     - End fight: robot's head gets knocked off. Robot (as the head/box) can now fit in the elevator.
* - Third chapter
*     - Take the robot's controller.
*     - Freeze block levels. Press x for the head to freeze (hover) in midair. Press x again to teleport the head back to you.
*     - Eventually make it to the lift
*     - Roll credits
*
* Music ideas
*     A https://pixelizer.bandcamp.com/album/emotional-road-001-free-download-free-to-use
*     B https://pixelizer.bandcamp.com/album/emotional-road-002-free-download-free-to-use
*     C https://pixelizer.bandcamp.com/album/emotional-road-003-free-download-free-to-use
*     D https://pixelizer.bandcamp.com/album/emotional-road-004-free-download-free-to-use
*     E https://pixelizer.bandcamp.com/album/emotional-road-005-free-download-creative-commons
*     Music by Dreamy Man
*     - Prologue: cave toss music/D-Discovery
*     - Act 1: A-Space Vibrations
*     - Act 2: A-Evolution/D-Discovery 2/C-Tenderness
*     - Act 3: A-Intrapersonal (Cut 1:00-1:28, 1:36-2:20 good) /D-Discovery 3/A-Alternative Vision
*           - boss: D-People's Justice (1:21 has spot w/out alarm)
*     - Credits: A-Evolution(start 1:47)/A-Game Wave/C-The End/C-Fusion/B-Diminished Reality
*           - https://www.storyblocks.com/audio/stock/sport-electro-bletfkjihk2yswg3f.html
*             A-Awakening Of Consciousness
*             E-Let's Go
* */

/*
* Wall grind - 9/skateboard
*
* */

import * as BMath from './bMath.js';
import * as Graphics from './graphics.js';
import * as Phys from './basePhysics.js';
import * as Map from './map.js';
import * as Load from './load.js';

const SCREEN_SHAKES = [
    BMath.Vector({x: 0, y:0}),
    BMath.Vector({x: -2, y:-2}),
    BMath.Vector({x: -2, y:-2}),
    BMath.Vector({x: 0, y:-2}),
    BMath.Vector({x: 0, y:-2}),
    BMath.Vector({x: 2, y:0}),
    BMath.Vector({x: 2, y:0}),
    BMath.Vector({x: 0, y:0}),
    BMath.Vector({x: 0, y:0}),
];

class Option {
    constructor(txt, pos, zPressed) {
        this.txt = txt;
        this.pos = pos;
        this.color = "#C2C3C7";
        this.zPressed = zPressed;
    }

    draw(selected) {
        Graphics.writeText(
            this.getFormattedTxt(selected),
            1,
            this.pos,
            selected ? this.color : "#5F574F",
            0,
            true,
        )
    }

    setKeys(k) {
        if(k["KeyZ"] === 2) this.zPressed();
    }

    getFormattedTxt() {return this.txt}
}

class SliderOption extends Option {
    constructor(txt, pos, valChange) {
        super(txt, pos, null);
        this.valChange = valChange;
        this.val = 10;
    }

    getFormattedTxt(selected) {
        return this.txt.replace(" {{val}} ", selected ? `\<${this.val}\>` : this.val);
    }

    setKeys(k) {
        let valChange = false;
        if(k["ArrowLeft"] === 2) {
            this.val = Math.max(this.val-1, 0);
            valChange = true;
        } else if(k["ArrowRight"] === 2) {
            this.val = Math.min(this.val+1, 10);
            valChange = true;
        }
        if(valChange) {
            this.valChange(this.val);
            // audioCon.playSoundEffect(PING_SFX);
        }
    }
}

class BrokenTextOption extends Option {
    constructor(txt, pos, onFill, onCorrect) {
        super(txt, pos, null);
        this.brokenTextField = new BrokenTextField(this.pos.addPoint(BMath.Vector({x:0, y:8})), onFill, 6, onCorrect);
    }

    setKeys(k) {
        this.brokenTextField.setKeys(k);
    }

    draw(selected) {
        super.draw(selected);
        if(selected) {this.brokenTextField.draw("#FFF1E8");}
    }
}
class BrokenTextField {
    constructor(pos, onFill, length, onCorrect) {
        this.pos = pos;
        this.onFill = onFill;
        this.onCorrect = onCorrect;
        this.length = length;
        this.reset();
        this.shakeWrongFrames = 0;
        this.shakeRightFrames = 0;
    }

    draw() {
        const offset = BMath.Vector({x:0, y:0});
        let specialColor = null;
        if(this.shakeWrongFrames > 0) {
            this.shakeWrongFrames -= 1;
            offset.x = Math.round(Math.sin(this.shakeWrongFrames*Math.PI/4));
            specialColor = "#FF004D";
            if(this.shakeWrongFrames === 0) this.reset();
        } else if(this.shakeRightFrames > 0) {
            this.shakeRightFrames -= 1;
            offset.y = Math.round(2*Math.sin(this.shakeRightFrames*Math.PI/6));
            specialColor = "#00E436";
            if(this.shakeRightFrames === 0) {
                this.onCorrect(this.getTextString());
                this.reset();
            }
        }
        for(let i = 0; i<this.length; ++i) {
            const white = (this.curInd === i) && Math.floor(Graphics.animFrame/4) > 3;
            let color = null;
            if(specialColor != null) {color = specialColor;}
            else {color = white ? "#FFF1E8" : "#5F574F";}
            Graphics.drawRectOnCanvas(new BMath.Rectangle(this.pos.x+i*8+offset.x, this.pos.y+8+offset.y, 6, 1), color, true);
            Graphics.writeText(this.txt[i], 1, this.pos.addPoint(BMath.Vector({x:1+i*8, y:1})).addPoint(offset), color, 2, true);
        }
    }

    setKeys(k) {
        const btf = this;
        Object.keys(k).map(function(key) {
            if((key.includes("Key") || key.includes("Digit")) && k[key] === 2) {
                btf.txt[btf.curInd] = key.slice(-1);
                btf.curInd = Math.min(btf.curInd+1, btf.length-1);
                // audioCon.playSoundEffect(PING_SFX);
            }
        });
        const kBack = k["Backspace"];
        if(!this.prevBack && kBack) {
            this.curInd = Math.max(0, this.curInd-1);
            this.txt[this.curInd] = "";
            // audioCon.playSoundEffect(PONG_SFX);
        }
        //     this.curInd = Math.max(this.curInd-1, 0);
        //     audioCon.playSoundEffect(PONG_SFX);
        // } else if(!this.prevRight && kRight) {
        //     this.curInd = Math.min(this.curInd+1, this.length-1);
        //     audioCon.playSoundEffect(PONG_SFX);
        // }
        this.prevBack = kBack;
        if(this.shakeWrongFrames === 0 && this.shakeRightFrames === 0 && this.getTextString().length === this.length) {
            this.onFill(this, this.getTextString());
        }
    }

    getTextString() {return this.txt.join("");}

    reset() {
        this.curInd = 0;
        this.txt = [];
        for(let i = 0; i<this.length; ++i) {this.txt.push("");}
    }

    shakeWrong() {
        this.shakeWrongFrames = 20;
    }

    shakeRight() {this.shakeRightFrames = 20;}
}

class OptionsController {
    constructor() {
        this.bgRect = new BMath.Rectangle(0, 0, Graphics.CANVAS_SIZE[0], Graphics.CANVAS_SIZE[1]);
        this.optionsPos = BMath.Vector({x:30, y:30});
        this.optionsRect = new BMath.Rectangle(this.optionsPos.x, this.optionsPos.y, Graphics.CANVAS_SIZE[0]-this.optionsPos.x*2, Graphics.CANVAS_SIZE[1]-this.optionsPos.y*2);
        this.otherRect = new BMath.Rectangle(this.optionsPos.x-2, this.optionsPos.y-2, Graphics.CANVAS_SIZE[0]-this.optionsPos.x*2+4, Graphics.CANVAS_SIZE[1]-this.optionsPos.y*2+4);
        this.showing = false;
        this.optionInd = 0;
        this.options = [
            new Option("Resume", this.optionsPos.addPoint({x:4, y:14}), () => {this.showing = false; Graphics.fullScreen();}),
            new SliderOption("Music vol: {{val}} ", this.optionsPos.addPoint({x:4, y:20}), (val) => {audioCon.setMusicVolume(val*0.1);}),
            new SliderOption("SFX vol: {{val}} ", this.optionsPos.addPoint({x:4, y:26}), (val) => {audioCon.setSFXVolume(val*0.1);}),
            new BrokenTextOption(
                "Cheat code",
                this.optionsPos.addPoint({x:4, y:32}),
                (field, text) => {
                    text = text.toLowerCase();
                    if(game.checkCheatCode(text)) {
                        field.shakeRight();
                        // audioCon.playSoundEffect(CORRECT_SFX);
                    } else {
                        // audioCon.playSoundEffect(INCORRECT_SFX);
                        field.shakeWrong();
                    }},
                (text) => {
                    this.showing = false;
                    game.applyCheatCode(text.toLowerCase());
                }
                ),
        ]
    }

    draw() {
        Graphics.drawRectOnCanvas(this.bgRect, "#00000080", true);
        Graphics.drawRectOnCanvas(this.otherRect, "#1D2B53", true);
        Graphics.drawRectOnCanvas(this.optionsRect, "#000000", true);
        Graphics.writeText("Options", 1, this.optionsPos.addPoint(BMath.Vector({x:4,y:4})), "#FFF1E8", 0, true);

        this.options.forEach((option, i) => {
            option.draw(i === this.optionInd);
        });
    }

    setKeys(k) {
        const len = this.options.length;
        let incrBy = 0;
        const kDown = k["ArrowDown"];
        const kUp = k["ArrowUp"];
        if(!this.prevDown && kDown) incrBy = 1;
        else if(!this.prevUp && kUp) incrBy = -1;
        // if(incrBy !== 0) audioCon.playSoundEffect(PONG_SFX);

        this.optionInd = (this.optionInd+(incrBy)+len)%len;
        this.options[this.optionInd].setKeys(k);
        this.prevUp = kUp;
        this.prevDown = kDown;
    }

    toggleOptions() {
        this.showing = !this.showing;

    }
}

const optionsCon = new OptionsController();

let frameCounter = 0;
frameCounter += 1;

class Game {
    constructor(levelDatas) {
        this.startTime = window.performance.now();
        this.levels = levelDatas.map(data => new Map.Level(data.json, this));
        this.roomInd = 0;
        this.deaths = 0;
        this.numLevels = levelDatas.length;

        this.screenShakeFrames = 0;
        const scoreBoardWidth = 44;
        this.scoreboardRect = new BMath.Rectangle(Graphics.CANVAS_SIZE[0]-scoreBoardWidth-8, 4, 44, 35);
        this.scoreboardFrames = 90;
        this.cheated = false;
        this.emptySquareData = {x:-1, y:-1, rad:-1, color:null};

        this.fps = "-";
        this.avgDrawTime = "-";
        this.avgPhysTime = "-";
    }

    getCurrentLevel() {
        return this.levels[this.roomInd];
    }

    drawCurrentLevel() {
        const ret = this.getCurrentLevel().drawAll();
        if(this.scoreboardFrames > 0) this.drawScoreboard();
        if(this.emptySquareData.x !== -1) {
            this.drawEmptySquareAround(
                this.emptySquareData.x,
                this.emptySquareData.y,
                this.emptySquareData.rad,
                this.emptySquareData.color,
            )
        }
        if(optionsCon.showing) {
            optionsCon.draw();
        }
        return ret;
    }

    setDrawEmptySquareData(x, y, rad, color) {
        this.emptySquareData = {x:x, y:y, rad:rad, color:color};
    }

    stopDrawEmptySquare() {this.emptySquareData.x = -1;}

    getPlayer() {return this.getCurrentLevel().getPlayer();}
    drawEmptySquareAround(x, y, r, color) {
        const xmr = x-r;
        const ypr = y+r;
        const rects = [
            new BMath.Rectangle(0, 0, xmr, CANVAS_SIZE[1]),
            new BMath.Rectangle(xmr, 0, 2*r, y-r),
            new BMath.Rectangle(xmr, ypr, 2*r, CANVAS_SIZE[1]-ypr),
            new BMath.Rectangle(x+r, 0, CANVAS_SIZE[0]-x-r, CANVAS_SIZE[1])
        ];
        rects.map(r => drawRectOnCanvas(r, color ? color : "black"));
    }

    writeDebugMetric(metricName, metricVal, scoreboardOffset) {
        Graphics.writeText(
            metricName + ": " + (metricVal.toFixed ? metricVal.toFixed(3) : metricVal),
            1,
            this.scoreboardRect.getPos().addPoint(scoreboardOffset),
            "#FFF1E8",
            0,
            true
        );
    }

    drawScoreboard() {
        // const backgroundRect = new Rectangle(this.scoreboardRect.getX()-1, this.scoreboardRect.getY()-1, this.scoreboardRect.width+2, this.scoreboardRect.height+2);
        // drawOnCanvas(backgroundRect, "#7e2553");
        Graphics.drawRectOnCanvas(this.scoreboardRect, "#00000080", true);
        Graphics.writeText(this.formatTimeSinceStart(), 1, BMath.Vector({x:this.scoreboardRect.getX()+2, y:this.scoreboardRect.getY()+2}), this.cheated ? "#FF004D" : "#FFF1E8", 0, true);
        // CTX.drawImage(SKULL_IMG, this.scoreboardRect.getX()+1+this.cameraOffset.x, this.scoreboardRect.getY()+10+this.cameraOffset.y);
        Graphics.writeText(this.deaths.toString(), 1, BMath.Vector({x:this.scoreboardRect.getX()+10, y:this.scoreboardRect.getY()+11}), "#FFF1E8", 0, true);

        if(Phys.DEBUG) {
            this.writeDebugMetric("FPS", this.fps, BMath.Vector({x:10, y:18}));
            this.writeDebugMetric("DT", this.avgDrawTime, BMath.Vector({x:10, y:26}));
            this.writeDebugMetric("PT", this.avgPhysTime, BMath.Vector({x:10, y:32}));
        }

        // if(!this.onLastLevel()) Graphics.writeText(`${this.roomInd}/${NUM_LEVELS-2}`, 1, BMath.Vector({x:this.scoreboardRect.getX()+2, y:this.scoreboardRect.getY()+20}), "#FFF1E8");
        // if(this.roomInd > 0 && this.roomInd < 19) {
        //     Graphics.writeText(SECRET_CODES[this.roomInd-1], 1, BMath.Vector({x:this.scoreboardRect.getX()+2, y:this.scoreboardRect.getY()+28}), "#FFF1E8");
        // }
    }

    setKeys(keys) {
        if(!optionsCon.showing) {
            if(keys["KeyO"]  === 2) {this.nextRoom();}
            if(keys["KeyP"]  === 2) {
                this.roomInd -= 1;
                this.getCurrentLevel().getPlayer().setX(10);
                this.getCurrentLevel().killPlayer();
            }
            if(keys["KeyC"] || Phys.DEBUG) {this.scoreboardFrames += 1;}
            this.getCurrentLevel().setKeys(keys);
        } else {
            optionsCon.setKeys(keys)
        }
        if(keys["Enter"] === 2) {
            optionsCon.toggleOptions();
            if(!optionsCon.showing) Graphics.fullScreen();
        }
    }
    onLastLevel() {
        return this.roomInd + 1 === this.numLevels;
    }

    setDebugMetrics(avgDrawTime, avgPhysTime, fps) {
        this.avgDrawTime = avgDrawTime;
        this.avgPhysTime = avgPhysTime;
        this.fps = fps;
    }

    update() {
        if(!document.hasFocus()) Phys.pause();
        else Phys.play();
        Phys.tick();
        if(!optionsCon.showing) {
            this.getCurrentLevel().update();
            if(this.screenShakeFrames > 0) {
                this.shakeScreen();
            }
            if(this.scoreboardFrames > 0 && !this.onLastLevel()) {
                this.scoreboardFrames -= 1;
            }
        }
    }

    nextRoom() {
        this.setRoom(this.roomInd+1);
    }

    setRoom(ind) {
        this.roomInd = ind;
        if(this.roomInd > 0) {
            canvas.style.backgroundImage = 'url("images/Background.png")';
        }
        if(this.roomInd > 0 && this.roomInd < 11) {
            if(audioCon.curSong._src !== STAGE1_MUSIC._src && audioCon.curSong._src !== BEGINNING_MUSIC._src) {audioCon.playSong(STAGE1_MUSIC);}
            else {audioCon.queueSong(STAGE1_MUSIC);}
        } else if(this.roomInd > 10) {
            if(audioCon.curSong._src !== STAGE2_MUSIC._src) {audioCon.stopSong(); audioCon.playSong(STAGE2_MUSIC);}
            else {audioCon.queueSong(STAGE2_MUSIC);}
        }
        this.getCurrentLevel().resetStage();
        this.respawn();
        if(this.onLastLevel()) {
            this.scoreboardRect.pos = Vector({x: 46, y: 94});
            this.scoreboardRect.height = 20;
            const t = window.performance.now();
            this.nanosecondsSinceStart = () => {return t-this.startTime;};
            audioCon.fadeOutSong(750);
        }
    }

    formatTimeNs(ns) {return new Date(ns).toISOString().substr(11, 11)}
    nanosecondsSinceStart() {return window.performance.now()-this.startTime;}
    formatTimeSinceStart() {return this.formatTimeNs(this.nanosecondsSinceStart());}

    death() {
        this.deaths += 1;
        this.screenShakeFrames = 14;
        if(this.roomInd !== 0) this.spawnDusts(14);
    }

    startScreenShake() {
        if(this.screenShakeFrames === 0) {
            this.screenShakeFrames = 9;
            if(this.roomInd !== 0) this.spawnDusts(Math.random()*4+7);
        }
    }

    spawnDusts(numDusts) {
        for(let i = 0; i<numDusts; ++i) {
            const spawnX = Math.random()*CANVAS_SIZE[0];
            const curLevel = this.getCurrentLevel();
            const mult = Math.random()+3*3;
            const angleOffset = Math.random()*5;
            const dust = new BrownDust(Math.round(spawnX), Math.round(-5-Math.random()*50), Math.random()*3+0.5, new AnimatedSprite(
                BROWN_DUST_SPRITESHEET,
                null,
                [{"frames": 0, onComplete: null}, {"frames": 6, onComplete: null, nth: 10}]
            ),
                (frame) => {return Math.round(spawnX+(mult*Math.sin(frame/60*2*Math.PI+angleOffset)));},
                curLevel,
                );
            curLevel.pushDecoration(dust);
        }
    }

    shakeScreen() {
        this.screenShakeFrames -= 1;
        // this.cameraOffset.incrPoint(SCREEN_SHAKES[this.screenShakeFrames%8]);
        // canvas.style.backgroundPosition = `top ${this.cameraOffset.y*3}px left ${this.cameraOffset.x*2}px`;
    }

    endGame() {
        this.getCurrentLevel().endGame();
    }

    respawn() {this.scoreboardFrames = 90; this.deaths+=1;}

    onStickyLevel() {
        return this.roomInd === 10;
    }

    checkCheatCode(cheatCode) {
        return SECRET_CODES.includes(cheatCode);
    }

    applyCheatCode(cheatCode) {
        const ind = SECRET_CODES.indexOf(cheatCode);
        if(ind !== -1) {
            this.cheated = true;
            this.setRoom(ind+1);
        }
    }
}

let keys = {
    "ArrowRight": 0,
    "ArrowLeft": 0,
    "ArrowDown": 0,
    "ArrowUp": 0,
    "KeyW": 0,
    "KeyA": 0,
    "KeyS": 0,
    "KeyD": 0,
    "KeyZ": 0,
    "Space": 0,
    "KeyX": 0,
    "Backquote": 0,
    // "KeyO": 0,
    // "KeyP" : 0,
    "KeyC": 0,
    "KeyR" : 0,
    "Enter": 0,

    // "KeyA":0,
    // "KeyB":0,
    // "KeyD":0,
    // "KeyE":0,
    // "KeyF":0,
    // "Digit0":0,
    // "Digit1":0,
    // "Digit2":0,
    // "Digit3":0,
    // "Digit4":0,
    // "Digit5":0,
    // "Digit6":0,
    // "Digit7":0,
    // "Digit8":0,
    // "Digit9":0,
    // "Backspace":0,
};

let prevKeys = {...keys};
let game = null;
// game.start();

let drawTime = 0;
let avgDrawTime = 0;

let physTime = 0;
let avgPhysTime = 0;

let resetTimer = 0;
function g() {
    frameCounter += 1;
    drawTime = window.performance.now();
    Graphics.update();
    Graphics.clearCanvas();
    Graphics.drawBG();
    let drawObj = game.drawCurrentLevel();
    avgDrawTime += drawObj[0];

    physTime = window.performance.now();
    //Set pressed keys to 2 instead of 1
    Object.keys(keys).map(key => {
        if(keys[key] === 1 && prevKeys[key] === 0) {
           keys[key] = 2;
        } else if(keys[key] === 2 && prevKeys[key] === 2) {
            keys[key] = 1;
        }
    });
    prevKeys = {...keys};
    if(keys["Backquote"] === 2) Phys.toggleDebug();
    game.setKeys(keys);
    game.update();
    avgPhysTime += window.performance.now()-physTime;
    resetTimer += Phys.timeDelta;

    if(resetTimer > 3000) {
        game.setDebugMetrics(avgDrawTime/frameCounter, avgPhysTime/frameCounter, frameCounter/3);
        avgDrawTime = 0;
        avgPhysTime = 0;
        resetTimer = 0;
        frameCounter = 0;
    }
}

let stopMain = null;
function main() {
    stopMain = window.requestAnimationFrame(main);
    g();
}

async function start() {
    const roomDatas = await Load.loadJsonFiles(Load.LEVEL_FILENAMES, Load.LEVEL_FILE_PATH);
    await Graphics.init();
    game = new Game(roomDatas);
    main();
}

document.getElementById("start").addEventListener("click", e => {
    start();
});

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(event) {
    if(event.code in keys) {
        keys[event.code] = 1;
    }
}

function keyUpHandler(event) {
    if(event.code in keys) {keys[event.code] = 0;}
}

document.addEventListener('visibilitychange', function() {
    if(document.hidden) {
        optionsCon.showing = true;
    }
});