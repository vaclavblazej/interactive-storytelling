// Given lines these methods go through them and compute all auxiliary
// information that is later used for dialog.

import { State } from './state'
import { Line, Next } from './entry'

function get_after(line: Line): Line | null{
    if(line.parent && line.parent.choice()){
        return get_after(line.parent);
    }
    if(line.successor){
        return line.successor;
    }
    if(line.parent){
        return get_after(line.parent);
    }
    return null;
}

function check_and_push(next: Line, set: Set<Line>, array: Line[]){
    if(set.has(next)){
        console.log("line has several ways of being added");
    }else{
        set.add(next);
        array.push(next);
    }
}

function compute_relations(lines: Line[]){
    const indent_stack: Line[] = [];
    for(const line of lines){
        while(true){
            const last = indent_stack.last();
            if(last == null || last.indent <= line.indent){
                break;
            }
            indent_stack.pop();
        }
        const predecesor = indent_stack.last();
        if(predecesor != null && predecesor.indent == line.indent){
            predecesor.successor = line;
            indent_stack.pop();
        }
        const parent = indent_stack.last();
        if(parent != null){
            line.parent = parent;
            parent.children.push(line);
        }
        indent_stack.push(line);
    }
}

function ancestor_test(child: Line, test: Function): Line | null{
    var ancestor = child.parent;
    while(ancestor != null && !test(ancestor)){
        ancestor = ancestor.parent;
    }
    return ancestor;
}

function compute_nexts(lines: Line[]){
    const id_to_entry: Map<string, Line> = new Map();
    for(const line of lines){
        const id = line.id();
        if(id != null){
            id_to_entry.set(id, line);
        }
    }
    for(const line of lines){
        const tobe_next_set = new Set<Line>();
        const nexts: Line[] = [];
        const next_command_id = line.next();
        if(next_command_id){
            const entry_by_id = id_to_entry.get(next_command_id);
            if(entry_by_id){
                check_and_push(entry_by_id, tobe_next_set, nexts);
            }else{
                console.log("did not find id in this file", next_command_id)
            }
        }else if(line.repeat()){
            const choice_ancestor = ancestor_test(line, (anc: Line) => anc.choice())
            if(choice_ancestor != null){
                check_and_push(choice_ancestor, tobe_next_set, nexts);
            }else{
                console.log("error: using repeat command outside of choice");
            }
        }else if(line.children.length != 0){
            if(line.choice()){
                for(const child of line.children){
                    check_and_push(child, tobe_next_set, nexts);
                }
            }else{
                check_and_push(line.children[0], tobe_next_set, nexts);
            }
        }else{
            const next = get_after(line);
            if(next){
                check_and_push(next, tobe_next_set, nexts);
            }
        }
        line.nexts = nexts;
    }
}

export function compute_entry_data(lines: Line[]){
    compute_relations(lines);
    compute_nexts(lines);
}

function compute_choice_rec(line: Line, state: State, tobe_next_set: Set<Line>): Next[]{
    const nexts: Next[] = [];
    if(line.option()){
        const after = get_after(line);
        if(after != null){
            nexts.concat(compute_choice_rec(after, state, tobe_next_set));
        }
    }
    // todo finish this function
    if(line.is_empty() || line.skip()){
        for(const n of line.nexts){
            // console.log("combining empty", line, n.line);
            check_and_push(new Next(line).concat(n.line), tobe_next_set, tobe_next_array);
        }
    }else{
        nexts.push(tobe_next);
    }
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

export function compute_choices(line: Line, state: State): Next[]{
    const tobe_next_set = new Set<Line>();
    const result: Next[] = [];
    for(const entry of line.nexts){
        result.concat(compute_choice_rec(entry, state, tobe_next_set));
    }
    return result;
}
