import * as BMath from "./bMath.js";
import {StateMachine} from "./stateMachine.js";
import * as Graphics from "./graphics.js";
import * as Phys from './basePhysics.js';
import * as Mechanics from './mechanics.js';

function ogmoRotateEntity(x, y, w, h, tileSize, rotation, originX = 0, originY = 0) {
    switch (rotation) {
        case 0:
            x -= originX;
            y -= originY;
            break;
        case 180:
            x -= w;
            break;
        case 270:
            x -= h;
            y -= w;
        case 90:
            let w1 = w;
            w = h;
            h = w1;
            break;
        default:
            console.warn("Error: incompatible direction:", rotation);
    }
    return {x: x, y: y, w: w, h: h};
}

function ogmoRotateTile(x, y, w, h, tileSize, tileArr) {
    let code = tileArr.x || tileArr;
    switch (code) {
        case 1:
            y += tileSize - h;
            break;
        case 4:
            x += tileSize - h;
        case 2:
            const w1 = w;
            w = h;
            h = w1;
            break;
    }
    return {x: x, y: y, w: w, h: h, d: ogmoTileCodeToRotationVec(tileArr)};
}

function ogmoRotationToVec(rotation) {
    switch (rotation) {
        case 0:
            return BMath.VectorUp;
        case 90:
            return BMath.VectorRight;
        case 180:
            return BMath.VectorDown;
        case 270:
            return BMath.VectorLeft;
        default:
            console.warn("Error: incompatible direction:", rotation);
            return {x: x, y: y};
    }
}

function ogmoTileCodeToRotation(tileCode) {
    return (tileCode - 1) * 90;
}

function ogmoTileCodeToRotationVec(tileArr) {
    switch (tileArr.x || tileArr) {
        case 1:
            return BMath.VectorDown;
        case 2:
            return BMath.VectorRight;
        case 3:
            return BMath.VectorUp;
        case 4:
            return BMath.VectorLeft;
        default:
            return null;
    }
}


const LAYER_NAMES = {
    "ROOMS": "rooms",
    "WALLS": "walls",
    "BREAKABLE": "breakable",
    "ONEWAY": "oneWay",
    "ICE": "ice",
    "STATIC_SPIKES": "staticSpikes",
    "PLAYER_SPAWNS": "playerSpawns",
    "THROWABLE_SPAWNS": "throwableSpawns",
    "PLAYER": "player",
    "THROWABLES": "throwables",
    "SPRINGS": "springs",
    "BOOSTERS": "boosters",
};

const LAYER_TYPES = {
    "SOLID": "solid",
    "ACTOR": "actor",
    "OTHER": "other",
};

Object.freeze(LAYER_NAMES);

const LAYER_TO_OBJ = {
    [LAYER_NAMES.ROOMS]: (entity, level) => new Room(entity["x"], entity["y"], entity["width"], entity["height"], level, entity["values"]["roomId"]),
    [LAYER_NAMES.WALLS]: (x, y, level, tileVec, tileSize) => new Mechanics.Wall(x, y, tileSize, tileSize, level, tileVec),
    [LAYER_NAMES.BREAKABLE]: (x, y, level, tileVec, tileSize) => {
        return new Mechanics.Breakable(x, y, tileSize, tileSize, level, tileVec)
    },
    [LAYER_NAMES.ONEWAY]: (x, y, level, tileData, tileSize) => {
        const h = tileSize / 8 * 2;
        const newPos = ogmoRotateTile(x, y, tileSize, h, tileSize, tileData);
        return new Mechanics.OneWay(newPos.x, newPos.y, newPos.w, newPos.h, level, newPos.d)
    },
    [LAYER_NAMES.ICE]: (x, y, level, tileVec, tileSize) => new Mechanics.Ice(x, y, tileSize, tileSize, level, tileVec),
    [LAYER_NAMES.STATIC_SPIKES]: (x, y, level, tileVec, tileSize) => {
        const h = tileSize / 8 * 2;
        const newPos = ogmoRotateTile(x, y, tileSize, h, tileSize, tileVec);
        return new Mechanics.PlayerKill(newPos.x, newPos.y, newPos.w, newPos.h, level, newPos.d, tileVec);
    },
    [LAYER_NAMES.PLAYER_SPAWNS]: (entity, level, tileSize) => new Mechanics.PlayerSpawn(entity["x"], entity["y"] + tileSize / 2, tileSize, tileSize * 1.5, level, entity["id"]),
    [LAYER_NAMES.THROWABLE_SPAWNS]: (entity, level, tileSize) => new Mechanics.ThrowableSpawn(entity["x"], entity["y"], tileSize * 1.5, tileSize * 1.5, level, entity["id"]),
    [LAYER_NAMES.SPRINGS]: (entity, level, tileSize) => {
        const h = 6;
        const newPos = ogmoRotateEntity(entity["x"], entity["y"], tileSize * 2, h, tileSize, entity["rotation"], 0, h);
        return new Mechanics.Spring(newPos.x, newPos.y, newPos.w, newPos.h, ogmoRotationToVec(entity["rotation"]), level,);
    },
    [LAYER_NAMES.BOOSTERS]: (entity, level, tileSize) => {
        const h = tileSize * 2;
        const newPos = ogmoRotateEntity(entity["x"], entity["y"], h, h, tileSize, entity["rotation"], 0, h);
        if (entity["name"] === "SuperBooster") {
            return new Mechanics.SuperBooster(newPos.x, newPos.y, newPos.w, newPos.h, level, ogmoRotationToVec(entity["rotation"]));
        }
        return new Mechanics.Booster(newPos.x, newPos.y, newPos.w, newPos.h, level, ogmoRotationToVec(entity["rotation"]));
    }
};

