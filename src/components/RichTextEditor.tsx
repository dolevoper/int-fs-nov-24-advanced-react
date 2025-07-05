import { useEffect, useReducer, useRef, useState, type KeyboardEvent } from "react";
import styles from "./RichTextEditor.module.scss";

type CursorPosition = { x: number, y: number };

type State = {
    text: string,
    cursorPosition: CursorPosition,
};
type Action =
    | { type: "insert", value: string }
    | { type: "backspace", word: boolean }
    | { type: "delete", word: boolean }
    | { type: "newline" }
    | { type: "home", ofText: boolean }
    | { type: "end", ofText: boolean }
    | { type: "move cursor horizontal", direction: "forward" | "backward", word: boolean }
    | { type: "move cursor vertical", by: number }
    | { type: "set caret", position: number };

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
        case "backspace": {
            const textToSearch = text.slice(0, absoluteCursorPosition).split("").reverse().join("");
            const lengthToDelete = action.word ? textToSearch.match(/\s{2,}| ?\w+| ?\W+|/)?.[0].length ?? 0 : 1;

            return absoluteCursorPosition === 0 ? state : {
                ...state,
                text: text.slice(0, absoluteCursorPosition - lengthToDelete) + text.slice(absoluteCursorPosition),
                cursorPosition: getCursotPosition(absoluteCursorPosition - lengthToDelete, text),
            };
        }
        case "delete": {
            const textToSearch = text.slice(absoluteCursorPosition);
            const lengthToDelete = action.word ? textToSearch.match(/\s{2,}| ?\w+| ?\W+|/)?.[0].length ?? 0 : 1;

            return absoluteCursorPosition === text.length ? state : {
                ...state,
                text: text.slice(0, absoluteCursorPosition) + text.slice(absoluteCursorPosition + lengthToDelete),
            };
        }
        case "newline": return {
            ...state,
            text: text.slice(0, absoluteCursorPosition) + "\n" + text.slice(absoluteCursorPosition),
            cursorPosition: {
                x: 0,
                y: cursorPosition.y + 1,
            },
        };
        case "move cursor horizontal": {
            const textToSearch = action.direction === "forward" ? text.slice(absoluteCursorPosition) : text.slice(0, absoluteCursorPosition).split("").reverse().join("");
            const lengthToMove = action.word ? textToSearch.match(/\s{2,}| ?\w+| ?\W+|/)?.[0].length ?? 0 : 1;
            const by = (action.direction === "forward" ? 1 : -1) * lengthToMove;

            return {
                ...state,
                cursorPosition: getCursotPosition(clamp(0, absoluteCursorPosition + by, text.length), text),
            };
        }
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
        case "set caret": return {
            ...state,
            cursorPosition: getCursotPosition(action.position, text),
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
        if (e.key.length === 1 && e.ctrlKey) {
            return;
        }

        if (e.ctrlKey && e.key === "Shift") {
            e.preventDefault();
            setRtl(e.code === "ShiftRight");
            return;
        }

        if (e.key.length === 1) {
            e.preventDefault();
            dispatch({ type: "insert", value: e.key });
            return;
        }

        switch (e.key) {
            case "Enter":
                e.preventDefault();
                dispatch({ type: "newline" });
                break;
            case "Tab":
                e.preventDefault();
                dispatch({ type: "insert", value: "\t" });
                break;
            case "Backspace":
                e.preventDefault();
                dispatch({ type: "backspace", word: e.ctrlKey });
                break;
            case "Delete":
                e.preventDefault();
                dispatch({ type: "delete", word: e.ctrlKey });
                break;
            case "ArrowLeft":
                e.preventDefault();
                dispatch({ type: "move cursor horizontal", direction: rtl ? "forward" : "backward", word: e.ctrlKey });
                break;
            case "ArrowRight":
                e.preventDefault();
                dispatch({ type: "move cursor horizontal", direction: rtl ? "backward" : "forward", word: e.ctrlKey });
                break;
            case "ArrowUp":
                e.preventDefault();
                dispatch({ type: "move cursor vertical", by: -1 });
                break;
            case "ArrowDown":
                e.preventDefault();
                dispatch({ type: "move cursor vertical", by: 1 });
                break;
            case "Home":
                e.preventDefault();
                dispatch({ type: "home", ofText: e.ctrlKey });
                break;
            case "End":
                e.preventDefault();
                dispatch({ type: "end", ofText: e.ctrlKey });
                break;
        }
    }

    return (
        <div
            data-rtl={rtl}
            className={styles.container}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPaste={(e) => dispatch({ type: "insert", value: e.clipboardData.getData("text") })}
            onMouseDown={(e) => {
                if (e.clientY + window.scrollY - e.currentTarget.offsetTop > e.currentTarget.clientHeight || e.clientX + window.scrollX - e.currentTarget.offsetLeft > e.currentTarget.clientWidth) {
                    return;
                }

                const caretPosition = document.caretPositionFromPoint(e.clientX, e.clientY);

                if (!caretPosition || cursorRef.current?.contains(caretPosition.offsetNode)) {
                    return;
                }

                const position = caretPosition.offset + (caretPosition.offsetNode.previousSibling ? absoluteCursorPosition : 0);

                dispatch({ type: "set caret", position });
            }}
        >
            {state.text.slice(0, absoluteCursorPosition)}<span className={styles.cursor} ref={cursorRef}>|</span>{state.text.slice(absoluteCursorPosition)}
        </div>
    );
}
