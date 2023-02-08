import * as BMath from './bMath.js';
import * as Phys from './basePhysics.js';
import * as Graphics from './graphics.js';
import {StateMachine} from './stateMachine.js';
import {LAYER_NAMES} from './map.js';

const AIR_RESISTANCE = 0.0003125;
// const GROUND_FRIC = 0.003125;
const GROUND_FRIC = 100.003125;

const PICKUP_TIME = 80;

class Throwable extends Phys.Actor {
    constructor(x, y, w, h, level) {
        super(x, y, w, h, [
            LAYER_NAMES.WALLS,
            LAYER_NAMES.BREAKABLE,
            LAYER_NAMES.ONEWAY,
            LAYER_NAMES.SPRINGS,
            LAYER_NAMES.THROWABLES,
            LAYER_NAMES.ICE,
            LAYER_NAMES.BOOSTERS,
            LAYER_NAMES.PLAYER,
        ], level, null, true);
        this.onCollide = this.onCollide.bind(this);
        this.squish = this.squish.bind(this);
        this.idleUpdate = this.idleUpdate.bind(this);
        this.incrPickupFrames = this.incrPickupFrames.bind(this);
        this.endPickup = this.endPickup.bind(this);
        this.throwingUpdate = this.throwingUpdate.bind(this);
        this.startCarrying = this.startCarrying.bind(this);
        this.getTargetPos = this.getTargetPos.bind(this);
        this.carriedBy = null;

        this.stateMachine = new StateMachine({
            "idle": {
                onStart: () => {},
                onUpdate: this.idleUpdate,
                transitions: ["picking", "sliding"],
            },
            "throwing": {
                onStart: () => {this.carriedBy = null;},
                onUpdate: this.throwingUpdate,
                transitions: ["falling", "idle", "sliding", "picking"]
            },
            "falling": {
                maxTimer: 128,
                onStart: () => {console.log("falling start")},
                onUpdate: this.idleUpdate,
                timeOutTransition: "idle",
                transitions: ["sliding", "idle", "picking"],
            },
            "picking": {
                maxTimer: PICKUP_TIME,
                onStart: () => {
                    this.prevCollisionLayers = this.collisionLayers;
                    this.collisionLayers = ["walls", "throwables", "player", "ice"];
                    // this.drawable.play();
                },
                onUpdate: this.incrPickupFrames,
                timeOutTransition: "picked",
                transitions: ["picked", "throwing"],
            },
            "picked": {
                onStart: this.endPickup,
                onUpdate: () => {
                    const targetP = this.getTargetPos();
                    let yDiff = targetP.y - this.getY();
                    if(yDiff < 0) {
                        this.carriedBy.moveY(-yDiff, this.carriedBy.squish);
                    }
                    // this.drawable.update();
                },
                transitions: ["throwing", "picking"],
            }, "sliding": {
                onStart: () => {},
                onUpdate: this.idleUpdate,
                transitions: ["picking", "idle"]
            }
        });
        // this.setDrawable(new Graphics.AnimationPlayer(Graphics.ANIMS.EYEBOX["OPENIDLE"], true, BMath.VectorUp, 3), 12, 12);
        // this.drawable.play();
    }

    startCarrying(carriedBy) {
        if(this.carriedBy) this.carriedBy.releasePicking();
        this.stateMachine.transitionTo("picking");
        this.carriedBy = carriedBy;
    }

    onPlayerCollide() {
        return "wall throwable";
    }

    squish(pushObj, againstObj, direction) {
        if(super.squish(pushObj, againstObj, direction)) {
            this.getLevel().killPlayer(this.getX(), this.getY());
            return true;
        }
    }

    respawnClone() {
        return new Throwable(this.spawn.x, this.spawn.y, this.origW, this.origH, this.getLevel());
    }

    draw() {
        // if(this.stateMachine.curStateName.includes("pick")) console.log(this.isBeingCarried());
        super.draw(this.isBeingCarried() ? "#fcf003" : "#eb9c09");
    }

