import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  RotateCcw,
  RotateCw
} from 'lucide-react';

const formatContent = (val) => {
  if (!val) return '';
  if (typeof val === 'string' && !val.includes('<p>') && val.includes('\n')) {
    return val
      .split('\n\n')
      .map((block) => `<p>${block.replace(/\n/g, '<br/>')}</p>`)
      .join('');
  }
  return val;
};

export default function RichTextEditor({ content, onChange, placeholder = 'Write notes...' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
    ],
    content: formatContent(content),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[160px] text-sm text-slate-800 dark:text-slate-200 p-4 leading-relaxed',
      },
    },
  });

  // Keep editor content in sync if updated externally
  React.useEffect(() => {
    if (editor && content !== undefined) {
      const formatted = formatContent(content);
      if (editor.getHTML() !== formatted && editor.getText() !== content) {
        editor.commands.setContent(formatted || '');
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, isActive, children, title }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
        isActive
          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          isActive={false}
          title="Undo"
        >
          <RotateCcw className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          isActive={false}
          title="Redo"
        >
          <RotateCw className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content Area */}
      <div className="min-h-[140px] max-h-[350px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