function getLayerDataByName(data, layerName) {
    return data["layers"].find(layerData => layerData["name"] === layerName)
}

//0 - nothing
//1 - any (nothing or tile)
//2 - any tile
const TILE_ARRS = {
    "CORNER_TL": [
        1, 0, 1,
        0, 2,
        1, 2, 1
    ], "EDGE_T": [
        1, 0, 1,
        2, 2,
        1, 2, 1
    ], "CORNER_TR": [
        1, 0, 1,
        2, 0,
        1, 2, 1
    ], "EDGE_R": [
        1, 2, 1,
        2, 0,
        1, 2, 1
    ], "CORNER_BR": [
        1, 2, 1,
        2, 0,
        1, 0, 1
    ], "EDGE_B": [
        1, 2, 1,
        2, 2,
        1, 0, 1
    ], "CORNER_BL": [
        1, 2, 1,
        0, 2,
        1, 0, 1
    ], "EDGE_L": [
        1, 2, 1,
        0, 2,
        1, 2, 1
    ], "FILL": [
        1, 2, 1,
        2, 2,
        1, 2, 1
    ], "MIDDLE_TB": [
        1, 0, 1,
        2, 2,
        1, 0, 1
    ], "MIDDLE_LTR": [
        1, 0, 1,
        0, 0,
        1, 2, 1
    ], "MIDDLE_LTB": [
        1, 0, 1,
        0, 2,
        1, 0, 1
    ], "MIDDLE_LR": [
        1, 2, 1,
        0, 0,
        1, 2, 1
    ], "MIDDLE_TBR": [
        1, 0, 1,
        2, 0,
        1, 0, 1
    ], "MIDDLE_LBR": [
        1, 2, 1,
        0, 0,
        1, 0, 1
    ], "SINGLE": [
        1, 0, 1,
        0, 0,
        1, 0, 1,
    ]
};

const TILE_VECS = {};
TILE_VECS[TILE_ARRS.CORNER_TL] = BMath.Vector({x: 0, y: 0});
TILE_VECS[TILE_ARRS.EDGE_T] = BMath.Vector({x: 1, y: 0});
TILE_VECS[TILE_ARRS.CORNER_TR] = BMath.Vector({x: 2, y: 0});
TILE_VECS[TILE_ARRS.EDGE_R] = BMath.Vector({x: 2, y: 1});
TILE_VECS[TILE_ARRS.CORNER_BR] = BMath.Vector({x: 2, y: 2});
TILE_VECS[TILE_ARRS.EDGE_B] = BMath.Vector({x: 1, y: 2});
TILE_VECS[TILE_ARRS.CORNER_BL] = BMath.Vector({x: 0, y: 2});
TILE_VECS[TILE_ARRS.EDGE_L] = BMath.Vector({x: 0, y: 1});
TILE_VECS[TILE_ARRS.FILL] = BMath.Vector({x: 1, y: 1});
TILE_VECS[TILE_ARRS.MIDDLE_TB] = BMath.Vector({x: 4, y: 1});
TILE_VECS[TILE_ARRS.MIDDLE_LTR] = BMath.Vector({x: 4, y: 0});
TILE_VECS[TILE_ARRS.MIDDLE_LTB] = BMath.Vector({x: 3, y: 1});
TILE_VECS[TILE_ARRS.MIDDLE_LR] = BMath.Vector({x: 3, y: 0});
TILE_VECS[TILE_ARRS.MIDDLE_TBR] = BMath.Vector({x: 5, y: 1});
TILE_VECS[TILE_ARRS.MIDDLE_LBR] = BMath.Vector({x: 4, y: 2});
TILE_VECS[TILE_ARRS.SINGLE] = BMath.Vector({x: 5, y: 0});

