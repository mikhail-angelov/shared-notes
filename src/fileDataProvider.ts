import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class FileDataProvider
  implements vscode.TreeDataProvider<vscode.TreeItem> {
  _onDidChangeTreeData: vscode.EventEmitter<void>;
  onDidChangeTreeData: vscode.Event<void>;

  constructor(private root: string) {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    let dir = this.root;
    if (element) {
      dir = element?.contextValue || this.root;
    }
    const files: fs.Dirent[] = await fs.promises.readdir(dir, {
      withFileTypes: true,
    });
    const items = files.map((file) => {
      const item = new vscode.TreeItem(
        file.name,
        file.isDirectory()
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
      );
      item.contextValue = path.join(dir, file.name);
      item.command = {
        command: "sharedNotes.open",
        title: "",
        arguments: [item.contextValue],
      };
      return item;
    });
    return items;
  }

  pathExists(name: string): boolean {
    try {
      fs.accessSync(name);
    } catch (err) {
      return false;
    }
    return true;
  }

  fileExist(fileName: string) {
    const name = path.join(this.root, fileName);
    return this.pathExists(name);
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  async addFile(fileName: string) {
    const name = path.join(this.root, fileName);
    await fs.promises.writeFile(name, `#${fileName}`);
    return name;
  }
  async rename(oldPath: string, newPath: string) {
    await fs.promises.rename(oldPath, newPath);
    return;
  }
}
