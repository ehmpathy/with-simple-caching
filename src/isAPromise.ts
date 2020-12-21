export const isAPromise = (obj: any): obj is Promise<any> => Promise.resolve(obj) === obj;
