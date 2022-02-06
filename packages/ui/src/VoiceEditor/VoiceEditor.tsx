import { h } from "preact";
import { useCallback, useEffect, useRef } from "preact/hooks";
import { updateSpokenSentenceUseCase } from "./UpdateSpokenSentenceUseCase";
import * as VoiceEditorState from "./VoiceEditorState";
import { basicSetup, EditorState, EditorView } from "@codemirror/basic-setup";
import { cursorDocEnd, cursorLineDown } from "@codemirror/commands";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { JSXInternal } from "preact/src/jsx";
// import { updateVoiceEditorTextUseCase } from "./UpdateVoiceEditorTextUseCase";
import { useStore } from "../hooks/useStore";
import { updateVoiceEditorTextUseCase } from "./UpdateVoiceEditorTextUseCase";

export type VoiceEditorProps = JSXInternal.HTMLAttributes<HTMLDivElement>;
export const VoiceEditor = (props: VoiceEditorProps) => {
    const { ...divProps } = props;
    const [storage, setStorage] = useLocalStorage("VoiceEditor", "");
    const divRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView>();
    const updateListenerExtension = useCallback(() => {
        return EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const text = update.state.doc.toString();
                setStorage(text);
                updateVoiceEditorTextUseCase(text);
            }
        });
    }, []); // eslint-disable-line
    useEffect(() => {
        const editorState = EditorState.create({
            doc: storage,
            extensions: [basicSetup, updateListenerExtension()],
        });
        updateVoiceEditorTextUseCase(storage);
        const editorView = new EditorView({
            state: editorState,
        });
        const refCurrent = divRef.current;
        refCurrent?.appendChild(editorView.dom);
        cursorDocEnd(editorView); // move to end of doc
        editorView.focus();
        editorViewRef.current = editorView;
        return () => {
            editorView.destroy();
            refCurrent?.remove();
        };
    }, [updateListenerExtension]); // eslint-disable-line -- storage at first
    const voiceEditorState = useStore(VoiceEditorState);
    useEffect(() => {
        if (!voiceEditorState.hasAddingSentences) {
            return;
        }
        const editorView = editorViewRef.current;
        if (!editorView) {
            return;
        }
        const transaction = editorView.state.update({
            changes: voiceEditorState.addingSentences.map((sentence) => {
                return {
                    from: editorView.state.selection.ranges[0].to,
                    insert: sentence.toSentence(),
                };
            }),
        });
        editorView.dispatch(transaction);
        cursorLineDown(editorView);
        updateSpokenSentenceUseCase().execute(voiceEditorState.addingSentences);
    }, [voiceEditorState]);
    return <div className={"VoiceEditor"} ref={divRef} {...divProps} />;
};
