'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Link } from '@tiptap/extension-link';
import { Highlight } from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Image } from '@tiptap/extension-image';
import { Underline } from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  MessageSquare,
  List,
  ListOrdered,
  Plus,
  Box,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Trash2,
  Highlighter,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import './editor.css';

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

export default function Editor({
  initialContent = '',
  onChange,
  readOnly = false,
}: EditorProps) {
  const [wordCount, setWordCount] = useState(0);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Color,
      TextStyle,
      Image.configure({
        allowBase64: true,
      }),
      Underline,
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);

      // Count words
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
    },
  });

  const calculateReadTime = () => {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes < 1 ? '< 1 min' : `${minutes} min`;
  };

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          editor?.chain().focus().setImage({ src: url }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [editor]);

  const addLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      editor
        ?.chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
    setTableMenuOpen(false);
  }, [editor]);

  if (!editor) {
    return <div className="text-[#8892A4]">Loading editor...</div>;
  }

  const isTableSelected = editor.isActive('table');

  return (
    <div className="w-full bg-[#0F0F0F] rounded-lg border border-[#2A2A4A]">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-40 bg-[#1A1A2E] border-b border-[#2A2A4A] p-3 rounded-t-lg space-y-2 max-h-96 overflow-y-auto">
        {/* Row 1: Text Style */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`p-2 rounded transition-colors ${
              editor.isActive('bold')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={18} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`p-2 rounded transition-colors ${
              editor.isActive('italic')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={18} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run()}
            className={`p-2 rounded transition-colors ${
              editor.isActive('underline')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={18} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={`p-2 rounded transition-colors ${
              editor.isActive('strike')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Strikethrough"
          >
            <Strikethrough size={18} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={`p-2 rounded transition-colors ${
              editor.isActive('code')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Inline Code"
          >
            <Code size={18} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            disabled={!editor.can().chain().focus().toggleHighlight().run()}
            className={`p-2 rounded transition-colors ${
              editor.isActive('highlight')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Highlight"
          >
            <Highlighter size={18} />
          </button>
        </div>

        {/* Row 2: Headings & Blocks */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={`p-2 rounded transition-colors text-sm font-bold ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Heading 1"
          >
            H1
          </button>

          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`p-2 rounded transition-colors text-sm font-bold ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Heading 2"
          >
            H2
          </button>

          <button
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={`p-2 rounded transition-colors text-sm font-bold ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Heading 3"
          >
            H3
          </button>

          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`p-2 rounded transition-colors text-sm ${
              editor.isActive('paragraph')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Paragraph"
          >
            P
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={!editor.can().chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded transition-colors ${
              editor.isActive('blockquote')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Blockquote"
          >
            <MessageSquare size={18} />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
            className={`p-2 rounded transition-colors ${
              editor.isActive('codeBlock')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Code Block"
          >
            <Code size={18} />
          </button>
        </div>

        {/* Row 3: Lists & Media */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            disabled={
              !editor.can().chain().focus().toggleBulletList().run()
            }
            className={`p-2 rounded transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Bullet List"
          >
            <List size={18} />
          </button>

          <button
            onClick={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            disabled={
              !editor.can().chain().focus().toggleOrderedList().run()
            }
            className={`p-2 rounded transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-[#E94560] text-[#EAEAEA]'
                : 'bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]'
            }`}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </button>

          <div className="relative">
            <button
              onClick={() => setTableMenuOpen(!tableMenuOpen)}
              className="p-2 rounded transition-colors bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]"
              title="Insert Table"
            >
              <Box size={18} />
            </button>
            {tableMenuOpen && (
              <div className="absolute top-full left-0 mt-2 bg-[#1A1A2E] border border-[#2A2A4A] rounded shadow-lg z-50 min-w-40">
                <button
                  onClick={addTable}
                  className="w-full text-left px-4 py-2 hover:bg-[#242442] text-[#EAEAEA] text-sm"
                >
                  Insert Table
                </button>
                {isTableSelected && (
                  <>
                    <button
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .addRowAfter()
                          .run();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#242442] text-[#EAEAEA] text-sm"
                    >
                      Add Row
                    </button>
                    <button
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .deleteRow()
                          .run();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#242442] text-[#EAEAEA] text-sm"
                    >
                      Delete Row
                    </button>
                    <button
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .addColumnAfter()
                          .run();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#242442] text-[#EAEAEA] text-sm"
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .deleteColumn()
                          .run();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#242442] text-[#EAEAEA] text-sm"
                    >
                      Delete Column
                    </button>
                    <button
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .deleteTable()
                          .run();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#242442] text-[#FF6B6B] text-sm"
                    >
                      Delete Table
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={addImage}
            className="p-2 rounded transition-colors bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]"
            title="Insert Image"
          >
            <Plus size={18} />
          </button>

          <button
            onClick={addLink}
            className="p-2 rounded transition-colors bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]"
            title="Add Link"
          >
            <LinkIcon size={18} />
          </button>
        </div>

        {/* Row 4: Actions */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="p-2 rounded transition-colors bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 size={18} />
          </button>

          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="p-2 rounded transition-colors bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 size={18} />
          </button>

          <button
            onClick={() => editor.chain().focus().clearNodes().run()}
            className="p-2 rounded transition-colors bg-[#2A2A4A] text-[#8892A4] hover:bg-[#3A3A5A]"
            title="Clear Formatting"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="p-6 min-h-96 bg-[#0F0F0F]">
        <EditorContent editor={editor} className="editor-content" />
      </div>

      {/* Word Count Footer */}
      <div className="flex justify-between items-center px-6 py-3 border-t border-[#2A2A4A] bg-[#1A1A2E] rounded-b-lg text-sm text-[#8892A4]">
        <span>Words: {wordCount}</span>
        <span>Read time: {calculateReadTime()}</span>
      </div>
    </div>
  );
}
