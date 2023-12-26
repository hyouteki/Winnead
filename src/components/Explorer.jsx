import "./Explorer.css";
import ExplorerItem from "./ExplorerItem";

function Explorer({ items, openFile }) {
    return (
        <div className="explorer">
            {items.map((item) => <ExplorerItem key={item.path} item={item} openFile={openFile}/>)}
        </div>
    );
}

export default Explorer;