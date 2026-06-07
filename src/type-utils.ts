/** 获取以 Object 的 values 作为 union 的类型 */
export type ObjectValues<T> = T[keyof T];
