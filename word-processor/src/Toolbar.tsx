"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { type YooEditor, Blocks, Marks } from "@yoopta/editor";
import {
  Bold,
  Italic,
  Underline,
  Undo2,
  Redo2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image,
  MessageSquare,
  Link,
  Send,
  ChevronDown,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

/* ---------------- UI Helpers ---------------- */

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");

const Button = ({ className, ...props }: any) => (
  <button
    className={cn(
      "h-9 px-3 rounded-md text-sm flex items-center justify-center hover:bg-neutral-100",
      className
    )}
    {...props}
  />
);

const ToolbarButton = ({ active, children, ...props }: any) => (
  <button
    className={cn(
      "h-9 w-9 flex items-center justify-center rounded hover:bg-neutral-100",
      active && "bg-neutral-200"
    )}
    {...props}
  >
    {children}
  </button>
);

const Separator = () => (
  <div className="w-px h-6 bg-neutral-300 mx-1" />
);

/* ---------------- Toolbar ---------------- */

export const WordToolbar = ({
  editor,
  onExport,
  onPrint,
  onToggleComments,
  isCommentsOpen,
  onPublish,
  isPublishDisabled,
  onToggleInvite,
  isInviteOpen,
}: {
  editor: YooEditor;
  onExport: any;
  onPrint: any;
  onToggleComments?: () => void;
  isCommentsOpen?: boolean;
  onPublish?: () => void;
  isPublishDisabled?: boolean;
  onToggleInvite?: () => void;
  isInviteOpen?: boolean;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [align, setAlignState] = useState<"left" | "center" | "right">("left");

  const getBlock = useCallback(
    () => Blocks.getBlock(editor, { at: editor.path.current }),
    [editor]
  );

  /* -------- Actions -------- */

  const toggleBold = () => Marks.toggle(editor, { type: "bold" });
  const toggleItalic = () => Marks.toggle(editor, { type: "italic" });
  const toggleUnderline = () => Marks.toggle(editor, { type: "underline" });

  const undo = () => editor.undo();
  const redo = () => editor.redo();

  const setAlign = (alignVal: "left" | "center" | "right") => {
    if (typeof document !== "undefined") {
      const block = getBlock();
      if (!block) {
        setAlignState(alignVal);
        return;
      }
      const selector = `[data-yoopta-block-id="${block.id}"]`;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        el.style.textAlign = alignVal;
      }
      // persist alignment in block meta so it survives reloads/exports
      try {
        Blocks.updateBlock(editor, block.id, { meta: { ...block.meta, align: alignVal } });
      } catch (e) {
        // fail silently if update not possible
      }
    }
    setAlignState(alignVal);
  };

  const block = getBlock();

  useEffect(() => {
    const block = getBlock();
    if (!block) return;
    const selector = `[data-yoopta-block-id="${block.id}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;
    // apply stored meta alignment if present
    const stored = block.meta?.align as "left" | "center" | "right" | undefined;
    if (el) {
      if (stored) {
        el.style.textAlign = stored;
        setAlignState(stored);
        return;
      }
      const computed = window.getComputedStyle(el).textAlign;
      if (computed === "center") setAlignState("center");
      else if (computed === "right") setAlignState("right");
      else setAlignState("left");
    }
  }, [block?.id]);

  const setHeading = (level: number) => {
    const map: any = {
      0: "Paragraph",
      1: "HeadingOne",
      2: "HeadingTwo",
    };
    Blocks.toggleBlock(editor, map[level], { focus: true });
  };

  const bullet = () => Blocks.toggleBlock(editor, "BulletedList", { focus: true });
  const number = () => Blocks.toggleBlock(editor, "NumberedList", { focus: true });

  const insertImage = () => fileInputRef.current?.click();

  const onFile = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const src = URL.createObjectURL(file);

    Blocks.insertBlock(editor, "Image", {
      focus: true,
      elements: editor.y("image", {
        props: { src, alt: file.name, nodeType: "void" },
      }),
    });
  };



  /* -------- State -------- */

  const isBold = Marks.isActive(editor, { type: "bold" });
  const isItalic = Marks.isActive(editor, { type: "italic" });
  const isUnderline = Marks.isActive(editor, { type: "underline" });


  /* ---------------- UI ---------------- */

  return (
    <div className="border-b bg-white sticky top-0 z-50">

      {/* Top Menu */}
      <div className="flex gap-2 px-2 py-1 border-b">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button>File</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="bg-white shadow rounded p-1">
            <DropdownMenu.Item onClick={() => onExport("html")}>
              Export HTML
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={onPrint}>
              Print
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button>Edit</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="bg-white shadow rounded p-1">
            <DropdownMenu.Item onClick={undo}>Undo</DropdownMenu.Item>
            <DropdownMenu.Item onClick={redo}>Redo</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button>Insert</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="bg-white shadow rounded p-1">
            <DropdownMenu.Item onClick={insertImage}>Image</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

      </div>

      {/* Main Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">

        {/* Undo / Redo */}
        <ToolbarButton onClick={undo}><Undo2 size={16} /></ToolbarButton>
        <ToolbarButton onClick={redo}><Redo2 size={16} /></ToolbarButton>

        <Separator />

        {/* Headings */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button>
              {block?.type || "Normal"}
              <ChevronDown size={14} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="bg-white shadow rounded p-1">
            <DropdownMenu.Item onClick={() => setHeading(0)}>Normal</DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => setHeading(1)}>Heading 1</DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => setHeading(2)}>Heading 2</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <Separator />

        {/* Text */}
        <ToolbarButton active={isBold} onClick={toggleBold}><Bold size={16} /></ToolbarButton>
        <ToolbarButton active={isItalic} onClick={toggleItalic}><Italic size={16} /></ToolbarButton>
        <ToolbarButton active={isUnderline} onClick={toggleUnderline}><Underline size={16} /></ToolbarButton>

        <Separator />

        {/* Align */}
        <ToolbarButton active={align === "left"} onClick={() => setAlign("left")}><AlignLeft size={16} /></ToolbarButton>
        <ToolbarButton active={align === "center"} onClick={() => setAlign("center")}><AlignCenter size={16} /></ToolbarButton>
        <ToolbarButton active={align === "right"} onClick={() => setAlign("right")}><AlignRight size={16} /></ToolbarButton>

        <Separator />

        {/* Lists */}
        <ToolbarButton onClick={bullet}><List size={16} /></ToolbarButton>
        <ToolbarButton onClick={number}><ListOrdered size={16} /></ToolbarButton>

        <Separator />

        {/* Insert */}
        <ToolbarButton onClick={insertImage}><Image size={16} /></ToolbarButton>

        <Separator />

        {/* Comments */}
        <ToolbarButton
          active={Boolean(isCommentsOpen)}
          onClick={onToggleComments}
          title="Toggle comments"
        >
          <MessageSquare size={16} />
        </ToolbarButton>

        <ToolbarButton
          active={Boolean(isInviteOpen)}
          onClick={onToggleInvite}
          title="Invite reviewers"
        >
          <Link size={16} />
        </ToolbarButton>

        <Button
          className="gap-2 border border-neutral-300 bg-white"
          onClick={onPublish}
          disabled={isPublishDisabled}
          title={isPublishDisabled ? "Only owner can publish" : "Open publish page"}
          type="button"
        >
          <Send size={14} />
          Publish
        </Button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={onFile}
          className="hidden"
        />
      </div>
    </div>
  );
};