    endPickup() {
        this.collisionLayers = this.prevCollisionLayers;
    }

    throw(direction, throwerXV) {
        this.stateMachine.transitionTo("throwing");
    }

    canPush(pushObj, direction) {
        if(pushObj === this.carriedBy) return false;
        const pC = pushObj.onPlayerCollide();
        if(this.isBeingCarried()) return true;
        if(pC === "") {
            return direction.y === -1;
        }
        return !(pC.includes("throwable") && (direction.y === 1 || direction.x !== 0));
    }

    isSolid(actor, direction) {
        if(actor == this.carriedBy) return false;
        return true;
    }

    onCollide(physObj, direction) {
        if(physObj === this.carriedBy) return false;
        const playerCollideFunction = physObj.onPlayerCollide();
        if(this.stateMachine.curStateName === "picked") {
            return this.carriedBy.onCollide(physObj, direction);
        }
        if(playerCollideFunction.includes("booster")) {
            if(physObj.canPickUp(this, physObj)) physObj.boosterPickUp(this);
            return false;
        }
        if(playerCollideFunction.includes("spring")) {
            physObj.bounceObj(this);
            if(this.stateMachine.curStateName === "falling") {
                this.stateMachine.transitionTo("idle", {direction: Math.sign(this.velocity.x)});
            }
        }
        if (playerCollideFunction.includes("throwable")) {
            if(direction.y > 0) {this.setYVelocity(0); return true;}
            else if(direction.y < 0) {this.bonkHead(); return true;}
            if(direction.x !== 0) {physObj.setXVelocity(this.getXVelocity()); this.setXVelocity(0); console.log("!"); return true;}
            return true;
        }
        if(playerCollideFunction.includes("wall")) {
            if(!physObj.isSolid(direction, this)) return false;
            if(playerCollideFunction.includes("oneWay")) {
                if(!physObj.isSolid(direction, this)) {return false;}
            }

            if(playerCollideFunction.includes("button")) {
                const direction = physObj.direction;
                if(direction === BMath.VectorLeft && this.isLeftOf(physObj)) {
                    physObj.push();
                } else if(direction === BMath.VectorUp && this.isOnTopOf(physObj)) {
                    physObj.push();
                } else if(direction === BMath.VectorRight && this.isRightOf(physObj)) {
                    physObj.push();
                }
                if(physObj.pushed) {return false;}
            }
            if(direction.y < 0) {
                this.bonkHead(physObj);
                return true;
            } else if(direction.y > 0) {
                if(playerCollideFunction.includes("ice")) {
                    if(this.stateMachine.curStateName === "falling" || this.stateMachine.curStateName === "throwing")
                        this.stateMachine.transitionTo("idle", {direction: Math.sqrt(this.getXVelocity()**2+this.getYVelocity())});
                } else {
                    this.setXVelocity(0);
                }
                this.setYVelocity(0);
                //Land on ground
                // this.setYVelocity(physObj.getYVelocity());
                // if(!this.isOnIce() && this.throwHeight > this.getHeight()+24) {this.setXVelocity(physObj.getXVelocity());}
            } else if((this.isLeftOf(physObj) || this.isRightOf(physObj)) && this.velocity.x !== 0) {
                if(!this.isBeingCarried() && !this.isOnGround()) {
                    this.velocity.y -= 0.05;
                    this.setXVelocity(0);
                }
                return true;
                // if(playerCollideFunction === "wall") {this.getRoom().pushDustSprite(new GroundDustSprite(this.getX(), this.getY()-3, 0, this.level, this.velocity.x < 0 ? VectorRight : VectorLeft))}
            }
        } else if(playerCollideFunction === "") {
            // const diff = physObj.getY()+physObj.getHeight() - this.getY();
            // if(this.isLeftOf(physObj) || physObj.isLeftOf(this)) {
            //     this.setXVelocity(physObj.getXVelocity());
            //     this.setYVelocity(physObj.getYVelocity());
            // }
            // // alert();
            // if(diff > 0 && this.getY() > physObj.getY()+physObj.getHeight()/2) {
            //     const ret = physObj.moveY(-1, physObj.onCollide);
            //     if(ret) {
            //         // alert();
            //         this.incrY(diff);
            //         this.setYVelocity(-0.5);
            //         return false;
            //     }
            //     this.draw();
            //     return ret;
            // }
            if(direction.y > 0) this.setYVelocity(0);
            else if(direction.y < 0) this.bonkHead();
            else {this.setXVelocity(0);}
            return true;
        }
        return true;
    }

