export function deepFreezeObject<T>(obj: T): T {
  const propNames = Object.getOwnPropertyNames(obj);

  for (const name of propNames) {
    const value = (obj as any)[name];

    if (value && typeof value === 'object') {
      deepFreezeObject(value);
    }
  }

  return Object.freeze(obj);
}
