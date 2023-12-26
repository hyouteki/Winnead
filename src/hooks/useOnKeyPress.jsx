import { useEffect } from "react";

export const useOnCtrlKeyPress = (callback, targetKey) => {
    useEffect(() => {
        const keyPressEventHandler = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.code === targetKey) {
                callback();
            }
        };
        document.addEventListener('keydown', keyPressEventHandler);
        return () => {
            document.removeEventListener('keydown', keyPressEventHandler);
        };
    }, [callback, targetKey]);
}