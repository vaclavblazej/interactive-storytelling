import { Line, Next } from './entry'
import { parse_file } from './parse'
import { compute_choices, compute_entry_data } from './processing'
import { Result, ok, err } from './utils'

export class State{
    data: Object
    file_stack: string[]
    current_line: Line | null
    chat_history: Line[]
    file_start: Map<string, Line>

    apply_set_command(par: string){
        const F = new Function("state", "{"+par+"}");
        F(this.data);
    }

    apply_if_command(par: string): Result<boolean> {
        const F = new Function("state", "{return "+par+"}");
        return ok(F(this.data)); // todo error reporting
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
            this.chat_history = []
        });
    }

    list_choices(): Result<Next[]>{
        if(this.current_line == null){
            return err("current line is null");
        }
        return compute_choices(this.current_line, this)
    }

    push_next(next: Next){
        this.chat_history.push(next.line);
        this.current_line = next.line;
        for(const effect of next.effects){
            if(effect.par){
                this.apply_set_command(effect.par);
            }
        }
        const id = next.line.id();
        if(id){
            console.log('state["line.'+id+'"]=true');
            this.apply_set_command('state["line.'+id+'"]=true');
        }
    }

    reset(){
        this.data = new Object();
        this.file_stack = [];
        this.current_line = null;
        this.chat_history = [];
        this.file_start = new Map();
    }

    constructor(){
        this.reset();
    }
}
