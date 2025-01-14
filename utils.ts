
// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
export function randomString(len: number) {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return [...Array(len)].reduce(a => a+alphabet[~~(Math.random()*alphabet.length)], '');
}

export type Ok<T> = {
    ok: true,
    value: T,
}

export type Err = {
    ok: false,
    message: string,
}

export const ok = <T>(value: T): Ok<T> => ({
    ok: true,
    value,
});

export const err = (message: string): Err => ({
    ok: false,
    message,
});

export type Result<T> = Ok<T> | Err
