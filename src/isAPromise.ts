export const isAPromise = <T extends any = any>(obj: any): obj is Promise<T> => Promise.resolve(obj) === obj;
