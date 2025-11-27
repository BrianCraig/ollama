export const assertString: (val: unknown) => asserts val is string = (val) => {
    if (typeof val !== "string") throw new Error ("Nope");
};