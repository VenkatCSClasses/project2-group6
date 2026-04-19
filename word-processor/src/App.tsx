import { type YooptaContentValue } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Headings from '@yoopta/headings';
import { Bold, Italic, Underline, Strike, CodeMark, Highlight } from '@yoopta/marks';
import { useMemo, useState, useRef, useEffect } from 'react';
import YooptaEditor, { createYooptaEditor, Blocks, Marks, useYooptaEditor, buildBlockData } from '@yoopta/editor';
import { FloatingToolbar, FloatingBlockActions, BlockOptions, SlashCommandMenu } from '@yoopta/ui';
import Typo from 'typo-js'; 

const PLUGINS = [Paragraph, Headings.HeadingOne, Headings.HeadingTwo, Headings.HeadingThree];
const MARKS = [Bold, Italic, Underline, Strike, CodeMark, Highlight];

// --- TOOLBAR COMPONENTS (Unchanged) ---
function MyToolbar() {
  const editor = useYooptaEditor();
  return (
    <FloatingToolbar>
      <FloatingToolbar.Content>
        <FloatingToolbar.Group>
          {editor.formats.bold && (<FloatingToolbar.Button onClick={() => Marks.toggle(editor, { type: 'bold' })} active={Marks.isActive(editor, { type: 'bold' })} title="Bold">B</FloatingToolbar.Button>)}
          {editor.formats.italic && (<FloatingToolbar.Button onClick={() => Marks.toggle(editor, { type: 'italic' })} active={Marks.isActive(editor, { type: 'italic' })} title="Italic">I</FloatingToolbar.Button>)}
          {editor.formats.underline && (<FloatingToolbar.Button onClick={() => Marks.toggle(editor, { type: 'underline' })} active={Marks.isActive(editor, { type: 'underline' })} title="Underline">U</FloatingToolbar.Button>)}
          {editor.formats.strike && (<FloatingToolbar.Button onClick={() => Marks.toggle(editor, { type: 'strike' })} active={Marks.isActive(editor, { type: 'strike' })} title="Strike">S</FloatingToolbar.Button>)}
        </FloatingToolbar.Group>
      </FloatingToolbar.Content>
    </FloatingToolbar>
  );
}

function MyFloatingBlockActions() {
  const editor = useYooptaEditor();
  const [blockOptionsOpen, setBlockOptionsOpen] = useState(false);
  const dragHandleRef = useRef<HTMLButtonElement>(null);

  return (
    <FloatingBlockActions frozen={blockOptionsOpen}>
      {({ blockId }: { blockId?: string | null }) => (
        <>
          <FloatingBlockActions.Button onClick={() => { if (!blockId) return; const block = Blocks.getBlock(editor, { id: blockId }); if (block) editor.insertBlock('Paragraph', { at: block.meta.order + 1, focus: true }); }}>+</FloatingBlockActions.Button>
          <FloatingBlockActions.Button ref={dragHandleRef} onClick={() => setBlockOptionsOpen(true)}>⋮⋮</FloatingBlockActions.Button>
          <BlockOptions open={blockOptionsOpen} onOpenChange={setBlockOptionsOpen} anchor={dragHandleRef.current}>
            <BlockOptions.Content>{/* Options */}</BlockOptions.Content>
          </BlockOptions>
        </>
      )}
    </FloatingBlockActions>
  );
}

