"use client"

import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Link2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BUTTON_TYPE_LABELS,
  type ButtonRows,
  type ButtonType,
  type PostButton,
} from "@/lib/tg/buttons"
import { cn } from "@/lib/utils"

const PLACEHOLDERS: Record<ButtonType, string> = {
  url: "https://exemplo.com",
  site: "https://seusite.com",
  callback: "dados_callback (máx 64)",
  deeplink: "https://t.me/seubot?start=promo",
  telegram: "@canal ou t.me/canal",
  whatsapp: "5511999999999",
  instagram: "@seuperfil",
}

export function ButtonBuilder({
  rows,
  onChange,
}: {
  rows: ButtonRows
  onChange: (rows: ButtonRows) => void
}) {
  function update(next: ButtonRows) {
    onChange(next)
  }

  function addRow() {
    update([...rows, [{ text: "", type: "url", value: "" }]])
  }

  function addButton(rowIndex: number) {
    const next = rows.map((row, i) =>
      i === rowIndex ? [...row, { text: "", type: "url" as ButtonType, value: "" }] : row,
    )
    update(next)
  }

  function updateButton(
    rowIndex: number,
    btnIndex: number,
    patch: Partial<PostButton>,
  ) {
    const next = rows.map((row, i) =>
      i === rowIndex
        ? row.map((b, j) => (j === btnIndex ? { ...b, ...patch } : b))
        : row,
    )
    update(next)
  }

  function removeButton(rowIndex: number, btnIndex: number) {
    const next = rows
      .map((row, i) => (i === rowIndex ? row.filter((_, j) => j !== btnIndex) : row))
      .filter((row) => row.length > 0)
    update(next)
  }

  function duplicateButton(rowIndex: number, btnIndex: number) {
    const next = rows.map((row, i) =>
      i === rowIndex
        ? [...row.slice(0, btnIndex + 1), { ...row[btnIndex] }, ...row.slice(btnIndex + 1)]
        : row,
    )
    update(next)
  }

  function moveRow(rowIndex: number, dir: -1 | 1) {
    const target = rowIndex + dir
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    ;[next[rowIndex], next[target]] = [next[target], next[rowIndex]]
    update(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-dashboard-border/30 bg-dashboard-surface/45 p-5 text-center">
          <Link2 className="mx-auto mb-2 h-6 w-6 text-dashboard-accent/50" />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-dashboard-text-muted/70">
            Nenhum botão configurado.
          </p>
        </div>
      )}

      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="rounded-xl border border-dashboard-border/25 bg-dashboard-surface/55 p-3 shadow-lg shadow-black/5"
        >
            <div className="mb-3 flex items-center justify-between border-b border-dashboard-border/15 pb-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-dashboard-accent">
              <GripVertical className="h-3.5 w-3.5" />
              Linha {rowIndex + 1}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-dashboard-text-muted hover:bg-dashboard-accent/10 hover:text-dashboard-accent"
                onClick={() => moveRow(rowIndex, -1)}
                disabled={rowIndex === 0}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-dashboard-text-muted hover:bg-dashboard-accent/10 hover:text-dashboard-accent"
                onClick={() => moveRow(rowIndex, 1)}
                disabled={rowIndex === rows.length - 1}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {row.map((btn, btnIndex) => (
              <div
                key={btnIndex}
                className="flex flex-col gap-2 rounded-xl border border-dashboard-border/20 bg-dashboard-bg/35 p-3"
              >
                {/* Texto do botão e tipo — empilhados no mobile */}
                <div className="flex flex-col gap-2">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-dashboard-text-muted/60">Texto do botão</p>
                    <Input
                      placeholder="Ex.: Comprar Agora"
                      className="h-9 rounded-xl border-dashboard-border/25 bg-dashboard-surface/60 px-3 text-sm text-dashboard-text placeholder:text-dashboard-text-muted/50"
                      value={btn.text}
                      onChange={(e) =>
                        updateButton(rowIndex, btnIndex, { text: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-dashboard-text-muted/60">Tipo de ação</p>
                    <Select
                      value={btn.type}
                      onValueChange={(v) =>
                        updateButton(rowIndex, btnIndex, {
                          type: (v as ButtonType) ?? "url",
                        })
                      }
                    >
                      <SelectTrigger                       className="h-9 rounded-xl border-dashboard-border/25 bg-dashboard-surface/60 px-3 text-sm text-dashboard-text">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(BUTTON_TYPE_LABELS) as ButtonType[]).map((t) => (
                          <SelectItem key={t} value={t}>
                            {BUTTON_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Link/Valor + ações */}
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-dashboard-text-muted/60">Link ou valor</p>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder={PLACEHOLDERS[btn.type]}
                      className="h-9 min-w-0 flex-1 rounded-xl border-dashboard-border/25 bg-dashboard-surface/60 px-3 text-sm text-dashboard-text placeholder:text-dashboard-text-muted/50"
                      value={btn.value}
                      onChange={(e) =>
                        updateButton(rowIndex, btnIndex, { value: e.target.value })
                      }
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl border border-dashboard-border/20 text-dashboard-text-muted hover:bg-dashboard-accent/10 hover:text-dashboard-accent"
                        onClick={() => duplicateButton(rowIndex, btnIndex)}
                        aria-label="Duplicar botão"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl border border-dashboard-border/20 text-dashboard-text-muted hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeButton(rowIndex, btnIndex)}
                        aria-label="Remover botão"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-3 h-9 w-full rounded-xl border border-dashed border-dashboard-border/30 text-[10px] font-black uppercase tracking-[0.14em] text-dashboard-text-muted hover:border-dashboard-accent/30 hover:bg-dashboard-accent/5 hover:text-dashboard-accent"
            onClick={() => addButton(rowIndex)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar botão nesta linha
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        className="h-10 w-full rounded-xl border-dashboard-accent/25 bg-dashboard-accent/10 text-xs font-black uppercase text-dashboard-accent shadow-lg shadow-dashboard-accent/5 active:scale-[0.98] hover:bg-dashboard-accent/15"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Adicionar nova linha de botões
      </Button>
    </div>
  )
}
