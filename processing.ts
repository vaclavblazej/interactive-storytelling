// Given lines these methods go through them and compute all auxiliary
// information that is later used for dialog.

import { State } from './state'
import { Line, Next } from './entry'
import { Result, ok } from 'utils';

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

function compute_choice_rec(line: Line, parent: Next | null, state: State, tobe_next_set: Set<Line>): Result<Next[]>{
    const if_command = line.if();
    if(if_command){
        const res = state.apply_if_command(if_command);
        if(!res.ok){
            return res;
        }else if(line.successor?.else()){
            return compute_choice_rec(line.successor, new Next(line), state, tobe_next_set);
        }else{
            return ok([]);
        }
    }
    var nexts: Next[] = [];
    var next_line = null;
    if(parent){
        next_line = parent.concat(line);
    }else{
        next_line = new Next(line);
    }
    if(line.is_empty() || line.skip()){
        for(const n of line.nexts){
            const res = compute_choice_rec(n, next_line, state, tobe_next_set);
            if(res.ok){
                nexts.push(...res.value);
            }else{
                return res;
            }
        }
    }else{
        if(tobe_next_set.has(line)){
            console.log("line has several ways of being added");
        }else{
            tobe_next_set.add(line);
            nexts.push(next_line);
        }
    }
    if(line.option()){
        const after = get_after(line);
        if(after != null){
            const res = compute_choice_rec(after, null, state, tobe_next_set);
            if(res.ok){
                nexts.push(...res.value);
            }else{
                return res;
            }
        }
    }
    return ok(nexts);
}

export function compute_choices(line: Line, state: State): Result<Next[]>{
    const tobe_next_set = new Set<Line>();
    var result: Next[] = [];
    for(const entry of line.nexts){
        const res = compute_choice_rec(entry, null, state, tobe_next_set);
        if(res.ok){
            result.push(...res.value);
        }else{
            return res;
        }
    }
    return ok(result);
}