Object.freeze(TILE_ARRS);
Object.freeze(TILE_VECS);

function tilesToVec(arr) {
    return TILE_VECS[arr];
}

function connectorCode(tileArr) {
    return (tileArr[0] === -1 || (tileArr[0] === 0 && tileArr[1] === 0)) ? 0 : 2;
}

function autoTile(tileArr, dataCoords, x, y) {
    const leftIsConnector = x - 1 < 0 ? 0 : connectorCode(dataCoords[y][x - 1]);
    const rightIsConnector = x + 1 >= dataCoords[y].length ? 0 : connectorCode(dataCoords[y][x + 1]);
    const topIsConnector = y - 1 < 0 ? 0 : connectorCode(dataCoords[y - 1][x]);
    const bottomIsConnector = y + 1 >= dataCoords.length ? 0 : connectorCode(dataCoords[y + 1][x]);

    let arr = [
        1, 1, 1,
        1, 1,
        1, 1, 1];
    arr[1] = topIsConnector;
    arr[3] = leftIsConnector;
    arr[4] = rightIsConnector;
    arr[6] = bottomIsConnector;
    return tilesToVec(arr).addPoint(BMath.Vector({x: 0, y: tileArr[1] + 1}));
}

class Level {
    constructor(data, game) {
        this.game = game;
        this.rooms = new Layer(false, LAYER_NAMES.ROOMS, LAYER_TYPES.OTHER);
        const roomLayerData = getLayerDataByName(data, "rooms");
        roomLayerData["entities"].forEach(roomEntity => {
            this.rooms.pushObj(LAYER_TO_OBJ[LAYER_NAMES.ROOMS](roomEntity, this));
        });

        this.rooms.objs = this.rooms.objs.sort((a, b) => a.id - b.id);

        data["layers"].forEach(layerData => {
            if (layerData["name"] !== LAYER_NAMES.ROOMS && layerData["name"] !== "Notes") {
                this.setLayerFromData(layerData);
            }
        });

        this.rooms.objs.forEach(room => room.sortObjs());

        this.curRoom = this.rooms.objs[0];
        this.curRoom.stateMachine.transitionTo("spawn");
    }

    getCollidables(physObj) {
        return this.getCurRoom().getCollidables(physObj);
    }

    getCollidableActors(physObj) {
        return this.getCurRoom().getCollidableActors(physObj);
    }

    getCollidableSolids(physObj) {
        return this.getCurRoom().getCollidableActorLayers(physObj);
    }


    getRidingActors(physObj) {
        return this.getCurRoom().getRidingActors(physObj);
    }

    /** Returns a list of spawn objects that match the corresponding room id.*/
    getSpawnsByRoomId(roomId, spawnLayerName, data) {
        let ret = [];
        getLayerDataByName(data, spawnLayerName)["entities"].forEach(entity => {
            if (entity["values"]["roomId"] === roomId) ret.push(LAYER_TO_OBJ[spawnLayerName](entity, this, Graphics.TILE_SIZE));
        });
        return ret;
    }

    getGame() {
        return this.game;
    }

    getPlayer() {
        return this.getCurRoom().getPlayer();
    }

    drawAll() {
        // this.decorations.forEach(curItem => {curItem.draw();});
        let ret = [];
        if (Phys.DEBUG) this.curRoom.draw();
        this.rooms.objs.forEach(room => {
            ret.push(room.drawAll());
        });
        return ret;
    }

