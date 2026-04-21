import { type YooptaContentValue } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Headings from '@yoopta/headings';
import { Bold, Italic, Underline, Strike, CodeMark, Highlight } from '@yoopta/marks';
import { useMemo, useState, useRef, useCallback, type ReactNode } from 'react';
import YooptaEditor, {
  createYooptaEditor,
  Blocks,
  Marks,
  useYooptaEditor,
  buildBlockData,
  type RenderBlockProps,
} from '@yoopta/editor';
import {
  FloatingBlockActions,
  BlockOptions,
  SlashCommandMenu,
  ActionMenuList,
  useBlockActions,
} from '@yoopta/ui';
import { BlockDndContext, SortableBlock, DragHandle } from '@yoopta/ui/block-dnd';
import PublishToWordPress from './publish';
import './App.css';

const PLUGINS = [Paragraph, Headings.HeadingOne, Headings.HeadingTwo, Headings.HeadingThree];
const MARKS = [Bold, Italic, Underline, Strike, CodeMark, Highlight];

// Sticky toolbar that stays visible while editing.
function FixedToolbar() {
  const editor = useYooptaEditor();
  const turnIntoRef = useRef<HTMLButtonElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const markButtons: Array<{ type: string; label: string; title: string }> = [
    { type: 'bold', label: 'B', title: 'Bold' },
    { type: 'italic', label: 'I', title: 'Italic' },
    { type: 'underline', label: 'U', title: 'Underline' },
    { type: 'strike', label: 'S', title: 'Strikethrough' },
    { type: 'code', label: '</>', title: 'Code' },
    { type: 'highlight', label: 'H', title: 'Highlight' },
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
          if (!editor.formats[button.type]) return null;

          return (
            <button
              key={button.type}
              type="button"
              className={`editor-toolbar-button ${
                Marks.isActive(editor, { type: button.type }) ? 'is-active' : ''
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
              if (block) editor.insertBlock('Paragraph', { at: block.meta.order + 1, focus: true });
            }}>
            +
          </FloatingBlockActions.Button>

          <DragHandle blockId={blockId ?? null} asChild>
            <FloatingBlockActions.Button title="Drag to reorder">
              ::
            </FloatingBlockActions.Button>
          </DragHandle>

          <FloatingBlockActions.Button
            ref={optionsButtonRef}
            title="Block options"
            onClick={() => setBlockOptionsOpen(true)}>
            ...
          </FloatingBlockActions.Button>

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

          <ActionMenuList
            open={actionMenuOpen}
            onOpenChange={onActionMenuOpenChange}
            anchor={turnIntoRef.current}
            blockId={blockId ?? null}
            view="small"
            placement="right-start">
            <ActionMenuList.Content />
          </ActionMenuList>
        </>
      )}
    </FloatingBlockActions>
  );
}

export default function Editor() {
  const editor = useMemo(() => {
    const heading = buildBlockData({ type: 'HeadingOne', value: [{ children: [{ text: 'Yoopta Editor - Demo Document' }] }] } as any);
    const para1 = buildBlockData({ type: 'Paragraph', value: [{ children: [{ text: 'This is a demo document showing Paragraphs, Headings and Marks.' }] }] } as any);
    const para2 = buildBlockData({ type: 'Paragraph', value: [{ children: [{ text: 'Use the fixed toolbar above to apply Bold, Italic, Underline, Strike, Code, and Highlight formatting.' }] }] } as any);
    const para3 = buildBlockData({ type: 'Paragraph', value: [{ children: [{ text: 'Type / to open the slash command menu and insert blocks.' }] }] } as any);

    const initial = {} as YooptaContentValue;
    (initial as Record<string, unknown>)[heading.id] = heading;
    (initial as Record<string, unknown>)[para1.id] = para1;
    (initial as Record<string, unknown>)[para2.id] = para2;
    (initial as Record<string, unknown>)[para3.id] = para3;

    return createYooptaEditor({
      plugins: PLUGINS,
      marks: MARKS,
      value: initial,
    });
  }, []);

  const renderBlock = useCallback(
    ({ children, blockId }: RenderBlockProps) => (
      <SortableBlock id={blockId} useDragHandle>
        {children}
      </SortableBlock>
    ),
    [],
  );

  return (
    <div className="editor-shell">
      <BlockDndContext editor={editor}>
        <YooptaEditor
          editor={editor}
          onChange={(value) => console.log(value)}
          autoFocus
          placeholder="Type / to open menu"
          className="editor-surface"
          renderBlock={renderBlock}>
          <FixedToolbar />
          <MyFloatingBlockActions />

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
        </YooptaEditor>
      </BlockDndContext>

      <div className="editor-publish-row">
        <PublishToWordPress getSourceValue={() => editor.getEditorValue()} />
      </div>
    </div>
  );
}

/*import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App*/