// --- MAIN EDITOR COMPONENT ---
export default function Editor() {
  const [dict, setDict] = useState<Typo | null>(null);
  
  // State to hold our found errors
  const [typos, setTypos] = useState<string[]>([]);
  const [grammarFlags, setGrammarFlags] = useState<string[]>([]);

  const editor = useMemo(() => createYooptaEditor({ plugins: PLUGINS, marks: MARKS }), []);

  // 1. Initialize Dictionary
  useEffect(() => {
    const typo = new Typo('en_US', false, false, {
      dictionaryPath: '/index.dic/en_US',
    });
    setDict(typo);
  }, []);

  // 2. The Checking Engine
  const handleChange = (value: YooptaContentValue) => {
    if (!dict) return;

    const foundTypos = new Set<string>();
    const foundGrammar = new Set<string>();

    // Scan through all Yoopta blocks and text nodes
    Object.values(value).forEach((block) => {
      block.value.forEach((node: any) => {
        if (node.children) {
          node.children.forEach((child: any) => {
            if (typeof child.text === 'string') {
              
              // --- SPELL CHECK LOGIC ---
              // Extract words using regex (ignores punctuation)
              const words = child.text.match(/\b[a-zA-Z]+\b/g) || [];
              words.forEach((word: string) => {
                // Ignore single letters, then check dictionary
                if (word.length > 1 && !dict.check(word)) {
                  foundTypos.add(word);
                }
              });

              // --- GRAMMAR CHECK LOGIC (Basic Example) ---
              // Note: Typo.js does not do grammar. You have to use custom rules 
              // or an API (like LanguageTool) for real grammar. Here is a basic rule engine:
              const textLower = child.text.toLowerCase();
              if (textLower.includes("they is")) foundGrammar.add('"they is" should be "they are"');
              if (textLower.includes("your a")) foundGrammar.add('"your a" should likely be "you\'re a"');
              if (textLower.includes("i seen")) foundGrammar.add('"I seen" should be "I saw" or "I have seen"');
            }
          });
        }
      });
    });

    // Update the UI states
    setTypos(Array.from(foundTypos));
    setGrammarFlags(Array.from(foundGrammar));
  };

  // 3. Initial Sample Data
  useEffect(() => {
    try {
      const current = editor.getEditorValue();
      if (!current || Object.keys(current).length === 0) {
        const heading = buildBlockData({ type: 'HeadingOne', value: [{ children: [{ text: 'Yoopta Editor — Demo Document' }] }] });
        const para1 = buildBlockData({ type: 'Paragraph', value: [{ children: [{ text: 'This is a demo documentt showing Paragraphs, Headings and Marks.' }] }] });
        // Added a deliberate typo here for testing!
        const para2 = buildBlockData({ type: 'Paragraph', value: [{ children: [{ text: 'I seen that this editor is awsume!' }] }] });

        const initial = { [heading.id]: heading, [para1.id]: para1, [para2.id]: para2 };
        editor.setEditorValue(initial);
        editor.setPath({ current: 0 });
        
        // Run an initial check on the default text
        handleChange(initial as unknown as YooptaContentValue);
      }
    } catch (e) {
      console.error('Yoopta init error', e);
    }
  }, [editor, dict]); // Re-run when dictionary loads

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', padding: '20px' }}>
      
      {/* LEFT COLUMN: THE EDITOR */}
      <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', backgroundColor: '#fff' }}>
        <YooptaEditor
          editor={editor}
          autoFocus
          placeholder="Type / to open menu"
          style={{ width: 650 }}
          onChange={handleChange}
        >
          <MyToolbar />
          <MyFloatingBlockActions />
          <SlashCommandMenu />
        </YooptaEditor>
      </div>

      {/* RIGHT COLUMN: THE REPORT DASHBOARD */}
      <div style={{ width: '300px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginTop: 0, borderBottom: '1px solid #cbd5e1', paddingBottom: '10px' }}>Document Report</h3>
        
        {/* Spelling Section */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>Spelling Errors ({typos.length})</h4>
          {typos.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#64748b' }}>No typos found!</p>
          ) : (
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#b91c1c' }}>
              {typos.map((typo, idx) => (
                <li key={idx}><strong>{typo}</strong></li>
              ))}
            </ul>
          )}
        </div>

        {/* Grammar Section */}
        <div>
          <h4 style={{ color: '#eab308', marginBottom: '8px' }}>Grammar Flags ({grammarFlags.length})</h4>
          {grammarFlags.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#64748b' }}>Grammar looks good!</p>
          ) : (
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#a16207' }}>
              {grammarFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}