    setLayerFromData(layerData) {
        const layerName = layerData["name"];

        if (layerData) {
            const yLen = layerData["gridCellsY"];
            const xLen = layerData["gridCellsX"];
            const gridCellWidth = Graphics.TILE_SIZE;
            const layerObjs = layerData["data2D"];
            const entities = layerData["entities"];
            const dataCoords = layerData["dataCoords2D"];
            const pushToRooms = (newObj) => {
                const rooms = this.inWhichRooms(newObj);
                if (rooms.length !== 0) rooms.forEach(room => room.pushObj(layerName, newObj));
            };
            if (layerObjs) {
                for (let y = 0; y < yLen - 1; y++) {
                    for (let x = 0; x < xLen; x++) {
                        const gameSpaceX = x * gridCellWidth;
                        const gameSpaceY = y * gridCellWidth;
                        const tileCode = parseInt(layerObjs[y][x]);
                        if (tileCode === 0 || tileCode === -1) {
                        } else {
                            const newObj = LAYER_TO_OBJ[layerName](gameSpaceX, gameSpaceY, this, tileCode, gridCellWidth);
                            pushToRooms(newObj);
                        }
                    }
                }
            } else if (dataCoords) {
                for (let y = 0; y < yLen - 1; y++) {
                    for (let x = 0; x < xLen; x++) {
                        const gameSpaceX = x * gridCellWidth;
                        const gameSpaceY = y * gridCellWidth;
                        let tileArr = dataCoords[y][x];
                        if (connectorCode(tileArr) === 0) {
                        } else {
                            let tileVec = BMath.Vector({x: tileArr[0], y: tileArr[1]});
                            let realLayername = layerName;
                            if (layerName === LAYER_NAMES.WALLS || layerName === LAYER_NAMES.ICE) {
                                if(layerName === LAYER_NAMES.WALLS && tileArr[1] >= 4 && tileArr[1] <= 7) {
                                    realLayername = LAYER_NAMES.BREAKABLE;
                                    console.log(tileVec, tileArr, x, y);
                                }
                                tileVec = autoTile(tileArr, dataCoords, x, y);
                            }
                            const newObj = LAYER_TO_OBJ[realLayername](gameSpaceX, gameSpaceY, this, tileVec, gridCellWidth);
                            pushToRooms(newObj);
                        }
                    }
                }
            } else if (entities) {
                entities.forEach(entity => {
                    const newObj = LAYER_TO_OBJ[layerName](entity, this, gridCellWidth);
                    pushToRooms(newObj);
                })
            }
        }
    }

    getThrowables() {
        return this.layers.getLayer(LAYER_NAMES.THROWABLES).objs
    }

    killPlayer(x, y) {
        this.getCurRoom().killPlayer(x, y);
        // audioCon.playSoundEffect(DEATH_SFX);
    }

    setKeys(keys) {
        this.getCurRoom().setKeys(keys);
    }

    update() {
        try {
            this.getCurRoom().update();
        } catch (error) {
            console.warn("error: in level update", error);
            if (this.getCurRoom().stateMachine.curStateName === "death") this.getCurRoom().resetRoom();
        }
    }

    getCurRoom() {
        return this.curRoom
    }

    setCurRoom(r, spawnParams) {
        this.curRoom = r;
        this.curRoom.stateMachine.transitionTo("spawn", spawnParams);
    }

    nextRoom(r) {
        this.curRoom = r;
        r.stateMachine.transitionTo("intoRoom");
    }

    isOnGround(actor) {
        let ret = null;
        return this.getCurRoom().isOnGround(actor);
    }

    collideOffset(physObj, offset) {
        return this.getCurRoom().collideOffset(physObj, offset);
    }

    checkCollideSolidsOffset(physObj, offset) {
        return this.getCurRoom().checkCollideSolidsOffset(physObj, offset);
    }

    isOnWallGrindable(actor, offset) {
        return this.getCurRoom().isOnWallGrindable(actor, offset);
    }

    isTouchingThrowable(physObj) {
        return this.getCurRoom().isTouchingThrowable(physObj);
    }

    inWhichRooms(physObj) {
        let ret = [];
        this.rooms.objs.forEach(room => {
            if (room.isOverlap(physObj, BMath.VectorZero)) ret.push(room);
        });
        return ret;
    }
}

