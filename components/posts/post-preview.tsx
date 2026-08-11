"use client"

import { MediaThumb, type MediaItem } from "@/components/media/media-thumb"
import { type ButtonRows, resolveButtonUrl } from "@/lib/tg/buttons"
import { renderTelegramHtml, renderTelegramMarkdown } from "@/lib/post-preview"


export function PostPreview({
  text,
  parseMode,
  media,
  buttons,
  botName = "Seu Bot",
}: {
  text: string
  parseMode: "HTML" | "Markdown"
  media: MediaItem[]
  buttons: ButtonRows
  botName?: string
}) {
  const html =
    parseMode === "HTML"
      ? renderTelegramHtml(text)
      : renderTelegramMarkdown(text)

  const validRows = buttons
    .map((row) => row.filter((b) => b.text.trim() && b.value.trim()))
    .filter((row) => row.length > 0)

  const now = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="rounded-xl bg-[#7893b0] p-4">
      <div className="mx-auto max-w-sm">
        <div className="overflow-hidden rounded-2xl rounded-tl-md bg-card shadow-sm">
          {/* Bot header */}
          <div className="flex items-center gap-2 px-3 pt-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {botName.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-primary">{botName}</span>
          </div>

          {/* Media */}
          {media.length === 1 && (
            <div className="mt-2 max-h-72 overflow-hidden bg-muted">
              <MediaThumb media={media[0]} className="max-h-72 w-full" />
            </div>
          )}
          {media.length >= 2 && (
            <div className="mt-2 grid grid-cols-2 gap-0.5 bg-muted">
              {media.slice(0, 4).map((m, i) => (
                <div
                  key={m.id}
                  className={
                    "relative aspect-square overflow-hidden" +
                    (media.length === 3 && i === 0 ? " col-span-2 aspect-video" : "")
                  }
                >
                  <MediaThumb media={m} />
                  {i === 3 && media.length > 4 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                      +{media.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text */}
          {text.trim() ? (
            <div
              className="px-3 py-2 text-sm leading-relaxed text-card-foreground [word-break:break-word]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="px-3 py-2 text-sm italic text-muted-foreground">
              Sua mensagem aparecerá aqui...
            </div>
          )}

          {/* Inline buttons */}
          {validRows.length > 0 && (
            <div className="flex flex-col gap-0.5 border-t border-border p-1">
              {validRows.map((row, i) => (
                <div key={i} className="flex gap-0.5">
                  {row.map((b, j) => {
                    const href = resolveButtonUrl(b)
                    return (
                      <span
                        key={j}
                        title={href || b.value}
                        className="flex flex-1 items-center justify-center truncate rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary"
                      >
                        {b.text}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="px-3 pb-1.5 text-right text-[10px] text-muted-foreground">
            {now}
          </div>
        </div>
      </div>
    </div>
  )
}
