
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
    line: Line
    effects: Command[]

    constructor(line: Line){
        this.line = line;
        this.effects = [];
        for(const command of line.commands){
            if(command.type == CommandType.Set){
                this.effects.push(command);
            }
        }
        // return this; // check
    }

    concat(line: Line): Next{
        const res = new Next(line);
        res.effects = Object.assign([], this.effects).concat(res.effects);
        return res;
    }
}

export class Line {
    nexts: Line[] // entries that are considered to be after this one
    indent: number // depth of this line
    speaker: string | null
    text: string | null
    commands: Command[]
    children: Line[]
    parent: Line | null // null if line is in the root scope
    successor: Line | null // null if line the last one

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
