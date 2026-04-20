import { type YooptaContentValue } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Headings from '@yoopta/headings';
import { Bold, Italic, Underline, Strike, CodeMark, Highlight } from '@yoopta/marks';
import { useMemo, useState, useRef } from 'react';
import YooptaEditor, { createYooptaEditor, Blocks, Marks, useYooptaEditor, buildBlockData } from '@yoopta/editor';
import { FloatingToolbar, FloatingBlockActions, BlockOptions, SlashCommandMenu, useBlockActions } from '@yoopta/ui';
import PublishToWordPress from './publish';

const PLUGINS = [Paragraph, Headings.HeadingOne, Headings.HeadingTwo, Headings.HeadingThree];
const MARKS = [Bold, Italic, Underline, Strike, CodeMark, Highlight];

// Floating toolbar for text formatting
function MyToolbar() {
  const editor = useYooptaEditor();

  return (
    <FloatingToolbar>
      <FloatingToolbar.Content>
        <FloatingToolbar.Group>
          {editor.formats.bold && (
            <FloatingToolbar.Button
              onClick={() => Marks.toggle(editor, { type: 'bold' })}
              active={Marks.isActive(editor, { type: 'bold' })}
              title="Bold">
              B
            </FloatingToolbar.Button>
          )}
          {editor.formats.italic && (
            <FloatingToolbar.Button
              onClick={() => Marks.toggle(editor, { type: 'italic' })}
              active={Marks.isActive(editor, { type: 'italic' })}
              title="Italic">
              I
            </FloatingToolbar.Button>
          )}
          {editor.formats.underline && (
            <FloatingToolbar.Button
              onClick={() => Marks.toggle(editor, { type: 'underline' })}
              active={Marks.isActive(editor, { type: 'underline' })}
              title="underline">
              U
            </FloatingToolbar.Button>
          )}
          {editor.formats.strike && (
            <FloatingToolbar.Button
              onClick={() => Marks.toggle(editor, { type: 'strike' })}
              active={Marks.isActive(editor, { type: 'strike' })}
              title="strike">
              S
            </FloatingToolbar.Button>
          )}
        </FloatingToolbar.Group>
      </FloatingToolbar.Content>
    </FloatingToolbar>
  );
}

// Floating block actions (plus button, drag handle)
function MyFloatingBlockActions() {
  const editor = useYooptaEditor();
  const { duplicateBlock, copyBlockLink, deleteBlock } = useBlockActions();
  const [blockOptionsOpen, setBlockOptionsOpen] = useState(false);
  const dragHandleRef = useRef<HTMLButtonElement>(null);

  return (
    <FloatingBlockActions frozen={blockOptionsOpen}>
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
          <FloatingBlockActions.Button
            ref={dragHandleRef}
            onClick={() => setBlockOptionsOpen(true)}>
            ⋮⋮
          </FloatingBlockActions.Button>

          <BlockOptions open={blockOptionsOpen} onOpenChange={setBlockOptionsOpen} anchor={dragHandleRef.current}>
            <BlockOptions.Content>
              <BlockOptions.Group>
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

export default function Editor() {
  const editor = useMemo(() => {
    const heading = buildBlockData({ type: 'HeadingOne', value: [{ children: [{ text: 'Yoopta Editor — Demo Document' }] }] } as any);
    const para1 = buildBlockData({ type: 'Paragraph', value: [{ children: [{ text: 'This is a demo document showing Paragraphs, Headings and Marks.' }] }] } as any);
    const para2 = buildBlockData({ type: 'Paragraph', value: [{ children: [{ text: 'Try selecting text and using the floating toolbar to apply Bold, Italic, Underline, Strike or Highlight.' }] }] } as any);
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

  return (
    <>
      <YooptaEditor
        editor={editor}
        onChange={(value) => console.log(value)}
        autoFocus
        placeholder="Type / to open menu"
        style={{ width: 750 }}>
        <MyToolbar />
        <MyFloatingBlockActions />
        <SlashCommandMenu />
      </YooptaEditor>

      <div style={{ width: 750, display: 'flex', justifyContent: 'flex-end' }}>
        <PublishToWordPress getSourceValue={() => editor.getEditorValue()} />
      </div>
    </>
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