class Room extends Phys.PhysObj {
    //entity["x"], entity["y"], entity["width"], entity["height"], level, spawnObjs, entity["id"]
    constructor(x, y, w, h, level, id) {
        super(x, y, w, h, ["player"], level);
        this.id = id;
        this.curPlayerSpawn = null;
        this.layers = new Layers({
            [LAYER_NAMES.ROOMS]: new Layer(false, LAYER_NAMES.ROOMS, LAYER_TYPES.OTHER),
            [LAYER_NAMES.PLAYER_SPAWNS]: new Layer(false, LAYER_NAMES.PLAYER_SPAWNS, LAYER_TYPES.OTHER),
            [LAYER_NAMES.THROWABLE_SPAWNS]: new Layer(true, LAYER_NAMES.THROWABLE_SPAWNS, LAYER_TYPES.OTHER),
            [LAYER_NAMES.WALLS]: new Layer(true, LAYER_NAMES.WALLS, LAYER_TYPES.SOLID),
            [LAYER_NAMES.BREAKABLE]: new Layer(false, LAYER_NAMES.BREAKABLE, LAYER_TYPES.SOLID, true),
            [LAYER_NAMES.ONEWAY]: new Layer(true, LAYER_NAMES.ONEWAY, LAYER_TYPES.SOLID),
            [LAYER_NAMES.ICE]: new Layer(true, LAYER_NAMES.ICE, LAYER_TYPES.SOLID),
            [LAYER_NAMES.THROWABLES]: new Layer(false, LAYER_NAMES.THROWABLES, LAYER_TYPES.ACTOR),
            [LAYER_NAMES.STATIC_SPIKES]: new Layer(true, LAYER_NAMES.STATIC_SPIKES, LAYER_TYPES.SOLID),
            [LAYER_NAMES.SPRINGS]: new Layer(false, LAYER_NAMES.SPRINGS, LAYER_TYPES.SOLID),
            [LAYER_NAMES.BOOSTERS]: new Layer(false, LAYER_NAMES.BOOSTERS, LAYER_TYPES.SOLID, true),
            [LAYER_NAMES.PLAYER]: new Layer(false, LAYER_NAMES.PLAYER, LAYER_TYPES.ACTOR),
        });
        this.idleUpdate = this.idleUpdate.bind(this);
        this.resetRoom = this.resetRoom.bind(this);
        this.resetObjs = this.resetObjs.bind(this);
        this.nextRoom = this.nextRoom.bind(this);
        this.stateMachine = new StateMachine({
            "load": {
                onStart: () => {
                },
                onUpdate: this.idleUpdate,
                transitions: ["spawn", "intoRoom"],
            },
            "intoRoom": {
                maxTimer: 128,
                onStart: this.resetObjs,
                onUpdate: this.idleUpdate,
                timeOutTransition: "idle",
                transitions: ["idle"]
            }, "spawn": {
                maxTimer: 128,
                onStart: this.resetRoom,
                onUpdate: () => {
                },
                timeOutTransition: "idle",
                transitions: ["idle"]
            },
            "idle": {
                onStart: () => {
                },
                onUpdate: this.idleUpdate,
                transitions: ["death", "nextRoom"]
            },
            "death": {
                maxTimer: 16,
                onStart: (deathPos) => {
                },
                onUpdate: () => {
                },
                timeOutTransition: "spawn",
                transitions: ["spawn"],
            },
            "nextRoom": {
                timer: 240,
                onStart: (data) => {
                    this.nextRoom(data["newRoom"])
                },
                onUpdate: () => {
                },
                onComplete: () => {
                },
                timeOutTransition: "END"
            }
        });
    }

    pushObj(layerName, obj) {
        if (layerName === LAYER_NAMES.PLAYER_SPAWNS) {
            if (!this.curPlayerSpawn || this.curPlayerSpawn.getId() > obj.getId()) {
                this.curPlayerSpawn = obj;
            }
        }
        this.layers.getLayer(layerName).pushObj(obj);
    }

    setSpawnPt(spawn) {
        this.curPlayerSpawn = spawn;
    }

    isOnWallGrindable(actor, distance) {
        let retObj = {ret: 0, obj: null};
        const aL = actor.getHitbox().cloneOffset(BMath.Vector({x: -distance, y: 0}));
        const aR = actor.getHitbox().cloneOffset(BMath.Vector({x: distance, y: 0}));
        this.layers.getCollidableLayers(actor).some(curLayer => {
            curLayer.objs.some(solid => {
                if (solid.isWallGrindable() && solid.isSolid(actor, BMath.VectorZero)) {
                    const sH = solid.getHitbox();
                    if (aL.isOverlap(sH)) {
                        retObj.ret = -1;
                        retObj.obj = sH;
                        return true;
                    } else if (sH.isOverlap(aR)) {
                        retObj.ret = 1;
                        retObj.obj = sH;
                        return true;
                    }
                }
            });
        });
        return retObj;
    }

