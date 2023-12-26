import "./ExplorerItem.css";
import { useState } from "react";

function ExplorerItem({ item, openFile }) {
    const [opened, setOpened] = useState(false);
    const btnOnClick = () => {
        console.log("clicked ", item.name);
        if (item.children) {setOpened(!opened);}
        else {openFile(item.path);}
    }
    return (
        <>
            <button className="explorer-item" onClick={btnOnClick}>
                {
                    item.children && !opened && <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512">
                        <path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z" />
                    </svg>
                } {
                    item.children && opened && <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="16" width="18" viewBox="0 0 576 512">
                        <path d="M384 480h48c11.4 0 21.9-6 27.6-15.9l112-192c5.8-9.9 5.8-22.1 .1-32.1S555.5 224 544 224H144c-11.4 0-21.9 6-27.6 15.9L48 357.1V96c0-8.8 7.2-16 16-16H181.5c4.2 0 8.3 1.7 11.3 4.7l26.5 26.5c21 21 49.5 32.8 79.2 32.8H416c8.8 0 16 7.2 16 16v32h48V160c0-35.3-28.7-64-64-64H298.5c-17 0-33.3-6.7-45.3-18.7L226.7 50.7c-12-12-28.3-18.7-45.3-18.7H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H87.7 384z" />
                    </svg>
                } {
                    !item.children && <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="16" width="12" viewBox="0 0 384 512">
                        <path d="M320 464c8.8 0 16-7.2 16-16V160H256c-17.7 0-32-14.3-32-32V48H64c-8.8 0-16 7.2-16 16V448c0 8.8 7.2 16 16 16H320zM0 64C0 28.7 28.7 0 64 0H229.5c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64z"/>
                    </svg>
                } {item.name}
            </button>
            <div className="sub-explorer-container">
                <div className="sub-explorer-line" />
                {
                    item.children && <div className={`sub-explorer ${opened ? '' : 'invisible'}`}>
                        {item.children.map((item) => <ExplorerItem key={item.path} item={item} openFile={openFile}></ExplorerItem>)}
                    </div>
                }
            </div>
        </>
    );
}

export default ExplorerItem;