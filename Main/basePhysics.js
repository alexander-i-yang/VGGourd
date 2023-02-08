import * as BMath from './bMath.js';
import * as Graphics from './graphics.js';

const PHYSICS_SCALAR = 4*-0.5+3;
const MAXFALL = 0.3 * PHYSICS_SCALAR;
const PLAYER_GRAVITY_DOWN = 0.0008*PHYSICS_SCALAR;
const PLAYER_GRAVITY_UP = 0.0007*PHYSICS_SCALAR;
const AIR_RESISTANCE = 0.1;
let DEBUG = false;

let timeDelta = 0;
let lastTime = window.performance.now();

let paused = false;
let pauseTime = 0;
let pauseDuration = 0;

function tick() {
    const now = window.performance.now();
    // timeDelta = ((now-lastTime)-pauseDuration);
    timeDelta = now-lastTime;
    lastTime = now;
    pauseDuration = 0;
}

function pause() {
    if(!paused) {
        pauseTime = window.performance.now();
    }
}

function play() {
    if(paused) {
        pauseDuration = window.performance.now()-pauseTime;
    }
}

class Hitbox {
    constructor(x, y, width, height) {
        this.rect = new BMath.Rectangle(x, y, width, height);
    }

    toString() {
        return `${this.rect.toString()}`
    }

    getX() {return(this.rect.getX());}
    getY() {return(this.rect.getY());}
    getPos() {return(this.rect.pos);}
    getWidth() {return(this.rect.width);}
    getHeight() {return(this.rect.height);}
    setX(x) {this.rect.setX(x);}
    setY(y) {this.rect.setY(y);}
    incrX(dx) {this.rect.incrX(dx);}
    incrY(dy) {this.rect.incrY(dy);}

    isOverlap(hitbox) {
        return(hitbox !== this && this.rect.isOverlap(hitbox.rect));
    }
    isTouching(hitbox) {
        return(hitbox !== this && this.rect.isTouching(hitbox.rect));
    }
    isOnTopOf(hitbox) {return this.rect.isOnTopOf(hitbox.rect);}
    isLeftOf(hitbox) {return this.rect.isLeftOf(hitbox.rect);}
    draw(color) {Graphics.drawRectOnCanvas(this.rect, color);}

    cloneOffset(v) {
        return new Hitbox(this.getX()+v.x, this.getY()+v.y, this.rect.width, this.rect.height);
    }

    angleBetween(hitbox) {
        return this.rect.angleBetween(hitbox.rect);
    }
}

class PhysObj {
    constructor(x, y, w, h, collisionLayers, level, direction = null, wallGrindable = false) {
        this.direction = direction;
        this.hitbox = new Hitbox(x, y, w, h);
        this.level = level;
        if(collisionLayers === "*") {
            collisionLayers = Object.keys(level.layers);
        }
        this.collisionLayers = collisionLayers;
        this.velocity = BMath.Vector({x:0, y:0});
        this.drawable = null;
        this.wallGrindable = wallGrindable;
        this.moveRemainder = BMath.Vector({x:0, y:0});
    }

    getX() {return(this.hitbox.getX());}
    getY() {return(this.hitbox.getY());}
    getPos() {return(this.hitbox.getPos());}
    getWidth() {return(this.hitbox.getWidth());}
    getHeight() {return(this.hitbox.getHeight());}
    setHeight(h) {this.hitbox.rect.height = h;}
    getLevel() {return this.level;}
    setX(x) {this.hitbox.setX(x);}
    setY(y) {this.hitbox.setY(y);}
    incrX(dx) {this.hitbox.incrX(dx); return true;}
    incrY(dy) {this.setY(this.getY()+dy); return true;}
    setSprite(s) {this.drawable = s;}
    getSprite() {return this.drawable;}
    isWallGrindable() {return this.wallGrindable;}

