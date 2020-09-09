import * as assert from "assert";
import { before, after } from "mocha";
import * as rimraf from "rimraf";
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as fs from "fs";
import { FileDataProvider } from "../../fileDataProvider";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");
  const TEST_NOTE = "test.md";
  let rootDir = `/tmp/${Date.now()}`;
  let provider: FileDataProvider;
  before(() => {
    fs.mkdirSync(rootDir);
    fs.writeFileSync(`${rootDir}/${TEST_NOTE}`, "");
    provider = new FileDataProvider(rootDir);
  });
  after(() => {
    rimraf.sync(rootDir);
  });

  test("should list notes", async () => {
    const items = await provider.getChildren();
    assert.equal(1, items.length);
    assert.equal(TEST_NOTE, items[0].label);
  });

  test("should check exist", () => {
    assert.equal(true, provider.fileExist(TEST_NOTE));
    assert.equal(false, provider.fileExist("any"));
  });

  test("should edit note", async () => {
    const newName = `${rootDir}/updated.md`;
    const oldName = `${rootDir}/${TEST_NOTE}`;
    await provider.rename(oldName, newName);
    assert.equal(true, provider.pathExists(newName));
    const items = await provider.getChildren();
    assert.equal("updated.md", items[0].label);
  });

  test("should add note", async () => {
    const newNote = "new.md";
    await provider.addFile(newNote);
    const items = await provider.getChildren();
    assert.equal(2, items.length);
    fs.unlinkSync(`${rootDir}/${newNote}`);
  });
});
