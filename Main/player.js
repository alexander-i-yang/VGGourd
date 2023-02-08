import * as BMath from './bMath.js';
import * as Phys from './basePhysics.js';
import * as Graphics from './graphics.js';
import {LAYER_NAMES} from './map.js';
import {Thrower} from './mechanics.js';
import {Vector, VectorZero} from "./bMath.js";

const X_SPEED = 0.12*Phys.PHYSICS_SCALAR;

const PLAYER_JUMP_V = -0.2*Phys.PHYSICS_SCALAR;
const COYOTE_TIME = 128;
const JUMP_JUST_PRESSED_TIME = 128;
const X_JUST_PRESSED_TIME = 64;

const CROUCH_HEIGHT = Graphics.TILE_SIZE;
const CROUCHING_SPEED = X_SPEED*0.5;

const PLAYER_WALLGRINDING_V = 0.047*Phys.PHYSICS_SCALAR;
const PLAYER_WALLJUMP_V = -0.15*Phys.PHYSICS_SCALAR;
const PLAYER_WALLJUMP_FORCE = 0.1*Phys.PHYSICS_SCALAR;
const PLAYER_WALLJUMP_TIMER = 128;
const PLAYER_WALLJUMP_GRACE_DISTANCE = 2*Phys.PHYSICS_SCALAR; //How far the player has to be from a wall in order to walljump
const WALLJUMP_COYOTE = 64;

const THROW_ANGLE = Math.PI/6;
const THROW_STRENGTH = 0.3;
const THROW_VELOCITY = BMath.Vector({x: Math.cos(THROW_ANGLE), y: -Math.sin(THROW_ANGLE)}).scalar(Phys.PHYSICS_SCALAR*THROW_STRENGTH);

const PICKUP_TARGET_OFFSET = BMath.Vector({x:-2, y:-16});

const hasWallGrindable = (arr) => {
    let ret = null;
    arr.some(solid => {
        if(solid.isWallGrindable()) {
            ret = solid;
            return true;
        }
    });
    return ret;
};

class Player extends Phys.Actor {
    constructor(x, y, w, h, level) {
        super(x, y, w, h, [
            LAYER_NAMES.WALLS,
            LAYER_NAMES.BREAKABLE,
            LAYER_NAMES.ONEWAY,
            LAYER_NAMES.STATIC_SPIKES,
            LAYER_NAMES.SPRINGS,
            LAYER_NAMES.THROWABLES,
            LAYER_NAMES.ICE,
        ], level, null, false);

        this.onCollide = this.onCollide.bind(this);
        this.squish = this.squish.bind(this);
        this.facing = false;
        this.jumpJustPressed = 0;
        this.xJustPressed = 0;
        this.coyoteTime = 0;
        this.xoyoteTime = 0;
        this.deathPos = BMath.Vector({x:0, y:0});
        this.wasOnGround = null;
        this.gyv = 0;
        this.movingPlatformCoyoteTime = 0;
        this.wallJumpCoyote = 0;
        this.actualWGObj = null;
        this.justTouching = null;
        this.setUpBoxJump = false;
        this.cHeld = 0;
        this.wallJumpTimer = 0;
        this.wallJumpObj = {ret:0, obj:null};
        this.thrower = new Thrower(THROW_VELOCITY, PICKUP_TARGET_OFFSET);


         // img = null,
        // direction: direction = BMath.VectorUp,
        // w=16, h=16,
        // offset=BMath.VectorZero
        // this.sprite = new Graphics.Sprite(Graphics.IMAGES.BOOSTER_IMG, null, 8, 12, VectorZero);
        this.sprite = new Graphics.Sprite({
            img: Graphics.IMAGES.PLAYER,
            direction: null,
            offset: VectorZero,
            w:8, h:12,
        });

        this.spriteOptions = {
            sx: 0, sy: 0,
            w: 8, h: 12,
            direction: 0
        };
    }