    angleBetween(physObj) {return this.getHitbox().angleBetween(physObj.getHitbox());}
    onPlayerCollide() {throw new Error("Specify on player collide in physobj");}
    onCollide(physObj, direction) {throw new Error("Specify onColide in physObj", this);}

    setXVelocity(vx) {
        this.velocity.x = vx;
    }
    setYVelocity(vy) {this.velocity.y = vy;}
    getXVelocity(vx) {return this.velocity.x;}

    getYVelocity() {return this.velocity.y;}
    setVelocity(v) {this.velocity.x = v.x; this.velocity.y = v.y;}

    update() {
        const moveAdded = this.velocity.scalar(timeDelta).addPoint(this.moveRemainder);
        this.moveRemainder = BMath.Vector({x:moveAdded.x%1, y:moveAdded.y%1});
        const moveWhole = moveAdded.addPoint(this.moveRemainder.scalar(-1));
        this.move(moveWhole.x, moveWhole.y);
        if(this.drawable && this.drawable.update) {this.drawable.update();}
    }

    move(x, y) {throw new Error("implement move in subclass PhysObj");}

    isOverlap(physObj, offset=BMath.VectorZero) {
        return this !== physObj && this.hitbox.cloneOffset(offset).isOverlap(physObj.getHitbox())
    }
    isTouching(hitbox) {return this.hitbox.isTouching(hitbox);}
    isOnTopOf(physObj) {return this.hitbox.isOnTopOf(physObj.getHitbox());}
    isUnder(physObj) {return physObj.getHitbox().isOnTopOf(this.hitbox);}
    isLeftOf(physObj) {return this.hitbox.isLeftOf(physObj.getHitbox());}
    isRightOf(physObj) {return physObj.getHitbox().isLeftOf(this.getHitbox());}
    getHitbox() {return(this.hitbox);}
    getLevel() {return this.level;}
    getGame() {return this.level.getGame();}

    drawHitbox(color) {
        Graphics.drawRectOnCanvas(this.hitbox.rect, color);
    }

    draw(color) {
        if(this.drawable) this.drawable.draw(this.getX()+this.anchor.x, this.getY()+this.anchor.y);
        if(DEBUG || !this.drawable) this.drawHitbox((color || "#29ADFF") + (this.drawable ? "80" : ""));
    }

    setDrawable(drawable, imgw, imgh) {
        this.drawable = drawable;
        this.anchor = toAnchor(imgw, imgh, this.getWidth(), this.getHeight(), this.direction);
        // this.anchor = BMath.Vector({x:0,y:0});
    }

    isSolid() {return true;}

    collideOffset(offset) {
        return this.getLevel().collideOffset(this, offset);
    }
}

class Actor extends PhysObj{
    constructor(x, y, w, h, collideLayers, level, direction, wallGrindable = false) {
        super(x, y, w, h, collideLayers, level, direction, wallGrindable);
        this.spawn = BMath.Vector({x:x, y:y});
        this.origW = w;
        this.origH = h;
        this.checkGeneralCollisions = this.checkGeneralCollisions.bind(this);
    }

    respawnClone() {throw new Error("Implement respawn clone");}

    checkGeneralCollisions(direction, onCollide) {
        let collideSolids = this.getLevel().checkCollideSolidsOffset(this, direction);
        //If there's a collision with a solid, collide with it
        let retObj = {ret:null, pushActors:[], rideActors:[]};
        if (collideSolids.length !== 0) {
            const shouldBreakGlobal = collideSolids.some(collideSolid => {
                const shouldBreak = onCollide(collideSolid, direction);
                if (shouldBreak) {
                    retObj.ret = true;
                    return true;
                }
            });
            if(shouldBreakGlobal) return retObj;
        }
        const allCollidableActors = this.getLevel().getCollidableActors(this);
        //Since actors can push/collide with/carry other actors,
        //Make a list of actors that this one can push/ride. But DON'T ACTUALLY MOVE THEM YET.
        retObj.ret = allCollidableActors.some(actor => {
            if (this.isPushing(actor, direction)) {
                if (!this.canPush(actor, direction) || actor.checkGeneralCollisions(direction, actor.onCollide).ret) {
                    return onCollide(actor, direction);
                }
                retObj.pushActors.push(actor);
            } else if (actor.isRiding(this)) {
                if (!actor.canRide(this, direction)) {
                    const shouldPush = this.onCollide(actor, direction);
                } else {
                    retObj.rideActors.push(actor);
                }
            }
        });
        return retObj;
    }