    isOnGround(actor) {
        let ret = null;
        this.layers.getCollidableLayers(actor).some(layer => {
            layer.objs.some(physObj => {
                const pC = physObj.onPlayerCollide();
                if (actor.isOnTopOf(physObj)) {
                    if (pC.includes("wall") && physObj.isSolid(BMath.VectorZero, actor)) {
                        ret = physObj;
                        return true;
                    } else if (pC === "") {
                        ret = physObj;
                        return true;
                    }
                }
            });
        });
        return ret;
    }

    onPlayerCollide() {
        return "room";
    }

    onCollide(actor) {
        // if(actor.onPlayerCollide() === "") {
        //     this.getLevel().setCurrentRoom(this);
        // }
    }

    draw() {
        super.draw("#0000ff80");
    }

    drawAll() {
        if (Phys.DEBUG) {
            let drawTime = window.performance.now();
            this.layers.getLayers().forEach(layer => {
                layer.drawAll();
            });
            drawTime = window.performance.now()-drawTime;
            return drawTime;
        }
        else this.layers.getLayers().forEach(layer => {
            if (!layer.name.includes("Spawn")) layer.drawAll();
        });
    }

    getSpawnLayerNames() {
        return Object.keys(this.layers).filter(layerName => layerName.includes("Spawn"));
    }

    update() {
        this.stateMachine.update();
    }

    nextRoom(newRoom) {
        newRoom.setPlayer(this.getPlayer());
        this.getLevel().nextRoom(newRoom);
        this.setPlayer(null);
        this.setThrowables([]);
    }

    idleUpdate() {
        try {
            const playerCamPos = this.getLevel().getPlayer().getPos().addPoint(BMath.Vector({x: 24, y: 0}));
            Graphics.centerCamera(playerCamPos, {x: this.getX(), y: this.getY()}, {
                x: this.getX() + this.getWidth(),
                y: this.getY() + this.getHeight()
            });
            this.layers.forEachLayer(layer => layer.update());
            if (this.stateMachine.curStateName === "idle" && this.level.getPlayer()) {
                const outOfBounds = this.checkPlayerOutOfBounds();
                if (outOfBounds) {
                    const p = this.getLevel().getPlayer();
                    const roomsPlayerIsIn = this.getLevel().inWhichRooms(p);
                    const newRoom = roomsPlayerIsIn.find(room => room !== this);
                    if (newRoom) {
                        this.stateMachine.transitionTo("nextRoom", {"newRoom": newRoom});
                    } else if (outOfBounds === BMath.VectorDown) {
                        this.killPlayer(p.x, p.y);
                    } else if (outOfBounds === BMath.VectorRight) {
                        p.setX(this.getX() + this.getWidth() - p.getWidth());
                    } else if (outOfBounds === BMath.VectorLeft) {
                        p.setX(this.getX());
                    } else if (outOfBounds === BMath.VectorUp) {
                        p.setY(this.getY());
                    }
                }
            }
        } catch (error) {
            console.warn("error: in  room update", error);
            // this.killPlayer();
        }
    }

    checkPlayerFallDeath() {
        return this.getLevel().getPlayer().getY() > this.getY() + this.getHeight();
    }

    checkPlayerOutOfBounds() {
        const p = this.getLevel().getPlayer();
        if (p.getX() < this.getX()) return BMath.VectorLeft;
        else if (p.getY() < this.getY()) return BMath.VectorUp;
        else if (p.getX() + p.getWidth() > this.getX() + this.getWidth()) return BMath.VectorLeft;
        else if (p.getY() > this.getY() + this.getHeight()) return BMath.VectorDown;
        return null;
    }

    checkNextRoom() {
        if (this.getLevel().inWhichRooms(this.getLevel().getPlayer()).length > 1) {
            return true;
        }
    }

    resetRoom(spawnParams) {
        if (!spawnParams) {
            spawnParams = {};
            spawnParams["resetPlayer"] = true;
        }
        if (spawnParams["resetPlayer"]) {
            this.resetPlayer(this.curPlayerSpawn);
            this.getLevel().getGame().respawn();
        }
        this.resetObjs();
    }


    setPlayer(p) {
        this.layers.getLayer(LAYER_NAMES.PLAYER).objs = [p];
    }

    getPlayer() {
        const playerLayerObjs = this.layers.getLayer(LAYER_NAMES.PLAYER).objs;
        return playerLayerObjs && playerLayerObjs[0] ? playerLayerObjs[0] : null;
    }

    resetPlayer(curPlayerSpawn) {
        this.setPlayer(curPlayerSpawn.respawnClone());
    }

