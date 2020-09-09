import * as vscode from "vscode";
import { FileDataProvider } from "./fileDataProvider";

async function setupRootPath() {
  const choose = await vscode.window.showWarningMessage(
    "You need to select a notes storage location before you can start using Shared Notes.",
    "Select",
    "Cancel"
  );
  if (choose === "Select") {
    selectRootPath();
  }
}
async function selectRootPath() {
  const files = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Select",
  });

  if (files && files[0]) {
    await vscode.workspace
      .getConfiguration("SharedNotes")
      .update("rootFolder", files[0].fsPath, true);

    const choose = await vscode.window.showWarningMessage(
      "You must reload the window for the storage location change to take effect.",
      "Reload"
    );
    if ("Reload" === choose) {
      vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  }
}

async function addNote(p: FileDataProvider) {
  const name = await vscode.window.showInputBox({
    prompt: "file name?",
    value: "",
  });
  if (!name || p.fileExist(name)) {
    return vscode.window.showWarningMessage(
      "A note with that name already exists."
    );
  }
  try {
    const fileName = await p.addFile(name);
    await p.refresh();
    await vscode.window.showTextDocument(vscode.Uri.file(fileName));
    vscode.commands.executeCommand("cursorMove", {
      to: "viewPortBottom",
    });
  } catch (e) {
    vscode.window.showErrorMessage("Failed to create the new note.");
  }
}

async function renameNote(element: vscode.TreeItem, p: FileDataProvider) {
  const oldPath = element.contextValue;
  const newName = await vscode.window.showInputBox({
    prompt: "New note name?",
    value: element.label,
  });
  if (!newName || newName === element.label || !oldPath) {
    return;
  }
  const newFileName = oldPath?.replace(element.label || "", newName);
  if (p.pathExists(newFileName)) {
    vscode.window.showWarningMessage(`'${newFileName}' already exists.`);
    return;
  }
  await p.rename(oldPath, newFileName);
  vscode.window.showInformationMessage(
    `'${element.label}' renamed to '${newName}'.`
  );
  await p.refresh();
  vscode.commands.executeCommand("vscode.open", vscode.Uri.file(newFileName));
}

export async function activate(context: vscode.ExtensionContext) {
  const rootFolder:
    | string
    | undefined = await vscode.workspace
    .getConfiguration("SharedNotes")
    .get("rootFolder");
  if (!rootFolder) {
    return setupRootPath();
  }

  const fileDataProvider = new FileDataProvider(rootFolder);
  fileDataProvider.refresh();

  vscode.window.registerTreeDataProvider("sharedNotes", fileDataProvider);

  vscode.commands.registerCommand("sharedNotes.open", (fileName) =>
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(fileName))
  );
  vscode.commands.registerCommand("sharedNotes.add", () =>
    addNote(fileDataProvider)
  );
  vscode.commands.registerCommand("sharedNotes.edit", (fileName) =>
    renameNote(fileName, fileDataProvider)
  );
  vscode.commands.registerCommand("sharedNotes.refresh", () =>
    fileDataProvider.refresh()
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