    onCollide(physObj, direction = null) {
        if(physObj === this.thrower.getPicking()) return true;
        const playerCollideFunction = physObj.onPlayerCollide();
        if(playerCollideFunction.includes("booster")) {
            if(physObj.carrying && this.isOverlap(physObj.carrying, direction)) return this.onCollide(physObj.carrying, direction);
            return false;
        }
        if(playerCollideFunction === "kill") {
            this.getLevel().killPlayer();
            return false;
        } else if(playerCollideFunction.includes("spring")) {
            physObj.bounceObj(this);
            return true;
        }

        if(playerCollideFunction.includes("wall")) {
            if(playerCollideFunction.includes("oneWay")) {
                if (!physObj.isSolid(direction, this)) {
                    return false;
                }
            } else if(playerCollideFunction.includes("breakable")) {
                if(!physObj.isSolid()) {
                    return false;
                } else {
                    physObj.playerTouch(this);
                }
            }
            if(playerCollideFunction.includes("button") && physObj.pushed) {return false;}
            if(direction.y > 0) {
                this.setYVelocity(0);
            } else if(direction.y < 0) {
                this.bonkHead();
            } else if(physObj.isLeftOf(this) || this.isLeftOf(physObj)) {
                this.setXVelocity(0);
            }
            return true;
        }
        return false;
    }

    draw() {
        this.sprite.draw(this.getX(), this.getY(), this.spriteOptions, this.facing);
        /* super.draw("#00ff00");
        Graphics.drawRectOnCanvas(new BMath.Rectangle(
            this.facing === -1 ? this.getX() : this.getX()+this.getWidth()-3,
            this.getY()+2,
            3, 3,
        ), "#000000");*/
    }

    onPlayerCollide() {
        return "";
    }

    isPushing(actor, direction) {return super.isPushing(actor, direction) || this.thrower.getPicking() === actor;}

    squish(pushObj, againstObj) {
        let kill = true;
        if(this.getHeight() > CROUCH_HEIGHT) {
            kill = this.crouch();
            // this.draw();
            this.forcedCrouch = true;
        }
        // alert(direction);
        if(kill && pushObj.isOnTopOf(this)) {this.getLevel().killPlayer(); return true;}
        return true;
        // throw new Error("function broken: doesn't check direction of physobjects");
        // if(againstObj!==this && (super.squish(pushObj, againstObj, direction) || (pushObj === this.getCarrying() && direction.y > 0 && this.getY() + this.getHeight() > againstObj.getY()))) {
        //     this.getRoom().killPlayer();
        //     return true;
        // }
    }

    respawnClone() {
        return new Player(this.spawn.x, this.spawn.y, this.origW, this.origH, this.level);
    }

    isBonkHead() {
        const normBonk = super.isBonkHead();
        if(this.thrower.getPicking()) {
            if(normBonk === this.thrower.getPicking()) {return false;}
            return normBonk || this.thrower.getPicking().isBonkHead();
        } else {
            return normBonk;
        }
    }

    jump() {
        this.setYVelocity(PLAYER_JUMP_V + Math.min(this.gyv/3, 0));
        this.coyoteTime = 0;
        this.movingPlatformCoyoteTime = 0;
        this.jumpJustPressed = 0;
        // audioCon.playSoundEffect(JUMP_SFX);
    }

    wallJump(direction) {
        // this.jump();
        // this.xForce = direction*-2;
        // this.xForceTimer = 14;

        // this.setYVelocity(Math.min(this.getYVelocity()+PLAYER_WALLJUMP_V,PLAYER_WALLJUMP_V));
        this.setYVelocity(PLAYER_WALLJUMP_V);
        this.setXVelocity(-direction*PLAYER_WALLJUMP_FORCE);
        // this.xForce = -direction*PLAYER_WALLJUMP_FORCE;
        this.wallJumpTimer = PLAYER_WALLJUMP_TIMER
    }

    releasePicking() {
        this.thrower.releasePicking();
    }

    pickUp(throwable) {
        if(this.isOnTopOf(throwable)) this.setYVelocity(throwable.getYVelocity());
        this.thrower.pickUp(throwable, this);
        this.xJustPressed = 0;
        this.xoyoteTime = 0;
    }

