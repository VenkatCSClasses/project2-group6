"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import YooptaEditor, {
  createYooptaEditor,
  type RenderBlockProps,
  type SlateElement,
  type YooptaContentValue,
  type YooptaPlugin,
  useYooptaEditor,
  Blocks,
  Marks,
} from "@yoopta/editor";

import { WORD_PLUGINS } from "./plugins";
import { WORD_MARKS } from "./marks";
import { WordToolbar } from "./Toolbar";
import { SelectionBox } from "@yoopta/ui/selection-box";
import { BlockDndContext, SortableBlock, DragHandle } from "@yoopta/ui/block-dnd";
import {
  FloatingBlockActions,
  BlockOptions,
  SlashCommandMenu,
  ActionMenuList,
  useBlockActions,
} from "@yoopta/ui";
import { withMentions } from "@yoopta/mention";
import { applyTheme } from "@yoopta/themes-shadcn";
import "./App.css";
// @ts-expect-error - MentionDropdown types not properly exported
import { EmojiDropdown } from "@yoopta/themes-shadcn/emoji";
// @ts-expect-error - MentionDropdown types not properly exported
import { MentionDropdown } from "@yoopta/themes-shadcn/mention";
import { Copy, Check } from "lucide-react";
import { withEmoji } from "@yoopta/emoji";

// SlashCommandMenu will be rendered inside the editor below

// Sticky toolbar that stays visible while editing (from App.tsx)
function FixedToolbar() {
  const editor = useYooptaEditor();
  const turnIntoRef = useRef<HTMLButtonElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const markButtons: Array<{ type: string; label: string; title: string }> = [
    { type: "bold", label: "B", title: "Bold" },
    { type: "italic", label: "I", title: "Italic" },
    { type: "underline", label: "U", title: "Underline" },
    { type: "strike", label: "S", title: "Strikethrough" },
    { type: "code", label: "</>", title: "Code" },
    { type: "highlight", label: "H", title: "Highlight" },
  ];

  return (
    <>
      <div className="editor-toolbar" role="toolbar" aria-label="Formatting toolbar">
        <button
          ref={turnIntoRef}
          type="button"
          className="editor-toolbar-button editor-toolbar-turn-into"
          onClick={() => setActionMenuOpen((prev) => !prev)}>
          Turn into
        </button>

        <span className="editor-toolbar-separator" />

        {markButtons.map((button) => {
          // Some marks may not be provided by the editor configuration
          if (!editor.formats?.[button.type]) return null;

          return (
            <button
              key={button.type}
              type="button"
              className={`editor-toolbar-button ${
                Marks.isActive(editor, { type: button.type }) ? "is-active" : ""
              }`}
              onClick={() => Marks.toggle(editor, { type: button.type })}
              title={button.title}>
              {button.label}
            </button>
          );
        })}

        <span className="editor-toolbar-separator" />

        <button
          type="button"
          className="editor-toolbar-button"
          onClick={() => Marks.clear(editor)}
          title="Clear formatting">
          Clear
        </button>
      </div>

      <ActionMenuList
        open={actionMenuOpen}
        onOpenChange={setActionMenuOpen}
        anchor={turnIntoRef.current}
        view="small"
        placement="bottom-start">
        <ActionMenuList.Content />
      </ActionMenuList>
    </>
  );
}

// Floating block actions (plus button, drag handle)
function MyFloatingBlockActions() {
  const editor = useYooptaEditor();
  const { duplicateBlock, copyBlockLink, deleteBlock } = useBlockActions();
  const [blockOptionsOpen, setBlockOptionsOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const turnIntoRef = useRef<HTMLButtonElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const onActionMenuOpenChange = (open: boolean) => {
    setActionMenuOpen(open);
    if (!open) setBlockOptionsOpen(false);
  };

  return (
    <FloatingBlockActions frozen={blockOptionsOpen || actionMenuOpen}>
      {({ blockId }: { blockId?: string | null }) => (
        <>
          <FloatingBlockActions.Button
            onClick={() => {
              if (!blockId) return;
              const block = Blocks.getBlock(editor, { id: blockId });
              if (block) editor.insertBlock("Paragraph", { at: block.meta.order + 1, focus: true });
            }}>
            +
          </FloatingBlockActions.Button>

          <DragHandle blockId={blockId ?? null} asChild>
            <FloatingBlockActions.Button title="Drag to reorder">::</FloatingBlockActions.Button>
          </DragHandle>

          <FloatingBlockActions.Button
            ref={optionsButtonRef}
            title="Block options"
            onClick={() => setBlockOptionsOpen(true)}>
            ...
          </FloatingBlockActions.Button>

          <ActionMenuList
            open={actionMenuOpen}
            onOpenChange={onActionMenuOpenChange}
            anchor={turnIntoRef.current}
            blockId={blockId ?? null}
            view="small"
            placement="right-start">
            <ActionMenuList.Content />
          </ActionMenuList>

          <BlockOptions open={blockOptionsOpen} onOpenChange={setBlockOptionsOpen} anchor={optionsButtonRef.current}>
            <BlockOptions.Content>
              <BlockOptions.Group>
                <BlockOptions.Item
                  ref={turnIntoRef}
                  disabled={!blockId}
                  keepOpen
                  onSelect={() => {
                    if (blockId) setActionMenuOpen(true);
                  }}>
                  Turn into
                </BlockOptions.Item>
                <BlockOptions.Item
                  disabled={!blockId}
                  onSelect={() => {
                    if (blockId) duplicateBlock(blockId);
                  }}>
                  Duplicate
                </BlockOptions.Item>
                <BlockOptions.Item
                  disabled={!blockId}
                  onSelect={() => {
                    if (blockId) copyBlockLink(blockId);
                  }}>
                  Copy Link
                </BlockOptions.Item>
                <BlockOptions.Item
                  variant="destructive"
                  disabled={!blockId}
                  onSelect={() => {
                    if (blockId) deleteBlock(blockId);
                  }}>
                  Delete
                </BlockOptions.Item>
              </BlockOptions.Group>
            </BlockOptions.Content>
          </BlockOptions>
        </>
      )}
    </FloatingBlockActions>
  );
}

const EDITOR_STYLES = {
  width: "100%",
  paddingBottom: 100,
};

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  modal?: boolean;
};

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full px-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full rounded-lg border border-neutral-200 bg-white p-6 shadow-lg dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </div>
);

