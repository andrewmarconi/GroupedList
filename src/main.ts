import { App, MarkdownPostProcessorContext, parseYaml, Plugin, TFile } from "obsidian";

interface GroupedListConfig {
	folder: string;
	property: string;
	header?: string;
	"include-all"?: boolean;
	render?: "column" | "linear";
}

function toByTitle(property: string): string {
	return "By " + property
		.split(/[_\-\s]+/)
		.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(" ");
}

function getDisplayName(file: TFile, app: App): string {
	const cache = app.metadataCache.getFileCache(file);
	return String(cache?.frontmatter?.title ?? file.basename);
}

export default class GroupedListPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor("grouped-list", (source, el, ctx) => {
			void this.render(source, el, ctx);
		});
	}

	async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		let config: GroupedListConfig;
		try {
			config = parseYaml(source) as GroupedListConfig;
		} catch (e) {
			el.createEl("p", {
				text: "grouped-list: invalid YAML — " + (e as Error).message,
				cls: "grouped-list-error",
			});
			return;
		}

		if (!config || !config.folder || !config.property) {
			el.createEl("p", {
				text: "grouped-list: \"folder\" and \"property\" are required.",
				cls: "grouped-list-error",
			});
			return;
		}

		const folder = config.folder.replace(/\/$/, "");
		const property = config.property;
		const header = config.header || toByTitle(property);
		const includeAll = config["include-all"] === true;
		const renderMode = config.render === "column" ? "column" : "linear";

		// Collect all markdown files recursively under the specified folder
		const files = this.app.vault.getMarkdownFiles()
			.filter(f => f.path.startsWith(folder + "/"));

		// Group files by property value
		const groups = new Map<string, TFile[]>();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			const raw: unknown = cache?.frontmatter?.[property];

			if (raw === undefined || raw === null) {
				if (includeAll) {
					if (!groups.has("")) groups.set("", []);
					groups.get("")!.push(file);
				}
				continue;
			}

			// Files with array values appear under each matching group
			const values = Array.isArray(raw)
				? (raw as unknown[]).map(v => String(v))
				: [String(raw as string | number | boolean)];
			for (const v of values) {
				if (!groups.has(v)) groups.set(v, []);
				groups.get(v)!.push(file);
			}
		}

		// Sort groups alphabetically; empty-string group always last
		const sortedKeys = [...groups.keys()].sort((a, b) => {
			if (a === "") return 1;
			if (b === "") return -1;
			return a.localeCompare(b);
		});

		// Render
		el.addClass("grouped-list");
		el.createEl("h2", { text: header });

		for (const key of sortedKeys) {
			const groupFiles = [...groups.get(key)!].sort((a, b) =>
				getDisplayName(a, this.app).localeCompare(getDisplayName(b, this.app))
			);

			el.createEl("h3", { text: `${key || "(none)"} (${groupFiles.length})` });

			if (renderMode === "column") {
				const ul = el.createEl("ul", { cls: "grouped-list-columns" });
				groupFiles.forEach(file => {
					const li = ul.createEl("li");
					const a = li.createEl("a", {
						text: getDisplayName(file, this.app),
						cls: "internal-link",
					});
					a.setAttribute("data-href", file.path);
					a.href = file.path;
				});
			} else {
				const p = el.createEl("p");
				groupFiles.forEach((file, i) => {
					const a = p.createEl("a", {
						text: getDisplayName(file, this.app),
						cls: "internal-link",
					});
					a.setAttribute("data-href", file.path);
					a.href = file.path;
					if (i < groupFiles.length - 1) p.appendText(", ");
				});
			}
		}
	}
}
