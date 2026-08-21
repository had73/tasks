import React, { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote,
  Link2, ImageIcon, Undo2, Redo2, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const Btn = ({ active, onClick, disabled, title, testid, children }) => (
  <button
    type="button" onClick={onClick} disabled={disabled} title={title}
    data-testid={testid}
    className={cn(
      "p-2 rounded-md transition-colors hover:bg-zinc-100 active:scale-95 text-zinc-600",
      active && "bg-zinc-900 text-white hover:bg-zinc-900",
      disabled && "opacity-40 cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

export default function TipTapEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        "data-placeholder": placeholder || "Popis úkolu…",
        class: "prose max-w-none",
      },
    },
  });

  const addLink = useCallback(() => {
    const url = window.prompt("URL odkazu:");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("URL obrázku:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-zinc-200 bg-white" data-testid="tiptap-editor">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 px-2 py-1.5">
        <Btn testid="ed-bold" title="Tučné" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></Btn>
        <Btn testid="ed-italic" title="Kurzíva" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></Btn>
        <Btn testid="ed-underline" title="Podtržení" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></Btn>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <Btn testid="ed-h1" title="Nadpis 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></Btn>
        <Btn testid="ed-h2" title="Nadpis 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></Btn>
        <Btn testid="ed-h3" title="Nadpis 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></Btn>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <Btn testid="ed-ul" title="Odrážky" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></Btn>
        <Btn testid="ed-ol" title="Číslovaný seznam" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></Btn>
        <Btn testid="ed-quote" title="Citace" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></Btn>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <Btn testid="ed-align-left" title="Vlevo" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="w-4 h-4" /></Btn>
        <Btn testid="ed-align-center" title="Střed" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="w-4 h-4" /></Btn>
        <Btn testid="ed-align-right" title="Vpravo" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="w-4 h-4" /></Btn>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <Btn testid="ed-link" title="Odkaz" active={editor.isActive("link")} onClick={addLink}><Link2 className="w-4 h-4" /></Btn>
        <Btn testid="ed-image" title="Obrázek" onClick={addImage}><ImageIcon className="w-4 h-4" /></Btn>
        <Btn testid="ed-table" title="Tabulka" onClick={addTable}><TableIcon className="w-4 h-4" /></Btn>
        <div className="w-px h-5 bg-zinc-200 mx-1" />
        <Btn testid="ed-undo" title="Zpět" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="w-4 h-4" /></Btn>
        <Btn testid="ed-redo" title="Znovu" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="w-4 h-4" /></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