const DialogHeader = ({ children }: { children: ReactNode }) => <div className="mb-4">{children}</div>;


const INITIAL_VALUE = {
  "block-1": {
    id: "block-1",
    type: "Paragraph",
    value: [
      {
        id: "element-1",
        type: "paragraph",
        children: [{ text: "Welcome to our Word Processor!" }],
        props: { nodeType: "block" },
      },
    ],
    meta: { order: 0, depth: 0 },
  },
};

export const WordEditor = () => {
  const containerBoxRef = useRef<HTMLDivElement>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportContent, setExportContent] = useState("");
  const [exportFormat, setExportFormat] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const editor = useMemo(() => {
    return withEmoji(withMentions(
      createYooptaEditor({
        plugins: applyTheme(WORD_PLUGINS) as unknown as YooptaPlugin<
          Record<string, SlateElement>,
          unknown
        >[],
        marks: WORD_MARKS,
      })
    ));
  }, []);

  const onChange = (value: YooptaContentValue) => {
    localStorage.setItem("yoopta-word-example", JSON.stringify(value));
  };

  useEffect(() => {
    const localStorageValue = localStorage.getItem("yoopta-word-example");
    const data = localStorageValue ? JSON.parse(localStorageValue) : INITIAL_VALUE;
    editor.setEditorValue(data);
  }, [editor]);

  const renderBlock = useCallback(({ children, blockId }: RenderBlockProps) => (
    <SortableBlock id={blockId} useDragHandle>
      {children}
    </SortableBlock>
  ), []);

  const handleExport = useCallback(
    (format: "html" | "markdown" | "text" | "json") => {
      const value = editor.getEditorValue();
      let content = "";

      switch (format) {
        case "html": content = editor.getHTML(value); break;
        case "markdown": content = editor.getMarkdown(value); break;
        case "text": content = editor.getPlainText(value); break;
        case "json": content = JSON.stringify(value, null, 2); break;
      }

      setExportContent(content);
      setExportFormat(format.toUpperCase());
      setExportDialogOpen(true);
    },
    [editor]
  );

  const handlePrint = useCallback(() => window.print(), []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportContent]);

  return (
    <div className="flex flex-col min-h-screen">
      <WordToolbar editor={editor} onExport={handleExport} onPrint={handlePrint} />

      <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 overflow-auto">
        <div className="max-w-5xl mx-auto py-8 px-4">
          <div
            ref={containerBoxRef}
            className="bg-white dark:bg-neutral-950 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-800 min-h-[800px]"
          >
            <div className="p-8 md:p-12 lg:p-16">
              <BlockDndContext editor={editor}>
                <YooptaEditor
                  editor={editor}
                  style={EDITOR_STYLES}
                  onChange={onChange}
                  renderBlock={renderBlock}
                  placeholder="Start typing your document..."
                >
                  <FixedToolbar />
                  <MyFloatingBlockActions />
                  <SelectionBox selectionBoxElement={containerBoxRef} />
                  <SlashCommandMenu>
                    {({ items }: { items: Array<{ id: string; title: string; description?: string; icon?: ReactNode }> }) => (
                      <SlashCommandMenu.Content>
                        <SlashCommandMenu.List>
                          <SlashCommandMenu.Empty>No blocks found</SlashCommandMenu.Empty>
                          {items.map((item: { id: string; title: string; description?: string; icon?: ReactNode }) => (
                            <SlashCommandMenu.Item
                              key={item.id}
                              value={item.id}
                              title={item.title}
                              description={item.description}
                              icon={item.icon}
                            />
                          ))}
                        </SlashCommandMenu.List>
                        <SlashCommandMenu.Footer />
                      </SlashCommandMenu.Content>
                    )}
                  </SlashCommandMenu>
                  <MentionDropdown />
                  <EmojiDropdown />
                </YooptaEditor>
              </BlockDndContext>
            </div>
          </div>
        </div>
      </div>
      {/* publish handled by toolbar */}

      <Dialog modal open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Export as {exportFormat}
            </h2>
          </DialogHeader>
          <div className="relative">
            <div className="h-[400px] rounded-md border overflow-auto">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all">
                {exportContent}
              </pre>
            </div>
            <button
              type="button"
              className="absolute top-2 right-4 flex items-center bg-white dark:bg-neutral-900 px-2 py-1 rounded border shadow-sm"
              onClick={handleCopy}
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-1 text-green-500" /> <span className="text-sm">Copied!</span></>
              ) : (
                <><Copy className="w-4 h-4 mr-1" /> <span className="text-sm">Copy</span></>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};