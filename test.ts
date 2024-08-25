
import { parse_line } from './parse'

function assert(condition: any, msg?: string):  asserts condition {
    if (!condition) {
        throw new Error(msg);
    }
}

export function run_tests(){
    {
        const line = parse_line("* A");
        assert(line != null);
        assert(line.speaker == null);
        assert(line.text == "A");
        assert(line.indent == 0);
    }
    {
        const line = parse_line("  *  \t Daniel:   B line \n \t");
        assert(line != null);
        assert(line.speaker == "Daniel");
        assert(line.text == "B line");
        assert(line.indent == 2);
    }
}
