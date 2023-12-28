import './App.css';
import './components/Navbar.css';
import React, { useState, useCallback, useRef, useEffect } from "react";
import * as dialog from '@tauri-apps/api/dialog';
import * as fs from '@tauri-apps/api/fs';
import { appWindow } from '@tauri-apps/api/window';
import { useOnCtrlKeyPress, useOnCtrlShiftKeyPress } from './hooks/useOnKeyPress';
import Editor, { DiffEditor, useMonaco, loader } from '@monaco-editor/react';
import { DEFAULT_CONFIG_STR } from './Helper';
import SplitPane, { Pane } from 'split-pane-react';
import 'split-pane-react/esm/themes/default.css';
import Explorer from './components/Explorer';
import { ReactTerminal } from "react-terminal";
import { Command } from '@tauri-apps/api/shell';
import * as path from '@tauri-apps/api/path';

const CONFIG_PATH = "C:/Winnead/config.json";
const WINNEAD_DIR_PATH = "C:/Winnead";
const DEFAULT_CONFIG = JSON.parse(DEFAULT_CONFIG_STR);

let config = DEFAULT_CONFIG
if (await fs.exists(CONFIG_PATH)) {
    try { config = JSON.parse(await fs.readTextFile(CONFIG_PATH)) } catch (e) { }
} else {
    console.log("Saving @", CONFIG_PATH);
    await fs.writeTextFile(CONFIG_PATH, DEFAULT_CONFIG_STR);
}

const DEFAULT_PATH = (config.defaultPath) ? config.defaultPath : "C:/Winnead";

const fileType = (ext) => {
    return (ext in config.languageExtensionMap) ? config.languageExtensionMap[ext] : ext;
}

const Keymap = ({ keymap }) => {
    return <span style={{ fontStyle: 'italic', fontSize: 15 }}>{keymap}</span>;
}

const getConfig = async () => {
    return (await fs.exists(CONFIG_PATH)) ? await fs.readTextFile(CONFIG_PATH) : DEFAULT_CONFIG;
}

