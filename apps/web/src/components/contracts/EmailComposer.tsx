"use client";
import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { emailDocument, emailText } from "../../lib/email-editor";
const labels: Record<string, string> = {
  cliente: "Nome do cliente",
  fatura: "Número da fatura",
  contrato: "Número do contrato",
  competencia: "Mês de referência",
  total: "Valor total",
  vencimento: "Data de vencimento",
  empresa: "Sua empresa",
  fuso: "Fuso horário",
};
export default function EmailComposer({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [url, setUrl] = useState(""),
    [linkOpen, setLinkOpen] = useState(false),
    [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
        italic: false,
        strike: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        protocols: ["https"],
      }),
    ],
    content: emailDocument(value),
    editorProps: {
      attributes: {
        class: "email-writing-area",
        role: "textbox",
        "aria-label": "Mensagem do email",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(emailText(editor.getJSON())),
  });
  useEffect(() => {
    if (editor && emailText(editor.getJSON()) !== value)
      editor.commands.setContent(emailDocument(value), false);
  }, [value, editor]);
  if (!editor) return <div className="loading-panel">Abrindo editor…</div>;
  return (
    <div className="email-composer">
      <div className="email-toolbar" aria-label="Formatação da mensagem">
        <button
          type="button"
          aria-label="Negrito"
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          aria-label="Desfazer"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </button>
        <button
          type="button"
          aria-label="Refazer"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </button>
        <button
          type="button"
          onClick={() => {
            setUrl(editor.getAttributes("link").href || "https://");
            setLinkOpen((v) => !v);
          }}
        >
          Inserir link
        </button>
        <select
          aria-label="Inserir dado automático"
          value=""
          onChange={(e) => {
            if (e.target.value)
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "text",
                  text: "{" + e.target.value + "}",
                })
                .run();
          }}
        >
          <option value="">＋ Dado automático</option>
          {Object.entries(labels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {linkOpen && (
        <div className="email-link-bar">
          <label className="sr-only" htmlFor="email-link">
            Endereço do link
          </label>
          <input
            id="email-link"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
          <button
            type="button"
            onClick={() => {
              try {
                const u = new URL(url);
                if (u.protocol !== "https:" || u.username || u.password)
                  throw new Error();
                editor
                  .chain()
                  .focus()
                  .extendMarkRange("link")
                  .setLink({ href: u.href })
                  .run();
                setLinkOpen(false);
                setError("");
              } catch {
                setError("Informe um endereço HTTPS válido.");
              }
            }}
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              setLinkOpen(false);
            }}
          >
            Remover link
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkOpen(false);
              setError("");
            }}
          >
            Cancelar
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-error p-sm">
          {error}
        </p>
      )}
      <EditorContent editor={editor} />
      <div className="email-editor-footer">
        <span>Mensagem</span>
        <span className={value.length > 10000 ? "text-error" : ""}>
          {value.length.toLocaleString("pt-BR")} / 10.000
        </span>
      </div>
    </div>
  );
}
