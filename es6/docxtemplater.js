"use strict";

const DocUtils = require("./doc-utils");
const {XTInternalError, throwFileTypeNotIdentified, throwFileTypeNotHandled} = require("./errors");
DocUtils.traits = require("./traits");
DocUtils.moduleWrapper = require("./module-wrapper");
const wrapper = DocUtils.moduleWrapper;

const Docxtemplater = class Docxtemplater {
	constructor() {
		if (arguments.length > 0) {
			throw new Error("The constructor with parameters has been removed in docxtemplater 3.0, please check the upgrade guide.");
		}
		this.compiled = {};
		this.modules = [];
		this.setOptions({});
	}
	setModules(obj) {
		this.modules.forEach((module) => {
			module.set(obj);
		});
	}
	sendEvent(eventName) {
		this.modules.forEach((module) => {
			module.on(eventName);
		});
	}
	attachModule(module) {
		this.modules.push(wrapper(module));
		return this;
	}
	setOptions(options) {
		this.options = options;
		Object.keys(DocUtils.defaults).forEach((key) => {
			const defaultValue = DocUtils.defaults[key];
			this[key] = (this.options[key] != null) ? this.options[key] : defaultValue;
		});
		if (this.zip) {
			this.updateFileTypeConfig();
		}
		return this;
	}
	loadZip(zip) {
		if (zip.loadAsync) {
			throw new XTInternalError("Docxtemplater doesn't handle JSZip version >=3, see changelog");
		}
		this.zip = zip;
		this.updateFileTypeConfig();
		return this;
	}
	compileFile(fileName) {
		const currentFile = this.createTemplateClass(fileName);
		currentFile.parse();
		this.compiled[fileName] = currentFile;
	}
	compile() {
		this.options.xmlFileNames = [];
		this.modules = this.fileTypeConfig.baseModules.map(function (moduleFunction) {
			return moduleFunction();
		}).concat(this.modules);
		this.options = this.modules.reduce((options, module) => {
			return module.optionsTransformer(options, this);
		}, this.options);
		this.xmlDocuments = this.options.xmlFileNames.reduce((xmlDocuments, fileName) => {
			const content = this.zip.files[fileName].asText();
			xmlDocuments[fileName] = DocUtils.str2xml(content);
			return xmlDocuments;
		}, {});
		this.setModules({zip: this.zip, xmlDocuments: this.xmlDocuments, data: this.data});
		this.getTemplatedFiles();
		this.setModules({compiled: this.compiled});
		// Loop inside all templatedFiles (ie xml files with content).
		// Sometimes they don't exist (footer.xml for example)
		this.templatedFiles.forEach((fileName) => {
			if (this.zip.files[fileName] != null) {
				this.compileFile(fileName);
			}
		});
		return this;
	}
	updateFileTypeConfig() {
		const fileTypeIdentifiers = {
			docx: "word/document.xml",
			pptx: "ppt/presentation.xml",
			odt: "mimetype",
		};

		const fileType = Object.keys(fileTypeIdentifiers).reduce((fileType, key) => {
			if (fileType) {
				return fileType;
			}
			if (this.zip.files[fileTypeIdentifiers[key]]) {
				return key;
			}
			return fileType;
		}, null);

		if (fileType === "odt") {
			throwFileTypeNotHandled(fileType);
		}
		if (!fileType) {
			throwFileTypeNotIdentified();
		}
		this.fileType = fileType;
		this.fileTypeConfig = this.options.fileTypeConfig || Docxtemplater.FileTypeConfig[this.fileType];
		return this;
	}
	render() {
		this.compile();

		this.mapper = this.modules.reduce(function (value, module) {
			return module.getRenderedMap(value);
		}, {});

		Object.keys(this.mapper).forEach((to) => {
			const mapped = this.mapper[to];
			const from = mapped.from;
			const currentFile = this.compiled[from];
			currentFile.setTags(mapped.data);
			currentFile.render(to);
			this.zip.file(to, currentFile.content, {createFolders: true});
		});
		this.sendEvent("syncing-zip");
		this.syncZip();
		return this;
	}
	syncZip() {
		Object.keys(this.xmlDocuments).forEach((fileName) => {
			this.zip.remove(fileName);
			const content = DocUtils.xml2str(this.xmlDocuments[fileName]);
			return this.zip.file(fileName, content, {createFolders: true});
		});
	}
	setData(data) {
		this.data = data;
		return this;
	}
	getZip() {
		return this.zip;
	}
	createTemplateClass(path) {
		const usedData = this.zip.files[path].asText();
		return this.createTemplateClassFromContent(usedData, path);
	}
	createTemplateClassFromContent(content, filePath) {
		const xmltOptions = {
			filePath,
		};
		Object.keys(DocUtils.defaults).forEach((key) => {
			xmltOptions[key] = this[key];
		});
		xmltOptions.fileTypeConfig = this.fileTypeConfig;
		xmltOptions.modules = this.modules;
		return new Docxtemplater.XmlTemplater(content, xmltOptions);
	}
	getFullText(path) {
		return this.createTemplateClass(path || this.fileTypeConfig.textPath).getFullText();
	}
	getTemplatedFiles() {
		this.templatedFiles = this.fileTypeConfig.getTemplatedFiles(this.zip);
		return this.templatedFiles;
	}
};

Docxtemplater.DocUtils = require("./doc-utils");
Docxtemplater.Errors = require("./errors");
Docxtemplater.XmlTemplater = require("./xml-templater");
Docxtemplater.FileTypeConfig = require("./file-type-config");
Docxtemplater.XmlMatcher = require("./xml-matcher");
module.exports = Docxtemplater;
