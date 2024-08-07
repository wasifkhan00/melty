import * as vscode from "vscode";
import * as path from "path";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import { Conversation } from "./types";
import { Task } from "./backend/tasks";

import { Message } from "./types";

const dummyTask1: Task = new Task("task_1", "task/task-1");
const dummyTasks: Map<string, Task> = new Map();
dummyTasks.set("task_1", dummyTask1);

// create another dummy task
const dummyTask2: Task = new Task("task_2", "task/task-2");
dummyTasks.set("task_2", dummyTask2);

export class SpectacleExtension {
  private outputChannel: vscode.OutputChannel;
  private meltyMindFilePaths: string[] = [];
  private workspaceFilePaths: string[] | undefined;
  private task: Task | undefined;
  private tasks: Map<string, Task> = dummyTasks;

  constructor(
    private context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.outputChannel = outputChannel;
  }

  async activate() {
    outputChannel.appendLine("Spectacle activation started");

    this.task = new Task("task_1", "task/task-1");
    // don't bother kicking off task.init() here; the git repo isn't ready.

    // kick off async init. this will also be kicked off by callers who use this object
    await this.initializeWorkspaceFilePaths();
  }

  public getMeltyMindFilePaths() {
    // TODO figure out why there are empty strings in the array
    return this.meltyMindFilePaths!.filter((path) => path !== "");
  }

  public async getWorkspaceFilePaths() {
    if (this.workspaceFilePaths === undefined) {
      if (!(await this.initializeWorkspaceFilePaths())) {
        throw new Error("Could not initialize workspace file paths");
      }
    }
    return this.workspaceFilePaths!;
  }

  public getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public handleListTasks() {
    const tasks = this.getTasks();
    return tasks;
  }

  private async initializeWorkspaceFilePaths(): Promise<boolean> {
    if (this.workspaceFilePaths !== undefined) {
      return true;
    }

    if (!(await this.task!.init())) {
      return false;
    }

    const workspaceFileUris = await vscode.workspace.findFiles(
      "**/*",
      "**/node_modules/**"
    );
    this.workspaceFilePaths = workspaceFileUris.map((file) => {
      return path.relative(this.task!.gitRepo!.rootPath, file.fsPath);
    });
    return true;
  }

  public addMeltyMindFilePath(filePath: string) {
    this.meltyMindFilePaths.push(filePath);
    this.outputChannel.appendLine(`Added file: ${filePath}`);
  }

  public dropMeltyMindFilePath(filePath: string) {
    this.meltyMindFilePaths = this.meltyMindFilePaths.filter(
      (path) => path !== filePath
    );
    this.outputChannel.appendLine(`Dropped file: ${filePath}`);
  }

  public getConversation(taskId: string): Conversation {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }
    return task.conversation;
  }

  public async createNewTask(taskName: string): Promise<string> {
    const taskId = `task_${Date.now()}`;
    const branchName = `task/${taskName.replace(/\s+/g, "-")}`;

    const newTask = new Task(taskId, branchName);
    await newTask.init();

    // Create a new branch for this task
    // todo: add this back once testing is done
    // await this.createGitBranch(branchName);

    this.tasks.set(taskId, newTask);
    this.task = newTask;

    return taskId;
  }

  public resetTask() {
    // this.task = new Task();
    throw new Error("Not implemented");
  }

  public async switchToTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    // Switch to the task's branch
    await this.checkoutGitBranch(task.branch);

    this.task = task;
  }

  public openFileInEditor(filePath: string) {
    const fileUri = vscode.Uri.file(
      path.join(this.task!.gitRepo!.rootPath, filePath)
    );
    vscode.window.showTextDocument(fileUri);
  }

  private async checkoutGitBranch(branchName: string): Promise<void> {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension) {
      const git = gitExtension.exports.getAPI(1);
      const repo = git.repositories[0];
      await repo.checkout(branchName);
    } else {
      throw new Error("Git extension not found");
    }
  }

  public async initRepository() {
    await this.task!.init();
  }

  public async getTask() {
    if (!this.task!.gitRepo) {
      await this.task!.init();
    }
    return this.task!;
  }

  private async createGitBranch(branchName: string): Promise<void> {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension) {
      const git = gitExtension.exports.getAPI(1);
      const repo = git.repositories[0];
      await repo.createBranch(branchName, true);
    } else {
      throw new Error("Git extension not found");
    }
  }
}

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating Spectacle extension");
  outputChannel = vscode.window.createOutputChannel("Spectacle");
  outputChannel.show();
  outputChannel.appendLine("Activating Spectacle extension");

  const extension = new SpectacleExtension(context, outputChannel);
  extension.activate();

  const helloCommand = vscode.commands.registerCommand(
    "melty.showMelty",
    () => {
      HelloWorldPanel.render(context.extensionUri, extension);
    }
  );

  context.subscriptions.push(helloCommand);

  outputChannel.appendLine("Spectacle extension activated");
  console.log("Spectacle extension activated");
}

export function deactivate() {
  // The extension instance will be garbage collected, so we don't need to call deactivate explicitly
}
