// Module that creates raw structures from given strings. Note that the
// structures need to be processed further to have all the information.

import { Line, Command, CommandType } from './entry'

export function parse_file(file_content: string): Line[] {
    const lines = file_content.split('\n');
    var res = [];
    for(var i = 0; i < lines.length; ++i){
        const line = lines[i];
        const line_struct = parse_line(line);
        if(line_struct){
            res.push(line_struct);
        }
    }
    return res;
}

export function parse_id_list(file_content: string) {
    var lines = file_content.split('\n');
    const rex: RegExp = /`id (?<id>\w+)`/g;
    var result: [string, string][] = [];
    for(var i = 0; i < lines.length; ++i){
        var line = lines[i];
        for(const match of line.matchAll(rex)) {
            var id = match.groups?.id;
            if(id) {
                result.push([line, id]);
            }
        }
    }
    return result;
}

// expecting lines of the following format
// (indent) * speaker: Text that may contain `commands` within backticks.
// (otherwise returns null)
export function parse_line(line: string): Line | null {
    var indent = 0;
    var i = 0;
    for(; i < line.length; ++i){
        const c = line.charAt(i);
        if((c == '*' || c == '-') && (i+1 < line.length) && line.charAt(i+1) == ' '){
            ++i;
            break;
        }
        if(c == ' '){
            indent += 1;
            continue;
        }
        if(c == '\t'){
            indent += 4;
            continue;
        }
        return null;
    }
    if(i == line.length){
        return null;
    }
    var code = false;
    var speaker = null;
    var text = "";
    var command: string = "";
    var commands = [];
    for(; i < line.length; ++i){
        const c = line.charAt(i);
        if(speaker == null && c == ':'){
            speaker = text.trim();
            if(speaker[0] == '['){
                speaker = speaker.substring(2,speaker.length-2);
            }
            text = "";
        }else if(code){
            if(c == '`'){
                code = false;
                for(const pcommand of parse_command(command)){
                    if(pcommand.type == CommandType.Call){
                        i += 3;
                        var file = "";
                        while(true){
                            ++i;
                            if(i == line.length){
                                break;
                            }
                            const c = line.charAt(i);
                            if(c == ']'){
                                i += 2;
                                break;
                            }
                            file += c;
                        }
                        pcommand.par = file;
                    }
                    commands.push(pcommand);
                }
            }else{
                command += c;
            }
        }else{
            if(c == '`'){
                code = true;
                command = "";
            }else{
                text += c;
            }
        }
    }
    const res = new Line();
    res.nexts = [];
    res.indent = indent;
    res.speaker = speaker;
    res.text = text.trim();
    res.commands = commands;
    res.children = [];
    return res;
}

function parse_command(command_str: string): Command[]{
    const cmd_split = command_str.split(' ');
    const res: Command[] = [];
    for(var i=0; i<cmd_split.length; ++i){
        var cmd = new Command();
        switch(cmd_split[i]){
            case "id": {
                cmd.type = CommandType.Id;
                cmd.par = cmd_split[i+1];
                i += 1;
                break;
            }
            case "next": {
                cmd.type = CommandType.Next;
                cmd.par = cmd_split[i+1];
                i += 1;
                break;
            }
            case "set": {
                cmd.type = CommandType.Set;
                cmd.par = cmd_split.slice(i+1).join(" ");
                i = cmd_split.length;
                break;
            }
            case "if": {
                cmd.type = CommandType.If;
                cmd.par = cmd_split.slice(i+1).join(" ");
                i = cmd_split.length;
                break;
            }
            case "else": {
                cmd.type = CommandType.Else;
                cmd.par = null;
                break;
            }
            case "call": {
                cmd.type = CommandType.Call;
                cmd.par = null;
                break;
            }
            case "choice": {
                cmd.type = CommandType.Choice;
                cmd.par = null;
                break;
            }
            case "option": {
                cmd.type = CommandType.Option;
                cmd.par = null;
                break;
            }
            case "repeat": {
                cmd.type = CommandType.Repeat;
                cmd.par = null;
                break;
            }
            case "end": {
                cmd.type = CommandType.End;
                cmd.par = null;
                break;
            }
            case "skip": {
                cmd.type = CommandType.Skip;
                cmd.par = null;
                break;
            }
        }
        res.push(cmd);
    }
    return res;
}

