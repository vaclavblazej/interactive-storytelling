import { Line, Next } from './entry'
import { parse_file } from './parse'
import { compute_choices, compute_entry_data } from './processing'
import { Result, ok, err } from './utils'

export class DebugMsg {
    message: string

    constructor(message: string) {
        this.message = message;
    }
}

export class State{
    data: Object
    file_stack: string[]
    current_line: Line | null
    chat_history: (Line | DebugMsg)[]
    file_start: Map<string, Line>
    debug: boolean = true
    choices_result: Result<Next[]>
    end: boolean

    apply_set_command(command: string | null){
        if(command){
            const F = new Function("state", "{"+command+"}");
            F(this.data);
            this.chat_history.push(new DebugMsg(command));
        }
    }

    apply_if_command(command: string | null): Result<boolean> {
        if(command){
            const F = new Function("state", "{return "+command+"}");
            this.chat_history.push(new DebugMsg(command));
            return ok(F(this.data)); // todo error reporting
        }
        return err("todo this error");
    }

    async push_file(filename: string, adapter: any) {
        // todo split parse file and push file
        await adapter.read(filename).then((file: string) => {
            const entries: Line[] = parse_file(file);
            if(entries.length == 0){
                console.log("error: parsed file does not have any lines")
            }else{
                compute_entry_data(entries);
                const dummy_entry = new Line();
                dummy_entry.nexts.push(entries[0]);
                this.current_line = dummy_entry;
                this.file_start.set(filename, dummy_entry);
                this.file_stack.push(filename);
            }
        });
    }

    async start_file(file_path: string, adapter: any){
        this.file_stack = [];
        await this.push_file(file_path, adapter).then(() => {
            this.recompute_chocies();
        });
    }

    push_debug(debug: DebugMsg){
        this.chat_history.push(debug);
    }

    recompute_chocies(){
        if(this.current_line == null){
            this.push_debug(new DebugMsg("choices null"));
            this.choices_result = err("current line is null");
            return;
        }
        this.push_debug(new DebugMsg("chocies \""+this.current_line.text+"\""));
        if(this.current_line.end()){
            this.choices_result = ok([]);
            return;
        }
        this.choices_result = compute_choices(this.current_line, this);
    }

    push_next(next: Next){
        this.chat_history.push(next.line);
        this.current_line = next.line;
        for(const effect of next.effects){
            this.apply_set_command(effect.par);
        }
        const id = next.line.id();
        if(id){
            this.apply_set_command('state["line.'+id+'"]=true');
            this.apply_set_command('if(state["line.'+id+'.visits"]){state["line.'+id+'.visits"]++;}else{state["line.'+id+'.visits"]=1;}');
        }
        this.recompute_chocies();
    }

    reset(){
        this.data = new Object();
        this.file_stack = [];
        this.current_line = null;
        this.chat_history = [];
        this.file_start = new Map();
        this.recompute_chocies();
    }

    constructor(){
        this.reset();
    }
}
