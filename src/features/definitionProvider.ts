import * as vscode from "vscode";
import AbstractProvider from "./abstractProvider";
let path = require("path");
let _ = require("underscore");

export default class GlobalDefinitionProvider extends AbstractProvider implements vscode.DefinitionProvider {
    public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location> {
        let word = document.getText(document.getWordRangeAtPosition(position)).split(/\r?\n/)[0];
        let self = this;
        return new Promise((resolve, reject) => {
            let added = {};
            let filename = document.fileName;
            let wordPosition = document.getWordRangeAtPosition(position);
            let wordAtPosition = document.getText(document.getWordRangeAtPosition(position));
            if (!wordPosition) {
                wordAtPosition = "";
            } else  {
                wordAtPosition = self._global.fullNameRecursor(wordAtPosition, document, document.getWordRangeAtPosition(position), false);
                wordAtPosition = self._global.fullNameRecursor(wordAtPosition, document, document.getWordRangeAtPosition(position), true);
            }
            let module = "";
            if (wordAtPosition.indexOf(".") > 0) {
                //if (path.extname(document.fileName) !== ".os") { // Для oscript не можем гаранитировать полное совпадение модулей.  
                    let dotArray: Array<string> = wordAtPosition.split(".");
                    wordAtPosition = dotArray.pop();
                    module = dotArray.join(".");
                //}
            }
            let local: Array<any>;
            let d: Array<any> = new Array();
            if (module.length === 0 ) {
                let source = document.getText();
                d = self._global.getCacheLocal(filename, wordAtPosition, source);
            } else {
                d = self._global.query(filename, wordAtPosition, module, false, false);
            }
            if (d.length === 0) {
                d = self._global.query(filename, word, "", false, false);
            }
            if (d) {
                let bucket = new Array<any>();
                for (let index = 0; index < d.length; index++) {
                    let element = d[index];
                    if (added[element.name] === true) {
                        continue;
                    }
                    added[element.name] = true;
                    let moduleDescription = (module && module.length > 0) ? module + "." : "";
                    let result = {
                        "path": element.filename,
                        "line": element.line,
                        "description": element.description,
                        "label": moduleDescription + element.name,
                        "isproc": element.isproc
                    };
                    if (!result.path){
                        result.path = filename;
                    }
                    bucket.push(result);
                }
                if (bucket.length === 1) {
                    let location: vscode.Location = new vscode.Location(vscode.Uri.file(bucket[0].path),
                        new vscode.Position(bucket[0].line, (bucket[0].isproc ? 9 : 7) + 1));
                    return resolve(location);
                } else if (bucket.length === 0) {
                    return resolve(null);
                }
                return vscode.window.showQuickPick(bucket).then(value => {
                    try {
                        if (value) {
                            let referenceResource = vscode.Uri.file(value.path);
                            let location = new vscode.Location(referenceResource, new vscode.Position(value.line, (value.isproc ? 9 : 7) + 1) );
                            return resolve(location);
                        } else {
                            return reject("value not found " + value);
                        }
                    } catch (e) {
                        console.error(e);
                        return reject(e);
                    }
                }
                );
            } else {
                Promise.resolve(null);
            }
        }
        );
    }
}