import { useEffect, useReducer, useRef, useState, type KeyboardEvent } from "react";
import styles from "./RichTextEditor.module.scss";

type CursorPosition = { x: number, y: number };

type State = {
    text: string,
    cursorPosition: CursorPosition,
};
type Action =
    | { type: "insert", value: string }
    | { type: "backspace" }
    | { type: "delete" }
    | { type: "newline" }
    | { type: "home", ofText: boolean }
    | { type: "end", ofText: boolean }
    | { type: "move cursor horizontal", by: number }
    | { type: "move cursor vertical", by: number };

const clamp = (min: number, num: number, max: number) => Math.max(min, Math.min(max, num));

const getAbsoluteCursorPosition = ({ cursorPosition, text }: State) => {
    const lines = text.split("\n");

    return Math.min(cursorPosition.x, lines[cursorPosition.y].length) + lines.slice(0, cursorPosition.y).reduce((sum, line) => sum + line.length + 1, 0);
};

const getCursotPosition = (absolutePosition: number, text: string): CursorPosition => {
    const lines = text.slice(0, absolutePosition).split("\n");

    return {
        y: lines.length - 1,
        x: lines.at(-1)!.length,
    };
};

function reducer(state: State, action: Action): State {
    const { text, cursorPosition } = state;
    const absoluteCursorPosition = getAbsoluteCursorPosition(state);


    switch (action.type) {
        case "insert": {
            const textToInsert = action.value.replaceAll("\r", "");
            const newText = text.slice(0, absoluteCursorPosition) + textToInsert + text.slice(absoluteCursorPosition);

            return {
                ...state,
                text: newText,
                cursorPosition: getCursotPosition(absoluteCursorPosition + textToInsert.length, newText),
            };
        }
        case "backspace": return absoluteCursorPosition === 0 ? state : {
            ...state,
            text: text.slice(0, absoluteCursorPosition - 1) + text.slice(absoluteCursorPosition),
            cursorPosition: getCursotPosition(absoluteCursorPosition - 1, text),
        };
        case "delete": return absoluteCursorPosition === text.length ? state : {
            ...state,
            text: text.slice(0, absoluteCursorPosition) + text.slice(absoluteCursorPosition + 1),
        };
        case "newline": return {
            ...state,
            text: text.slice(0, absoluteCursorPosition) + "\n" + text.slice(absoluteCursorPosition),
            cursorPosition: {
                x: 0,
                y: cursorPosition.y + 1,
            },
        };
        case "move cursor horizontal": return {
            ...state,
            cursorPosition: getCursotPosition(clamp(0, absoluteCursorPosition + action.by, text.length), text),
        };
        case "move cursor vertical": return {
            ...state,
            cursorPosition: {
                x: cursorPosition.x,
                y: clamp(0, cursorPosition.y + action.by, text.split("\n").length - 1),
            }
        };
        case "home": {
            const currentLineTextStartPosition = text.split("\n")[cursorPosition.y].search(/\S/);

            return {
                ...state,
                cursorPosition: action.ofText ? { x: 0, y: 0 } : {
                    y: cursorPosition.y,
                    x: cursorPosition.x === currentLineTextStartPosition ? 0 : currentLineTextStartPosition,
                },
            };
        }
        case "end": return {
            ...state,
            cursorPosition: action.ofText ? getCursotPosition(text.length, text) : {
                y: cursorPosition.y,
                x: text.split("\n")[cursorPosition.y].length,
            }
        };
    }
}

const initialState: State = {
    text: "",
    cursorPosition: { x: 0, y: 0 },
};

export function RichTextEditor() {
    const [state, dispatch] = useReducer(
        reducer,
        initialState
    );
    const absoluteCursorPosition = getAbsoluteCursorPosition(state);
    const cursorRef = useRef<HTMLSpanElement>(null);
    const [rtl, setRtl] = useState(false);

    useEffect(() => {
        cursorRef.current?.scrollIntoView({
            block: "nearest",
            inline: "nearest",
        });
    });

    function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        // TODO:
        //  * Support ctrl + stuff
        //  * Support shift
        //  * Support mouse cursor control
        //  * Support text highlighting
        //  * Support switching writing direction (ctrl + shift)
        console.log(e.code);

        if (e.key === "v" && e.ctrlKey) {
            return;
        }

        if (e.ctrlKey && e.code === "ShiftRight") {
            e.preventDefault();
            setRtl(true);
        }

        if (e.ctrlKey && e.code === "ShiftLeft") {
            e.preventDefault();
            setRtl(false);
        }

        if (e.key.length === 1) {
            e.preventDefault();
            dispatch({ type: "insert", value: e.key });
        }

        if (e.key === "Enter") {
            e.preventDefault();
            dispatch({ type: "newline" });
        }

        if (e.key === "Tab") {
            e.preventDefault();
            dispatch({ type: "insert", value: "\t" });
        }

        if (e.key === "Backspace") {
            e.preventDefault();
            dispatch({ type: "backspace" });
        }

        if (e.key === "Delete") {
            e.preventDefault();
            dispatch({ type: "delete" });
        }

        if (e.key === "ArrowLeft") {
            e.preventDefault();
            dispatch({ type: "move cursor horizontal", by: rtl ? 1 : -1 });
        }

        if (e.key === "ArrowRight") {
            e.preventDefault();
            dispatch({ type: "move cursor horizontal", by: rtl ? -1 : 1 });
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            dispatch({ type: "move cursor vertical", by: -1 });
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            dispatch({ type: "move cursor vertical", by: 1 });
        }

        if (e.key === "Home") {
            e.preventDefault();
            dispatch({ type: "home", ofText: e.ctrlKey });
        }

        if (e.key === "End") {
            e.preventDefault();
            dispatch({ type: "end", ofText: e.ctrlKey });
        }
    }

    return (
        <div data-rtl={rtl} className={styles.container} tabIndex={0} onKeyDown={handleKeyDown} onPaste={(e) => dispatch({ type: "insert", value: e.clipboardData.getData("text") })}>
            {state.text.slice(0, absoluteCursorPosition)}<span className={styles.cursor} ref={cursorRef}>|</span>{state.text.slice(absoluteCursorPosition)}
        </div>
    );
}
