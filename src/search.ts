/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Uri, window, Disposable, Position, Selection, Range } from "vscode";
import { QuickPickItem } from "vscode";
import { workspace } from "vscode";
import { Result, findFile } from "./findFiles";

/**
 * A file opener using window.createQuickPick().
 *
 * It shows how the list of items can be dynamically updated based on
 * the user's input in the filter field.
 */
export async function quickOpen(root: string) {
  const [uri, line] = await pickFile(root);
  if (uri) {
    var cursor = new Position(line, 0);
    const document = await workspace.openTextDocument(uri);
    const editor = await window.showTextDocument(document);
    editor.selections = [new Selection(cursor, cursor)];
    editor.revealRange(new Range(cursor, cursor));
  }
}

class FileItem implements QuickPickItem {
  label: string;
  description: string;

  constructor(public file: string, public detail: string, public line: number) {
    this.label = file.split("/")[file.split("/").length - 1];
    this.description = `(${line + 1})`;
  }
}

class MessageItem implements QuickPickItem {
  alwaysShow = true;
  constructor(public label: string) { }
}

async function pickFile(root: string) {
  const disposables: Disposable[] = [];
  try {
    return await new Promise<[Uri | undefined, number]>((resolve, reject) => {
      const input = window.createQuickPick<FileItem | MessageItem>();
      input.placeholder = "Type to search notes";
      input.matchOnDescription = true;
      input.matchOnDetail = true;
      disposables.push(
        input.onDidChangeValue(async (value) => {
          if (!value) {
            input.items = [];
            return;
          }
          if (value.length < 3) {
            return;
          }
          input.busy = true;

          findFile({ term: value, flags: "ig" }, root).then((results: any) => {
            if (!results || results.length === 0) {
              input.items = [new MessageItem("nothing found :(")];
            } else {
              input.items = results.map((data: Result) => new FileItem(data.filename, data.value, data.line));
            }
            input.busy = false;
          });
        }),
        input.onDidChangeSelection((items) => {
          const item = items[0];
          if (item instanceof FileItem) {
            resolve([Uri.file(item.file), item.line]);
            input.hide();
          }
        }),
        input.onDidHide(() => {
          resolve([undefined, 0]);
          input.dispose();
        })
      );
      input.show();
    });
  } finally {
    disposables.forEach((d) => d.dispose());
  }
}
