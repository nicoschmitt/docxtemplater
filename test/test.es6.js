var fs = require('mz/fs');
var path = require('path');
var Docxtemplater = require("../es6/docxtemplater.js");
var JSZip = require("jszip");
var expressions = require("angular-expressions");

async function Main() {
    var content = await fs.readFile(path.resolve(__dirname, '../examples/tag-example.docx'), 'binary');
    var zip = await JSZip.loadAsync(content);

    var doc = new Docxtemplater();
    doc.loadZip(zip);

    doc.setOptions({ parser: tag => ({ get: expressions.compile(tag) }) });

    doc.setData({
        last_name: 'a last name',
        first_name: 'a first name',
        description: 'a description',
        phone: '12345',
    });

    await doc.render();

    var buf = await doc.getZip()
                .generateAsync({type: 'nodebuffer'});

    // buf is a nodejs buffer, you can either write it to a file or do anything else with it.
    await fs.writeFile(path.resolve(__dirname, 'output.docx'), buf);
}

Main()
    .then(() => console.log('Done.'));