import React, { useState, useEffect, useRef } from "react";
import { vscode } from "./utilities/vscode";
import {
  ChevronsUpDown,
  XIcon,
  Undo,
  Trash2Icon,
  FileIcon,
  RotateCcwIcon,
} from "lucide-react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
} from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import * as Diff2Html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { Switch } from "./components/ui/switch";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Button as VSCodeButton } from "@vscode/webview-ui-toolkit";
import { FilePicker } from "./components/FilePicker";
import { Button } from "./components/ui/button";
import { Tasks } from "./components/Tasks";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import "./App.css";
import { Message } from "../../src/extension";

function MessageComponent({
  message,
  isPartial = false,
}: {
  message: Message;
  isPartial?: boolean;
}) {
  const renderDiff = (diff: string) => {
    const lines = diff.split("\n");
    const fileNameLine = lines.find((line) => line.startsWith("diff --git"));
    let fileName = "";
    if (fileNameLine) {
      const match = fileNameLine.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        fileName = match[2]; // Use the 'b' file name (new file)
      }
    }

    const customHeader = fileName ? (
      <div className="diff-header flex items-center space-x-2 p-2 bg-gray-100 rounded-t">
        <FileIcon className="h-4 w-4" />
        <button
          className="text-blue-600 hover:underline"
          onClick={() =>
            vscode.postMessage({
              command: "openFileInEditor",
              filePath: fileName,
            })
          }
        >
          {fileName}
        </button>
      </div>
    ) : null;

    return (
      <>
        {customHeader}
        <div
          className="text-xs mt-4 font-mono"
          dangerouslySetInnerHTML={{
            __html: Diff2Html.html(diff, {
              drawFileList: false,
              matching: "lines",
              outputFormat: "line-by-line",
            }),
          }}
        />
      </>
    );
  };

  return (
    <div
      className={`grid grid-cols-2 gap-12 mb-2 p-3 rounded ${
        message.sender === "user" ? "bg-gray-50 " : "bg-white"
      }`}
    >
      <div className="text-xs flex flex-col">
        {message.text}
        {isPartial && <span className="animate-pulse">▋</span>}
      </div>

      <div>
        {message.diff && (
          <Collapsible>
            <div className="flex items-center justify-end space-x-4 px-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <h4 className="text-sm font-semibold mr-2">1 file changed</h4>
                  <ChevronsUpDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>{renderDiff(message.diff)}</CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

function MessagesView({
  messages,
  partialResponse,
  handleSendMessage,
  handleUndo,
  handleReset,
}: {
  messages: Message[];
  partialResponse: Message | null;
  handleSendMessage: (mode: "ask" | "code", text: string) => void;
  handleUndo: () => void;
  handleReset: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const message = form.message.value;
    handleSendMessage("ask", message);
    form.reset();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (event.metaKey || event.ctrlKey) {
        // Cmd+Enter or Ctrl+Enter
        event.preventDefault();
        handleSendMessage("code", event.currentTarget.value);
        event.currentTarget.value = "";
      } else if (!event.shiftKey) {
        // Enter without Shift (to allow multiline input)
        event.preventDefault();
        handleSubmit(event as unknown as React.FormEvent);
      }
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 rounded p-2 mx-auto">
        {messages.map((message, index) => (
          <MessageComponent key={index} message={message} />
        ))}
        {partialResponse && (
          <MessageComponent message={partialResponse} isPartial={true} />
        )}
      </div>
      <div className="">
        <form onSubmit={handleSubmit}>
          <div className="mt-4 flex">
            <Input
              placeholder="What should I do? (⌘K)"
              id="message"
              autoFocus
              required
              ref={inputRef}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex justify-end space-x-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleReset}
            >
              <RotateCcwIcon className="h-3 w-3" />
            </Button>
            <Button name="ask" variant="outline" size="sm" type="submit">
              Ask{" "}
              <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded px-1.5 font-mono text-[10px] font-medium text-black opacity-100">
                <span className="text-xs">↵</span>
              </kbd>
            </Button>
            <Button
              name="code"
              size="sm"
              type="button"
              onClick={() => {
                const message = inputRef.current?.value || "";
                handleSendMessage("code", message);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Code{" "}
              <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 px-1.5 font-mono text-[10px] font-medium text-white opacity-100">
                <span className="text-xs">⌘</span>
                <span className="text-xs">↵</span>
              </kbd>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [partialResponse, setPartialResponse] = useState<Message | null>(null);
  const [meltyFiles, setMeltyFiles] = useState<string[]>(["test.pdf"]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([
    "hi.pdf",
    "hello.txt",
  ]);
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSendMessage(mode: "ask" | "code", text: string) {
    // Send message to extension
    vscode.postMessage({
      command: mode,
      text: text,
    });
  }

  function handleUndo() {
    vscode.postMessage({ command: "undo" });
  }

  function loadFiles() {
    vscode.postMessage({ command: "listMeltyFiles" });
    vscode.postMessage({ command: "listWorkspaceFiles" });
  }

  function handleAddFile(file: string) {
    vscode.postMessage({ command: "addMeltyFile", filePath: file });
    setPickerOpen(false);
  }

  function handleDropFile(file: string) {
    vscode.postMessage({ command: "dropMeltyFile", filePath: file });
    setPickerOpen(false);
  }

  function loadMessages() {
    vscode.postMessage({ command: "loadMessages" });
  }

  function handleReset() {
    vscode.postMessage({ command: "resetTask" });
  }

  useEffect(() => {
    loadFiles();
    loadMessages();

    // Listen for messages from the extension
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      console.log("NEW MESSAGE IN APP.TSX: ", message);
      switch (message.command) {
        case "addMessage":
          console.log("addMessage", message);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              text: message.text.message,
              sender: message.text.sender,
              diff: message.text.diff,
            },
          ]);
          setPartialResponse(null); // Clear the partial response
          break;
        case "listMeltyFiles":
          console.log("listMeltyFiles", message);
          setMeltyFiles(message.meltyFilePaths);
          break;
        case "listWorkspaceFiles":
          console.log("listWorkspaceFiles", message);
          setWorkspaceFiles(message.workspaceFilePaths);
          break;
        case "loadMessages":
          console.log("loadMessages", message);
          setMessages(message.messages);
          break;
        case "confirmedUndo":
          console.log("confirmedUndo", message);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              text: "Undone commit",
              sender: "user",
            },
          ]);
          break;
        case "setPartialResponse":
          setPartialResponse({
            text: message.joule.message,
            sender: "bot",
          });
          break;
      }
    };

    window.addEventListener("message", messageListener);

    return () => window.removeEventListener("message", messageListener);
  }, []);

  return (
    <Router>
      <main className="p-4">
        <nav className="mb-4">
          <Link to="/" className="mr-4">
            Chat
          </Link>
          <Link to="/tasks">Tasks</Link>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <>
                <MessagesView
                  messages={messages}
                  partialResponse={partialResponse}
                  handleSendMessage={handleSendMessage}
                  handleUndo={handleUndo}
                  handleReset={handleReset}
                />
                <div className="mt-6">
                  <FilePicker
                    open={pickerOpen}
                    setOpen={setPickerOpen}
                    meltyFilePaths={meltyFiles}
                    workspaceFilePaths={workspaceFiles}
                    handleAddFile={handleAddFile}
                    handleDropFile={handleDropFile}
                  />

                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Melty's Mind{"  "}
                      <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">\</span>
                      </kbd>{" "}
                    </p>
                    {meltyFiles.length === 0 && (
                      <p className="text-xs text-muted-foreground mb-2 italic">
                        Melty can't see any files yet
                      </p>
                    )}
                    {meltyFiles.map((file, i) => (
                      <button
                        onClick={() => handleDropFile(file)}
                        className="mt-1 text-xs text-muted-foreground mr-2 bg-gray-100 px-2 py-1 inline-flex items-center"
                        key={`file-${i}`}
                      >
                        <XIcon className="h-3 w-3 mr-2" />
                        {file}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            }
          />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
