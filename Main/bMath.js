const Vector = ({ x, y }) => ({
    x, y,
    incrPoint(p) {
        this.x += p.x;
        this.y += p.y;
    },
    addPoint(p) {
        return Vector({x:this.x+p.x, y:this.y+p.y});
    },
    scalarX(scalar) {return(Vector({x: this.x*scalar, y:this.y}));},
    // scalarY(scalar) {return(Vector({x: this.x, y:this.y*scalar}));},
    scalar(s) {return(Vector({x: this.x*s, y:this.y*s}));}
});
const VectorUp = Vector({x: 0, y: -1});
const VectorRight = Vector({x: 1, y: 0});
const VectorDown = Vector({x: 0, y: 1});
const VectorLeft = Vector({x: -1, y: 0});
const VectorZero = Vector({x: 0, y:0});

function appr(val, target, amount) {
    return (val > target ? Math.max(val - amount, target) : Math.min(val + amount, target));
}

const angleBetween = (v1, v2) => {
    //Radians
    return Math.acos( (v1.x * v2.x + v1.y * v2.y) / ( Math.sqrt(v1.x*v1.x + v1.y*v1.y) * Math.sqrt(v2.x*v2.x + v2.y*v2.y) ) );
};

function vToRad(v) {
    switch(v) {
        case VectorUp: return 0;
        case VectorDown: return Math.PI;
        case VectorLeft: return Math.PI*1.5;
        case VectorRight: return Math.PI/2;
        default: return null;
    }
}

function numToVec(num) {
    switch (num) {
        case 0: return VectorUp;
        case 1: return VectorRight;
        case 2: return VectorDown;
        case 3: return VectorLeft;
    }
    return null;
}

function rotateRect(x, y, w, h, tileSize, direction) {

    return {
        newX: direction === VectorLeft ? x+tileSize-h : x,
        newY : direction === VectorUp ? y : y+h-tileSize,
        newW : direction.x === 0 ? w : h,
        newH : direction.x === 0 ? h : w
    };
}

class Rectangle {
    constructor(x, y, width, height) {
        this.pos = Vector({x, y});
        this.width = width;
        this.height = height;
    }

    toString() {
        return `x: ${this.pos.x} y: ${this.pos.y} w: ${this.width} height: ${this.height}`
    }

    getX() {return(this.pos.x);}
    getY() {return(this.pos.y);}
    setX(x) {this.pos.x = x;}
    setY(y) {this.pos.y = y;}
    incrX(dx) {this.pos.x += dx;}
    incrY(dy) {this.pos.y += dy;}

    isOverlap(rectangle) {
        let x = this.getX();
        let y = this.getY();
        let rx = rectangle.getX();
        let ry = rectangle.getY();
        return (x < rx + rectangle.width &&
            x + this.width > rx &&
            y < ry + rectangle.height &&
            y + this.height > ry);
    }

    isTouching(rectangle) {
        return(
            this.isOnTopOf(rectangle) ||
            rectangle.isOnTopOf(this) ||
            this.isLeftOf(rectangle) ||
            rectangle.isLeftOf(this)
        )
    }

    isOnTopOf(rectangle) {
        return (
            this.getY() + this.height === rectangle.getY() &&
            this.getX() + this.width > rectangle.getX() &&
            rectangle.getX() + rectangle.width > this.getX()
        );
    }

    isLeftOf(rectangle) {
        return(
            this.getX() + this.width === rectangle.getX() &&
            this.getY() < rectangle.getY() + rectangle.height &&
            this.getY() + this.height > rectangle.getY()
        )
    }

    angleBetween(rectangle) {
        return angleBetween(this.pos, rectangle.pos);
    }

    getPos() {return this.pos;}
}

export {
    VectorDown, VectorUp, VectorRight, VectorLeft, VectorZero, Vector,
    numToVec, vToRad, rotateRect, appr,
    Rectangle,
};