import { randomInt } from "node:crypto";

const ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates an unguessable random string using a CSPRNG.
 * With 62 symbols, 10 characters gives ~59.5 bits of entropy.
 */
export function random(len: number): string {
    let ans = "";

    for (let i = 0; i < len; i++) {
        ans += ALPHABET[randomInt(ALPHABET.length)];
    }

    return ans;
}
