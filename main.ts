import { App, Editor, FuzzySuggestModal, ItemView, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal, WorkspaceLeaf, setIcon } from 'obsidian';

interface InteractiveStorytellingSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: InteractiveStorytellingSettings = {
    mySetting: 'default'
}

// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
function randomString(len: number) {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return [...Array(len)].reduce(a => a+alphabet[~~(Math.random()*alphabet.length)], '');
}

function getIdList(view: MarkdownView) {
    var lines = view.data.split('\n');
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

enum CommandType{
    Id,
    Next,
    Choice,
    Option,
    Repeat,
    End,
}

class Command{
    type: CommandType
    id: string | null
}

class Entry {
    nexts: Set<Entry>
    indent: number
    speaker: string | null
    text: string
    commands: Command[]
    children: Entry[]
    parent: Entry | null
    successor: Entry | null

    is_empty(): boolean{
        return this.text.trim() == "";
    }
    check_get(type: CommandType): string | null {
        for(const command of this.commands){
            if(command.type == type){
               return command.id;
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
}

function parse_command(command_str: string): Command{
    const cmd_split = command_str.split(' ');
    var res = new Command();
    switch(cmd_split[0]){
        case "id": {
            res.type = CommandType.Id;
            res.id = cmd_split[1];
            break;
        }
        case "next": {
            res.type = CommandType.Next;
            res.id = cmd_split[1];
            break;
        }
        case "choice": {
            res.type = CommandType.Choice;
            res.id = null;
            break;
        }
        case "option": {
            res.type = CommandType.Option;
            res.id = null;
            break;
        }
        case "repeat": {
            res.type = CommandType.Repeat;
            res.id = null;
            break;
        }
        case "end": {
            res.type = CommandType.End;
            res.id = null;
            break;
        }
    }
    return res;
}

// expecting lines of the following format
// (indent) * speaker: Text that may contain `commands` within backticks.
// (otherwise returns null)
function parse_line(line: string): Entry | null {
    var indent = 0;
    var i = 0;
    for(; i < line.length; ++i){
        const c = line.charAt(i);
        if(c == '*' || c == '-'){
            ++i;
            break;
        }
        if(c != ' '){
            return null;
        }
        indent += 1;
    }
    if(i == line.length){
        return null;
    }
    var code = false;
    var speaker = null;
    var text = "";
    var command: string = "";
    var command_strings = [];
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
                command_strings.push(command);
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
    const commands = command_strings.map(parse_command);
    const res = new Entry();
    res.nexts = new Set<Entry>();
    res.indent = indent;
    res.speaker = speaker;
    res.text = text.trim();
    res.commands = commands;
    res.children = [];
    return res;
}

function get_graph(lines: string[]): Entry[] {
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

export default class MyPlugin extends Plugin {
    settings: InteractiveStorytellingSettings;

    async onload() {
        run_tests();
        await this.loadSettings();

        // // This creates an icon in the left ribbon.
        // const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
        // // Called when the user clicks the icon.
        // new Notice('This is a notice!');
        // });
        // // Perform additional things with the ribbon
        // ribbonIconEl.addClass('my-plugin-ribbon-class');

        // const statusBarItemEl = this.addStatusBarItem();
        // statusBarItemEl.setText('Status Bar Text');

        this.addCommand({
            id: 'add-id',
            name: 'Add ID',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                var new_id = randomString(4);
                // todo check that no such id already exists
                editor.replaceSelection('`id ' + new_id + '`');
            }
        });

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'add-next',
            name: 'Add Next',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                var idList = getIdList(view);
                new IdSuggestModal(this.app, editor, idList).open();
            }
        });

        // This adds an editor command that can perform some operation on the current editor instance
        // this.addCommand({
            // id: 'sample-editor-command',
            // name: 'Sample editor command',
            // editorCallback: (editor: Editor, view: MarkdownView) => {
                // editor.replaceSelection('Sample Editor Command');
            // }
        // });

        // This adds a complex command that can check whether the current state of the app allows execution of the command
        // this.addCommand({
        // id: 'open-sample-modal-complex',
        // name: 'Open sample modal (complex)',
        // checkCallback: (checking: boolean) => {
        // // Conditions to check
        // const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        // if (markdownView) {
        // // If checking is true, we're simply "checking" if the command can be run.
        // // If checking is false, then we want to actually perform the operation.
        // if (!checking) {
        // new IdSuggestModal(this.app).open();
        // }

        // // This command will only show up in Command Palette when the check function returns true
        // return true;
        // }
        // }
        // });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        // this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            // console.log('click', evt);
        // });

        // this.registerView(
        // "interactive-story-view",
        // (leaf: WorkspaceLeaf) => new ExampleView(leaf)
        // );
        // this.registerEditorExtension();

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        // this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
        this.registerView(
            VIEW_TYPE_EXAMPLE,
            (leaf) => new ExampleView(leaf)
        );

        this.addRibbonIcon("file-text", "Interactive story reader", () => {
            this.activateView();
        });
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf: any;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);
        if (leaves.length > 0) {
            // A leaf with our view already exists, use that
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
        }
        // "Reveal" the leaf in case it is in a collapsed sidebar
        if(workspace) {
            workspace.revealLeaf(leaf);
        }
    }

    onunload() {
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class IdSuggestModal extends FuzzySuggestModal<[string, string]> {
    list: [string, string][];
    editor: Editor;

    constructor(app: App, editor: Editor, list: [string, string][]) {
        super(app);
        this.editor = editor;
        this.list = list;
    }

    onChooseItem(item: [string, string], evt: MouseEvent | KeyboardEvent) {
        var [_, id] = item;
        this.editor.replaceSelection('`next ' + id + '`');
    }

    getItemText(item: [string, string]): string {
        var [line, _] = item;
        return line;
    }

    getItems(): [string, string][] {
        return this.list;
    }

}

class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
        .setName('Setting #1')
        .setDesc('It\'s a secret')
        .addText(text => text
                 .setPlaceholder('Enter your secret')
                 .setValue(this.plugin.settings.mySetting)
                 .onChange(async (value) => {
                     this.plugin.settings.mySetting = value;
                     await this.plugin.saveSettings();
                 }));
    }
}

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

