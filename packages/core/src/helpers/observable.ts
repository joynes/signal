export interface Observable<T = void> {
  subscribe: (listener: (value: T) => void) => () => void
}