    getTargetPos() {
        let targetOffset = this.carriedBy.thrower.getTargetOffset();
        const objPos = this.carriedBy.getPos();
        return targetOffset.addPoint(objPos);
    }

    incrPickupFrames() {
        const tx = this.getX();
        const ty = this.getY();
        //Target pos
        const targetOffset = this.getTargetPos();
        const curT = Math.min(PICKUP_TIME-this.stateMachine.getCurState().curTimer+Phys.timeDelta, PICKUP_TIME);
        let xOffset = Math.floor((targetOffset.x-tx)*curT/PICKUP_TIME);
        let yOffset = Math.floor((targetOffset.y-ty)*curT/PICKUP_TIME);

        let pickupCollide = (p, d) => {

            if(p === this.carriedBy) return false;
            if (d.x !== 0) return this.onCollide(p, d);
            else {
                // const pc = p.onPlayerCollide();
                const c = this.onCollide(p, d);
                if (c && d.y === -1) {
                    // this.incrY(1);
                    if(this.canPush(this.carriedBy, BMath.VectorUp)) this.carriedBy.move(0,1, this.carriedBy.squish);
                }
                return c;
            }
        };

        pickupCollide = pickupCollide.bind(this);
        this.move(xOffset, yOffset, pickupCollide);
        // this.drawable.update();
        // );

        // this.incrX(xOffset);
        // this.incrY(yOffset);
        /*this.moveY(yOffset, physObj => {
            const ret = this.onCollide(physObj);
            if(this.onCollide(physObj) && yOffset < 0 && this.carriedBy.getY() > this.getY()) {
                if (this.carriedBy.moveY) return this.carriedBy.moveY(1, (physObj) => this.carriedBy.squish(this, physObj, 1));
                return false;
            } else return ret;
        });
        this.moveX(xOffset, physObj => {
            if(this.carriedBy.moveX) return this.carriedBy.moveX(-Math.sign(xOffset), this.carriedBy.onCollide);
            return false;
        });*/
    }

    update() {
        this.stateMachine.update();
    }

    throwingUpdate() {
        this.idleUpdate();
    }

    canRide(pusher, direction) {
        if(this.isBeingCarried() && pusher !== this.carriedBy) {
            return false;
        }
        return true;
    }

    isBeingCarried() {return this.stateMachine.curStateName.includes("pick")}

    idleUpdate() {
        super.update();
        const onGround = this.isOnGround();
        const xv = this.getXVelocity();
        let xvAdd = Math.sign(this.getXVelocity())*Phys.timeDelta;
        if (!onGround) {
            if(this.getYVelocity() > 0) xvAdd *= AIR_RESISTANCE;
            else xvAdd = 0;
            this.fall();
        } else {
            if(onGround.onPlayerCollide().includes("ice")) xvAdd = 0;
            else xvAdd *= GROUND_FRIC;
        }
        let newXV = xv-xvAdd;
        if(Math.abs(xvAdd) > Math.abs(xv)) newXV = 0;
        this.setXVelocity(newXV);
        const curRoom = this.getLevel().getCurRoom();
        if (this.getY() > curRoom.getY()+curRoom.getHeight()) {
            this.getLevel().killPlayer(this.getX(), this.getY());
        }
        // if (this.getSprite().update) this.getSprite().update();
    }

    setYVelocity(y) {
        super.setYVelocity(y);
    }
}

export {Throwable};