function compute_entry_data(entries: Entry[]){
    const indent_stack: Entry[] = [];
    for(const entry of entries){
        const id = entry.id();
        if(id != null){
            id_to_entry.set(id, entry);
        }
    }
    for(const entry of entries){
        while(true){
            const last = indent_stack.last();
            if(last == undefined || last.indent <= entry.indent){
                break;
            }
            indent_stack.pop();
        }
        const predecesor = indent_stack.last();
        if(predecesor != undefined && predecesor.indent == entry.indent){
            predecesor.successor = entry;
            indent_stack.pop();
        }
        const parent = indent_stack.last();
        if(parent != undefined){
            entry.parent = parent;
            parent.children.push(entry);
        }
        indent_stack.push(entry);
    }
    for(const entry of entries){
        const tobe_nexts = new Set<Entry>();
        const next_command_id = entry.next();
        if(next_command_id){
            const entry_by_id = id_to_entry.get(next_command_id);
            if(entry_by_id){
                tobe_nexts.add(entry_by_id);
            }else{
                console.log("did not find in", next_command_id)
            }
        }else if(entry.repeat()){
            var choice_ancestor = entry.parent;
            while(choice_ancestor != null && !choice_ancestor.choice()){
                choice_ancestor = choice_ancestor.parent;
            }
            if(choice_ancestor != null){
                tobe_nexts.add(choice_ancestor);
            }
        }else if(entry.children.length != 0){
            if(entry.choice()){
                for(const child of entry.children){
                    tobe_nexts.add(child);
                }
            }else{
                tobe_nexts.add(entry.children[0]);
            }
        }else{
            const next = get_after(entry);
            if(next){
                tobe_nexts.add(next);
            }
        }
        const nexts = new Set<Entry>();
        for(const tobe_next of tobe_nexts){
            if(tobe_next == undefined){
                continue;
            }
            nexts.add(tobe_next);
        }
        entry.nexts = nexts;
    }
    for(const entry of entries){
        const tobe_nexts: Entry[] = [];
        const visited = new Set<Entry>();
        for(const next of entry.nexts){
            tobe_nexts.push(next);
            visited.add(next);
        }
        entry.nexts = new Set<Entry>();
        const nexts = new Set<Entry>();
        while(tobe_nexts.length != 0){
            const tobe_next = tobe_nexts.pop();
            if(tobe_next == undefined){
                continue;
            }
            if(tobe_next.option()){
                const after = get_after(tobe_next);
                if(after){
                    if(!visited.has(after)){
                        visited.add(after);
                        tobe_nexts.push(after);
                    }
                }
            }
            if(tobe_next.is_empty()){
                for(const n of tobe_next.nexts){
                    if(!visited.has(n)){
                        visited.add(n);
                        tobe_nexts.push(n);
                    }
                }
            }else{
                nexts.add(tobe_next);
            }
        }
        entry.nexts = nexts;
    }
}