    isPushing(actor, direction) {return this.isOverlap(actor, direction);}

    moveGeneral(direction, magnitude, onCollide) {
        let remainder = Math.abs(Math.round(magnitude));
        // If the actor moves at least 1 pixel, execute the move function
        if (remainder !== 0) {
            //Move one pixel at a time
            while (remainder !== 0) {
                const collisionData = this.checkGeneralCollisions(direction, onCollide);
                if(collisionData.ret) {
                    return collisionData.ret;
                }
                const pushActors = collisionData.pushActors;
                const rideActors = collisionData.rideActors;
                //If there's no collisions with anything, move forward! Yay!

                pushActors.forEach(actor => {
                    // actor.moveGeneral(direction, 1, (p) => {console.log(p)});
                    actor.incrX(direction.x);
                    actor.incrY(direction.y);
                });
                const t = this;
                this.incrX(direction.x);
                this.incrY(direction.y);
                rideActors.forEach(actor => {
                    actor.moveGeneral(direction, Math.sign(magnitude), (obj) => {
                        if(obj === t) return false; else return actor.onCollide(obj, direction);
                    });
                });
                remainder -= 1;
            }
        }
        return false;
    }

    /**
     * @param magnitude Moves the actor by this many pixels.
     * @param onCollide Calls this after a collision with any object in this.collideLayer.
     * @description Recursively pushes/carries actors in the way.
     * Returns true if the actor collides and stops moving (ie if the player collided with a wall, or if
     * the player collided with a box that can't move because it would get pushed into a wall).
     * Since actors can't squish other actors, never mess with the squish method.
     * */
    moveX(magnitude, onCollide) {
        return(this.moveGeneral(
            BMath.Vector({x:Math.sign(magnitude), y:0}),
            magnitude, onCollide
        ));
    }

    moveY(magnitude, onCollide) {
        return(this.moveGeneral(
            BMath.Vector({y:Math.sign(magnitude), x:0}),
            magnitude, onCollide
        ));
    }

    movePush(pusher, direction) {
        return this.move(direction.x, direction.y);
    }

    canPush(pushObj, direction) {
        return true;
    }

    checkCollideSolidsOffset(direction) {this.getLevel().checkCollideSolidsOffset(direction);}

    /**
     * @description Moves the actor by the direction specified.
     * Most of the time the actor won't have a problem when it rides a solid.
     * This method can be overriden so that actors tied to another actor stop the carrying actor from moving too.
     * */
    ride(pusher, direction) {
        this.move(direction.x, direction.y, (physObj) => {
            if(physObj === pusher) {
                return false;
            } else {
                return this.onCollide(physObj, direction);
            }
        });
    }

    canRide(pusher, direction) {
        return true;
    }

    isOnGround() {
        return(this.getLevel().isOnGround(this));
    }

    isBonkHead() {
        return(this.getLevel().isBonkHead(this));
    }

    isRiding(solid) {
        return(this.getHitbox().isOnTopOf(solid.getHitbox()));
    }

    bonkHead() {
        if(this.getYVelocity() < -0.002*timeDelta) {
            this.setYVelocity(-0.002*timeDelta);
        }
    }

    fall() {
        this.setYVelocity(Math.min(MAXFALL, this.velocity.y + (this.velocity.y > 0 ? PLAYER_GRAVITY_DOWN : PLAYER_GRAVITY_UP)*timeDelta));
    }

