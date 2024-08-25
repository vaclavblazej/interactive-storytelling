// Given entries these methods go through them and compute all auxiliary
// information that is later used for dialog.

import { Entry } from './entry'

function get_after(entry: Entry): Entry | null{
    if(entry.parent && entry.parent.choice()){
        return get_after(entry.parent);
    }
    if(entry.successor){
        return entry.successor;
    }
    if(entry.parent){
        return get_after(entry.parent);
    }
    return null;
}

function check_and_push(next: Entry, set: Set<Entry>, array: Entry[]){
    if(set.has(next)){
        console.log("entry has several ways of being added");
    }else{
        set.add(next);
        array.push(next);
    }
}

function compute_relations(entries: Entry[]){
    const indent_stack: Entry[] = [];
    for(const entry of entries){
        while(true){
            const last = indent_stack.last();
            if(last == null || last.indent <= entry.indent){
                break;
            }
            indent_stack.pop();
        }
        const predecesor = indent_stack.last();
        if(predecesor != null && predecesor.indent == entry.indent){
            predecesor.successor = entry;
            indent_stack.pop();
        }
        const parent = indent_stack.last();
        if(parent != null){
            entry.parent = parent;
            parent.children.push(entry);
        }
        indent_stack.push(entry);
    }
}

function compute_nexts(entries: Entry[]){
    const id_to_entry: Map<string, Entry> = new Map();
    for(const entry of entries){
        const id = entry.id();
        if(id != null){
            id_to_entry.set(id, entry);
        }
    }
    for(const entry of entries){
        const tobe_next_set = new Set<Entry>();
        const nexts: Entry[] = [];
        const next_command_id = entry.next();
        if(next_command_id){
            const entry_by_id = id_to_entry.get(next_command_id);
            if(entry_by_id){
                check_and_push(entry_by_id, tobe_next_set, nexts);
            }else{
                console.log("did not find id in this file", next_command_id)
            }
        }else if(entry.repeat()){
            var choice_ancestor = entry.parent;
            while(choice_ancestor != null && !choice_ancestor.choice()){
                choice_ancestor = choice_ancestor.parent;
            }
            if(choice_ancestor != null){
                check_and_push(choice_ancestor, tobe_next_set, nexts);
            }else{
                console.log("error: using repeat command outside of choice");
            }
        }else if(entry.children.length != 0){
            if(entry.choice()){
                for(const child of entry.children){
                    check_and_push(child, tobe_next_set, nexts);
                }
            }else{
                check_and_push(entry.children[0], tobe_next_set, nexts);
            }
        }else{
            const next = get_after(entry);
            if(next){
                check_and_push(next, tobe_next_set, nexts);
            }
        }
        entry.nexts = nexts;
    }
}

export function compute_entry_data(entries: Entry[]){
    compute_relations(entries);
    compute_nexts(entries);
}
