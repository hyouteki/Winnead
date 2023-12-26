import './App.css';
import './components/Navbar.css';
import React, { useState, useCallback, useRef, useEffect } from "react";
import * as dialog from '@tauri-apps/api/dialog';
import * as fs from '@tauri-apps/api/fs';
import { exit } from '@tauri-apps/api/process';
import { appWindow } from '@tauri-apps/api/window';
import { useOnCtrlKeyPress } from './hooks/useOnKeyPress';
import Editor, { DiffEditor, useMonaco, loader } from '@monaco-editor/react';
import { DEFAULT_CONFIG } from './Helper';

const CONFIG_PATH = "C:/Winnead/config.json";
const WINNEAD_DIR_PATH = "C:/Winnead";

const fileType = (ext) => {
    const known = {
        "js": "javascript",
        "jsx": "javascript",
        "md": "markdown",
    };
    return (ext in known) ? known[ext] : ext;
}

const Shortcut = ({ shortcut }) => {
    return (<span style={{ fontStyle: 'italic', fontSize: 15 }}>{shortcut}</span>);
}

const getConfig = async () => {
    return (await fs.exists(CONFIG_PATH))
        ? await fs.readTextFile(CONFIG_PATH)
        : DEFAULT_CONFIG;
}

function App() {
    const [editorData, setEditorData] = useState({});

    const fetchEditorData = async () => {
        try {
            if (await fs.exists(CONFIG_PATH)) {
                const data = await fs.readTextFile(CONFIG_PATH);
                setEditorData(JSON.parse(data));
            }
        } catch (error) {
            useEffect(async () => {
                console.log("Saving @", CONFIG_PATH);
                await fs.writeTextFile(CONFIG_PATH, DEFAULT_CONFIG);
                setEditorData(JSON.parse(DEFAULT_CONFIG));
            }, []);
        }
    };

    useEffect(() => {
        fetchEditorData();
    }, []);

    const [file, setFile] = useState({
        path: "C:/",
        value: editorData.defaultValue,
        lang: editorData.defaultLanguage,
    });
    const editorRef = useRef(null);

    function onEditorMount(editor, _) {
        editorRef.current = editor;
    }

    const onMinimize = async () => {
        await appWindow.minimize();
    }

    const onMaximize = async () => {
        await appWindow.maximize();
    }

    const onClose = async () => {
        await appWindow.close();
    }

    const onOpen = useCallback(async () => {
        const selectedPath = await dialog.open({
            multiple: false,
            title: "Select File to Open",
            defaultPath: "C:/hyouteki",
        });
        if (selectedPath === null) return;
        const filepath = selectedPath.slice(0);
        const value = await fs.readTextFile(selectedPath);
        var ext = selectedPath.slice(selectedPath.lastIndexOf('.') + 1);
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

    const onExit = async () => {
        await exit(1);
    }

    useOnCtrlKeyPress(onOpen, "KeyO");
    useOnCtrlKeyPress(onSave, "KeyS");

    console.log(editorData);
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
                                Open File&nbsp;&nbsp;<Shortcut shortcut={"Ctrl+O"} />
                            </button>
                            <button className="menu-item">
                                Open Folder
                            </button>
                            <button className="menu-item" onClick={onSave}>
                                Save&nbsp;&nbsp;<Shortcut shortcut={"Ctrl+S"} />
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
                            <button className="menu-item" onClick={onExit}>
                                Exit&nbsp;&nbsp;<Shortcut shortcut={"Alt+F4"} />
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
                <Editor
                    defaultValue={editorData.defaultValue}
                    defaultLanguage={editorData.defaultLanguage}
                    theme={editorData.theme}
                    language={file.lang}
                    value={file.value}
                    onMount={onEditorMount}
                    options={editorData.options} />
            </div>
        </div>
    );
}

export default App;