    getThrowables() {
        return this.layers.getLayer(LAYER_NAMES.THROWABLES).objs;
    }

    setThrowables(arr) {
        this.layers.getLayer(LAYER_NAMES.THROWABLES).objs = arr;
    }

    resetObjs() {
        this.setThrowables(this.layers.getLayer(LAYER_NAMES.THROWABLE_SPAWNS).objs.map(spawn => spawn.respawnClone()));
        const p = this.getPlayer();
        if (p && p.thrower.picking) this.setThrowables(this.getThrowables().concat(p.thrower.picking));
        this.layers.getRespawnableLayers().forEach(layer => layer.respawn());
    }

    killPlayer(x, y) {
        if (this === this.getLevel().getCurRoom()) this.stateMachine.transitionTo("death", {x: x, y: y});
    }

    setKeys(keys) {
        if (this.stateMachine.curStateName !== "load" && this.stateMachine.curStateName !== "intoRoom" && this.stateMachine.curStateName !== "nextRoom" && this.stateMachine.curStateName !== "spawn") {
            if (keys["KeyR"] === 2) {
                this.getLevel().killPlayer();
            } else {
                this.getLevel().getPlayer().setKeys(keys);
            }
        }
    }

    sortObjs() {
        this.layers.sortObjs();
    }

    collideOffset(physObj, offset) {
        return this.layers.collideOffset(physObj, offset);
    }

    getCollidables(physObj) {
        return this.layers.getCollidables(physObj);
    }

    getCollidableActorLayers(physObj) {
        return this.layers.getCollidableLayers(physObj);
    }

    getCollidableActors(physObj) {
        return this.layers.getCollidableActors(physObj);
    }

    getRidingActors(physObj) {
        return this.layers.getRidingActors(physObj);
    }

    checkCollideSolidsOffset(physObj, offset) {
        return this.layers.checkCollideSolidsOffset(physObj, offset);
    }

    isTouchingThrowable(physObj) {
        return this.layers.isTouchingThrowable(physObj);
    }
}

class Layers {
    constructor(layers) {
        this.layers = layers;
    }

    getLayer(name) {
        return this.layers[name];
    }

    getLayers() {
        return Object.keys(this.layers).map(layerName => this.layers[layerName]);
    }

    forEachLayer(f) {
        Object.keys(this.layers).forEach(layerName => f(this.layers[layerName]));
    }

    sortObjs() {
        this.forEachLayer(layer => layer.sortObjs());
    }

    getRidingActors(physObj) {
        let ret = [];
        this.getCollidableActorLayers(physObj).forEach(layer => {
            if (layer) {
                layer.objs.forEach(actor => {
                    if (actor.isRiding(physObj)) {
                        ret.push(actor);
                    }
                });
            }
        });
        return ret;
    }

    getCollidableLayers(physObj) {
        return this.getLayers().filter(layer => physObj.collisionLayers.includes(layer.name))
    }

    getRespawnableLayers() {
        return this.getLayers().filter(layer => layer.respawnable);
    }

    /** Returns all static layers*/
    getStaticLayers() {
        return this.getLayers().filter(layer => layer.allStatic);
    }

    /** Returns all nonstatic layers*/
    getDynamicLayers() {
        return this.getLayers().filter(layer => !layer.allStatic);
    }

    getSolidLayers() {
        return this.getLayers().filter(layer => layer.layerType === LAYER_TYPES.SOLID);
    }

    getActorLayers() {
        return this.getLayers().filter(layer => layer.layerType === LAYER_TYPES.ACTOR);
    }

    getNonRoomLayers() {
        return this.getLayers().filter(layer => layer.name !== LAYER_NAMES.ROOMS);
    }

    getCollidables(physObj) {
        let ret = [];
        this.getCollidableLayers(physObj).forEach(layer => {
            // layer.forEachSlicedObjs(physObj.getX()-physObj.getWidth(), physObj.getX()+physObj.getWidth()*2, obj => ret = ret.concat(obj));
            layer.forEachSlicedObjs(physObj.getX(), physObj.getX() + physObj.getWidth(), obj => ret = ret.concat(obj));
        });
        return ret;
    }

    /** Returns all actor layers that [physObj] can collide with*/
    getCollidableActorLayers(physObj) {
        return this.getActorLayers().filter(actorLayer => physObj.collisionLayers.includes(actorLayer.name));
    }

