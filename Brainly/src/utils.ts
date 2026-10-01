export function random(len: number) {
    let options = "38r8fjf888fc8hdhe8w9ww9w0c8800fvvvfdss";
    let length = options.length;

    let ans = "";

    for (let i = 0; i < len; i++) {
        ans += options[Math.floor((Math.random() * length))]
    }
    return ans;
}