function App() {
    const [explorerSizes, setExplorerSizes] = useState([(config.explorer.showOnStartUp)
        ? config.explorer.defaultWidth : "0%", 'auto']);
    const [explorerItems, setExplorerItems] = useState([]);
    const [lastExplorerWidth, setLastExplorerWidth] = useState([config.explorer.defaultWidth]);
    const [terminalSizes, setTerminalSizes] = useState(['auto', (config.terminal.showOnStartUp)
        ? config.terminal.defaultWidth : "0%"]);
    const [lastTerminalWidth, setLastTerminalWidth] = useState([config.terminal.defaultWidth]);
    const [curPath, setCurPath] = useState(DEFAULT_PATH);
    const [cwd, setCwd] = useState(DEFAULT_PATH);

    const readCurDir = async () => {
        setExplorerItems((explorerSizes[0] !== '0%') ? await fs.readDir(curPath, { recursive: false }) : []);
    }

    const readDir = async (dirPath) => {
        setExplorerItems((explorerSizes[0] !== '0%') ? await fs.readDir(dirPath, { recursive: false }) : []);
    }

    useEffect(() => { readCurDir(); }, []);

    const [file, setFile] = useState({
        valid: false,
        path: DEFAULT_PATH,
        value: config.defaultValue,
        lang: config.defaultLanguage,
    });

    const editorRef = useRef(null);
    function onEditorMount(editor, _) { editorRef.current = editor; editor.focus(); }

    const onMinimize = async () => { await appWindow.minimize(); }
    const onMaximize = async () => { await appWindow.maximize(); }
    const onClose = async () => { await appWindow.close(); }

    const onNewFile = useCallback(async () => {
        await onSave();
        setFile({ valid: false, path: curPath, value: config.defaultValue, lang: config.defaultLanguage, });
    }, [])

    const onOpen = useCallback(async () => {
        await onSave();
        const selectedPath = await dialog.open({
            multiple: false,
            title: "Select File to Open",
            directory: false,
            defaultPath: curPath,
        });
        if (selectedPath === null) return;
        const filepath = selectedPath.slice(0);
        const value = await fs.readTextFile(selectedPath);
        const ext = selectedPath.slice(selectedPath.lastIndexOf('.') + 1);
        const lang = fileType(ext);
        setFile({ valid: true, path: filepath, value: value, lang: lang });
    }, []);

    const onOpenFolder = useCallback(async () => {
        await onSave();
        const selectedPath = await dialog.open({
            multiple: false,
            title: "Select Folder to Open",
            directory: true,
            defaultPath: curPath,
        });
        if (selectedPath === null) return;
        setExplorerVisibility(true);
        setCurPath(selectedPath);
        setExplorerItems(await fs.readDir(selectedPath, { recursive: false }));
        setFile({ valid: false, path: curPath, value: config.defaultValue, lang: config.defaultLanguage });
    }, []);

    const onSave = useCallback(async () => {
        if (!file.valid) return;
        console.log("Saving @", file.path);
        await fs.writeTextFile(file.path, editorRef.current.getValue());
        if (file.path == CONFIG_PATH) { onReloadConfig(); }
    }, [file, editorRef]);

    const onSaveAs = useCallback(async () => {
        const selectedPath = await dialog.save({
            title: "Save As",
            defaultPath: curPath,
        });
        if (selectedPath === null) return;
        console.log("Saving @", selectedPath);
        await fs.writeTextFile(selectedPath, editorRef.current.getValue());
        const ext = selectedPath.slice(selectedPath.lastIndexOf('.') + 1);
        const lang = fileType(ext);
        setFile({ valid: true, path: selectedPath, value: editorRef.current.getValue(), lang: lang });
        await readCurDir();
    }, []);

    const onReloadConfig = useCallback(async () => {
        if (await fs.exists(CONFIG_PATH)) {
            try { config = JSON.parse(await fs.readTextFile(CONFIG_PATH)) } catch (e) { }
        } else {
            console.log("Saving @", CONFIG_PATH);
            await fs.writeTextFile(CONFIG_PATH, DEFAULT_CONFIG_STR);
        }
        editorRef.current.updateOptions(config.options)
    });

    const onCloseFolder = useCallback(async () => {
        await onSave();
        setExplorerItems([]);
        setExplorerVisibility(false);
    }, []);

    const onEditConfig = useCallback(async () => {
        await onSave();
        if (!await fs.exists(WINNEAD_DIR_PATH)) {
            await fs.createDir(WINNEAD_DIR_PATH, { recursive: true });
        }
        setFile({ valid: true, path: CONFIG_PATH, value: await getConfig(), lang: "json" });
    }, []);

    const openFile = async (filepath) => {
        const value = await fs.readTextFile(filepath);
        const lang = fileType(filepath.slice(filepath.lastIndexOf('.') + 1));
        console.log("current file @", { valid: true, path: filepath, value: value, lang: lang });
        setFile({ valid: true, path: filepath, value: value, lang: lang });
    }

    const expandFolder = async (item, parents) => {
        const itemsInDir = await fs.readDir(item.path, { recursive: false });
        let newExplorerTree = [...explorerItems];
        let curDir = [...newExplorerTree];
        for (let i = 0; i < parents.length; i++) {
            for (let j = 0; j < curDir.length; j++) {
                if (curDir[j].name == parents[i]) {
                    curDir = [...curDir[j].children];
                    break;
                }
            }
        }
        for (let i = 0; i < curDir.length; i++) {
            if (curDir[i].name == item.name) {
                curDir[i].children = itemsInDir;
                break;
            }
        }
        setExplorerItems(newExplorerTree);
    }

    const collapseFolder = async (item, parents) => {
        let newExplorerTree = [...explorerItems];
        let curDir = [...newExplorerTree];
        for (let i = 0; i < parents.length; i++) {
            for (let j = 0; j < curDir.length; j++) {
                if (curDir[j].name == parents[i]) {
                    curDir = [...curDir[j].children];
                    break;
                }
            }
        }
        for (let i = 0; i < curDir.length; i++) {
            if (curDir[i].name == item.name) {
                curDir[i].children = [];
                break;
            }
        }
        setExplorerItems(newExplorerTree);
    }

    const onToggleExplorer = () => {
        if (explorerSizes[0] === '0%') setExplorerSizes([lastExplorerWidth, 'auto']);
        else {
            setLastExplorerWidth(explorerSizes[0]);
            setExplorerSizes(['0%', 'auto']);
        }
    };

    const onToggleTerminal = () => {
        if (terminalSizes[1] === "0%") setTerminalSizes(["auto", lastTerminalWidth]);
        else {
            setLastTerminalWidth(terminalSizes[1]);
            setTerminalSizes(["auto", "0%"]);
        }
    };

    const terminalDefaultHandler = async (cmd, commandArguments) => {
        if (cmd === "cd") {
            const newCwd = (await path.isAbsolute(commandArguments))
                ? commandArguments : await path.resolve(cwd, commandArguments);
            console.log("new cwd ", newCwd);
            const command = Command.sidecar('bin/nu', ["-c", `cd ${newCwd}`], { cwd: cwd.slice(0) });
            const output = await command.execute();
            if (output.stderr.length != 0) return output.stderr;
            setCwd(newCwd);
            readCurDir();
            return output.stdout;
        } else if (cmd === "xp") {
            const newCwd = (await path.isAbsolute(commandArguments))
                ? commandArguments : await path.resolve(cwd, commandArguments);
            console.log("new cwd ", newCwd);
            const command = Command.sidecar('bin/nu', ["-c", `cd ${newCwd}`], { cwd: cwd.slice(0) });
            const output = await command.execute();
            if (output.stderr.length != 0) return output.stderr;
            setCwd(newCwd);
            setCurPath(newCwd);
            readDir(newCwd);
            return output.stdout;
        } else if (cmd === "ls") cmd = "lsd";
        else if (cmd == "ed") {
            const filepath = (await path.isAbsolute(commandArguments))
                ? commandArguments : await path.resolve(cwd, commandArguments);
            const value = await fs.readTextFile(filepath);
            const ext = filepath.slice(filepath.lastIndexOf('.') + 1);
            const lang = fileType(ext);
            setFile({ valid: true, path: filepath, value: value, lang: lang });
            return `${filepath} opened in editor`;
        }
        const command = Command.sidecar('bin/nu', ["-c", `${cmd} ${commandArguments}`], { cwd: cwd });
        const output = await command.execute();
        console.log("output ", output);
        readCurDir();
        if (output.stderr.length != 0) return output.stderr;
        return output.stdout;
    };

    useOnCtrlKeyPress(onNewFile, "KeyN");
    useOnCtrlKeyPress(onOpen, "KeyO");
    useOnCtrlKeyPress(onOpenFolder, "KeyK");
    useOnCtrlKeyPress(onSave, "KeyS");
    useOnCtrlKeyPress(onEditConfig, "Comma");
    useOnCtrlKeyPress(onToggleExplorer, "KeyB");
    useOnCtrlKeyPress(onToggleTerminal, "KeyT");
    useOnCtrlShiftKeyPress(onReloadConfig, "Comma");
    useOnCtrlShiftKeyPress(onSaveAs, "KeyS");

    console.log(explorerItems);
    return (
        <div className="box">
            <div className="row header">
                <div className="navbar">
                    <div className="dropdown">
                        <button className="menu-item">File</button>
                        <div className="dropdown-content">
                            <button className="menu-item" onClick={onNewFile}>
                                New File&nbsp;&nbsp;<Keymap keymap={"Ctrl+N"} />
                            </button>
                            <button className="menu-item" onClick={onOpen}>
                                Open File&nbsp;&nbsp;<Keymap keymap={"Ctrl+O"} />
                            </button>
                            <button className="menu-item" onClick={onOpenFolder}>
                                Open Folder&nbsp;&nbsp;<Keymap keymap={"Ctrl+K"} />
                            </button>
                            <button className="menu-item" onClick={onSave}>
                                Save&nbsp;&nbsp;<Keymap keymap={"Ctrl+S"} />
                            </button>
                            <button className="menu-item" onClick={onSaveAs}>
                                Save As&nbsp;&nbsp;<Keymap keymap={"Ctrl+Shift+S"} />
                            </button>
                            <button className="menu-item" onClick={onCloseFolder}>
                                Close Folder
                            </button>
                            <button className="menu-item" onClick={onEditConfig}>
                                Edit Config&nbsp;&nbsp;<Keymap keymap={"Ctrl+,"} />
                            </button>
                            <button className="menu-item" onClick={onReloadConfig}>
                                Reload Config&nbsp;&nbsp;<Keymap keymap={"Ctrl+Shift+,"} />
                            </button>
                            <button className="menu-item" onClick={onClose}>
                                Exit&nbsp;&nbsp;<Keymap keymap={"Alt+F4"} />
                            </button>
                        </div>
                    </div>
                    <div className="dropdown">
                        <button className="menu-item">View</button>
                        <div className="dropdown-content">
                            <button className="menu-item" onClick={onToggleExplorer}>
                                Toggle Explorer&nbsp;&nbsp;<Keymap keymap={"Ctrl+B"} />
                            </button>
                            <button className="menu-item" onClick={onToggleTerminal}>
                                Toggle Terminal&nbsp;&nbsp;<Keymap keymap={"Ctrl+T"} />
                            </button>
                        </div>
                    </div>
                    <div className="window-button-container">
                        <div className="titlebar-button" id="titlebar-minimize" onClick={onMinimize}>
                            <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="16" width="14" viewBox="0 0 448 512">
                                <path d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z" />
                            </svg>
                        </div>
                        <div className="titlebar-button" id="titlebar-maximize" onClick={onMaximize}>
                            <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512">
                                <path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zM96 96H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H96c-17.7 0-32-14.3-32-32s14.3-32 32-32z" />
                            </svg>
                        </div>
                        <div className="titlebar-button" id="titlebar-close" onClick={onClose}>
                            <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512">
                                <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
            <div className="row content">
                <SplitPane split='vertical' sizes={explorerSizes} onChange={setExplorerSizes}>
                    <Pane minSize="0%" maxSize='50%'>
                        <Explorer items={explorerItems} openFile={openFile}
                            expandFolder={expandFolder} collapseFolder={collapseFolder} />
                    </Pane>
                    <SplitPane split='horizontal' sizes={terminalSizes} onChange={setTerminalSizes}>

                        <Editor
                            defaultValue={config.defaultValue}
                            defaultLanguage={config.defaultLanguage}
                            theme={config.theme}
                            language={file.lang}
                            value={file.value}
                            onMount={onEditorMount}
                            options={config.options} />
                        <Pane minSize="0%" maxSize='100%'>
                            <ReactTerminal
                                defaultHandler={terminalDefaultHandler}
                                theme={config.terminal.theme}
                                showControlBar={config.terminal.showControlBar}
                                prompt={`${cwd} ${config.terminal.promptSymbol}`}
                            />
                        </Pane>
                    </SplitPane>
                </SplitPane>
            </div>
        </div>
    );
}

export default App;
