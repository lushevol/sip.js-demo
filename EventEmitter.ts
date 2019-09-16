/*
 * @Description: Event Emitter
 * @Author: lushevol
 * @Date: 2019-09-09 09:23:21
 * @LastEditors: lushevol
 * @LastEditTime: 2019-09-16 21:51:34
 */

type EventMap = Map<string, Function[]>

class EventEmitter {
  private defaultMaxListeners = 10
  public maxListeners: number
  private events: EventMap
  constructor() {
    this.events = new Map()
    this.maxListeners = this.getMaxListeners()
  }

  /**
   * get all eventNames
   */
  public eventNames() {
    return [...this.events.keys()]
  }

  /**
   * setMaxListeners
   */
  public setMaxListeners(num: number) {
    if(!num) {
      return false
    }
    this.maxListeners = num
  }

  /**
   * getMaxListeners
   */
  public getMaxListeners() {
    return this.maxListeners || this.defaultMaxListeners
  }

  /**
   * attach a listener on a event
   * en: EventName, cb: Callback Function
   */
  public on(en: string, cb: Function) {
    if(this.events.has(en)) {
      const cbArray = this.events.get(en)
      cbArray.push(cb)
    } else {
      this.events.set(en, [cb])
    }
  }

  /**
   * once
   */
  public once() {
    
  }

  /**
   * remove one listener of a event , or remove all listeners of a event
   */
  public removeListener(en: string, cb?: Function) {
    if(this.events.has(en)) {
      if(cb) {
        const cbArray = this.events.get(en)
        let cbIndex = -1
        cbArray.forEach((listener, index) => {
          if(listener === cb) {
            cbIndex = index
          }
        })
        if(cbIndex !== -1) {
          cbArray.splice(cbIndex, 1)
        }
      } else {
        this.events.delete(en)
      }
    }
  }

  /**
   * removeAllListener
   */
  public removeAllListener() {
    this.events.clear()
  }

  /**
   * return listeners of some EventName
   */
  public listeners(en: string) {
    if(this.events.has(en)) {
      return this.events.get(en)
    } else {
      return []
    }
  }

  /**
   * emit
   */
  public emit(en: string, ...arg) {
    if (this.events.has(en)) {
      const cbArray = this.events.get(en)
      cbArray.forEach(listener => {
        listener.call(this, ...arg)
      })
    }
  }
}

export { EventEmitter }