    getCollidableActors(physObj) {
        let ret = [];
        this.getCollidableActorLayers(physObj).forEach(actorLayer => {
            ret = ret.concat(actorLayer.objs);
        });
        return ret;
    }

    getCollidableSolidLayers(physObj) {
        return this.getSolidLayers().filter(actorLayer => physObj.collisionLayers.includes(actorLayer.name));
    }

    checkCollideSolidsOffset(physObj, offset) {
        let ret = [];
        this.getCollidableSolidLayers(physObj).forEach(layer => {
            const r = layer.collideOffset(physObj, offset);
            if (r.length !== 0) {
                ret = ret.concat(r);
            }
        });
        return ret;
    }

    collideOffset(physObj, offset) {
        let ret = null;
        this.getCollidableLayers(physObj).some(curLayer => {
            let r = curLayer.collideOffset(physObj, offset);
            if (r) {
                ret = r;
                return true;
            }
        });
        return ret;
    }

    isTouchingThrowable(physObj) {
        return this.getLayer(LAYER_NAMES.THROWABLES).isTouching(physObj);
    }
}

const physObjCompare = (a, b) => {
    return a.getX() + a.getWidth() - (b.getX() + b.getWidth());
};

class Layer {
    constructor(allStatic, name, layerType, respawnable = false) {
        this.objs = [];
        this.allStatic = allStatic;
        this.name = name;
        this.layerType = layerType;
        this.respawnable = respawnable;
    }

    sortObjs() {
        this.objs.sort(physObjCompare);
    }

    pushObj(o) {
        this.objs.push(o);
    }

    forEachSlicedObjs(lowTarget, highTarget, callBack) {
        if (this.objs.length !== 0 && this.allStatic) {
            const lowInd = this.binaryAboveX(lowTarget);
            const len = this.objs.length;
            for (let i = lowInd; i < len; ++i) {
                const curObj = this.objs[i];
                if (curObj.getX() - curObj.getWidth() < highTarget) {
                    callBack(curObj);
                } else {
                    break;
                }
            }
        } else {
            this.objs.forEach(callBack);
        }
        // return this.allStatic ? this.objs.slice(this.binaryAboveX(lowInd), this.binaryBelowX(highInd)) : this.objs;
    }

    drawAll() {
        const leftWidth = Math.max(this.objs[0] ? this.objs[0].getWidth() : 0, Graphics.TILE_SIZE);
        this.forEachSlicedObjs(
            -Graphics.cameraOffset.x - leftWidth,
            -Graphics.cameraOffset.x + Graphics.cameraSize.x,
            o => {
                if (o) o.draw();
            }
        );
    }

    update() {
        if (this.allStatic) {
            // console.warn("Warning: updating static layer");
            // console.trace();
            // throw new Error("Trying to update layer in static layer");
        } else {
            this.objs.forEach(o => {
                o.update();
            });
        }
    }

    collideOffset(physObj, offset) {
        let ret = [];
        let collide = false;
        this.forEachSlicedObjs(
            physObj.getX() + offset.x - Graphics.TILE_SIZE,
            physObj.getX() + physObj.getWidth() + offset.x + Graphics.TILE_SIZE,
            checkObj => {
                if (checkObj !== physObj && physObj.isOverlap(checkObj, offset)) {
                    ret.push(checkObj);
                    collide = true;
                }
            }
        );
        return ret;
    }

    respawn() {
        this.objs = this.objs.map(obj => obj.respawnClone());
    }

    binaryAboveX(targetX) {
        let low = 0, high = this.objs.length; // numElems is the size of the array i.e arr.size()
        while (low + 1 < high) {
            const mid = Math.floor((low + high) / 2); // Or a fancy way to avoid int overflow
            const mO = this.objs[mid];
            if (mO.getX() + mO.getWidth() > targetX) {
                if (mid < 1 || this.objs[mid - 1].getX() + this.objs[mid - 1].getWidth() <= targetX) return mid - 1;
                high = mid;
            } else {
                low = mid;
            }
        }
        if (low === 0) {
            return 0;
        } else return this.objs.length;
    }

    isTouching(physObj) {
        let ret = null;
        this.forEachSlicedObjs(physObj.getX(), physObj.getX() + physObj.getWidth(), checkObj => {
            if (physObj.isTouching(checkObj.getHitbox())) ret = checkObj;
        });
        return ret;
    }
}

export {
    Level, Room, Layer, LAYER_NAMES, LAYER_TYPES
}