export type TNetworkAgentCountAt = {
    count: number;
    date: Date;
};

// move!
// Derived type where Date is converted to a string
// export type TDateAsString<T> = {
//     [K in keyof T]: T[K] extends Date ? string : T[K];
// };