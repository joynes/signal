import { Emitter } from "./emitter"
import { Observable } from "./observable"

export class DerivedValue<T> {
  private readonly emitter = new Emitter()

  constructor(private currentValue: T) {}

  get value(): T {
    return this.currentValue
  }

  get onChanged(): Observable {
    return this.emitter
  }

  set(value: T) {
    this.currentValue = value
    this.emitter.emit()
  }
}
