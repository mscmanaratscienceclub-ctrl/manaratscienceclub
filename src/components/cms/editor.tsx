"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import { useEffect } from "react";
import Toolbar from "./toolbar";

interface Props { content: string; onChange: (html: string) => void; placeholder?: string }

export default function RichTextEditor({ content, onChange, placeholder = "Start writing your article here..." }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Placeholder.configure({ placeholder }), TiptapLink.configure({ openOnClick: false, autolink: true })],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "blog-content focus:outline-none" } },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content);
  }, [content, editor]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white [&_.ProseMirror]:break-words">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
