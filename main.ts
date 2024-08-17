import { App, Editor, FuzzySuggestModal, ItemView, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal, WorkspaceLeaf, setIcon } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
}

// https://stackoverflow.com/questions/10726909/random-alpha-numeric-string-in-javascript
function randomString(len: number) {
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return [...Array(len)].reduce(a => a+alphabet[~~(Math.random()*alphabet.length)], '');
}

function getUrlList(view: MarkdownView) {
    var lines = view.data.split('\n');
    const rex: RegExp = /`url (?<url>\w+)`/g;
    var result: [string, string][] = [];
    for(var i = 0; i < lines.length; ++i){
        var line = lines[i];
        for(const match of line.matchAll(rex)) {
            var url = match.groups?.url;
            if(url) {
                result.push([line, url]);
            }
        }
    }
    return result;
}

function parse_line(line: String): any {
    var spaces = 0;
    var sentence = "";
    var i = 0;
    for(; i < line.length; ++i){
        const c = line.charAt(i);
        if(c == "*" || c == "-"){
            spaces = i;
            ++i;
            break;
        }
    }
    var speaker = null;
    var code = false;
    var cmd;
    var commands = [];
    for(; i < line.length; ++i){
        const c = line.charAt(i);
        if(speaker == null && c == ":"){
            speaker = sentence.trim();
            sentence = "";
        }else if(code){
            if(c == '`'){
                code = false;
                commands.push(cmd);
            }else{
                cmd += c;
            }
        }else{
            if(c == '`'){
                code = true;
                cmd = "";
            }else{
                sentence += c;
            }
        }
    }
    return {
        spaces: spaces,
        speaker: speaker,
        sentence: sentence.trim(),
        commands: commands,
    };
}

function get_graph(lines: String[]): any {
    for(const line in lines){
        const line_struct = parse_line(line);
    }
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

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
            id: 'add-url',
            name: 'Add URL',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                // console.log(editor.getSelection());
                var new_id = randomString(4);
                // todo check that no such id already exists
                editor.replaceSelection('`url ' + new_id + '`');
            }
        });
        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'add-goto',
            name: 'Add Goto',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                var urlList = getUrlList(view);
                new UrlSuggestModal(this.app, editor, urlList).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        // this.addCommand({
            // id: 'sample-editor-command',
            // name: 'Sample editor command',
            // editorCallback: (editor: Editor, view: MarkdownView) => {
                // console.log(editor.getSelection());
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
        // new UrlSuggestModal(this.app).open();
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

class UrlSuggestModal extends FuzzySuggestModal<[string, string]> {
    list: [string, string][];
    editor: Editor;

    constructor(app: App, editor: Editor, list: [string, string][]) {
        super(app);
        this.editor = editor;
        this.list = list;
    }

    onChooseItem(item: [string, string], evt: MouseEvent | KeyboardEvent) {
        var [_, url] = item;
        this.editor.replaceSelection('`goto ' + url + '`');
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

var chat: any[] = [];
var choices: any[] = [];
var state: any = {
};

export class ExampleView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_EXAMPLE;
    }

    getDisplayText() {
        return "Interactive story reader";
    }

    async onOpen() {
        // container.createEl("h4", { text: "Interactive story reader" });
        chat = [
            { speaker: "other", text: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Excepteur sint occaecat cupidatat non proident, sunt." },
            { speaker: "you", text: "Ut enim ad minim veniam, quis nostrud exercitation!" },
            { speaker: "other", text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
        ];
        choices = [
            { id: 1, text: "Ullamco laboris nisi ut aliquip ex ea commodo consequat, consequuntur magni dolores eos qui ratione voluptatem." },
            { id: 2, text: "Esse cillum dolore eu fugiat nulla pariatur." },
            { id: 3, text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
        ];
        this.render()
    }

    render(){
        const container = this.containerEl.children[1];
        container.empty();
        var messages = container.createEl("div", { cls: "intstory_chat_window" });
        for(const msg of chat) {
            var cls = "intstory_message_" + msg.speaker;
            var m = messages
            .createEl("div", { cls: "intstory_message_border " + cls })
            .createEl("div", { cls: "intstory_message_content" });
            m.createEl("b", { text: msg.speaker });
            m.createEl("span", { text: " – " + msg.text, cls: "intstory_" + msg.speaker });
        }
        var choices_element = messages.createEl("div", { cls: "intstory_choices" })
        if(choices.length != 0){
            for(const choice of choices){
                let btn = choices_element.createEl("button", { text: "" + choice.id + " – " + choice.text, cls: "intstory_choice" })
                btn.onClickEvent(() => {
                    console.log(choice.id);
                    chat.push({
                        speaker: "you",
                        text: choice.text,
                    });
                    choices = [];
                    this.render();
                });
            }
        }else{
            let btn = choices_element.createEl("button", { text: "next", cls: "intstory_next" })
            btn.onClickEvent(() => {
                console.log("next");
            });
        }
    }

    async onClose() {
        // Nothing to clean up.
    }
}
