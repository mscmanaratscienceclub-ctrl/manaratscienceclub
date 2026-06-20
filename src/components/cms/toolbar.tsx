"use client";

import type { Editor } from "@tiptap/react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code, Code2, Undo, Redo, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

function ToolBtn({ onClick, active, disabled, title, children }: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); onClick(); }} disabled={disabled} title={title}
      className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors", active ? "bg-ink text-white" : "text-ink/50 hover:bg-gray-200 hover:text-ink", disabled && "pointer-events-none opacity-30")}>
      {children}
    </button>
  );
}

const Divider = () => <div className="mx-1 h-6 w-px bg-gray-200" />;

export default function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-3 py-2">
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><Underline className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code"><Code className="size-3.5" /></ToolBtn>
      <Divider />
      {([1, 2, 3] as const).map((level) => (
        <ToolBtn key={level} onClick={() => editor.chain().focus().toggleHeading({ level }).run()} active={editor.isActive("heading", { level })} title={`Heading ${level}`}>
          <span className="text-xs font-bold">H{level}</span>
        </ToolBtn>
      ))}
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List"><List className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List"><ListOrdered className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote"><Quote className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block"><Code2 className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule"><Minus className="size-3.5" /></ToolBtn>
      <Divider />
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo className="size-3.5" /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo className="size-3.5" /></ToolBtn>
    </div>
  );
}
