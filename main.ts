import { App, Editor, FuzzySuggestModal, ItemView, MarkdownView, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { Next } from './entry'
import { parse_id_list } from './parse'
import { randomString } from './utils'
import { run_tests } from './test'
import { State } from './state'

export const VIEW_TYPE_EXAMPLE = "example-view";

interface InteractiveStorytellingSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: InteractiveStorytellingSettings = {
    mySetting: 'default'
}

export default class InteractiveStorytellingPlugin extends Plugin {
    settings: InteractiveStorytellingSettings;

    async onload() {
        run_tests();
        await this.loadSettings();
        this.addCommand({
            id: 'add-id',
            name: 'Add ID',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const new_id = randomString(4);
                // todo check that no such id already exists
                editor.replaceSelection('`id ' + new_id + '`');
            }
        });
        this.addCommand({
            id: 'add-next',
            name: 'Add Next',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const idList = parse_id_list(view.data);
                new IdSuggestModal(this.app, editor, idList).open();
            }
        });

        this.addSettingTab(new InteractiveStorytellingSettingTab(this.app, this));
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
        const [_, id] = item;
        this.editor.replaceSelection('`next ' + id + '`');
    }

    getItemText(item: [string, string]): string {
        const [line, _] = item;
        return line;
    }

    getItems(): [string, string][] {
        return this.list;
    }

}

class InteractiveStorytellingSettingTab extends PluginSettingTab {
    plugin: InteractiveStorytellingPlugin;

    constructor(app: App, plugin: InteractiveStorytellingPlugin) {
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

const state = new State();

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

    async start_active_file() {
        const active_file = this.app.workspace.getActiveFile();
        if(active_file){
            await state.start_file(active_file.path, this.app.vault.adapter);
        }
    }

    async onOpen() {
        await this.start_active_file().then(() => {
            this.render()
        });
    }

    render(){
        const container = this.containerEl.children[1];
        container.empty();
        const start_btn = container.createEl("button", { text: "Run this file", cls: "intstory_buttons" });
        start_btn.onClickEvent(() => {
            state.reset();
            this.start_active_file().then(() => {
                this.render()
            });
        });
        const messages_el = container.createEl("div", { cls: "intstory_chat_window" });
        for(const message of state.chat_history) {
            var cls = "intstory_message_" + message.speaker;
            if(message.speaker != "You"){
                cls += " intstory_message_other";
            }
            if(message.text == null){
                console.log("error: empty text in a displayed element");
                continue;
            }
            const m = messages_el
                .createEl("div", { cls: "intstory_message_border " + cls })
                .createEl("div", { cls: "intstory_message_content" });
            if(message.speaker){
                m.createEl("b", { text: message.speaker });
                m.createEl("span", { text: " – " });
            }
            m.createEl("span", { text: message.text, cls: "intstory_" + message.speaker });
        }
        const res_choices = state.list_choices();
        if(res_choices.ok){
            const choices = res_choices.value;
            const chocies_el = messages_el.createEl("div", { cls: "intstory_choices" })
            // console.log("current line:", state.current_line);
            if(choices.length == 0){
                chocies_el.createEl("div", { text: "end of conversation" });
            } else if(choices.length == 1){
                const btn = chocies_el.createEl("button", { text: "next", cls: "intstory_next" })
                const next: Next = choices.values().next().value;
                btn.onClickEvent(() => {
                    state.push_next(next);
                    this.render();
                });
            } else if(choices.length >= 2){
                var i = 0;
                for(const next of choices){
                    const btn = chocies_el.createEl("button", { text: (i+1) + " – " + next.line.text, cls: "intstory_choice" })
                    btn.onClickEvent(() => {
                        state.push_next(next);
                        this.render();
                    });
                    i += 1;
                }
            }
        }
    }

    async onClose() {
        // Nothing to clean up.
    }
}