export const VIEW_TYPE_EXAMPLE = "example-view";

var chat_history: Entry[] = [];
var file_start: Map<string, Entry> = new Map();
var id_to_entry: Map<string, Entry> = new Map();
var file_stack: string[] = [];
var current_line: Entry | null = null;

export class ExampleView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    async push_file(filename: string) {
        await this.app.vault.adapter.read(filename).then((file: string) => {
            const lines = file.split('\n');
            const entries: Entry[] = get_graph(lines);
            compute_entry_data(entries);
            current_line = entries[0];
            file_start.set(filename, current_line);
            file_stack.push(filename);
        });
    }

    getViewType() {
        return VIEW_TYPE_EXAMPLE;
    }

    getDisplayText() {
        return "Interactive story reader";
    }

    async onOpen() {
        await this.start_active_file().then(() => {
            this.render()
        });
    }

    async start_active_file(){
        const active_file = this.app.workspace.getActiveFile();
        if(active_file) {
            file_stack = [];
            await this.push_file(active_file.path).then(() => {
                chat_history = []
                if(current_line){
                    chat_history.push(current_line);
                }
            });
        }
    }

    push_next(next: Entry){
        chat_history.push(next);
        current_line = next;
    }

    render(){
        const container = this.containerEl.children[1];
        container.empty();
        const start_btn = container.createEl("button", { text: "Run this file", cls: "intstory_buttongs" });
        start_btn.onClickEvent(() => {
            this.start_active_file().then(() => {
                this.render()
            });
        });
        var messages_el = container.createEl("div", { cls: "intstory_chat_window" });
        for(const message of chat_history) {
            var cls = "intstory_message_" + message.speaker;
            if(message.speaker != "You"){
                cls += " intstory_message_other";
            }
            var m = messages_el
            .createEl("div", { cls: "intstory_message_border " + cls })
            .createEl("div", { cls: "intstory_message_content" });
            if(message.speaker){
                m.createEl("b", { text: message.speaker });
                m.createEl("span", { text: " – " });
            }
            m.createEl("span", { text: message.text, cls: "intstory_" + message.speaker });
        }
        if(current_line == null){
            return;
        }
        var chocies_el = messages_el.createEl("div", { cls: "intstory_choices" })
        const nexts: Entry[] = [];
        console.log(current_line);
        console.log(current_line.nexts);
        for(const next of current_line.nexts){
            nexts.push(next);
        }
        // console.log(current_line);
        // if(current_line.end()){
            // // todo end
        // }
        // if(current_line.nexts.length == 0){
            // // todo idk
        // }
        console.log(current_line);
        if(current_line.nexts.size == 1){
            console.log(current_line.nexts.size);
            const btn = chocies_el.createEl("button", { text: "next", cls: "intstory_next" })
            const next: Entry = current_line.nexts.entries().next().value;
            console.log(current_line);
            console.log(">>", next);
            btn.onClickEvent(() => {
                this.push_next(next);
                this.render();
            });
        } else if(current_line.nexts.size >= 2){
            for(const i in nexts){
                const next: Entry = nexts[i];
                const btn = chocies_el.createEl("button", { text: (i+1) + " – " + next.text, cls: "intstory_choice" })
                btn.onClickEvent(() => {
                    console.log("next:", next);
                    this.push_next(next);
                    // if(next.nexts.size == 1){
                        // const value: Entry = next.nexts.entries().next().value;
                        // this.push_next(value);
                    // }
                    this.render();
                });
            }
        }
    }

    async onClose() {
        // Nothing to clean up.
    }
}

function assert(condition: any, msg?: string):  asserts condition {
    if (!condition) {
        throw new Error(msg);
    }
}

function run_tests(){
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
