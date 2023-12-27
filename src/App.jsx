import './App.css';
import './components/Navbar.css';
import React, { useState, useCallback, useRef, useEffect } from "react";
import * as dialog from '@tauri-apps/api/dialog';
import * as fs from '@tauri-apps/api/fs';
import { appWindow } from '@tauri-apps/api/window';
import { useOnCtrlKeyPress } from './hooks/useOnKeyPress';
import Editor, { DiffEditor, useMonaco, loader } from '@monaco-editor/react';
import { DEFAULT_CONFIG_STR } from './Helper';
import SplitPane, { Pane } from 'split-pane-react';
import 'split-pane-react/esm/themes/default.css';
import Explorer from './components/Explorer';

const CONFIG_PATH = "C:/Winnead/config.json";
const WINNEAD_DIR_PATH = "C:/Winnead";
const DEFAULT_CONFIG = JSON.parse(DEFAULT_CONFIG_STR);

const CONFIG = (await fs.exists(CONFIG_PATH))
    ? JSON.parse(await fs.readTextFile(CONFIG_PATH))
    : DEFAULT_CONFIG;
if (!await fs.exists(CONFIG_PATH)) {
    console.log("Saving @", CONFIG_PATH);
    await fs.writeTextFile(CONFIG_PATH, DEFAULT_CONFIG_STR);
}

const DEFAULT_PATH = (CONFIG.defaultPath) ? CONFIG.defaultPath : "C:/Winnead";

const fileType = (ext) => {
    const known = {
        "js": "javascript",
        "jsx": "javascript",
        "md": "markdown",
    };
    return (ext in known) ? known[ext] : ext;
}

const Keymap = ({ keymap }) => {
    return (<span style={{ fontStyle: 'italic', fontSize: 15 }}>{keymap}</span>);
}

const getConfig = async () => {
    return (await fs.exists(CONFIG_PATH)) ? await fs.readTextFile(CONFIG_PATH) : DEFAULT_CONFIG;
}

function App() {
    const [sizes, setSizes] = useState([100, '30%', 'auto']);
    const [explorerItems, setExlorerItems] = useState([]);
    const [explorerVisibility, setExplorerVisibility] = useState(CONFIG.explorerOnStartUp);

    const readCurDir = async () => {
        setExlorerItems((explorerVisibility) ? await fs.readDir(DEFAULT_PATH, { recursive: false }) : []);
    }

    useEffect(() => { readCurDir(); }, []);

    const [file, setFile] = useState({
        path: DEFAULT_PATH,
        value: CONFIG.defaultValue,
        lang: CONFIG.defaultLanguage,
    });

    const editorRef = useRef(null);
    function onEditorMount(editor, _) { editorRef.current = editor; }

    const onMinimize = async () => { await appWindow.minimize(); }
    const onMaximize = async () => { await appWindow.maximize(); }
    const onClose = async () => { await appWindow.close(); }

    const onOpen = useCallback(async () => {
        const selectedPath = await dialog.open({
            multiple: false,
            title: "Select File to Open",
            defaultPath: DEFAULT_PATH,
        });
        if (selectedPath === null) return;
        const filepath = selectedPath.slice(0);
        const value = await fs.readTextFile(selectedPath);
        const ext = selectedPath.slice(selectedPath.lastIndexOf('.') + 1);
        const lang = fileType(ext);
        setFile({ path: filepath, value: value, lang: lang });
    }, []);

    const onSave = useCallback(async () => {
        console.log("Saving @", file.path);
        await fs.writeTextFile(file.path, editorRef.current.getValue());
    }, [file, editorRef]);

    const onEditConfig = useCallback(async () => {
        if (!await fs.exists(WINNEAD_DIR_PATH)) {
            await fs.createDir(WINNEAD_DIR_PATH, { recursive: true });
        }
        setFile({ path: CONFIG_PATH, value: await getConfig(), lang: "json" });
    }, []);

    const openFile = async (filepath) => {
        const value = await fs.readTextFile(filepath);
        const lang = fileType(filepath.slice(filepath.lastIndexOf('.') + 1));
        setFile({ path: filepath, value: value, lang: lang });
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
        setExlorerItems(newExplorerTree);
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
        setExlorerItems(newExplorerTree);
    }

    useOnCtrlKeyPress(onOpen, "KeyO");
    useOnCtrlKeyPress(onSave, "KeyS");

    console.log(explorerItems);
    return (
        <div className="box">
            <div className="row header">
                <div className="navbar">
                    <div className="dropdown">
                        <button className="menu-item">File</button>
                        <div className="dropdown-content">
                            <button className="menu-item">
                                New File
                            </button>
                            <button className="menu-item" onClick={onOpen}>
                                Open File&nbsp;&nbsp;<Keymap shortcut={"Ctrl+O"} />
                            </button>
                            <button className="menu-item" onClick={readCurDir}>
                                Open Folder
                            </button>
                            <button className="menu-item" onClick={onSave}>
                                Save&nbsp;&nbsp;<Keymap shortcut={"Ctrl+S"} />
                            </button>
                            <button className="menu-item">
                                Save As
                            </button>
                            <button className="menu-item">
                                Close Folder
                            </button>
                            <button className="menu-item" onClick={onEditConfig}>
                                Edit Config
                            </button>
                            <button className="menu-item" onClick={onClose}>
                                Exit&nbsp;&nbsp;<Keymap shortcut={"Alt+F4"} />
                            </button>
                        </div>
                    </div>
                    <div className="dropdown">
                        <button className="menu-item">View</button>
                        <div className="dropdown-content">
                            <a href="/" className="menu-item">Explorer</a>
                            <a href="/" className="menu-item">Runner</a>
                            <a href="/" className="menu-item">Terminal</a>
                        </div>
                    </div>
                    <div className="dropdown">
                        <button className="menu-item dropdown-button">Display</button>
                        <div className="dropdown-content">
                            <a href="/" className="menu-item">Open Explorer</a>
                            <a href="/" className="menu-item">New Terminal</a>
                            <a href="/" className="menu-item">Close Terminal</a>
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
                {explorerVisibility && <SplitPane split='vertical' sizes={sizes} onChange={setSizes}>
                    <Pane minSize="0%" maxSize='50%'>
                        <Explorer items={explorerItems} openFile={openFile} 
                            expandFolder={expandFolder} collapseFolder={collapseFolder} />
                    </Pane>
                    <Editor
                        defaultValue={CONFIG.defaultValue}
                        defaultLanguage={CONFIG.defaultLanguage}
                        theme={CONFIG.theme}
                        language={file.lang}
                        value={file.value}
                        onMount={onEditorMount}
                        options={CONFIG.options} />
                </SplitPane>}
                {!explorerVisibility && <Editor
                    defaultValue={CONFIG.defaultValue}
                    defaultLanguage={CONFIG.defaultLanguage}
                    theme={CONFIG.theme}
                    language={file.lang}
                    value={file.value}
                    onMount={onEditorMount}
                    options={CONFIG.options} />}
            </div>
        </div>
    );
}

export default App;