    crouch() {
        const h = this.getHeight();
        // alert();
        if(h > CROUCH_HEIGHT) {
            this.setHeight(h-1);
            const ret = this.moveY(1, this.onCollide);
            return ret;
        }
        return true;
    }

    setKeys(keys) {
        const onGround = this.isOnGround();
        const h = this.getHeight();

        const downKey = keys["ArrowDown"] || keys["KeyS"];
        const leftKey = keys["ArrowLeft"] || keys["KeyA"];
        const rightKey = keys["ArrowRight"] || keys["KeyD"];

        if(downKey) {
            this.crouch();
        } else if(h < Graphics.TILE_SIZE*1.5 && (onGround || !downKey)) {
            let topObj = this.thrower.getPicking() || this;
            const m = topObj.moveY(-1, this.onCollide);
            // alert();
            if(!m && !this.forcedCrouch) {
                // alert();
                // this.setYVelocity(0.1);
                this.setHeight(this.getHeight()+1);
                if(topObj !== this) {
                    this.moveY(-1, this.onCollide);
                    topObj.moveY(1, topObj.onCollide);
                }
            } else {
                // this.moveY(1, this.onCollide);
                // this.setYVelocity(0);
                // alert();
                if(!m) {this.forcedCrouch = false;}
            }
        }
        let direction = 0;
        if (rightKey) {
            // if(this.sprite.getRow() === 0 && onGround) this.sprite.setRow(1);
            direction = 1;
        } else if (leftKey) {
            // if(this.sprite.getRow() === 0 && onGround) this.sprite.setRow(1);
            direction = -1;
        }
        if (direction) this.facing = direction === -1;
        if(this.wallJumpTimer === 0) {
            let applyXSpeed = this.isCrouching() ? CROUCHING_SPEED * Phys.PHYSICS_SCALAR : X_SPEED;
            this.setXVelocity(BMath.appr(this.getXVelocity(), direction*applyXSpeed, 0.006*Phys.timeDelta));
        } else {this.wallJumpTimer = Phys.timeDecay(this.wallJumpTimer, 0);}

        if(onGround && direction === 0) {this.setXVelocity(0);}
        const zPressed = keys["KeyZ"] === 2 || keys["Space"] === 2 || keys["KeyW"];
        const xPressed = keys["KeyX"] === 2;
        this.cHeld = keys["KeyC"];
        //If z is pressed, jjp = 8, otherwise decr jjp if jjp > 0
        if(zPressed) {this.jumpJustPressed = JUMP_JUST_PRESSED_TIME;}
        else if(this.jumpJustPressed > 0) {this.jumpJustPressed = Phys.timeDecay(this.jumpJustPressed, 0);}
        const onWall = false;
        if(!onWall.ret || (!rightKey && !leftKey)) {this.wallGrinding = false;}
        else if(rightKey && onWall.ret === 1) {this.wallGrinding = true;}
        else if(leftKey && onWall.ret === -1) {this.wallGrinding = true;}
        if(onWall.ret) {
            this.wallJumpCoyote = WALLJUMP_COYOTE;
        } else {
            this.wallJumpCoyote = Phys.timeDecay(this.wallJumpCoyote, 0);
            if(this.wallJumpCoyote === 0) {
                this.wallJumpObj = null;
            }
        }
        const wJ = this.getLevel().isOnWallGrindable(this, PLAYER_WALLJUMP_GRACE_DISTANCE);
        if(wJ.ret !== 0) {this.wallJumpObj = wJ;}
        //foo
        if(!onGround) {
            if(this.coyoteTime > 0 && zPressed) {
                if(this.setUpBoxJump) {
                    this.boxJump();
                    this.setUpBoxJump = false;
                } else {
                    this.jump();
                }
            } else {
                if(this.jumpJustPressed && this.wallJumpObj && this.wallJumpCoyote !== 0) {
                    const wJDir = this.wallJumpObj.ret;
                    const wJObj = this.wallJumpObj.obj;
                    if(wJDir === -1) this.setX(wJObj.getX()+wJObj.getWidth());
                    else if(wJDir === 1) this.setX(wJObj.getX()-this.getWidth());
                    this.wallJump(wJDir);
                    this.jumpJustPressed = 0;
                }
            }
        } else {
            this.coyoteTime = COYOTE_TIME;
            if(this.jumpJustPressed > 0) {
                //Jump if jjp and on ground now
                if(onGround.onPlayerCollide().includes("throwable")) {
                    this.setUpBoxJump = true;
                }
                this.jump();
            } else {
                const newGYV = onGround.getYVelocity();
                if(newGYV < 0) {
                    this.gyv = newGYV;
                    this.movingPlatformCoyoteTime = 16;
                }
                if(this.movingPlatformCoyoteTime === 0) {
                    this.gyv = newGYV;
                }
            }
        }
        if(this.coyoteTime > 0) {
            this.coyoteTime = Phys.timeDecay(this.coyoteTime, 0);
            if(this.coyoteTime === 0) this.setUpBoxJump = false;
        }
        if(this.movingPlatformCoyoteTime > 0) {this.movingPlatformCoyoteTime = Phys.timeDecay(this.movingPlatformCoyoteTime, 0);}
        if(this.thrower.getPicking() == null) {
            if(xPressed) {this.xJustPressed = X_JUST_PRESSED_TIME;}
            else if(this.xJustPressed > 0) {this.xJustPressed = Phys.timeDecay(this.xJustPressed, 0);}
            const touching = this.getLevel().isTouchingThrowable(this);
            if(touching) {
                this.justTouching = touching;
                this.wasOnTopOfJustTouching = this.isOnTopOf(touching);
                this.xoyoteTime = 8;
            }
            if((this.xoyoteTime > 0 && xPressed) || (this.xJustPressed && touching)) {
                if(this.thrower.canPickUp(this.justTouching, this)) {
                    if(this.wasOnTopOfJustTouching && this.setUpBoxJump) {
                        this.boxJump();
                        this.setUpBoxJump = false;
                    }
                    if (this.isOnTopOf(this.justTouching)) {
                        this.setUpBoxJump = true;
                    }
                    this.pickUp(this.justTouching);
                }
            }
            if(this.xoyoteTime > 0) {
                this.xoyoteTime -= 1;
                if(this.xoyoteTime === 0) {
                    this.justTouching = null;
                    this.setUpBoxJump = false;
                }
            }
        } else if(xPressed) {
            this.thrower.throw(BMath.Vector({x:this.facing ? -1 : 1, y:0}), this.getXVelocity());
            // this.getGame().startScreenShake();
            // audioCon.playSoundEffect(THROW_SFX);
        }
        this.wasOnGround = onGround;
    }

