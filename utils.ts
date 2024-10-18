
// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
export function randomString(len: number) {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return [...Array(len)].reduce(a => a+alphabet[~~(Math.random()*alphabet.length)], '');
}

export type Ok<T> = {
    _tag: "Ok",
    value: T
}

export type Err = {
    _tag: "Err",
    message: string
}

export const ok = <T>(value: T): Ok<T> => ({
    _tag: "Ok",
    value,
});

export const err = (message: string): Err => ({
    _tag: "Err",
    message,
});

export type Result<T> = Ok<T> | Err
