import { App, Editor, FuzzySuggestModal, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';

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
				console.log(editor.getSelection());
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
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
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
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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