    canPush(pushObj, direction) {
        if(pushObj.onPlayerCollide().includes("throwable")) {
            if(pushObj.isBeingCarried() && pushObj.carriedBy !== this) {return false;}
            if(pushObj === this.thrower.getPicking()) return true;
            else if(direction.y === -1) return true;
            else if(direction.x !== 0 && this.cHeld) return true;
            return false;
        }
        return true;
    }

    update() {
        super.update();
        if (this.velocity.x > 0) {
            // this.getSprite().flip = true;
        }
        if (this.velocity.x < 0) {
            // this.getSprite().flip = false;
        }
        if(!this.isOnGround()) {
            if(this.getLevel().getCurRoom().stateMachine.curStateName !== "intoRoom") this.fall();
        }
    }

    // incrX(dx) {
    //     const normResult = super.incrX(dx);
    //     if(this.misAligned !== 0 && this.carrying) {
    //         this.carrying.moveX(-dx, this.carrying.onCollide);
    //         if(this.getX() === this.carrying.getX()) {
    //             this.misAligned = 0;
    //             this.setXVelocity(0);
    //             return false;
    //         }
    //     }
    //     return normResult;
    // }

    isCrouching() {return this.getHeight() < Graphics.TILE_SIZE*1.5;}

    boxJump() {
        this.setYVelocity(PLAYER_JUMP_V*1.5);
    }

    fall() {
        if(this.wallGrinding && this.velocity.y > 0) {
            this.setYVelocity(PLAYER_WALLGRINDING_V);
        } else if(this.wallJumpTimer === 0) {
            super.fall();
        }
    }

}

export {Player};