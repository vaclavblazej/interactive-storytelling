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
}

class Command{
    type: CommandType
    id: number | null
}

class Entry {
    id: number
    next_id: number | null
    spaces: number
    speaker: string | null
    choice_ids: number[] | null
    text: string
    commands: Command[]
}

var first_free_id: number = 0;

function parse_command(command_str: string): Command{
    const cmd_split = command_str.split(' ');
    var res = new Command();
    switch(cmd_split[0]){
        case "id": {
            res.type = CommandType.Id;
            res.id = parseInt(cmd_split[1]);
        }
        case "next": {
            res.type = CommandType.Next;
            res.id = parseInt(cmd_split[1]);
        }
        case "choice": {
            res.type = CommandType.Choice;
            res.id = null;
        }
    }
    return res;
}

// expecting lines of the following format
// (spaces) * speaker: Text that may contain `commands` within backticks.
// (otherwise returns null)
function parse_line(line: string): Entry | null {
    var spaces = 0;
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
        spaces += 1;
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
    for(const i in commands){
        const command = commands[i];
        switch(command.type){
            case CommandType.Id: {
            }
            case CommandType.Next: {
            }
            case CommandType.Choice: {
            }
        }
    }
    if(res.id == null){
        res.id = first_free_id;
        first_free_id += 1;
    }
    res.choices = [];
    res.next_id = null;
    res.spaces = spaces;
    res.speaker = speaker;
    res.text = text.trim();
    res.commands = commands;
    return res;
}

function get_graph(lines: string[]): Entry[] {
    var res = [];
    var last = null;
    for(var i = 0; i < lines.length; ++i){
        const line = lines[i];
        const line_struct = parse_line(line);
        if(line_struct){
            line_struct.id = first_free_id;
            if(last != null){
                if(last.next_id == null){
                    last.next_id = line_struct.id;
                }
            }
            res.push(line_struct);
            last = line_struct
        }
    }
    return res;
}

export default class MyPlugin extends Plugin {
    settings: InteractiveStorytellingSettings;

    async onload() {
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

export const VIEW_TYPE_EXAMPLE = "example-view";

var chat_history: any[] = [];
var choices: Entry[] = [];
var everything: any = {
    file_start: {},
    ids_to_structs: {},
};
var current_stack: number[] = [];

export class ExampleView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    async push_file(filename: string) {
        await this.app.vault.adapter.read(filename).then((file: string) => {
            const lines = file.split('\n');
            const entries: Entry[] = get_graph(lines);
            for(const i in entries){
                const entry = entries[i];
                everything.ids_to_structs[entry.id] = entry;
            }
            const first_id = entries[0].id;
            everything.file_start[filename] = first_id;
            current_stack.push(first_id);
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
            current_stack = [];
            await this.push_file(active_file.name).then(() => {
                chat_history = []
                const last = current_stack.last();
                if(last){
                    chat_history.push(everything.ids_to_structs[last]);
                }
            });
        }
    }

    advance_current_position(){
        const current_id: number | undefined = current_stack.pop();
        console.log("current_id:", current_id);
        if(current_id == undefined){
            console.log("undefined current_id", current_id);
            return;
        }
        const current: Entry = everything.ids_to_structs[current_id];
        if(current.next_id == null){
            this.advance_current_position();
            return;
        }
        const next_el = everything.ids_to_structs[current.next_id];
        console.log("next:", next_el);
        current_stack.push(next_el.id);
        chat_history.push(next_el);
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
            m.createEl("b", { text: message.speaker });
            m.createEl("span", { text: " – " + message.text, cls: "intstory_" + message.speaker });
        }
        var chocies_el = messages_el.createEl("div", { cls: "intstory_choices" })
        if(choices.length != 0){
            for(const choice of choices){
                const btn = chocies_el.createEl("button", { text: "" + choice.id + " – " + choice.text, cls: "intstory_choice" })
                btn.onClickEvent(() => {
                    chat_history.push({
                        speaker: "You",
                        text: choice.text,
                    });
                    choices = [];
                    this.render();
                });
            }
        }else{
            const btn = chocies_el.createEl("button", { text: "next", cls: "intstory_next" })
            btn.onClickEvent(() => {
                console.log("next");
                this.advance_current_position();
                this.render();
            });
        }
    }

    async onClose() {
        // Nothing to clean up.
    }
}
