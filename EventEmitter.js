

/**  @template T */
export default class EventEmitter{
    /**
     * @callback Listener
     * @param {T} t
     */

    constructor(sender){
        this.sender = sender;
        // /**@type {Listener[]} */
        this.listeners = [];
    }



    /**@param {Listener} listener */
    listen(listener){
        this.listeners.push(listener);
    }


    invoke(args){
        for (let i = 0; i < this.listeners.length; i++) {
            const listener = this.listeners[i];
            listener(args);
        }
    }
}