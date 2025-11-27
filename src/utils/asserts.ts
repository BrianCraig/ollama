export const assertString2 = (x: unknown): asserts x is string => {
  if (typeof x !== "string") throw new Error("nope");
};

export const assertString: (val: unknown) => asserts val is string = (val) => {
    if (typeof val !== "string") throw new Error ("Nope");
};