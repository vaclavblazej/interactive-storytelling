import { Entry, Next } from './entry'
import { parse_file } from './parse'
import { compute_entry_data } from './processing'

export class State{
    data: Object
    file_stack: string[]
    current_line: Entry | null
    chat_history: Entry[]
    file_start: Map<string, Entry>

    apply_set_command(par: string){
        console.log("set", par);
        const F = new Function("state", "{"+par+"}");
        F(this.data);
    }

    apply_if_command(par: string): boolean{
        console.log("if", par);
        const F = new Function("state", "{return "+par+"}");
        return F(this.data);
    }

    async push_file(filename: string, adapter: any) {
        // todo split parse file and push file
        await adapter.read(filename).then((file: string) => {
            const entries: Entry[] = parse_file(file);
            if(entries.length == 0){
                console.log("error: parsed file does not have any lines")
            }else{
                compute_entry_data(entries);
                const dummy_entry = new Entry();
                dummy_entry.nexts.push(entries[0]);
                this.file_start.set(filename, dummy_entry);
                this.file_stack.push(filename);
            }
        });
    }

    async start_file(file_path: string, adapter: any){
        this.file_stack = [];
        await this.push_file(file_path, adapter).then(() => {
            this.chat_history = []
            if(this.current_line){
                this.chat_history.push(this.current_line);
            }
        });
    }

    list_choices(){
        if(this.current_line == null){
            return [];
        }
        console.log("current line:", this.current_line);
        // console.log(this.current_line.nexts);
        // for(const next of this.current_line.nexts){
            // nexts.push(next);
        // }
        // console.log(this.current_line);
        // if(this.current_line.end()){
            // // todo end
        // }
        // todo incorporate the below
        // for(const entry of entries){
            // console.log("building nexts for", entry);
            // const tobe_next_set = new Set<Entry>();
            // const tobe_next_array: Next[] = [];
            // for(const next of entry.nexts){
                // tobe_next_set.add(next.entry);
                // tobe_next_array.push(next);
            // }
            // const nexts: Next[] = [];
            // while(tobe_next_array.length != 0){
                // const tobe_next: Next | undefined = tobe_next_array.pop();
                // if(tobe_next == undefined){
                    // continue;
                // }
                // if(tobe_next.entry.option()){
                    // console.log("found option", tobe_next.entry);
                    // const after = get_after(tobe_next.entry);
                    // if(after){
                        // check_and_push(to_next(after), tobe_next_set, tobe_next_array);
                    // }
                // }
                // if(tobe_next.entry.is_empty() || tobe_next.entry.skip()){
                    // console.log("found empty", tobe_next);
                    // for(const n of tobe_next.entry.nexts){
                        // console.log("combining empty", tobe_next, n.entry);
                        // check_and_push(combine_next(tobe_next, n.entry), tobe_next_set, tobe_next_array);
                    // }
                // }else{
                    // nexts.push(tobe_next);
                // }
            // }
            // entry.nexts = nexts;
        // }
        const filtered_nexts = [];
        for(const next of this.current_line.nexts){
            var okay = true;
            for(const condition of next.conditions){
                if(condition.par){
                    if(!this.apply_if_command(condition.par)){
                        okay = false;
                        break;
                    }
                }
            }
            if(okay){
                filtered_nexts.push(next);
            }
        }
        return filtered_nexts;
    }

    push_next(next: Next){
        this.chat_history.push(next.entry);
        this.current_line = next.entry;
        for(const effect of next.effects){
            if(effect.par){
                this.apply_set_command(effect.par);
            }
        }
        const id = next.entry.id();
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
