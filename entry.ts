
// Datasturctures for lines and their properties.

export enum CommandType{
    Id,
    Next,
    Choice,
    Option,
    Repeat,
    End,
    Call,
    Skip,
    Set,
    If,
}

export class Command{
    type: CommandType
    par: string | null
}

export class Next{
    conditions: Command[]
    yes_entry: Entry
    no_entry: Entry | null
    effects: Command[]

    constructor(entry: Entry){
        this.yes_entry = entry;
        this.conditions = [];
        this.effects = [];
        for(const command of entry.commands){
            if(command.type == CommandType.Set){
                this.effects.push(command);
            }else if(command.type == CommandType.If){
                this.conditions.push(command);
            }
        }
        // return this; // check
    }

}

export class Entry {
    nexts: Entry[]
    indent: number
    speaker: string | null
    text: string | null
    commands: Command[]
    children: Entry[]
    parent: Entry | null // null if line is in the root scope
    successor: Entry | null // null if line the last one

    constructor(){
        this.nexts = []
        this.indent = 0
        this.speaker = null
        this.text = null
        this.commands = []
        this.children = []
        this.parent = null
        this.successor = null
    }

    is_empty(): boolean{
        return this.text == null || this.text.trim() == "";
    }
    check_get(type: CommandType): string | null {
        for(const command of this.commands){
            if(command.type == type){
               return command.par;
            }
        }
        return null;
    }
    check(type: CommandType): boolean {
        for(const command of this.commands){
            if(command.type == type){
               return true;
            }
        }
        return false;
    }
    id(): string | null{
        return this.check_get(CommandType.Id)
    }
    next(): string | null{
        return this.check_get(CommandType.Next);
    }
    call(): string | null{
        return this.check_get(CommandType.Call);
    }
    set(): string | null{
        return this.check_get(CommandType.Set);
    }
    if(): string | null{
        return this.check_get(CommandType.If);
    }
    choice(): boolean{
        return this.check(CommandType.Choice);
    }
    option(): boolean{
        return this.check(CommandType.Option);
    }
    repeat(): boolean{
        return this.check(CommandType.Repeat);
    }
    end(): boolean{
        return this.check(CommandType.End);
    }
    skip(): boolean{
        return this.check(CommandType.Skip);
    }
}
