import "./Explorer.css";
import ExplorerItem from "./ExplorerItem";

function Explorer({ items, openFile, expandFolder, collapseFolder }) {
    return (
        <div className="explorer">
            {items.map((item) => <ExplorerItem key={item.path} item={item} openFile={openFile} 
                parents={[]} expandFolder={expandFolder} collapseFolder={collapseFolder}/>)}
        </div>
    );
}

export default Explorer;