    squish(pushObj, againstObj, direction) {
        const pushObjNewHb = pushObj.getHitbox().cloneOffset(direction.scalar(-1));
        const hb = this.getHitbox();
        return ((hb.isOnTopOf(pushObjNewHb) && againstObj.isOnTopOf(this)) ||
            (hb.isLeftOf(pushObjNewHb) && againstObj.isLeftOf(this)) ||
            (pushObjNewHb.isLeftOf(hb) && this.isLeftOf(againstObj)) ||
            (pushObjNewHb.isOnTopOf(hb) && this.isOnTopOf(againstObj)));

        // throw new Error("implement method squish in subclass actor");
    }
    getCarryingActors() {return [];}
    move(x,y,
         onCollide = this.onCollide,
    ) {
        const mX = this.moveX(x, onCollide);
        const mY = this.moveY(y, onCollide);
        if(mX) return mX;
        else if(mY) return mY;
        else return false;
    }
}

class Solid extends PhysObj {
    constructor(x, y, w, h, collideLayers, level, direction, wallGrindable = false) {
        super(x, y, w, h, collideLayers, level, direction, wallGrindable);
    }

    move(moveX, moveY) {
        let remainderX = Math.round(moveX);
        let remainderY = Math.round(moveY);
        if (remainderX !== 0 || remainderY !== 0) {
            const ridingActors = super.getLevel().getAllRidingActors(this);
            const allActors = super.getLevel().getActors();
            if(remainderX !== 0) {
                const directionX = Math.sign(remainderX);
                while(remainderX !== 0) {
                    this.incrX(directionX);
                    let shouldBreak = false;
                    allActors.some(actor => {
                        if (ridingActors.includes(actor)) {
                            actor.moveX(directionX, actor.onCollide);
                        } else if (this.getHitbox().isOverlap(actor.getHitbox())) {
                            if(actor.moveX(directionX, (physObj) => {
                                return actor.squish(this, physObj, BMath.Vector({x:directionX, y:0}));
                            })) {shouldBreak = true; return true;}
                        }
                    });
                    if(shouldBreak) break;
                    remainderX -= directionX;
                }
            }
            if (remainderY !== 0) {
                const directionY = Math.sign(remainderY);
                while(remainderY !== 0) {
                    super.incrY(directionY);
                    let shouldBreak = false;
                    allActors.some(actor => {
                        if (ridingActors.includes(actor)) {
                            actor.moveY(directionY, actor.onCollide);
                        } else if (this.getHitbox().isOverlap(actor.getHitbox())) {
                            if(actor.moveY(directionY, (physObj) => {
                                return actor.squish(this, physObj, BMath.Vector({x:0, y:directionY}));
                            })) {
                                shouldBreak = true; return true;
                            }
                        }
                    });
                    if(shouldBreak) {super.incrY(-directionY); break;}
                    remainderY -= directionY;
                }
            }
        }
    }

    onPlayerCollide() {
        return "wall";
    }
}

function toAnchor(iw, ih, w, h, direction) {
    let retx = 0;
    let rety = 0;
    switch(direction) {
        case BMath.VectorUp:
            retx = 0;
            rety = -ih+h;
            break;
        case BMath.VectorLeft:
            retx = -iw+w;
            break;
        case BMath.VectorDown:
        case BMath.VectorRight:
            retx = -iw*2;
            break;
        default:
            console.error("invalid dir:", direction);
            return null;
    }
    return BMath.Vector({x:retx, y:rety});
}

function toggleDebug() {
    DEBUG = !DEBUG;
}

function timeDecay(val, min) {
    return Math.max(val-timeDelta, min);
}

export {
    PHYSICS_SCALAR, MAXFALL, PLAYER_GRAVITY_UP, PLAYER_GRAVITY_DOWN, AIR_RESISTANCE, DEBUG,
    toggleDebug, tick, timeDelta, pause, play, timeDecay,
    Hitbox, PhysObj, Actor, Solid,
};