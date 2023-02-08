import * as Phys from './basePhysics.js';

const END_STATE = "END";

class State {
    constructor(data) {
        this.onUpdate = null;
        this.onStart = null;
        this.onComplete = null;
        this.maxTimer = null;
        this.timeOutTransition = null;
        Object.keys(data).map(key => {
            this[key] = data[key];
        });
        if(this.maxTimer) {
            const actualStart = this.onStart;
            this.onStart = (params) => {
                this.curTimer = this.maxTimer;
                actualStart(params);
            }
        }
    }

    update(params) {
        if(this.onUpdate) this.onUpdate(params);
        if(this.maxTimer) {
            this.curTimer = Phys.timeDecay(this.curTimer, 0);
            if(this.curTimer === 0) {
                if(this.onComplete) this.onComplete();
                this.timeOutTransition();
            }
        }
    }
}

class StateMachine {
    constructor(states, startStateName) {
        let startName = startStateName;
        Object.keys(states).map(key => {
            const stateData = states[key];
            if(startName == null) startName = key;
            const targetTransition = stateData["timeOutTransition"];
            if(targetTransition === END_STATE) {
                //State machine complete
            } else if(targetTransition) {
                stateData["timeOutTransition"] = () => this.transitionTo(targetTransition);
            }
            states[key] = new State(stateData);
        });
        this.states = states;
        this.curState = null;
        this.transitionTo(startName);
    }

    transitionTo(name, params) {
        if(name === this.curStateName) {return;}
        if(name in this.states) {
            if(this.curState && this.curState.transitions && !(this.curState.transitions.includes(name))) {
                console.error("from: ", this.curStateName, "to:", name);
                console.error(this.curState.transitions);
                console.error(this.states);
                console.trace();
                throw new Error("Tried to transition to state that's not in state's transitions");
            }
            this.setStateName(name);
            if(this.curState.onStart) this.curState.onStart(params);
        } else {
            console.error("name", name);
            console.error(this.states);
            console.trace();
            throw new Error("Transitioned to state that's not in states")
        }
    }

    setStateName(name) {
        this.curStateName = name;
        this.curState = this.states[name];
    }

    update(args) {
        this.curState.update(args);
    }

    getCurState() {return this.curState;}
}

export {StateMachine, END_STATE};