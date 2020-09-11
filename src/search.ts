/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as cp from "child_process";
import { Uri, window, Disposable } from "vscode";
import { QuickPickItem } from "vscode";
import { workspace } from "vscode";
import { findFile } from "./findFiles";

/**
 * A file opener using window.createQuickPick().
 *
 * It shows how the list of items can be dynamically updated based on
 * the user's input in the filter field.
 */
export async function quickOpen(root: string) {
  const uri = await pickFile(root);
  if (uri) {
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document);
  }
}

class FileItem implements QuickPickItem {
  label: string;
  description: string;
  detail: string;

  constructor(public file: string, public lines: string[]) {
    this.label = file.split("/")[file.split("/").length - 1];
    this.description = `(${lines.length})`;
    this.detail = lines.join("<br/>");
  }
}

class MessageItem implements QuickPickItem {
  alwaysShow = true;
  constructor(public label: string) {}
}

async function pickFile(root: string) {
  const disposables: Disposable[] = [];
  try {
    return await new Promise<Uri | undefined>((resolve, reject) => {
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
            const files = Object.keys(results);
            input.items = files.map((file: any) => {
              return new FileItem(file, results[file].line);
            });
            if (files.length === 0) {
              input.items = [new MessageItem("nothing found :(")];
            }

            input.busy = false;
          });
        }),
        input.onDidChangeSelection((items) => {
          const item = items[0];
          if (item instanceof FileItem) {
            resolve(Uri.file(item.file));
            input.hide();
          }
        }),
        input.onDidHide(() => {
          resolve(undefined);
          input.dispose();
        })
      );
      input.show();
    });
  } finally {
    disposables.forEach((d) => d.dispose());
  }
}
